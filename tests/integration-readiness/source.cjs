'use strict';
const {execFileSync} = require('node:child_process');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'../..');
const refs = {master:'374c0381d8bd309ccb275e3712533784cc9a044e',sales:'17b8eb765b408784a7ac11ed4ef3974c7281cc0f',research:'73a0fd730c41c2f843794eb05d9762168215b088'};
if(process.env.AUDIT_SALES_SHA){
  if(!['17b8eb765b408784a7ac11ed4ef3974c7281cc0f','0f7af781f3dd72471ce8ab8ee0cd68dbc5a2203a'].includes(process.env.AUDIT_SALES_SHA))throw new Error('Unknown audit snapshot; review and explicitly pin it first.');
  refs.sales=process.env.AUDIT_SALES_SHA;
}
function source(branch,file) {
  return execFileSync('git',['show',`${refs[branch]}:${file}`],{cwd:root,encoding:'utf8',maxBuffer:30e6});
}
function loadCommonJS(branch,file,environment={},dependencies={}) {
  const module={exports:{}};
  const sandbox={module,exports:module.exports,require:id=>dependencies[id] || require(id),process:{env:environment},Buffer,URL,console};
  vm.runInNewContext(source(branch,file),sandbox,{filename:`${refs[branch]}:${file}`});
  return module.exports;
}
module.exports={source,refs,loadCommonJS,root};
