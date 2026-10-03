const test=require('node:test');
const assert=require('node:assert/strict');
const {observeOwnedImage}=require('../image_observation_recovery');
function fixture(state={ready:true,foundImgSrc:'blob:owned-output'}) {
  const job={id:'job-a',assignedTo:'worker-a',prompt:'approved prompt',referenceReceipt:{job_id:'job-a',worker_id:'worker-a',target_id:'target-a'}};
  let owner='job-a',closed=false;
  const requests=[];
  const cdp={send:async(method,args)=>{
    assert.equal(method,'Runtime.evaluate');
    assert.doesNotMatch(args.expression,/\.click\(|Page\.navigate|insertText|setFileInputFiles/);
    return {result:{value:args.expression==='window.__mesajifyImageOwnerJobId'?owner:args.expression.startsWith('(async()=>')?'data:image/png;base64,aW1hZ2U=':state}};
  },close:()=>{closed=true}};
  return {job,tab:{id:'target-a'},cdp,gatewayUrl:'http://gateway',sleep:async()=>{},maxChecks:1,
    fetchImpl:async(url,options)=>{requests.push({url,options});return {ok:true}},
    requests,setOwner:value=>{owner=value},isClosed:()=>closed};
}
test('owned completed target delivers existing bytes without a new provider submit',async()=>{
  const f=fixture();assert.deepEqual(await observeOwnedImage(f),{completed:true});
  assert.equal(f.requests.length,1);assert.match(f.requests[0].url,/\/upload\?jobId=job-a&/);
  assert.equal(f.requests[0].options.body.toString(),'image');assert.equal(f.isClosed(),true);
});
test('still-generating target is bounded and never submitted again',async()=>{
  const f=fixture({ready:false,isGenerating:true});assert.deepEqual(await observeOwnedImage(f),{completed:false});
  assert.equal(f.requests.length,0);assert.equal(f.isClosed(),true);
});
test('changed page owner or target refuses output and closes the connection',async()=>{
  for(const kind of ['owner','target']) {
    const f=fixture();if(kind==='owner')f.setOwner('other-job');else f.tab.id='other-target';
    await assert.rejects(observeOwnedImage(f),/OWNER_MISMATCH/);assert.equal(f.requests.length,0);assert.equal(f.isClosed(),true);
  }
});
