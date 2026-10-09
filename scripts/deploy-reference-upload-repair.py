"""Scoped, idle-only upload repair. Preserves remote edits; no provider submission."""
import hashlib
import json
import re
from pathlib import Path
import paramiko

ROOT = Path(__file__).resolve().parent.parent
EXPECTED = '8572a048e3eeba8552035450667a2cde77d4514099bc3a958e8776237626068c'
REMOTE = '/opt/whatsappbot/services/omnistudio/gateway/'
values = {}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('"\'')
client = paramiko.SSHClient()
client.load_system_host_keys()
client.set_missing_host_key_policy(paramiko.RejectPolicy())
paused = None

def run(command):
    _, output, error = client.exec_command(command, timeout=20)
    value = output.read().decode('utf-8', errors='replace')
    if output.channel.recv_exit_status() != 0:
        raise RuntimeError('REMOTE_COMMAND_FAILED')
    return value

def health():
    return json.loads(run("docker exec omnistudio-engine node -e 'fetch(\"http://127.0.0.1:3456/health\").then(r=>r.json()).then(x=>console.log(JSON.stringify({active:x.activeCount,pending:x.pending,workers:x.workersStatus})))'"))

def idle(state):
    return state['active'] == 0 and state['pending'] == 0 and not any(w.get('isBusy') for w in state['workers'].values())

def replace_once(text, before, after):
    if text.count(before) != 1:
        raise RuntimeError('SOURCE_PREIMAGE_MISMATCH')
    return text.replace(before, after, 1)

try:
    client.connect(values['HETZNER_HOST'], username=values.get('HETZNER_USER', 'root'), password=values.get('HETZNER_PASSWORD'), timeout=15)
    if not idle(health()):
        raise RuntimeError('WORKER_NOT_IDLE')
    sftp = client.open_sftp()
    original = sftp.open(REMOTE + 'cdp_worker.js', 'rb').read()
    if hashlib.sha256(original).hexdigest() != EXPECTED:
        raise RuntimeError('REMOTE_SOURCE_CHANGED')
    text = original.decode('utf-8')
    text = replace_once(text, "const { readComposerAttachments } = require('./image_reference_gate.js');", "const { readComposerAttachments } = require('./image_reference_gate.js');\nconst { findImageUploadInput } = require('./image_upload_input.js');")
    old_picker = '''            fileInput = await cdp.send('DOM.querySelector', {
              nodeId: doc.root.nodeId,
              selector: 'input[type="file"][accept*="image"], input[type="file"]'
            }, 5000).catch(() => null);'''
    candidate = (ROOT / 'services/omnistudio/gateway/cdp_worker.js').read_text(encoding='utf-8')
    picker_start = candidate.index("            const selected = (await cdp.send('Runtime.evaluate', {")
    picker_end = candidate.index('            if (fileInput?.nodeId) break;', picker_start)
    text = replace_once(text, old_picker, candidate[picker_start:picker_end].rstrip())
    pattern = r'          const dispatchFileEvents = async \(\) => \{.*?\n          \};'
    text, count = re.subn(pattern, '', text, flags=re.S)
    if count != 1 or text.count('await dispatchFileEvents();') != 2:
        raise RuntimeError('EVENT_PREIMAGE_MISMATCH')
    text = text.replace('await dispatchFileEvents();', '// Native file-selection events only; no duplicate synthetic change.')
    clean_old = "                const btns = Array.from(document.querySelectorAll('button')).filter(b => {"
    clean_start = candidate.index('                const editor = document.querySelector', candidate.index('const cleanComposerAttachments'))
    clean_end = candidate.index('                  const label', clean_start)
    text = replace_once(text, clean_old, candidate[clean_start:clean_end].rstrip())
    failure_old = "            if (!attachmentsVerified) throw new Error('REFERENCE_ATTACHMENT_FAILED: all requested references were not confirmed in the composer');"
    fail_start = candidate.index('            if (!attachmentsVerified) {')
    fail_end = candidate.index("            workerTiming.mark('reference_upload_ms'", fail_start)
    text = replace_once(text, failure_old, candidate[fail_start:fail_end].rstrip())
    text = replace_once(text, '            let retriedDispatch = false;', '            let retriedDispatch = false;\n            let lastAttachmentObservation = null;')
    text = replace_once(text, '              const res = hasThumb.result?.value;', "              const res = hasThumb.result?.value;\n              lastAttachmentObservation = res && typeof res === 'object' ? { count: res.count, ready: res.ready } : null;")
    helper = (ROOT / 'services/omnistudio/gateway/image_upload_input.js').read_bytes()
    try:
        existing = sftp.open(REMOTE + 'image_upload_input.js', 'rb').read()
        if existing != helper:
            raise RuntimeError('REMOTE_HELPER_ALREADY_EXISTS')
    except FileNotFoundError:
        pass
    pid = run("docker exec omnistudio-engine pgrep -f '^node .*cdp_worker.js.*--worker-id=chatgpt-1'").strip()
    if not pid.isdigit():
        raise RuntimeError('AMBIGUOUS_WORKER_PID')
    run('docker exec omnistudio-engine kill -STOP ' + pid)
    paused = pid
    if not idle(health()):
        raise RuntimeError('QUEUE_CHANGED_DURING_PAUSE')
    if hashlib.sha256(sftp.open(REMOTE + 'cdp_worker.js', 'rb').read()).hexdigest() != EXPECTED:
        raise RuntimeError('REMOTE_SOURCE_CHANGED_DURING_PAUSE')
    backup = '/opt/whatsappbot/.deployment-backups/reference-upload-20261009/'
    run('mkdir -p ' + backup)
    with sftp.open(backup + EXPECTED + '.js', 'wb') as f:
        f.write(original)
    with sftp.open(REMOTE + 'image_upload_input.js', 'wb') as f:
        f.write(helper)
    staged = REMOTE + 'cdp_worker.reference-upload-stage.js'
    with sftp.open(staged, 'wb') as f:
        f.write(text.encode('utf-8'))
    run('docker exec omnistudio-engine node --check /app/gateway/cdp_worker.reference-upload-stage.js')
    sftp.posix_rename(staged, REMOTE + 'cdp_worker.js')
    run('docker exec omnistudio-engine kill -KILL ' + pid)
    paused = None
    print(json.dumps({'deployed_source_sha256': hashlib.sha256(text.encode('utf-8')).hexdigest(), 'backup_sha256': EXPECTED, 'worker_restart': 'idle worker only; existing supervisor will respawn', 'real_acceptance': 'NOT_VERIFIED'}))
except Exception as error:
    print(json.dumps({'deployment': 'HELD', 'reason': str(error) if isinstance(error, RuntimeError) else type(error).__name__}))
finally:
    if paused:
        run('docker exec omnistudio-engine kill -CONT ' + paused)
    client.close()
