"""Recover only the exact submitted video after a provider download timeout."""
import json
from pathlib import Path
import shutil
import subprocess
import re

def submitted_identity(output):
    records = set()
    for line in output.splitlines():
        try:
            item = json.loads(line)
        except (ValueError, TypeError):
            continue
        if item.get('event') == 'migrated.submit_observed_via_status':
            workflow, media = item.get('workflow_id'), item.get('media_id')
            if all(isinstance(value, str) and re.fullmatch(r'[a-fA-F0-9-]{36}', value) for value in (workflow, media)):
                records.add((workflow, media))
    return next(iter(records)) if len(records) == 1 else None

def recover_submitted_video(output, executable, account, project, destination, env, run=subprocess.run):
    identity = submitted_identity(output)
    if not identity:
        return False
    workflow, media = identity
    destination = Path(destination)
    result = run([executable, '-m', 'gflow_cli', 'data', 'download', media,
                  '--profile', account, '--out', str(destination.parent), '--json'],
                 env=env, capture_output=True, text=True, timeout=120, check=False)
    if result.returncode != 0 or len(result.stdout) > 1024 * 1024:
        return False
    for line in result.stdout.splitlines():
        try:
            receipt = json.loads(line)
        except ValueError:
            continue
        if (receipt.get('media_id'), receipt.get('workflow_id'), receipt.get('profile'), receipt.get('project_id')) != (media, workflow, account, project):
            continue
        source = Path(receipt.get('path', '')).resolve()
        if source.parent != destination.parent.resolve() or source.suffix != '.mp4' or not source.is_file():
            return False
        size = source.stat().st_size
        if size < 1024 or size != receipt.get('bytes'):
            return False
        if source != destination.resolve():
            shutil.copyfile(source, destination)
        return True
    return False
