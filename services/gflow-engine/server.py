"""
GFlow Engine — Internal-Only FastAPI REST Service
Port: 3461 (Docker internal network only, no public exposure)
Role: Wraps pinned gflow-cli v0.79.1 for AI video generation.
      Returns results/events to ai-media-control. NEVER writes to DB.
"""

import asyncio
import os
import logging
import platform
import time
from pathlib import Path
from typing import Any, Dict, List, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from driver import (
    execute_generation_job,
    FlowExecutionError,
    PROFILES_BASE,
    OUTPUTS_BASE,
    INCIDENTS_BASE,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("gflow-engine.server")

# Per-account locks: each Flow account gets concurrency=1,
# but different accounts can generate simultaneously.
# DO NOT use a global semaphore — that would serialize all accounts.
_account_locks: Dict[str, asyncio.Semaphore] = {}

def get_account_lock(account_id: str) -> asyncio.Semaphore:
    """Get or create a concurrency=1 semaphore for a specific Flow account."""
    if account_id not in _account_locks:
        _account_locks[account_id] = asyncio.Semaphore(1)
    return _account_locks[account_id]

start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("GFlow Engine starting on port 3461 (internal-only)")
    logger.info(f"Profiles: {PROFILES_BASE}")
    logger.info(f"Outputs: {OUTPUTS_BASE}")
    logger.info(f"Incidents: {INCIDENTS_BASE}")
    yield
    logger.info("GFlow Engine shutting down")


app = FastAPI(
    title="GFlow Engine",
    description="Internal Flow video generation engine. Not publicly accessible.",
    version="1.0.0",
    lifespan=lifespan,
)


# --- Request/Response Models ---

class AssetPayload(BaseModel):
    asset_id: Optional[str] = None
    org_id: Optional[str] = None
    role: str = "reference"
    file_path: str
    sha256: Optional[str] = None

class GenerateRequest(BaseModel):
    job_id: str
    attempt_id: str
    org_id: str
    account_id: str = "account-01"
    prompt: str
    aspect_ratio: str = "9:16"
    model: str = "veo-fast"
    duration: int = 8
    project_id: Optional[str] = None
    is_recovery: bool = False
    assets: List[AssetPayload] = Field(default_factory=list)

class GenerateResponse(BaseModel):
    job_id: str
    attempt_id: str
    org_id: str
    account_id: str
    real_flow_project_uuid: str
    output_path: str
    log_path: str
    file_size: int
    elapsed_seconds: float
    expected_ingredient_count: int
    actual_ingredient_count: int
    verified_assets: List[Dict[str, Any]] = Field(default_factory=list)
    verified: bool


class ErrorResponse(BaseModel):
    error: bool = True
    code: str
    message: str
    incident: Optional[Dict[str, Any]] = None


# --- Endpoints ---

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "gflow-engine",
        "uptime_seconds": round(time.time() - start_time, 1),
        "profiles_dir": str(PROFILES_BASE),
        "outputs_dir": str(OUTPUTS_BASE),
    }


@app.post("/v1/jobs/execute", response_model=GenerateResponse)
async def execute_job(req: GenerateRequest):
    """Execute a video generation job via pinned gflow-cli.
    Concurrency=1 PER ACCOUNT — different accounts can run in parallel."""
    account_lock = get_account_lock(req.account_id)

    if account_lock.locked():
        raise HTTPException(
            status_code=429,
            detail=f"Account {req.account_id} is already processing a job. Per-account concurrency=1 enforced."
        )

    async with account_lock:
        try:
            payload = {
                "job_id": req.job_id,
                "attempt_id": req.attempt_id,
                "org_id": req.org_id,
                "account_id": req.account_id,
                "prompt": req.prompt,
                "aspect_ratio": req.aspect_ratio,
                "model": req.model,
                "duration": req.duration,
                "project_id": req.project_id,
                "is_recovery": req.is_recovery,
                "assets": [a.model_dump() for a in req.assets],
            }

            # Run in thread pool to avoid blocking the event loop
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, execute_generation_job, payload)
            return GenerateResponse(**result)

        except FlowExecutionError as e:
            logger.error(f"FlowExecutionError [{req.account_id}]: {e.code} — {e.message}")
            raise HTTPException(
                status_code=422,
                detail={
                    "error": True,
                    "code": e.code,
                    "message": e.message,
                    "incident": e.incident,
                }
            )
        except Exception as e:
            logger.exception(f"Unexpected error [{req.account_id}]: {e}")
            raise HTTPException(
                status_code=500,
                detail={
                    "error": True,
                    "code": "INTERNAL_ERROR",
                    "message": str(e),
                }
            )


@app.get("/v1/accounts")
async def list_accounts():
    """Returns status of all flow accounts based on filesystem profile directories."""
    accounts = []
    if PROFILES_BASE.exists():
        for profile_dir in sorted(PROFILES_BASE.iterdir()):
            if profile_dir.is_dir() and profile_dir.name.startswith("profile_"):
                account_id = profile_dir.name.replace("profile_", "")
                lock_file = profile_dir / "account_operation.lock"
                is_busy = lock_file.exists()

                accounts.append({
                    "id": account_id,
                    "profile_path": str(profile_dir),
                    "status": "busy" if is_busy else "idle",
                    "lock_file_exists": is_busy,
                    "profile_size_mb": round(sum(f.stat().st_size for f in profile_dir.rglob("*") if f.is_file()) / 1024 / 1024, 1),
                })
    return {"accounts": accounts}


@app.post("/v1/accounts/{account_id}/refresh")
async def refresh_account(account_id: str):
    """Trigger a session refresh for a specific account (placeholder)."""
    profile_path = PROFILES_BASE / f"profile_{account_id}"
    if not profile_path.exists():
        raise HTTPException(status_code=404, detail=f"Profile not found: {account_id}")

    return {
        "account_id": account_id,
        "status": "refresh_requested",
        "message": "Session refresh will occur on next job execution.",
    }


@app.get("/v1/workers/health")
async def workers_health():
    """Returns host system health metrics."""
    try:
        import psutil
        cpu = psutil.cpu_percent(interval=0.5)
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/app" if os.path.exists("/app") else "/")

        # Find Chrome processes
        chrome_pids = []
        for proc in psutil.process_iter(["pid", "name"]):
            if "chrom" in (proc.info["name"] or "").lower():
                chrome_pids.append(proc.info["pid"])

        return {
            "host": platform.node(),
            "cpu_percent": cpu,
            "ram_total_gb": round(mem.total / 1024**3, 1),
            "ram_used_gb": round(mem.used / 1024**3, 1),
            "ram_percent": mem.percent,
            "disk_total_gb": round(disk.total / 1024**3, 1),
            "disk_free_gb": round(disk.free / 1024**3, 1),
            "disk_percent": disk.percent,
            "chrome_pids": chrome_pids,
            "chrome_count": len(chrome_pids),
            "uptime_seconds": round(time.time() - start_time, 1),
            "busy_accounts": [aid for aid, lock in _account_locks.items() if lock.locked()],
            "total_accounts_seen": len(_account_locks),
        }
    except ImportError:
        return {
            "host": platform.node(),
            "error": "psutil not installed",
            "uptime_seconds": round(time.time() - start_time, 1),
            "busy_accounts": [aid for aid, lock in _account_locks.items() if lock.locked()],
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3461, log_level="info")
