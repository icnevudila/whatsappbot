"""Idle-only scoped chat configuration repair. Secret output must be privately captured."""
import argparse, hashlib, json, secrets, time
from pathlib import Path
import paramiko

values = {}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('"\'')
client = paramiko.SSHClient()
client.load_system_host_keys()
client.set_missing_host_key_policy(paramiko.RejectPolicy())
remote = '/opt/whatsappbot/services/omnistudio/gateway/'
parser = argparse.ArgumentParser()
parser.add_argument('--private-result',action='store_true',help='Only for private tool capture; includes the generated credential.')
options = parser.parse_args()
def run(command):
    _, out, err = client.exec_command(command, timeout=20)
    result = out.read().decode('utf-8')
    if out.channel.recv_exit_status() != 0: raise RuntimeError('REMOTE_COMMAND_FAILED')
    return result
def idle():
    data = json.loads(run("docker exec omnistudio-engine node -e 'fetch(\"http://127.0.0.1:3456/health\").then(r=>r.json()).then(x=>console.log(JSON.stringify({active:x.activeCount,pending:x.pending,busy:Object.values(x.workersStatus||{}).some(w=>w.isBusy)})))'"))
    return data.get('active') == 0 and data.get('pending') == 0 and data.get('busy') is False
try:
    client.connect(values['HETZNER_HOST'],username=values.get('HETZNER_USER','root'),password=values.get('HETZNER_PASSWORD'),timeout=15)
    sftp = client.open_sftp()
    exclude = '/opt/whatsappbot/.git/info/exclude'
    existing = sftp.open(exclude,'r').read().decode('utf-8')
    additions = [name for name in ['.chatgpt_api_key','.worker_control_token'] if name not in existing.splitlines()]
    if additions:
        with sftp.open(exclude,'a') as file: file.write('\n'+'\n'.join(additions)+'\n')
    if not idle(): raise RuntimeError('GATEWAY_NOT_IDLE')
    original = sftp.open(remote+'server.js','rb').read()
    sha = hashlib.sha256(original).hexdigest()
    before = 'const configuredApiKey = process.env.CHATGPT_API_KEY;'
    after = "const configuredApiKey = process.env.CHATGPT_API_KEY || (() => { try { return fs.readFileSync(path.join(__dirname, '.chatgpt_api_key'), 'utf8').trim(); } catch { return ''; } })();"
    source = original.decode('utf-8')
    if source.count(before) != 1: raise RuntimeError('SOURCE_PREIMAGE_MISMATCH')
    try:
        key = sftp.open(remote+'.chatgpt_api_key','r').read().decode().strip()
    except FileNotFoundError:
        key = secrets.token_urlsafe(48)
        with sftp.open(remote+'.chatgpt_api_key','wx') as file: file.write(key+'\n')
        sftp.chmod(remote+'.chatgpt_api_key',0o600)
    if not key and sftp.stat(remote+'.chatgpt_api_key').st_size == 0:
        key = secrets.token_urlsafe(48)
        sftp.chmod(remote+'.chatgpt_api_key',0o600)
        with sftp.open(remote+'.chatgpt_api_key','w') as file: file.write(key+'\n')
    if len(key) < 40: raise RuntimeError('INVALID_KEY_FILE')
    backup = remote+'server.js.chat-key-backup-'+sha
    try: sftp.stat(backup)
    except FileNotFoundError:
        with sftp.open(backup,'wx') as file: file.write(original)
        sftp.chmod(backup,0o600)
    staged = remote+'server.chat-key-staged.js'
    with sftp.open(staged,'w') as file: file.write(source.replace(before,after,1))
    run('docker exec omnistudio-engine node --check /app/gateway/server.chat-key-staged.js')
    if not idle() or sftp.open(remote+'server.js','rb').read() != original: raise RuntimeError('GATEWAY_CHANGED_HOLD')
    pid = run("docker exec omnistudio-engine pgrep -f '^node server.js$'").strip()
    if not pid.isdigit(): raise RuntimeError('AMBIGUOUS_GATEWAY_PID')
    sftp.posix_rename(staged,remote+'server.js')
    run('docker exec omnistudio-engine kill -TERM '+pid)
    time.sleep(12)
    health = idle()
    print(json.dumps({'ok':True,**({'key':key} if options.private_result else {}),'backup_sha256':sha,'idle_after':health}))
except Exception as error:
    print(json.dumps({'ok':False,'error_type':type(error).__name__,'reason':str(error) if isinstance(error,RuntimeError) else 'CONFIG_DEPLOY_FAILED'}))
finally: client.close()
