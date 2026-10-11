'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync,spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/integration-readiness/evidence');
const previous='17b8eb765b408784a7ac11ed4ef3974c7281cc0f',current='0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a';
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:20e6}).trim();
const pairs=[];
for(const [role,other] of [['master','374c0381d8bd309ccb275e3712533784cc9a044e'],['research','73a0fd730c41c2f843794eb05d9762168215b088']]){
  const r=spawnSync('git',['merge-tree','--write-tree','--name-only',other,current],{cwd:root,encoding:'utf8',maxBuffer:20e6});
  if(![0,1].includes(r.status))throw new Error(r.stderr);
  pairs.push({a:role,b:'sales-follow-up',status:r.status===0?'CLEAN_TEXT_MERGE':'CONFLICT',raw:r.stdout});
}
fs.writeFileSync(path.join(out,'sales-follow-up.json'),JSON.stringify({capturedAt:new Date().toISOString(),previous,current,changed:git('diff','--name-only',`${previous}..${current}`).split('\n'),pairs},null,2)+'\n');
console.log(JSON.stringify({previous,current,pairs:pairs.map(({a,b,status})=>({a,b,status}))},null,2));
