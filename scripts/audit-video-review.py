"""Apply tested additive review RPC only when absent; never overwrite another deployment."""
import json,shlex
from pathlib import Path
import paramiko
ROOT=Path(__file__).resolve().parent.parent
cfg={}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);cfg[k.strip()]=v.strip().strip('"\'')
client=paramiko.SSHClient();client.load_system_host_keys();client.set_missing_host_key_policy(paramiko.RejectPolicy())
try:
 client.connect(cfg['HETZNER_HOST'],username=cfg.get('HETZNER_USER','root'),password=cfg.get('HETZNER_PASSWORD'),timeout=15)
 js='const pg=require(\'pg\');const p=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});Promise.all([p.query("select id,org_id,status,format,payload->>\'job_id\' as job_id from creatives where id=\'2e228656-8ffb-55f1-a9de-48568f36e00f\'"),p.query("select visual_qa_report->\'combined_review\' as review from ai_media_outputs where job_id=\'2e228656-8ffb-55f1-a9de-48568f36e00f\'")]).then(rs=>console.log(JSON.stringify(rs.map(r=>r.rows)))).catch(e=>console.log(JSON.stringify({error:e.code}))).finally(()=>p.end())'
 _,out,err=client.exec_command('docker exec ai-media-control node -e '+shlex.quote(js),timeout=20)
 print(out.read().decode());raise SystemExit(out.channel.recv_exit_status())
finally:client.close()
