"""Read-only runtime inventory. Never prints credentials or container environments."""
import json
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
try:
    client.connect(values['HETZNER_HOST'], username=values.get('HETZNER_USER', 'root'),
                   password=values.get('HETZNER_PASSWORD'), timeout=15, auth_timeout=15)
    commands = {
        'containers': "docker ps --format '{{.Names}} | {{.Image}} | {{.Status}}'",
        'server_revision': 'git -C /opt/whatsappbot rev-parse HEAD',
        'ai_control_liveness': 'curl --max-time 5 -fsS http://127.0.0.1:3460/health',
        'whatsapp_readiness': 'curl --max-time 5 -fsS http://127.0.0.1:8080/ready',
        'flow_liveness': 'docker exec gflow-engine curl --max-time 5 -fsS http://127.0.0.1:3461/health',
        'resources': "docker stats --no-stream --format '{{.Name}} | {{.CPUPerc}} | {{.MemUsage}}'",
        'queue_duplicate_preflight': """docker exec ai-media-control node -e 'const pg=require("pg");const p=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});p.query("select count(*)::int as duplicate_groups from (select org_id,payload->>$$creative_id$$ from public.jobs where type=$$creative.render$$ and status in ($$pending$$,$$claimed$$,$$running$$) and payload->>$$creative_id$$ is not null group by org_id,payload->>$$creative_id$$ having count(*)>1) d").then(r=>console.log(JSON.stringify(r.rows))).catch(e=>{console.log(JSON.stringify({error_code:e.code||"DB_CHECK_FAILED"}));process.exitCode=1}).finally(()=>p.end())'""",
        'recent_video_jobs': """docker exec ai-media-control node -e 'const pg=require("pg");const p=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});p.query("select id,state,created_at,updated_at from public.ai_media_jobs order by created_at desc limit 3").then(r=>console.log(JSON.stringify(r.rows))).catch(e=>console.log(JSON.stringify({error_code:e.code}))).finally(()=>p.end())'""",
        'disk': 'df -h / --output=size,used,avail,pcent 2>/dev/null',
        'customer_release_compatibility': """docker exec ai-media-control node -e 'const pg=require("pg");const p=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});p.query("select to_regprocedure($$public.approve_creative_video_review(uuid,uuid,uuid,text,timestamp with time zone,uuid)$$) is not null as atomic_review_present, (select public from storage.buckets where id=$$creatives$$) as creative_bucket_public").then(r=>console.log(JSON.stringify(r.rows))).catch(e=>{console.log(JSON.stringify({error_code:e.code||"DB_CHECK_FAILED"}));process.exitCode=1}).finally(()=>p.end())'""",
    }
    for label, command in commands.items():
        _, stdout, stderr = client.exec_command(command, timeout=15)
        output = stdout.read().decode('utf-8', errors='replace')[:6000]
        print(json.dumps({'check': label, 'exit': stdout.channel.recv_exit_status(), 'output': output}))
except Exception as error:
    print(json.dumps({'runtime_audit': 'NOT_VERIFIED', 'error_type': type(error).__name__}))
finally:
    client.close()
