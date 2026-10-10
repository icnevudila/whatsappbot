'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {waitForPromptAcceptance}=require('../prompt_acceptance');
test('late receipt is observed without a second submission',async()=>{
 let time=0,observations=0;
 const accepted=await waitForPromptAcceptance(async()=>++observations===9,{timeoutMs:3000,now:()=>time,sleep:async ms=>{time+=ms}});
 assert.equal(accepted,true);assert.equal(observations,9);assert.equal(time,2000);
});
test('unknown acceptance remains uncertain at bounded deadline',async()=>{
 let time=0;
 assert.equal(await waitForPromptAcceptance(async()=>false,{timeoutMs:1000,now:()=>time,sleep:async ms=>{time+=ms}}),false);
 assert.equal(time,1000);
});
test('observation disconnect propagates without retrying submission',async()=>{
 await assert.rejects(waitForPromptAcceptance(async()=>{throw Error('disconnected')}),/disconnected/);
});
