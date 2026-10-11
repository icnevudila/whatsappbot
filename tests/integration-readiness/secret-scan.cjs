'use strict';
// Scan only this audit delivery. Print location/rule, never matched secret bytes.
const {execFileSync} = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve(__dirname,'../..');
const scopes=['docs/integration-readiness','tests/integration-readiness'];
const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--',...scopes],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(Boolean);
const rules=[
  ['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['live-stripe-key',/sk_live_[a-zA-Z0-9]{12,}/],
  ['github-token',/(?:ghp_|github_pat_)[a-zA-Z0-9_]{20,}/],
  ['openai-key',/sk-(?:proj-)?[a-zA-Z0-9_-]{40,}/],
  ['credential-url',/postgres(?:ql)?:\/\/[^\s:]+:[^\s@]+@/],
  ['jwt',/eyJ[a-zA-Z0-9_-]{15,}\.[a-zA-Z0-9_-]{15,}\.[a-zA-Z0-9_-]{15,}/]
];
let violations=0;
for(const file of new Set(files)) {
  const absolute=path.join(root,file);
  if(!fs.existsSync(absolute))continue;
  fs.readFileSync(absolute,'utf8').split('\n').forEach((line,index)=>{
    for(const [name,rule] of rules) if(rule.test(line)){console.error(`${file}:${index+1} ${name}`);violations++;}
  });
}
console.log(`Audit delivery secret scan: ${files.length} files, ${violations} findings. Not a historical repository secret audit.`);
process.exitCode=violations?1:0;
