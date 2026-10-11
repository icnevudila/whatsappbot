"""Authorized bounded live HTTP probes. No writes, AI jobs, payments or messages."""
import json, shlex, sys
from pathlib import Path
import paramiko

root = Path(__file__).resolve().parents[1]
values = {}
for line in Path(r'C:\Users\TP2\Documents\whatsapp\.env').read_text(encoding='utf-8-sig').splitlines():
    if '=' in line and not line.lstrip().startswith('#'):
        key, value = line.split('=', 1)
        values[key.strip()] = value.strip().strip('\"\'')
remote = r'''
import concurrent.futures, urllib.request, urllib.error, time, json, pathlib, subprocess, math
def snapshot():
    mem=dict((line.split(':')[0],int(line.split()[1])) for line in pathlib.Path('/proc/meminfo').read_text().splitlines() if len(line.split())>=2 and line.split()[1].isdigit())
    stats=subprocess.run(['docker','stats','--no-stream','--format','{{json .}}'],capture_output=True,text=True,timeout=15)
    return {'mem_available_kib':mem['MemAvailable'],'swap_free_kib':mem['SwapFree'],'load':pathlib.Path('/proc/loadavg').read_text().strip(),'containers':[json.loads(x) for x in stats.stdout.splitlines() if x.startswith('{')]}
def request(url):
    start=time.perf_counter()
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mesajify-Readiness-Controlled-Probe/1.0'}),timeout=8) as r:
            r.read(65536)
            return {'status':r.status,'ms':(time.perf_counter()-start)*1000,'timeout':False}
    except urllib.error.HTTPError as e:
        return {'status':e.code,'ms':(time.perf_counter()-start)*1000,'timeout':False}
    except Exception as e:
        return {'status':None,'ms':(time.perf_counter()-start)*1000,'timeout':isinstance(e,TimeoutError),'error_type':type(e).__name__}
def pct(xs,p):return sorted(xs)[max(0,math.ceil(len(xs)*p)-1)]
result={'scope':'real bounded HTTP requests; health endpoints and unauthenticated customer entry only; NOT authenticated user/tenant capacity','timestamp':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'stages':[]}
endpoints={'gateway_health':'http://127.0.0.1:3456/health','wa_ready':'http://127.0.0.1:8080/ready','customer_entry':'https://app.mesajify.com/'}
for concurrency in [5,10,30,50]:
    before=snapshot()
    if before['mem_available_kib']<350000:
        result['stopped']='MEMORY_HEADROOM_BELOW_350MB';break
    stage={'concurrency':concurrency,'before':before,'endpoints':{}}
    for label,url in endpoints.items():
        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
            rows=list(pool.map(request,[url]*(concurrency*2)))
        times=[r['ms'] for r in rows]
        errors=sum(r['status'] is None or r['status']>=400 for r in rows)
        stage['endpoints'][label]={'requests':len(rows),'mean_ms':sum(times)/len(times),'p95_ms':pct(times,.95),'p99_ms':pct(times,.99),'errors':errors,'timeouts':sum(r['timeout'] for r in rows),'statuses':{str(s):sum(r['status']==s for r in rows) for s in set(r['status'] for r in rows)}}
        if errors/len(rows)>.05 or pct(times,.95)>5000:
            result['stopped']='ERROR_RATE_ABOVE_5_PERCENT_OR_P95_ABOVE_5S';break
        time.sleep(1)
    stage['after']=snapshot();result['stages'].append(stage)
    if result.get('stopped'):break
    time.sleep(2)
result['recovery_health']={label:request(url) for label,url in endpoints.items()}
print(json.dumps(result))
'''
client=paramiko.SSHClient()
recovery_only = '--recovery-only' in sys.argv
if recovery_only:
    remote = remote.replace('for concurrency in [5,10,30,50]:', 'for concurrency in []:')
client.load_system_host_keys()
client.set_missing_host_key_policy(paramiko.RejectPolicy())
try:
    client.connect(values['HETZNER_HOST'],username=values.get('HETZNER_USER','root'),password=values.get('HETZNER_PASSWORD'),timeout=15)
    _,out,err=client.exec_command('python3 -c '+shlex.quote(remote),timeout=240)
    body=out.read().decode()
    if out.channel.recv_exit_status():raise RuntimeError('LIVE_LOAD_COLLECTION_FAILED')
    result=json.loads(body)
    target=root/'docs/sales-readiness/evidence'/('live-http-recovery.json' if recovery_only else 'live-http-load.json')
    target.write_text(json.dumps(result,indent=2),encoding='utf-8')
    print(json.dumps({'file':str(target),'stopped':result.get('stopped'),'stages':[{'concurrency':s['concurrency'],'endpoints':s['endpoints']} for s in result['stages']]}))
finally:
    client.close()
