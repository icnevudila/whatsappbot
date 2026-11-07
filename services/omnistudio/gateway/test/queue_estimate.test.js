'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimateQueue } = require('../queue_estimate');
const now = 1000000;
function fixture() {
  const jobs = new Map(Array.from({length:5},(_,i)=>[`h${i}`, {status:'completed',startedAt:0,completedAt:60000}]));
  jobs.set('active',{status:'processing',startedAt:now-30000});
  const pendingIds = Array.from({length:10},(_,i)=>`q${i}`);
  pendingIds.forEach(id=>jobs.set(id,{status:'queued'}));
  return {jobs,pendingIds,jobId:'q9',capacity:1,now};
}
test('tenth queued request includes active residual and its own generation',()=>{
  const result=estimateQueue(fixture());
  assert.equal(result.queue_position,10);
  assert.equal(result.estimated_wait_seconds,570);
  assert.equal(result.estimated_completion_seconds,630);
});
test('parallel lanes reduce backlog without dropping running work',()=>{
  assert.equal(estimateQueue({...fixture(),capacity:2}).estimated_wait_seconds,270);
});
test('unknown admission, insufficient history and overdue work never invent an ETA',()=>{
  const f=fixture();
  assert.equal(estimateQueue({...f,pendingIds:[]}).queue_position,null);
  assert.equal(estimateQueue({...f,pendingIds:[]}).estimated_wait_seconds,null);
  f.jobs.delete('h0');
  assert.equal(estimateQueue(f).estimated_completion_seconds,null);
  const overdue=fixture(); overdue.jobs.get('active').startedAt=now-70000;
  assert.equal(estimateQueue(overdue).estimated_wait_seconds,null);
});
