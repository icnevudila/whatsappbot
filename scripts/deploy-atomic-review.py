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
 sql=(ROOT/'supabase/migrations/20261010094815_atomic_video_review.sql').read_text(encoding='utf-8')
 js="""const pg=require('pg');const p=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});(async()=>{const c=await p.connect();try{await c.query('begin');await c.query('select pg_advisory_xact_lock(20261010,94815)');const q=await c.query("select to_regprocedure('public.approve_creative_video_review(uuid,uuid,uuid,text,timestamp with time zone,uuid)') is not null as present");if(q.rows[0].present)throw new Error('FUNCTION_ALREADY_PRESENT');await c.query(SQL_INPUT);await c.query('commit');const v=await c.query("select to_regprocedure('public.approve_creative_video_review(uuid,uuid,uuid,text,timestamp with time zone,uuid)') is not null as present");console.log(JSON.stringify({applied:true,verified:v.rows[0].present}));}catch(e){await c.query('rollback');console.log(JSON.stringify({applied:false,error:e.code||e.message}));process.exitCode=1;}finally{c.release();await p.end();}})();""".replace('SQL_INPUT',json.dumps(sql))
 _,out,err=client.exec_command('docker exec ai-media-control node -e '+shlex.quote(js),timeout=30)
 print(out.read().decode());raise SystemExit(out.channel.recv_exit_status())
finally:client.close()
