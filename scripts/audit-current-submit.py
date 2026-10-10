"""Read-only, redacted worker receipt diagnosis; never creates a provider job."""
import json, re
from pathlib import Path
import paramiko
values={}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k,v=line.split('=',1); values[k.strip()]=v.strip().strip('"\'')
client=paramiko.SSHClient();client.load_system_host_keys();client.set_missing_host_key_policy(paramiko.RejectPolicy())
try:
    client.connect(values['HETZNER_HOST'],username=values.get('HETZNER_USER','root'),password=values.get('HETZNER_PASSWORD'),timeout=15)
    command="docker exec omnistudio-engine sh -c 'find /var/log -maxdepth 1 -type f -name \"*.log\" -print'"
    _,out,err=client.exec_command(command,timeout=20)
    paths=out.read().decode().splitlines()
    records=[]
    for path in paths:
        if not re.fullmatch(r'/var/log/(?:server|cdp_worker_[12])\.log',path):continue
        _,out,err=client.exec_command('docker exec omnistudio-engine tail -n 150 '+path,timeout=20)
        for line in out.read().decode(errors='replace').splitlines():
            if any(x in line for x in ['SUBMISSION_UNCERTAIN','accepted','YENİ İŞ','jobId','Send was','completed','CHAT_NAVIGATION_FAILED']):
                line=re.sub(r'https?://\S+','[URL]',line)
                records.append({'file':path,'event':line[:400]})
    print(json.dumps(records,ensure_ascii=True))
finally:client.close()
