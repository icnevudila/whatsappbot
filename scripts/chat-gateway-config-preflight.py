"""Read-only gateway credential presence audit; never prints secret values."""
import json
from pathlib import Path
import paramiko

values = {}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('"\'')
print(json.dumps({'local_config_present': {key: bool(values.get(key)) for key in ['CHATGPT_API_KEY', 'OMNISTUDIO_GATEWAY_TOKEN', 'WORKER_CONTROL_TOKEN']}}))
client = paramiko.SSHClient()
client.load_system_host_keys()
client.set_missing_host_key_policy(paramiko.RejectPolicy())
try:
    client.connect(values['HETZNER_HOST'], username=values.get('HETZNER_USER', 'root'), password=values.get('HETZNER_PASSWORD'), timeout=15)
    command = """docker exec -w /app/gateway omnistudio-engine node -e 'const fs=require("fs");let h={};try{h=JSON.parse(fs.readFileSync("/tmp/gateway-health.json","utf8"))}catch{};console.log(JSON.stringify({envPresent:{chat:!!process.env.CHATGPT_API_KEY,control:!!process.env.WORKER_CONTROL_TOKEN},tokenFilesPresent:{chat:fs.existsSync(".chatgpt_api_key"),control:fs.existsSync(".worker_control_token")}}));fetch("http://127.0.0.1:3456/health").then(r=>r.json()).then(x=>console.log(JSON.stringify({active:x.activeCount,pending:x.pending,workersBusy:Object.values(x.workersStatus||{}).some(w=>w.isBusy)})))'"""
    _, output, error = client.exec_command(command, timeout=15)
    print(output.read().decode('utf-8'))
    print(json.dumps({'exit': output.channel.recv_exit_status()}))
except Exception as error:
    print(json.dumps({'error_type': type(error).__name__}))
finally:
    client.close()
