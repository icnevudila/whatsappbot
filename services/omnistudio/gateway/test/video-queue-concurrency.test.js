'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {VideoJobQueue} = require('../server');

test('ten tenants queue behind two lanes, finish once, and retain their own outputs', async()=>{
  const queue=new VideoJobQueue(2);
  let active=0, peak=0;
  const started=[], completed=[];
  const releases=[];
  const promises=Array.from({length:10},(_,i)=>{
    const id=`concurrency-${i}`;
    queue.createJob({jobId:id,orgId:`tenant-${i}`,idempotencyKey:`tenant-${i}:one`});
    return queue.enqueue(async()=>{
      active++; peak=Math.max(peak,active); started.push(i);
      await new Promise(resolve=>releases.push(resolve));
      active--; completed.push(i);
      return {url:`tenant-${i}/output.mp4`};
    },id);
  });
  assert.equal(queue.getStats().waiting,8);
  assert.equal(queue.getJob('concurrency-9').queue_position,8);
  for(let i=0;i<10;i++) {
    assert.ok(releases[i]); releases[i]();
    await new Promise(resolve=>setImmediate(resolve));
  }
  const results=await Promise.all(promises);
  assert.equal(peak,2);
  assert.deepEqual(started,Array.from({length:10},(_,i)=>i));
  assert.equal(new Set(completed).size,10);
  results.forEach((result,i)=>assert.equal(result.url,`tenant-${i}/output.mp4`));
  assert.equal(queue.getStats().active,0);
  assert.equal(queue.getStats().waiting,0);
});

test('one failed task releases its lane and does not strand the following tenant',async()=>{
  const queue=new VideoJobQueue(1);
  queue.createJob({jobId:'fails'}); queue.createJob({jobId:'next'});
  const failed=queue.enqueue(async()=>{throw new Error('provider failure')},'fails');
  const next=queue.enqueue(async()=>({url:'next.mp4'}),'next');
  await assert.rejects(failed,/provider failure/);
  assert.equal((await next).url,'next.mp4');
  assert.equal(queue.getJob('fails').reconciliationRequired,true);
  assert.equal(queue.getJob('next').status,'completed');
});
