"""Patch only reviewed uncertainty guards, with idle gate and byte backups."""
import hashlib,json,subprocess,sys,time
from pathlib import Path
import paramiko
ROOT=Path(__file__).resolve().parent.parent
REMOTE='/opt/whatsappbot/services/omnistudio/gateway/'
cfg={}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
 if '=' in line and not line.lstrip().startswith('#'):
  k,v=line.split('=',1);cfg[k.strip()]=v.strip().strip('"\'')
client=paramiko.SSHClient();client.load_system_host_keys();client.set_missing_host_key_policy(paramiko.RejectPolicy())
paused=[]
def run(cmd):
 _,out,err=client.exec_command(cmd,timeout=25);value=out.read().decode(errors='replace')
 if out.channel.recv_exit_status()!=0:raise RuntimeError('REMOTE_COMMAND_FAILED')
 return value
def idle():
 return json.loads(run("docker exec omnistudio-engine node -e 'fetch(\"http://127.0.0.1:3456/health\").then(r=>r.json()).then(x=>console.log(JSON.stringify({active:x.activeCount,pending:x.pending,busy:Object.values(x.workersStatus||{}).some(w=>w.isBusy)})))'"))
def check_idle():
 h=idle()
 if h['active']!=0 or h['pending']!=0 or h['busy']:raise RuntimeError('QUEUE_NOT_IDLE')
def function(s):
 start=s.index('async function executeGenericChatJob(');end=s.index('\nasync function ',start+1)
 return s[start:end]
try:
 client.connect(cfg['HETZNER_HOST'],username=cfg.get('HETZNER_USER','root'),password=cfg.get('HETZNER_PASSWORD'),timeout=15)
 sftp=client.open_sftp();originals={n:sftp.open(REMOTE+n,'rb').read() for n in ['server.js','cdp_worker.js']}
 worker=originals['cdp_worker.js'].decode().replace('\r\n','\n')
 if hashlib.sha256(originals['cdp_worker.js']).hexdigest()!='ed48ec085054b75ba22d31ad4e5f9e6d6e6754eebc6d1653ef3398be622f78f3':raise RuntimeError('WORKER_PREIMAGE_CHANGED')
 server=originals['server.js'].decode().replace('\r\n','\n')
 old="if (job.type === 'image' && error && String(error).includes('SUBMISSION_UNCERTAIN'))"
 if server.count(old)!=1:raise RuntimeError('SERVER_GUARD_PREIMAGE_CHANGED')
 candidate=server.replace(old,"if (error && String(error).includes('SUBMISSION_UNCERTAIN'))")
 local=(ROOT/'services/omnistudio/gateway/cdp_worker.js').read_text(encoding='utf-8')
 payloads={'server.js':candidate.encode(),'cdp_worker.js':worker.replace(function(worker),function(local)).encode()}
 print(json.dumps({'health':idle(),'preimageHashes':{k:hashlib.sha256(v).hexdigest() for k,v in originals.items()}}))
 if '--activate' not in sys.argv:sys.exit(0)
 check_idle()
 pids=run("docker exec omnistudio-engine pgrep -f '^node .*cdp_worker.js.*--worker-id=chatgpt-[12]'").split()
 if not pids or any(not x.isdigit() for x in pids):raise RuntimeError('WORKER_PID_AMBIGUOUS')
 for pid in pids:run('docker exec omnistudio-engine kill -STOP '+pid);paused.append(pid)
 check_idle()
 for n,b in originals.items():
  if sftp.open(REMOTE+n,'rb').read()!=b:raise RuntimeError('SOURCE_CHANGED')
 backup='/opt/whatsappbot/.deployment-backups/text-uncertainty-20261010/'+hashlib.sha256(originals['server.js']).hexdigest()[:12]+'/'
 run('mkdir -p '+backup)
 for n,b in originals.items():
  with sftp.open(backup+n,'wb') as f:f.write(b)
 for n,b in payloads.items():
  with sftp.open(REMOTE+n+'.uncertainty-stage.js','wb') as f:f.write(b)
  run('docker exec omnistudio-engine node --check /app/gateway/'+n+'.uncertainty-stage.js')
 server_pids=run("docker exec omnistudio-engine pgrep -f '^node .*server.js$'").split()
 if len(server_pids)!=1 or not server_pids[0].isdigit():raise RuntimeError('SERVER_PID_AMBIGUOUS')
 for n in payloads:sftp.posix_rename(REMOTE+n+'.uncertainty-stage.js',REMOTE+n)
 run('docker exec omnistudio-engine kill -TERM '+server_pids[0])
 for pid in paused:run('docker exec omnistudio-engine kill -TERM '+pid);run('docker exec omnistudio-engine kill -CONT '+pid)
 paused=[]
 print(json.dumps({'deployment':'APPLIED','hashes':{k:hashlib.sha256(v).hexdigest() for k,v in payloads.items()},'browserRetest':'PENDING'}))
except Exception as e:
 print(json.dumps({'deployment':'HELD','reason':str(e) if isinstance(e,RuntimeError) else type(e).__name__}));sys.exit(1)
finally:
 for pid in paused:run('docker exec omnistudio-engine kill -CONT '+pid)
 client.close()
