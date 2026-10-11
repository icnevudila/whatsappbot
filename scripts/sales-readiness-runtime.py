"""Read-only production inventory; no env values, customer records or log bodies."""
import json
import sys
import shlex
from pathlib import Path
from datetime import datetime, timezone
import paramiko

root = Path(__file__).resolve().parents[1]
values = {}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('\"\'')
remote = r'''
import json, subprocess, urllib.request, hashlib, pathlib
def command(args):
    p = subprocess.run(args, capture_output=True, text=True, timeout=25)
    return {'exit':p.returncode, 'output':p.stdout[:18000]}
result={'timestamp':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat()}
result['memory']=pathlib.Path('/proc/meminfo').read_text()
result['load']=pathlib.Path('/proc/loadavg').read_text()
result['disk']=command(['df','-B1','/'])
result['stats']=command(['docker','stats','--no-stream','--format','{{json .}}'])
names=subprocess.check_output(['docker','ps','--format','{{.Names}}'],text=True).splitlines()
result['containers']=[]
for name in names:
    c=json.loads(subprocess.check_output(['docker','inspect',name],text=True))[0]
    h=c['HostConfig']; s=c['State']
    result['containers'].append({'name':name,'image':c['Config']['Image'],'image_id':c['Image'],
      'started_at':s['StartedAt'],'status':s['Status'],'health':s.get('Health',{}).get('Status'),
      'oom_killed':s['OOMKilled'],'restart_count':c['RestartCount'],'restart_policy':h['RestartPolicy'],
      'memory_limit':h['Memory'],'pids_limit':h.get('PidsLimit'),'log_config':h['LogConfig'],
      'ports':c['NetworkSettings']['Ports'],'networks':list(c['NetworkSettings']['Networks']),
      'mounts':[{'type':m['Type'],'source':m['Source'],'destination':m['Destination'],'rw':m['RW']} for m in c['Mounts']],
      'healthcheck_configured':bool(c['Config'].get('Healthcheck'))})
    if name=='omnistudio-engine':
      env=dict(item.split('=',1) for item in c['Config'].get('Env',[]) if '=' in item)
      result['gateway_config_presence']={key:bool(env.get(key)) for key in ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_SERVICE_KEY','SENTRY_DSN']}
try:
    health=json.load(urllib.request.urlopen('http://127.0.0.1:3456/health',timeout=5))
    allowed=['status','ai_ready','pending','activeCount','queued_jobs','total','completed','failed']
    result['gateway_health']={key:health.get(key) for key in allowed}
    result['gateway_health']['workers']=[{'id':key,'status':value.get('status')} for key,value in health.get('workersStatus',{}).items()]
except Exception as error:
    result['gateway_health']={'status':'NOT_VERIFIED','error_type':type(error).__name__}
result['private_output_head_checks']=[]
for filename in ['audit_security_events.json','video_1789992411766_flow_meta.json']:
    req=urllib.request.Request('http://127.0.0.1:3456/outputs/'+filename,method='HEAD')
    try:
      response=urllib.request.urlopen(req,timeout=5)
      result['private_output_head_checks'].append({'filename':filename,'status':response.status,'content_length':response.headers.get('Content-Length')})
    except urllib.error.HTTPError as error:
      result['private_output_head_checks'].append({'filename':filename,'status':error.code})
    except Exception as error:
      result['private_output_head_checks'].append({'filename':filename,'status':'NOT_VERIFIED','error_type':type(error).__name__})
result['source_hashes']={}
for relative in ['services/omnistudio/gateway/server.js','services/omnistudio/gateway/cdp_worker.js','infra/docker-compose.yml']:
    p=pathlib.Path('/opt/whatsappbot')/relative
    if p.exists():result['source_hashes'][relative]=hashlib.sha256(p.read_bytes()).hexdigest()
lease=pathlib.Path('/opt/whatsappbot/services/omnistudio/gateway/distributed_lease_store.js')
if lease.exists():
    text=lease.read_text()
    result['lease_source']={'sha256':hashlib.sha256(lease.read_bytes()).hexdigest(),'has_simulator_fallback':'this.simulator = new SharedDatabaseSimulator()' in text,'has_unconditional_upsert':'.upsert({' in text}
sql="""
SELECT json_build_object(
 'database_version',version(),
 'connections',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database()),
 'connection_limit',current_setting('max_connections'),
 'rls_tables',(SELECT json_agg(row_to_json(t)) FROM (SELECT schemaname,tablename,rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('organizations','org_members','contacts','campaigns','creatives','jobs','ai_media_jobs','ai_media_assets','accounts','message_log')) t),
 'rls_policy_counts',(SELECT json_agg(row_to_json(p)) FROM (SELECT tablename,count(*) policy_count FROM pg_policies WHERE schemaname='public' GROUP BY tablename ORDER BY tablename) p),
 'job_states',(SELECT json_agg(row_to_json(j)) FROM (SELECT status,count(*) FROM public.jobs GROUP BY status) j),
 'video_states',(SELECT json_agg(row_to_json(v)) FROM (SELECT state,count(*) FROM public.ai_media_jobs GROUP BY state) v)
) audit
"""
node='const pg=require("pg"); const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:5000,statement_timeout:5000}); pool.query('+json.dumps(sql)+').then(r=>console.log(JSON.stringify(r.rows[0].audit))).catch(e=>{console.log(JSON.stringify({status:"NOT_VERIFIED",error_code:e.code||"DB_FAILURE"}));process.exitCode=1}).finally(()=>pool.end());'
result['database_audit']=command(['docker','exec','ai-media-control','node','-e',node])
print(json.dumps(result))
'''
client=paramiko.SSHClient()
client.load_system_host_keys()
client.set_missing_host_key_policy(paramiko.RejectPolicy())
try:
    client.connect(values['HETZNER_HOST'],username=values.get('HETZNER_USER','root'),password=values.get('HETZNER_PASSWORD'),timeout=15)
    _,out,err=client.exec_command('python3 -c '+shlex.quote(remote),timeout=60)
    body=out.read().decode()
    status=out.channel.recv_exit_status()
    if status: raise RuntimeError('REMOTE_INVENTORY_FAILED')
    result=json.loads(body)
    target=root/'docs/sales-readiness/evidence/runtime-inventory.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({'status':'collected','containers':len(result['containers']),'file':str(target)}))
except Exception as error:
    print(json.dumps({'status':'NOT_VERIFIED','error_type':type(error).__name__}))
    sys.exit(1)
finally:
    client.close()
