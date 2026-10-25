'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { AdvancedJobQueue, VideoJobQueue } = require('../server');
const { DurableJobStore } = require('../durable_job_store');
const { VideoJobPersistence } = require('../video_job_persistence');

for (const kind of ['image','video']) test(`${kind}: actual child process exit preserves the claimed job without paid replay`, () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-child-crash-'));
  try {
    const source = `
      const {AdvancedJobQueue,VideoJobQueue}=require(${JSON.stringify(require.resolve('../server'))});
      const {DurableJobStore}=require(${JSON.stringify(require.resolve('../durable_job_store'))});
      const {VideoJobPersistence}=require(${JSON.stringify(require.resolve('../video_job_persistence'))});
      const root=process.argv[1],kind=process.argv[2];
      if(kind==='image') {
        const q=new AdvancedJobQueue(new DurableJobStore(root));
        q.createJob({tenantId:'crash-org',requestId:'one',prompt:'fixture',optimizePrompt:false});
        q.getNextJob('chatgpt','crashed-worker'); process.exit(23);
      } else {
        const q=new VideoJobQueue(1,new VideoJobPersistence(root));
        const j=q.createJob({orgId:'crash-org',idempotencyKey:'one',requestHash:'fixture'});
        q.enqueue(()=>{process.exit(23)},j.id);
      }`;
    const child=spawnSync(process.execPath,['-e',source,root,kind],{encoding:'utf8',timeout:10000,
      env:{...process.env,NODE_ENV:'test',OUTPUT_DIR:path.join(root,'outputs')}});
    assert.equal(child.status,23,child.stderr);
    if(kind==='image') {
      const q=new AdvancedJobQueue(new DurableJobStore(root));
      const [job]=q.jobs.values();
      assert.equal(job.reconciliationRequired,true);
      assert.equal(q.getNextJob('chatgpt','new-worker'),null);
      assert.equal(q.createJob({tenantId:'crash-org',requestId:'one',prompt:'fixture',optimizePrompt:false}).id,job.id);
    } else {
      const q=new VideoJobQueue(1,new VideoJobPersistence(root));
      const [job]=q.jobs.values();
      assert.equal(job.status,'reconciliation_required');
      assert.equal(job.providerSubmissionState,'UNCERTAIN');
      assert.equal(q.findJobByIdempotencyKey('one').id,job.id);
      assert.equal(q.queue.length,0);
    }
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});

test('provider success followed by receipt write failure stays uncertain after reload, with no resubmit', async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-write-failure-'));
  try {
    const store=new VideoJobPersistence(root);
    const save=store.save.bind(store);
    store.save=job=>{if(job.status==='completed') throw new Error('DISK_FULL');save(job)};
    const q=new VideoJobQueue(1,store);
    const job=q.createJob({orgId:'owned',idempotencyKey:'one'});
    let providerCalls=0;
    await assert.rejects(q.enqueue(async()=>{providerCalls++;return {sha256:'a'.repeat(64)}},job.id), /VIDEO_DURABLE_STORAGE_UNAVAILABLE/);
    assert.equal(providerCalls,1);
    assert.throws(()=>q.createJob({orgId:'owned',idempotencyKey:'one'}),/VIDEO_DURABLE_STORAGE_UNAVAILABLE/);
    const restarted=new VideoJobQueue(1,new VideoJobPersistence(root));
    assert.equal(restarted.getJob(job.id).status,'reconciliation_required');
    assert.equal(restarted.getJob(job.id).attemptCount,1);
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
