"""Exact-function guarded receipt deployment, idle workers only, with rollback bytes."""
import hashlib,json,subprocess,sys
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
 _,out,err=client.exec_command(cmd,timeout=25);result=out.read().decode(errors='replace')
 if out.channel.recv_exit_status()!=0:raise RuntimeError('REMOTE_COMMAND_FAILED')
 return result
def idle():
 h=json.loads(run("docker exec omnistudio-engine node -e 'fetch(\"http://127.0.0.1:3456/health\").then(r=>r.json()).then(x=>console.log(JSON.stringify({active:x.activeCount,pending:x.pending,busy:Object.values(x.workersStatus||{}).some(w=>w.isBusy)})))'"))
 return h['active']==0 and h['pending']==0 and not h['busy']
def norm(b):return b.decode('utf-8').replace('\r\n','\n')
def function(text,name='injectPromptAndSend'):
 start=text.index('async function '+name+'(')
 end=text.index('\nasync function ',start+1)
 return text[start:end]
try:
 client.connect(cfg['HETZNER_HOST'],username=cfg.get('HETZNER_USER','root'),password=cfg.get('HETZNER_PASSWORD'),timeout=15)
 sftp=client.open_sftp(); originals={}
 for name in ['cdp_worker.js','chatgpt_turn_scope.js','chat_navigation.js']:
  originals[name]=sftp.open(REMOTE+name,'rb').read()
 prior=subprocess.check_output(['git','show','HEAD:services/omnistudio/gateway/cdp_worker.js'],cwd=ROOT)
 prior_scope=subprocess.check_output(['git','show','HEAD:services/omnistudio/gateway/chatgpt_turn_scope.js'],cwd=ROOT)
 prior_navigation=subprocess.check_output(['git','show','HEAD:services/omnistudio/gateway/chat_navigation.js'],cwd=ROOT)
 matches=function(norm(originals['cdp_worker.js']))==function(norm(prior))
 scope_matches=norm(originals['chatgpt_turn_scope.js'])==norm(prior_scope)
 known_scope=subprocess.check_output(['git','show','5d5758f:services/omnistudio/gateway/chatgpt_turn_scope.js'],cwd=ROOT)
 known_scope_matches=norm(originals['chatgpt_turn_scope.js'])==norm(known_scope)
 generic_matches=function(norm(originals['cdp_worker.js']),'executeGenericChatJob')==function(norm(prior),'executeGenericChatJob')
 navigation_matches=norm(originals['chat_navigation.js'])==norm(prior_navigation)
 reviewed_worker=hashlib.sha256(originals['cdp_worker.js']).hexdigest()=='6150ca140c536b66e4d7b65f93b078ff18d47de17730665954e826e10f7be10f'
 reviewed_navigation=hashlib.sha256(originals['chat_navigation.js']).hexdigest()=='9cfcb663a4626a8b7cc2497df92424601f1b0aa91d1ce9db5952123842dc153e'
 print(json.dumps({'idle':idle(),'workerFunctionMatches':matches,'genericFunctionMatches':generic_matches,'navigationMatches':navigation_matches,'scopeMatches':scope_matches,'knownFallbackScopeMatches':known_scope_matches,'remoteHashes':{k:hashlib.sha256(v).hexdigest() for k,v in originals.items()}}))
 if '--activate' not in sys.argv:sys.exit(0)
 if not matches or not (generic_matches or reviewed_worker) or not (navigation_matches or reviewed_navigation) or not (scope_matches or known_scope_matches):raise RuntimeError('REMOTE_PREIMAGE_MISMATCH')
 if not idle():raise RuntimeError('WORKER_NOT_IDLE')
 pids=run("docker exec omnistudio-engine pgrep -f '^node .*cdp_worker.js.*--worker-id=chatgpt-[12]'").split()
 if not pids or any(not pid.isdigit() for pid in pids):raise RuntimeError('WORKER_PID_AMBIGUOUS')
 for pid in pids:run('docker exec omnistudio-engine kill -STOP '+pid);paused.append(pid)
 if not idle():raise RuntimeError('QUEUE_CHANGED')
 for name,data in originals.items():
  if sftp.open(REMOTE+name,'rb').read()!=data:raise RuntimeError('REMOTE_SOURCE_CHANGED')
 candidate=norm(originals['cdp_worker.js']).replace(function(norm(prior)),function((ROOT/'services/omnistudio/gateway/cdp_worker.js').read_text(encoding='utf-8')))
 candidate=candidate.replace(function(norm(originals['cdp_worker.js']),'executeGenericChatJob'),function((ROOT/'services/omnistudio/gateway/cdp_worker.js').read_text(encoding='utf-8'),'executeGenericChatJob'))
 if function(norm(originals['cdp_worker.js']),'getTab')!=function(norm(prior),'getTab'):raise RuntimeError('TAB_SELECTION_PREIMAGE_MISMATCH')
 candidate=candidate.replace(function(norm(prior),'getTab'),function((ROOT/'services/omnistudio/gateway/cdp_worker.js').read_text(encoding='utf-8'),'getTab'))
 anchor="const { captureTurnBaseline, readCurrentTurn } = require('./chatgpt_turn_scope.js');"
 if candidate.count(anchor)!=1:raise RuntimeError('IMPORT_PREIMAGE_MISMATCH')
 receipt_import="const { observePromptAcceptance, waitForPromptAcceptance } = require('./prompt_acceptance.js');"
 if receipt_import not in candidate:candidate=candidate.replace(anchor,anchor+'\n'+receipt_import)
 payloads={'cdp_worker.js':candidate.encode(),'chatgpt_turn_scope.js':(ROOT/'services/omnistudio/gateway/chatgpt_turn_scope.js').read_bytes(),'prompt_acceptance.js':(ROOT/'services/omnistudio/gateway/prompt_acceptance.js').read_bytes(),'chat_navigation.js':(ROOT/'services/omnistudio/gateway/chat_navigation.js').read_bytes()}
 try:
  if sftp.open(REMOTE+'prompt_acceptance.js','rb').read()!=payloads['prompt_acceptance.js']:raise RuntimeError('HELPER_CONFLICT')
 except FileNotFoundError:pass
 backup='/opt/whatsappbot/.deployment-backups/prompt-receipt-20261010/'+hashlib.sha256(originals['cdp_worker.js']).hexdigest()[:12]+'/'
 run('mkdir -p '+backup)
 for name,data in originals.items():
  with sftp.open(backup+name,'wb') as f:f.write(data)
 for name,data in payloads.items():
  with sftp.open(REMOTE+name+'.receipt-stage.js','wb') as f:f.write(data)
  run('docker exec omnistudio-engine node --check /app/gateway/'+name+'.receipt-stage.js')
 for name in ['prompt_acceptance.js','chatgpt_turn_scope.js','chat_navigation.js','cdp_worker.js']:
  sftp.posix_rename(REMOTE+name+'.receipt-stage.js',REMOTE+name)
 for pid in paused:
  run('docker exec omnistudio-engine kill -TERM '+pid)
  run('docker exec omnistudio-engine kill -CONT '+pid)
 paused=[]
 print(json.dumps({'deployment':'APPLIED','files':list(payloads),'hashes':{k:hashlib.sha256(v).hexdigest() for k,v in payloads.items()},'liveAcceptance':'NOT_VERIFIED'}))
except Exception as e:
 print(json.dumps({'deployment':'HELD','reason':str(e) if isinstance(e,RuntimeError) else type(e).__name__}));sys.exit(1)
finally:
 for pid in paused:run('docker exec omnistudio-engine kill -CONT '+pid)
 client.close()
