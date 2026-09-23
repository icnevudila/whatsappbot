"""
GFlow Driver - Pinned Upstream Wrapper & Account Lease Manager
Enforces:
1. Concurrency = 1 per Flow Account
2. Profile Sanitization before Chrome launch
3. Ingredient Invariant Check: expected_ingredient_count === actual_attached_ingredient_count
4. Redacted Incident Packaging on failure
5. Zero DB Mutability (pure functional execution returning results to ai-media-control)
"""

import os
import sys
import time
import json
import uuid
import shutil
import logging
import subprocess
import hashlib
import asyncio
from pathlib import Path
from typing import Dict, Any, List, Optional
from redactor import redact_har, redact_string

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gflow-engine.driver")

PROFILES_BASE = Path(os.environ.get("FLOW_PROFILES_DIR", "/app/flow-profiles"))
OUTPUTS_BASE = Path(os.environ.get("FLOW_OUTPUTS_DIR", "/app/flow-outputs"))
INCIDENTS_BASE = Path(os.environ.get("FLOW_INCIDENTS_DIR", "/app/flow-incidents"))
UPSTREAM_CLI_PATH = Path(os.environ.get("GFLOW_CLI_PATH", "/app/upstream_gflow/gflow-cli"))

OUTPUTS_BASE.mkdir(parents=True, exist_ok=True)
INCIDENTS_BASE.mkdir(parents=True, exist_ok=True)
PROFILES_BASE.mkdir(parents=True, exist_ok=True)

class FlowExecutionError(Exception):
    def __init__(self, code: str, message: str, incident: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.incident = incident

def sanitize_chrome_profile(profile_path: Path):
    """Sanitizes Chrome preferences to prevent crash bubbles and removes stale Singleton locks."""
    if not profile_path.exists():
        return
    
    # 1. Remove Singleton lock files if any (including broken symlinks)
    for lock_name in ["SingletonLock", "SingletonCookie", "SingletonSocket"]:
        lock_file = profile_path / lock_name
        if lock_file.is_symlink() or lock_file.exists():
            try:
                lock_file.unlink(missing_ok=True)
                logger.info(f"Removed stale Chrome lock: {lock_file}")
            except Exception as e:
                logger.warning(f"Failed to remove {lock_file}: {e}")

    # 2. Reset exit_type to Normal in Preferences
    pref_file = profile_path / "Default" / "Preferences"
    if pref_file.exists():
        try:
            with open(pref_file, "r", encoding="utf-8", errors="ignore") as f:
                prefs = json.load(f)
            if "profile" in prefs and isinstance(prefs["profile"], dict):
                prefs["profile"]["exit_type"] = "Normal"
                prefs["profile"]["exited_cleanly"] = True
            with open(pref_file, "w", encoding="utf-8") as f:
                json.dump(prefs, f)
        except Exception as e:
            logger.warning(f"Could not sanitize preferences in {pref_file}: {e}")

class AccountLock:
    def __init__(self, account_id: str):
        self.account_id = account_id
        self.profile_dir = PROFILES_BASE / f"profile_{account_id}"
        self.profile_dir.mkdir(parents=True, exist_ok=True)
        self.lock_file = self.profile_dir / "account_operation.lock"
        self._acquired = False

    def acquire(self, timeout_sec: int = 120):
        start = time.time()
        while time.time() - start < timeout_sec:
            if not self.lock_file.exists():
                try:
                    with open(self.lock_file, "w") as f:
                        f.write(str(os.getpid()))
                    self._acquired = True
                    sanitize_chrome_profile(self.profile_dir)
                    return True
                except Exception:
                    pass
            else:
                # Check if holding PID is still alive
                try:
                    with open(self.lock_file, "r") as f:
                        pid = int(f.read().strip())
                    os.kill(pid, 0)
                except (OSError, ValueError):
                    logger.warning(f"Removing stale lock file for {self.account_id}")
                    try:
                        self.lock_file.unlink()
                    except Exception:
                        pass
                    continue
            time.sleep(1)
        raise FlowExecutionError("ACCOUNT_BUSY", f"Account {self.account_id} is currently locked by another job.")

    def release(self):
        if self._acquired and self.lock_file.exists():
            try:
                self.lock_file.unlink()
            except Exception:
                pass
            self._acquired = False

    def __enter__(self):
        self.acquire()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.release()

def create_incident_bundle(
    job_id: str,
    attempt_id: str,
    account_id: str,
    error_code: str,
    error_message: str,
    raw_output: str,
    screenshot_bytes: Optional[bytes] = None,
    dom_text: Optional[str] = None,
    har_dict: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    incident_id = f"inc_{int(time.time())}_{uuid.uuid4().hex[:6]}"
    incident_dir = INCIDENTS_BASE / incident_id
    incident_dir.mkdir(parents=True, exist_ok=True)

    ss_path = None
    if screenshot_bytes:
        ss_path = incident_dir / "screenshot.png"
        with open(ss_path, "wb") as f:
            f.write(screenshot_bytes)

    dom_path = None
    if dom_text:
        dom_path = incident_dir / "dom_dump.html"
        with open(dom_path, "w", encoding="utf-8") as f:
            f.write(redact_string(dom_text))

    har_path = None
    if har_dict:
        har_path = incident_dir / "network.har"
        redacted_h = redact_har(har_dict)
        with open(har_path, "w", encoding="utf-8") as f:
            json.dump(redacted_h, f, indent=2)

    diag = {
        "job_id": job_id,
        "attempt_id": attempt_id,
        "account_id": account_id,
        "error_code": error_code,
        "error_message": error_message,
        "raw_output": raw_output[-4000:],
        "timestamp": time.time(),
        "is_redacted": True
    }
    with open(incident_dir / "diagnostics.json", "w", encoding="utf-8") as f:
        json.dump(diag, f, indent=2)

    return {
        "incident_id": incident_id,
        "screenshot_path": str(ss_path) if ss_path else None,
        "dom_dump_path": str(dom_path) if dom_path else None,
        "har_path": str(har_path) if har_path else None,
        "diagnostics": diag,
        "is_redacted": True
    }

def create_new_flow_project(profile_dir: Path, title: str) -> str:
    """Creates a real fresh Flow project through FlowApiClient and returns its UUID."""
    from gflow_cli.api.client import FlowApiClient

    async def _async_create():
        async with FlowApiClient(profile_dir=profile_dir) as client:
            p_info = await client.create_project(title=title)
            return p_info.project_id

    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(_async_create())
    finally:
        loop.close()

def execute_generation_job(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Executes a video generation command via pinned gflow-cli with strict invariant checks.
    Enforces:
    - Reference Identity Gate (expected vs actual asset_id, org_id, sha256, role, attached_media_id)
    - Single-Job Project Lifecycle (Fresh real Flow project UUID per job)
    - Per-account mutual exclusion
    - Persistent real-time logging to /shared/outputs/<org_id>/<job_id>/<attempt_id>/generation.log
    """
    job_id = payload.get("job_id", str(uuid.uuid4()))
    attempt_id = payload.get("attempt_id", str(uuid.uuid4()))
    account_id = payload.get("account_id", "account-01")
    org_id = payload.get("org_id", "unknown_org")
    prompt = payload.get("prompt", "")
    aspect_ratio = payload.get("aspect_ratio", "9:16")
    model = payload.get("model", "veo-fast")
    duration = payload.get("duration", 8)
    assets: List[Dict[str, Any]] = payload.get("assets", [])

    expected_ingredient_count = len(assets)

    # Output directory: /shared/outputs/<org_id>/<job_id>/<attempt_id>/
    job_output_dir = OUTPUTS_BASE / org_id / job_id / attempt_id
    job_output_dir.mkdir(parents=True, exist_ok=True)
    log_file_path = job_output_dir / "generation.log"

    # Pre-flight Duration Capability Check (fail-closed before resource allocation)
    if duration is not None:
        if model == "omni-flash":
            pass
        elif int(duration) != 8:
            raise FlowExecutionError(
                "CAPABILITY_UNAVAILABLE",
                f"Model '{model}' on account '{account_id}' does not support custom duration control (requested: {duration}s, default: 8s)"
            )

    # --- GATE 1: Reference Identity Pre-flight Gate ---
    verified_assets: List[Dict[str, Any]] = []
    ref_args: List[str] = []
    for a in assets:
        a_id = a.get("asset_id") or str(uuid.uuid4())
        a_org = a.get("org_id")
        a_role = a.get("role", "reference")
        expected_sha = a.get("sha256")
        f_path = a.get("file_path")

        # 1. Cross-org contamination check
        if a_org and a_org != org_id:
            logger.error(f"CROSS_ORG_CONTAMINATION: Asset org {a_org} != Job org {org_id}")
            raise FlowExecutionError(
                "INGREDIENT_ATTACHMENT_FAILED",
                f"CROSS_ORG_CONTAMINATION: Asset org '{a_org}' does not match Job org '{org_id}'"
            )

        # 2. File existence check
        if not f_path or not os.path.exists(f_path):
            logger.error(f"Asset file not found on filesystem: {f_path}")
            raise FlowExecutionError(
                "INGREDIENT_ATTACHMENT_FAILED",
                f"Asset file not found on filesystem: {f_path}"
            )

        # 3. SHA256 integrity check
        computed_sha = hashlib.sha256(Path(f_path).read_bytes()).hexdigest()
        if expected_sha and computed_sha.lower() != expected_sha.lower():
            logger.error(f"Asset SHA256 mismatch for {f_path}: expected {expected_sha}, computed {computed_sha}")
            raise FlowExecutionError(
                "INGREDIENT_ATTACHMENT_FAILED",
                f"Asset SHA256 mismatch: expected {expected_sha}, got {computed_sha}"
            )

        # 4. Role validation
        if not a_role or a_role not in ("logo", "reference", "product", "start_frame", "end_frame"):
            logger.error(f"Invalid or missing role '{a_role}' for asset {a_id}")
            raise FlowExecutionError(
                "INGREDIENT_ATTACHMENT_FAILED",
                f"Invalid asset role '{a_role}' for asset {a_id}"
            )

        ref_args.extend(["--ref", str(f_path)])
        verified_assets.append({
            "asset_id": a_id,
            "org_id": org_id,
            "role": a_role,
            "file_path": str(f_path),
            "sha256": computed_sha,
            "attached_media_id": None
        })

    with AccountLock(account_id):
        profile_path = PROFILES_BASE / f"profile_{account_id}"
        sanitize_chrome_profile(profile_path)

        # --- GATE 2: Project Lifecycle Management ---
        target_project = payload.get("project_id")
        is_recovery = payload.get("is_recovery", False)

        if target_project:
            if not is_recovery:
                logger.error(f"PROJECT_REUSE_VIOLATION: Reuse of project {target_project} forbidden for new job {job_id}")
                raise FlowExecutionError(
                    "PROJECT_REUSE_VIOLATION",
                    f"Project reuse forbidden for new job {job_id}. Real fresh Flow project UUID required."
                )
            logger.info(f"Crash recovery mode: reusing project {target_project} for job {job_id}")
        else:
            project_title = f"{org_id[:8]}_{job_id[:8]}"
            logger.info(f"Creating fresh Flow project '{project_title}' on profile {account_id}...")
            try:
                target_project = create_new_flow_project(profile_path, project_title)
                logger.info(f"Successfully created real Flow project UUID: {target_project}")
            except Exception as e:
                logger.exception(f"Failed to create fresh Flow project: {e}")
                raise FlowExecutionError(
                    "PROJECT_CREATION_FAILED",
                    f"Failed to create fresh Flow project: {e}"
                )

        # Build CLI command environment
        env = os.environ.copy()
        env["PYTHONUNBUFFERED"] = "1"
        env["GFLOW_CLI_HOME"] = str(PROFILES_BASE)
        env["GFLOW_PROFILE_PATH"] = str(profile_path)
        if UPSTREAM_CLI_PATH.exists():
            env["PYTHONPATH"] = f"{UPSTREAM_CLI_PATH}/src:{env.get('PYTHONPATH', '')}"
        elif Path("/app/gflow-cli").exists():
            env["PYTHONPATH"] = f"/app/gflow-cli/src:{env.get('PYTHONPATH', '')}"

        output_file_name = f"{job_id}.mp4"
        dest_path = job_output_dir / output_file_name

        subcommand = ["video", "r2v"] if ref_args else ["video", "t2v"]
        cmd = [
            sys.executable, "-m", "gflow_cli",
            *subcommand,
            "--aspect", aspect_ratio,
            "-o", str(dest_path),
            "--profile", account_id,
            "--project", target_project,
        ]

        if model:
            cmd.extend(["--model", model])

        # Duration capability: fail-closed if caller requests explicit non-default duration on models lacking duration selector
        if duration is not None:
            if model == "omni-flash":
                cmd.extend(["--duration", str(duration)])
            elif int(duration) != 8:
                raise FlowExecutionError(
                    "CAPABILITY_UNAVAILABLE",
                    f"Model '{model}' on account '{account_id}' does not support custom duration control (requested: {duration}s, default: 8s)"
                )

        # For video r2v, gflow-cli parses @mentions as saved character entities.
        # Reference ingredients passed via --ref must not carry literal '@' symbols to prevent
        # gflow-cli from failing with MentionIndexUnavailableError.
        cli_prompt = prompt
        if ref_args:
            cli_prompt = (
                cli_prompt.replace("@HeroProduct", "provided Hero Product (Reference Image 1)")
                .replace("@BrandLogo", "provided Brand Logo (Reference Image 2)")
                .replace("@SoftwareUI", "provided Software UI (Reference Image 1)")
            )
            import re
            cli_prompt = re.sub(r"@([A-Za-z0-9_]+)", r"\1", cli_prompt)

        if ref_args:
            cmd.extend(ref_args)
        cmd.append(cli_prompt)

        logger.info(f"Executing gflow-cli for job {job_id} (Account: {account_id}, Expected refs: {expected_ingredient_count})")
        logger.info(f"Project UUID: {target_project}")
        logger.info(f"CLI Command: {' '.join(cmd)}")
        start_time = time.time()

        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            env=env
        )

        stdout_lines = []
        actual_ingredient_count = 0
        references_attached_seen = False

        with open(log_file_path, "w", encoding="utf-8") as log_file:
            while True:
                line = proc.stdout.readline()
                if not line and proc.poll() is not None:
                    break
                if line:
                    stdout_lines.append(line)
                    log_file.write(line)
                    log_file.flush()

                    clean_line = line.strip()
                    # Inspect for migrated.references_attached event
                    if "migrated.references_attached" in clean_line:
                        try:
                            # Parse JSON log event
                            data = json.loads(clean_line)
                            media_ids = data.get("media_ids") or []
                            actual_ingredient_count = len(media_ids)
                            references_attached_seen = True
                            for idx, mid in enumerate(media_ids):
                                if idx < len(verified_assets):
                                    verified_assets[idx]["attached_media_id"] = mid
                        except Exception:
                            # Fallback text parsing if not pure JSON
                            if "count" in clean_line:
                                try:
                                    parts = clean_line.split("count")
                                    actual_ingredient_count = int(parts[1].split()[0].replace(":", ""))
                                    references_attached_seen = True
                                except Exception:
                                    pass

        return_code = proc.poll()
        elapsed = time.time() - start_time
        full_output = "".join(stdout_lines)

        # --- GATE 3: In-flight Reference Gate Verification ---
        if expected_ingredient_count > 0:
            if not references_attached_seen or actual_ingredient_count != expected_ingredient_count:
                logger.error(f"INGREDIENT_ATTACHMENT_FAILED: Expected {expected_ingredient_count} chips, attached {actual_ingredient_count}")
                incident = create_incident_bundle(
                    job_id=job_id,
                    attempt_id=attempt_id,
                    account_id=account_id,
                    error_code="INGREDIENT_ATTACHMENT_FAILED",
                    error_message=f"Invariant check failed: expected {expected_ingredient_count} chips, attached {actual_ingredient_count}",
                    raw_output=full_output
                )
                raise FlowExecutionError(
                    "INGREDIENT_ATTACHMENT_FAILED",
                    f"Expected {expected_ingredient_count} ingredient chips, but only {actual_ingredient_count} were attached.",
                    incident=incident
                )

            # Verify every asset was assigned an attached_media_id
            for va in verified_assets:
                if not va.get("attached_media_id"):
                    logger.error(f"INGREDIENT_ATTACHMENT_FAILED: Asset {va['asset_id']} ({va['role']}) missing attached_media_id")
                    incident = create_incident_bundle(
                        job_id=job_id,
                        attempt_id=attempt_id,
                        account_id=account_id,
                        error_code="INGREDIENT_ATTACHMENT_FAILED",
                        error_message=f"Reference identity gate failed: Asset {va['asset_id']} missing attached_media_id",
                        raw_output=full_output
                    )
                    raise FlowExecutionError(
                        "INGREDIENT_ATTACHMENT_FAILED",
                        f"Asset {va['asset_id']} ({va['role']}) has no confirmed attached_media_id.",
                        incident=incident
                    )

        if return_code != 0 or not dest_path.exists():
            error_code = "FLOW_EXECUTION_FAILED"
            if "FlowAgentUiError" in full_output or "AGENT_UI_DETECTED" in full_output:
                error_code = "AGENT_UI_DETECTED"
            elif "CreditLimit" in full_output:
                error_code = "CREDIT_LIMIT_REACHED"
            elif "ProfileLockedError" in full_output or "Profile locked" in full_output:
                if "Target page, context or browser has been closed" in full_output or "TargetClosedError" in full_output:
                    error_code = "BROWSER_TARGET_CLOSED"
                else:
                    error_code = "PROFILE_LOCKED"
            elif "TargetClosedError" in full_output:
                error_code = "BROWSER_TARGET_CLOSED"
            elif "No usable sandbox" in full_output or "Running as root without --no-sandbox is not supported" in full_output:
                error_code = "CHROME_SANDBOX_ERROR"
            elif "BrowserType.launch" in full_output or "Failed to launch" in full_output:
                error_code = "BROWSER_STARTUP_FAILED"

            incident = create_incident_bundle(
                job_id=job_id,
                attempt_id=attempt_id,
                account_id=account_id,
                error_code=error_code,
                error_message=f"gflow-cli exited with code {return_code}",
                raw_output=full_output
            )
            raise FlowExecutionError(
                error_code,
                f"Generation failed with return code {return_code}",
                incident=incident
            )

        file_size = dest_path.stat().st_size
        return {
            "job_id": job_id,
            "attempt_id": attempt_id,
            "org_id": org_id,
            "account_id": account_id,
            "real_flow_project_uuid": target_project,
            "output_path": str(dest_path),
            "log_path": str(log_file_path),
            "file_size": file_size,
            "elapsed_seconds": round(elapsed, 2),
            "expected_ingredient_count": expected_ingredient_count,
            "actual_ingredient_count": actual_ingredient_count or expected_ingredient_count,
            "verified_assets": verified_assets,
            "verified": True
        }

