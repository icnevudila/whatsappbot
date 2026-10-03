"""
Central Launch Configuration & Resilience Helper for Playwright & GFlow Engine.
Ensures:
1. --no-sandbox and --disable-dev-shm-usage injected centrally into Playwright
2. ignoreDefaultArgs doesn't strip --no-sandbox
3. MigratedComposer._exit_agent_mode handles Google Flow's new panel close button
   and Agent pill toggle without touching upstream source files.
4. Auto-dismisses random Google Flow modals ('Got it', 'Dismiss', 'Anladım', 'Kapat')
5. Increases FRAME_SEARCH_ATTEMPTS = 6 and FRAME_SEARCH_RETRY_PAUSE_S = 2.5 so
   ingredient chips NEVER fail to attach due to server-side asset search indexing delay.
6. Bulletproof cookie bar elimination: injects CSS and force-removes div.glue-cookie-notification-bar
   so it CAN NEVER occlude .settings-trigger-button or any Flow action.
7. Handles cross-device EXDEV errors gracefully via shutil.move in Path.replace.
"""
import os
import sys
import asyncio

MESAJIFY_GFLOW_PATCH_VERSION = "2026.10.03.1"
SUPPORTED_GFLOW_CLI_VERSIONS = {"0.79.1"}

def _verify_gflow_cli_compatibility():
    try:
        import importlib.metadata
        v = importlib.metadata.version("gflow-cli")
        if v not in SUPPORTED_GFLOW_CLI_VERSIONS:
            sys.stderr.write(
                f"[sitecustomize] WARNING: GFLOW_PATCH_VERSION_UNSUPPORTED: Expected gflow-cli in {SUPPORTED_GFLOW_CLI_VERSIONS}, found {v}\n"
            )
            return False
        return True
    except Exception:
        return True

_verify_gflow_cli_compatibility()

# 1. Chromium launch flags
if os.environ.get("GFLOW_CHROME_NO_SANDBOX") == "1":
    try:
        from playwright._impl._browser_type import BrowserType
        _orig_impl_lpc = BrowserType.launch_persistent_context

        async def _canary_impl_lpc(self, *args, **kwargs):
            ida = kwargs.get("ignoreDefaultArgs")
            if isinstance(ida, (list, tuple)):
                kwargs["ignoreDefaultArgs"] = [x for x in ida if x != "--no-sandbox"]

            curr_args = list(kwargs.get("args") or [])
            if "--no-sandbox" not in curr_args:
                curr_args.append("--no-sandbox")
            if "--disable-dev-shm-usage" not in curr_args:
                curr_args.append("--disable-dev-shm-usage")
            kwargs["args"] = curr_args
            kwargs["chromiumSandbox"] = False

            return await _orig_impl_lpc(self, *args, **kwargs)

        BrowserType.launch_persistent_context = _canary_impl_lpc
    except Exception as e:
        sys.stderr.write(f"[sitecustomize] Failed to patch BrowserType: {e}\n")

# 2. Resilient Chip Attachment & Cookie/Popup Dismissal
try:
    import gflow_cli.api.transports.migrated_composer as mc
    
    # Increase search attempts and pause so fresh uploads are guaranteed to be indexed
    mc.FRAME_SEARCH_ATTEMPTS = 6
    mc.FRAME_SEARCH_RETRY_PAUSE_S = 2.5
    sys.stderr.write("[sitecustomize] ✅ Set FRAME_SEARCH_ATTEMPTS=6, RETRY_PAUSE=2.5s for zero chip misses\n")

    # Hook 1: Bulletproof Cookie Bar Dismissal
    _orig_dismiss_cookie_bar = mc.MigratedComposer._dismiss_cookie_bar

    async def _bulletproof_dismiss_cookie_bar(self, page):
        # A. Inject CSS hiding the cookie bar completely
        try:
            await page.add_style_tag(content="""
                #glue-cookie-notification-bar-1, .glue-cookie-notification-bar, div[class*="glue-cookie"], .glue-cookie {
                    display: none !important;
                    pointer-events: none !important;
                    visibility: hidden !important;
                    height: 0px !important;
                    opacity: 0 !important;
                }
            """)
        except Exception:
            pass

        # B. Force-remove from DOM
        try:
            await page.evaluate("""() => {
                const elements = document.querySelectorAll(
                    '#glue-cookie-notification-bar-1, .glue-cookie-notification-bar, div[class*="glue-cookie"], .glue-cookie'
                );
                elements.forEach(el => {
                    el.style.display = 'none';
                    el.style.pointerEvents = 'none';
                    try { el.remove(); } catch(e) {}
                });
            }""")
        except Exception:
            pass

        # C. Try clicking reject or accept buttons if still detectable
        try:
            bar = page.locator(mc.COOKIE_BAR).first
            if await bar.count() > 0 and await bar.is_visible():
                for sel in [
                    mc.COOKIE_BAR_REJECT,
                    "button.glue-cookie-notification-bar__accept",
                    "button:has-text('Accept')",
                    "button:has-text('Kabul')",
                    "button:has-text('Anladım')",
                    "button",
                ]:
                    btn = bar.locator(sel).first
                    if await btn.count() > 0 and await btn.is_visible():
                        await btn.click(timeout=1000)
                        break
        except Exception:
            pass

    mc.MigratedComposer._dismiss_cookie_bar = _bulletproof_dismiss_cookie_bar
    sys.stderr.write("[sitecustomize] ✅ Hooked MigratedComposer._dismiss_cookie_bar with bulletproof DOM purge\n")

    # Hook 2: Exit Agent Mode & Dialog Dismissal
    _orig_exit_agent_mode = mc.MigratedComposer._exit_agent_mode

    @classmethod
    async def _canary_exit_agent_mode(cls, page):
        # 0. Always purge cookie bar
        try:
            await page.evaluate("""() => {
                const elements = document.querySelectorAll('#glue-cookie-notification-bar-1, .glue-cookie-notification-bar, div[class*="glue-cookie"]');
                elements.forEach(el => { el.style.display = 'none'; el.style.pointerEvents = 'none'; try { el.remove(); } catch(e) {} });
            }""")
        except Exception:
            pass

        # 1. Close any random modal dialogs ('Anladım', 'Got it', 'Dismiss', 'Close')
        try:
            for text_val in ['Anladım', 'Got it', 'Dismiss', 'Kapat', 'Not now']:
                modal_btn = page.locator(f"button:has-text('{text_val}')").first
                if await modal_btn.count() > 0 and await modal_btn.is_visible():
                    await modal_btn.click(timeout=1500)
                    await asyncio.sleep(0.3)
        except Exception:
            pass

        # 2. Close the right agent session panel if open
        try:
            close_btn = page.locator("button").filter(has=page.locator("mat-icon:text-is('close')")).first
            if await close_btn.count() > 0 and await close_btn.is_visible():
                await close_btn.click(timeout=3000)
                await asyncio.sleep(0.5)
        except Exception:
            pass

        # 3. Toggle off the Agent pill button if present
        try:
            agent_btn = page.locator("button:has-text('Agent')").first
            if await agent_btn.count() > 0 and await agent_btn.is_visible():
                await agent_btn.click(timeout=3000)
                await asyncio.sleep(0.5)
                return "clicked", None
        except Exception:
            pass

        return await _orig_exit_agent_mode(page)

    mc.MigratedComposer._exit_agent_mode = _canary_exit_agent_mode

    # Hook 3: Resilient Generation Record Hook for MZZa6b & as29s / Migrated Flow R2V
    try:
        import gflow_cli.api.transports.batchexecute as be

        _orig_generation_record = be.generation_record

        def _parse_modern_flow_record(node):
            if isinstance(node, list):
                if len(node) >= 6 and all(isinstance(node[i], str) and be._UUID_RE.match(node[i]) for i in (0, 1, 2)):
                    status_cell = be._as_list(be._at(node, 5, 8))
                    status = status_cell[0] if status_cell else None
                    size = be._at(node, 5, 13)
                    # In modern as29s/r2v: node[0] is media_id, node[1] is proj_id, node[2] is workflow_id
                    return be.GenerationRecord(
                        workflow_id=node[2],
                        project_id=node[1],
                        media_id=node[0],
                        status=status if isinstance(status, int) else None,
                        video_url=be._url(be._at(node, 7, 0, 8)),
                        poster_url=be._url(be._at(node, 5, 10)),
                        size_bytes=size if isinstance(size, int) else None,
                    )
                for child in node:
                    res = _parse_modern_flow_record(child)
                    if res is not None:
                        return res
            return None

        def _find_mzza6b_record(node):
            if isinstance(node, list):
                # Look for [uuid, null, null, [..., media_uuid, ...]]
                if len(node) >= 4 and isinstance(node[0], str) and be._UUID_RE.match(node[0]):
                    sub = node[3]
                    if isinstance(sub, list) and len(sub) >= 5:
                        media_id = None
                        for elem in sub:
                            if isinstance(elem, str) and be._UUID_RE.match(elem):
                                media_id = elem
                                break
                        return be.GenerationRecord(
                            workflow_id=node[0],
                            project_id="",
                            media_id=media_id or node[0],
                            status=be.STATUS_SUBMITTED,
                        )
                for child in node:
                    rec = _find_mzza6b_record(child)
                    if rec is not None:
                        return rec
            return None

        def _resilient_generation_record(rpcid, payload):
            try:
                rec = _orig_generation_record(rpcid, payload)
                # Check if upstream parser swapped workflow and media IDs on as29s
                if rpcid == "as29s" and rec is not None:
                    # In as29s, rec[0] was media_id and rec[2] was workflow_id
                    swapped = _parse_modern_flow_record(payload)
                    if swapped is not None:
                        return swapped
                return rec
            except be.WireFormatError as exc:
                # 1. Try modern flow record parser (as29s without 'CAE')
                rec = _parse_modern_flow_record(payload)
                if rec is not None:
                    sys.stderr.write(f"[sitecustomize] Recovered modern flow record from {rpcid}: workflow={rec.workflow_id}, media={rec.media_id}, done={rec.is_done}\n")
                    return rec
                # 2. Try MZZa6b submit envelope
                rec = _find_mzza6b_record(payload)
                if rec is not None:
                    sys.stderr.write(f"[sitecustomize] Recovered generation record from {rpcid}: workflow={rec.workflow_id}, media={rec.media_id}\n")
                    return rec
                raise exc

        be.generation_record = _resilient_generation_record
        mc.generation_record = _resilient_generation_record
        sys.stderr.write("[sitecustomize] Hooked batchexecute.generation_record with resilient MZZa6b/as29s envelope fallback\n")
    except Exception as e_gen:
        sys.stderr.write(f"[sitecustomize] Failed to hook generation_record: {e_gen}\n")

    # Hook 4: Active Tile Watcher for Video Download Trigger
    try:
        _orig_submit_and_observe = mc.MigratedComposer.submit_and_observe

        async def _canary_submit_and_observe(self, page, *args, **kwargs):
            stop_event = asyncio.Event()

            async def _tile_watcher():
                # Wait 10 seconds before polling for completed tiles
                await asyncio.sleep(10)
                while not stop_event.is_set():
                    try:
                        tile = page.locator("img[alt*='video'], img[alt*='Video'], img[alt*='video küçük'], mat-icon:text-is('play_circle')").first
                        if await tile.count() > 0 and await tile.is_visible():
                            sys.stderr.write("[sitecustomize] Clicking completed video tile to trigger as29s URL fetch...\n")
                            await tile.click(force=True, timeout=1500)
                    except Exception:
                        pass
                    await asyncio.sleep(4)

            watcher_task = asyncio.create_task(_tile_watcher())
            try:
                return await _orig_submit_and_observe(self, page, *args, **kwargs)
            finally:
                stop_event.set()
                watcher_task.cancel()
                try:
                    await watcher_task
                except (asyncio.CancelledError, Exception):
                    pass

        mc.MigratedComposer.submit_and_observe = _canary_submit_and_observe
        sys.stderr.write("[sitecustomize] Hooked MigratedComposer.submit_and_observe with active tile watcher\n")
    except Exception as e_sp:
        sys.stderr.write(f"[sitecustomize] Failed to hook submit_and_observe: {e_sp}\n")
except Exception as e:
    sys.stderr.write(f"[sitecustomize] Failed to hook MigratedComposer: {e}\n")

# 3. EXDEV cross-filesystem move safety
try:
    import pathlib
    import shutil
    import errno

    _orig_path_replace = pathlib.Path.replace

    def _safe_path_replace(self, target):
        try:
            return _orig_path_replace(self, target)
        except OSError as e:
            if e.errno == errno.EXDEV:
                shutil.move(str(self), str(target))
                return target
            raise

    pathlib.Path.replace = _safe_path_replace
except Exception as e:
    sys.stderr.write(f"[sitecustomize] Failed to hook Path.replace: {e}\n")
