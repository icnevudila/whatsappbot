const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
process.env.NODE_ENV = 'test';
const {AdvancedJobQueue} = require('../server');
const {DurableJobStore} = require('../durable_job_store');
function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(),'image-reference-receipt-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  const store = new DurableJobStore(directory);
  const queue = new AdvancedJobQueue(store);
  const job = queue.createJob({prompt:'fixture',platform:'chatgpt',tenantId:'tenant-a',referenceImages:[{role:'logo'},{role:'product'}],expectedReferenceCount:2});
  const claimed = queue.getNextJob('chatgpt','worker-a');
  assert.equal(claimed.id,job.id);
  const receipt = {job_id:job.id,worker_id:'worker-a',target_id:'target-a',conversation_owner_job_id:job.id,expected_reference_count:2,resolved_reference_count:2,uploaded_reference_count:2,composer_attachment_count:2,attachments_ready_at:'2026-10-03T12:00:00Z'};
  return {directory,store,queue,job,receipt};
}
test('actual private durable store preserves receipt through queue reconstruction',t=>{
  const {store,queue,job,receipt} = fixture(t);
  queue.recordReferenceReceipt(receipt);
  const restored = new AdvancedJobQueue(store);
  assert.deepEqual(restored.getJob(job.id).referenceReceipt,receipt);
});
test('disk failure never acknowledges or leaves an unpersisted receipt',t=>{
  const {store,queue,job,receipt} = fixture(t);
  const save = store.save;
  store.save = ()=>{throw new Error('disk failure fixture')};
  assert.throws(()=>queue.recordReferenceReceipt(receipt),/DURABLE_JOB_STORAGE_UNAVAILABLE/);
  assert.equal(job.referenceReceipt,undefined);
  store.save = save;
});
test('reference job cannot complete without the owned durable attachment receipt',t=>{
  const {queue,job} = fixture(t);
  assert.throws(()=>queue.completeJob(job.id,'fixture.png',Buffer.alloc(100)),/OWNER_MISMATCH/);
  assert.equal(job.status,'processing');
  assert.equal(job.resultUrl,null);
});
test('CDP disconnect after reference receipt never requeues a paid image',t=>{
  const {queue,job,receipt} = fixture(t);
  queue.recordReferenceReceipt(receipt);
  queue.releaseLock(job.id,'[CDP Error] WebSocket not open (readyState: 3)');
  assert.equal(job.status,'reconciliation_required');
  assert.equal(job.reconciliationRequired,true);
  assert.equal(job.attemptCount,0);
  assert.equal(queue.getNextJob('chatgpt','worker-b'),null);
  const recovery=queue.getNextJob('chatgpt','worker-a');
  assert.equal(recovery.id,job.id);
  assert.equal(recovery.resumeImage,true);
  assert.equal(recovery.referenceReceipt.target_id,'target-a');
});
