'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const {isChatGPTPage}=require('../chatgpt_tab_scope');
const source=fs.readFileSync(path.join(__dirname,'../cdp_worker.js'),'utf8');
const start=source.indexOf('async function getTab(');const end=source.indexOf('let isTabLoggedIn',start);
assert.ok(start>=0 && end>start,'bounded production function extraction');
function setup(tabs,ownedId){
 let created=0;const bound=[];
 const context={cachedTabId:null,CDP_HTTP:'http://test.invalid',WORKER_ID:'chatgpt-1',TAB_INDEX:0,isChatGPTPage,sleep:async()=>{},console:{log:()=>{}},URL,
  reaper:{registry:{getWorkerCanonicalTab:()=>ownedId?{tabId:ownedId}:null,isCanonicalForAnyWorker:id=>id==='other-owned',hasActiveJob:()=>false,bindWorkerCanonical:(...args)=>bound.push(args)}},
  fetch:async url=>({json:async()=>url.includes('/json/new')?(created++,{id:'fresh',url:'https://chatgpt.com/',type:'page'}):tabs})};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 return {context,bound,created:()=>created};
}
test('worker reuses its persisted canonical target after restart despite tab reorder',async()=>{
 const s=setup([{id:'other-owned',url:'https://chatgpt.com/'},{id:'own',url:'https://chatgpt.com/c/owned'}],'own');
 assert.equal((await s.context.getTab('chatgpt.com')).id,'own');assert.equal(s.created(),0);
});
test('another worker canonical target cannot be assigned to this worker',async()=>{
 const s=setup([{id:'other-owned',url:'https://chatgpt.com/'}]);
 assert.equal((await s.context.getTab('chatgpt.com')).id,'fresh');assert.equal(s.created(),1);
});
test('lost owned target creates fresh tab without borrowing another worker tab',async()=>{
 const s=setup([{id:'other-owned',url:'https://chatgpt.com/'}],'lost');
 assert.equal((await s.context.getTab('chatgpt.com')).id,'fresh');assert.equal(s.bound[0][1],'fresh');
});
