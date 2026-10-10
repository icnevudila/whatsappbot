'use strict';
// Read-only release compatibility checks; credentials remain private and are never logged.
const fs=require('node:fs');
const path=require('node:path');
const cfg={};
const root='C:/Users/TP2/Documents/whatsapp';
for(const p of [path.join(root,'.env'),path.join(root,'apps/customer/.env.local')]){
 if(!fs.existsSync(p))continue;
 for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){
  const m=line.match(/^([A-Z0-9_]+)=(.*)$/);if(m)cfg[m[1]]=m[2].trim().replace(/^['"]|['"]$/g,'');
 }
}
(async()=>{
 const url=cfg.NEXT_PUBLIC_SUPABASE_URL||cfg.SUPABASE_URL;
 const key=cfg.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key){console.log(JSON.stringify({configuration:'MISSING',urlPresent:!!url,keyPresent:!!key}));process.exitCode=1;return;}
 const headers={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
 // Null IDs cannot match a creative/output/job and therefore cannot approve anything.
 const rpc=await fetch(url+'/rest/v1/rpc/approve_creative_video_review',{method:'POST',headers,signal:AbortSignal.timeout(15000),body:JSON.stringify({p_org:null,p_creative:null,p_output:null,p_sha:null,p_updated:null,p_reviewer:null})});
 const value=await rpc.json();
 const bucket=await fetch(url+'/storage/v1/bucket/creatives',{headers,signal:AbortSignal.timeout(15000)});
 const b=await bucket.json();
 console.log(JSON.stringify({atomicReviewRpc:{status:rpc.status,available:rpc.ok&&value===false,errorCode:value?.code||null},creativeBucket:{status:bucket.status,public:b.public??null},providerCredentials:{geminiPresent:!!cfg.GEMINI_API_KEY,openAiPresent:!!cfg.OPENAI_API_KEY}}));
})().catch(e=>{console.log(JSON.stringify({error:e.name}));process.exitCode=1;});
