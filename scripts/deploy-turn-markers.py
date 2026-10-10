"""Idle-only deployment of reviewed nested-turn/identical-prompt regressions."""
import hashlib,json,sys
from pathlib import Path
import paramiko
ROOT=Path(__file__).resolve().parent.parent
REMOTE='/opt/whatsappbot/services/omnistudio/gateway/'
expected={'chatgpt_turn_scope.js':'dde426bc1815f37cec8257260db89ddcc463b5231c34f8c2e38cae760aee3435','prompt_acceptance.js':'6027cd933de3336ec48741027845109586477a18a90a5c59aaf1725aa0ed56ee'}
cfg={}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);cfg[k.strip()]=v.strip().strip('"\'')
client=paramiko.SSHClient();client.load_system_host_keys();client.set_missing_host_key_policy(paramiko.RejectPolicy());paused=[]
def run(cmd):
 _,out,err=client.exec_command(cmd,timeout=25);value=out.read().decode(errors='replace')
 if out.channel.recv_exit_status()!=0:raise RuntimeError('REMOTE_COMMAND_FAILED')
 return value
def idle():
 h=json.loads(run("docker exec omnistudio-engine node -e 'fetch(\"http://127.0.0.1:3456/health\").then(r=>r.json()).then(x=>console.log(JSON.stringify({active:x.activeCount,pending:x.pending,busy:Object.values(x.workersStatus||{}).some(w=>w.isBusy)})))'"))
 if h['active']!=0 or h['pending']!=0 or h['busy']:raise RuntimeError('QUEUE_NOT_IDLE')
try:
 client.connect(cfg['HETZNER_HOST'],username=cfg.get('HETZNER_USER','root'),password=cfg.get('HETZNER_PASSWORD'),timeout=15)
 sftp=client.open_sftp();old={n:sftp.open(REMOTE+n,'rb').read() for n in expected}
 for n,b in old.items():
  if hashlib.sha256(b).hexdigest()!=expected[n]:raise RuntimeError('PREIMAGE_CHANGED')
 idle()
 if '--activate' not in sys.argv:print(json.dumps({'preimages':'MATCH','queue':'IDLE'}));sys.exit(0)
 pids=run("docker exec omnistudio-engine pgrep -f '^node .*cdp_worker.js.*--worker-id=chatgpt-[12]'").split()
 if not pids or any(not x.isdigit() for x in pids):raise RuntimeError('WORKER_PID_AMBIGUOUS')
 for pid in pids:run('docker exec omnistudio-engine kill -STOP '+pid);paused.append(pid)
 idle();backup='/opt/whatsappbot/.deployment-backups/turn-markers-20261010/'
 run('mkdir -p '+backup)
 for n,b in old.items():
  if sftp.open(REMOTE+n,'rb').read()!=b:raise RuntimeError('SOURCE_CHANGED')
  with sftp.open(backup+n,'wb') as f:f.write(b)
  with sftp.open(REMOTE+n+'.marker-stage.js','wb') as f:f.write((ROOT/'services/omnistudio/gateway'/n).read_bytes())
  run('docker exec omnistudio-engine node --check /app/gateway/'+n+'.marker-stage.js')
 for n in old:sftp.posix_rename(REMOTE+n+'.marker-stage.js',REMOTE+n)
 for pid in paused:run('docker exec omnistudio-engine kill -TERM '+pid);run('docker exec omnistudio-engine kill -CONT '+pid)
 paused=[]
 print(json.dumps({'deployment':'APPLIED','hashes':{n:hashlib.sha256((ROOT/'services/omnistudio/gateway'/n).read_bytes()).hexdigest() for n in old},'liveRetest':'PENDING'}))
except Exception as e:
 print(json.dumps({'deployment':'HELD','reason':str(e) if isinstance(e,RuntimeError) else type(e).__name__}));sys.exit(1)
finally:
 for pid in paused:run('docker exec omnistudio-engine kill -CONT '+pid)
 client.close()
