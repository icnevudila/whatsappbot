"""
Central Launch Configuration Helper for Playwright (Phase 1 Canary).
Activates ONLY when GFLOW_CHROME_NO_SANDBOX=1.
Ensures:
1. --no-sandbox and --disable-dev-shm-usage are injected centrally into Playwright
2. ignoreDefaultArgs doesn't strip --no-sandbox
3. MigratedComposer._exit_agent_mode handles Google Flow's new panel close button
   and Agent pill toggle without touching upstream source files.
"""
import os
import sys
import asyncio

if os.environ.get("GFLOW_CHROME_NO_SANDBOX") == "1":
    try:
        from playwright._impl._browser_type import BrowserType
        _orig_impl_lpc = BrowserType.launch_persistent_context

        async def _canary_impl_lpc(self, *args, **kwargs):
            # 1. Clean ignoreDefaultArgs so Playwright doesn't filter out --no-sandbox
            ida = kwargs.get("ignoreDefaultArgs")
            if isinstance(ida, (list, tuple)):
                kwargs["ignoreDefaultArgs"] = [x for x in ida if x != "--no-sandbox"]

            # 2. Add --no-sandbox and --disable-dev-shm-usage to args
            curr_args = list(kwargs.get("args") or [])
            if "--no-sandbox" not in curr_args:
                curr_args.append("--no-sandbox")
            if "--disable-dev-shm-usage" not in curr_args:
                curr_args.append("--disable-dev-shm-usage")
            kwargs["args"] = curr_args

            # 3. Explicitly disable chromiumSandbox
            kwargs["chromiumSandbox"] = False

            return await _orig_impl_lpc(self, *args, **kwargs)

        BrowserType.launch_persistent_context = _canary_impl_lpc
    except Exception as e:
        sys.stderr.write(f"[sitecustomize] Failed to patch BrowserType: {e}\n")

try:
    from gflow_cli.api.transports.migrated_composer import MigratedComposer
    _orig_exit_agent_mode = MigratedComposer._exit_agent_mode

    @classmethod
    async def _canary_exit_agent_mode(cls, page):
        # 1. Close the right agent session panel if open
        try:
            close_btn = page.locator("button").filter(has=page.locator("mat-icon:text-is('close')")).first
            if await close_btn.count() > 0 and await close_btn.is_visible():
                await close_btn.click(timeout=3000)
                await asyncio.sleep(0.5)
        except Exception:
            pass

        # 2. Toggle off the Agent pill button if present
        try:
            agent_btn = page.locator("button:has-text('Agent')").first
            if await agent_btn.count() > 0 and await agent_btn.is_visible():
                await agent_btn.click(timeout=3000)
                await asyncio.sleep(0.5)
                return "clicked", None
        except Exception:
            pass

        return await _orig_exit_agent_mode(page)

    MigratedComposer._exit_agent_mode = _canary_exit_agent_mode
except Exception as e:
    sys.stderr.write(f"[sitecustomize] Failed to hook MigratedComposer: {e}\n")

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

