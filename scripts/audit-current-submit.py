"""Read-only, redacted worker receipt diagnosis; never creates a provider job."""
import json, re, sys, shlex
from pathlib import Path
import paramiko
values={}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        k,v=line.split('=',1); values[k.strip()]=v.strip().strip('"\'')
client=paramiko.SSHClient();client.load_system_host_keys();client.set_missing_host_key_policy(paramiko.RejectPolicy())
try:
    client.connect(values['HETZNER_HOST'],username=values.get('HETZNER_USER','root'),password=values.get('HETZNER_PASSWORD'),timeout=15)
    if '--job' in sys.argv:
        job_id=sys.argv[sys.argv.index('--job')+1]
        if not re.fullmatch(r'job_[a-f0-9]{16}',job_id):raise ValueError('Invalid job ID')
        js="fetch('http://127.0.0.1:3456/v1/images/status/"+job_id+"').then(r=>r.json()).then(x=>console.log(JSON.stringify({id:x.id,status:x.status,error:x.error,reconciliation:x.reconciliation_required,sha256:x.result_sha256,expectedReferences:x.expected_reference_count,receipt:x.reference_receipt,telemetry:x.telemetry})))"
        _,out,err=client.exec_command('docker exec omnistudio-engine node -e '+shlex.quote(js),timeout=20)
        print(out.read().decode());sys.exit(0)
    command="docker exec omnistudio-engine sh -c 'find /var/log -maxdepth 1 -type f -name \"*.log\" -print'"
    _,out,err=client.exec_command(command,timeout=20)
    paths=out.read().decode().splitlines()
    records=[]
    for path in paths:
        if not re.fullmatch(r'/var/log/(?:server|cdp_worker_[12])\.log',path):continue
        _,out,err=client.exec_command('docker exec omnistudio-engine tail -n 150 '+path,timeout=20)
        for line in out.read().decode(errors='replace').splitlines():
            if any(x in line for x in ['SUBMISSION_UNCERTAIN','accepted','YENİ İŞ','jobId','Send was','completed','CHAT_NAVIGATION_FAILED','WebSocket','CDP Error','Başlatılıyor','Bağlandı']):
                line=re.sub(r'https?://\S+','[URL]',line)
                records.append({'file':path,'event':line[:400]})
    print(json.dumps(records,ensure_ascii=True))
finally:client.close()
