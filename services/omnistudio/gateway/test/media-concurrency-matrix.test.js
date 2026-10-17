'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { AdvancedJobQueue, VideoJobQueue } = require('../server');
const { DurableJobStore } = require('../durable_job_store');
const { VideoJobPersistence } = require('../video_job_persistence');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const percentile = (values, p) => [...values].sort((a,b) => a-b)[Math.ceil(values.length*p)-1];
const reports = [];

// Actual Gateway queue classes + private filesystem receipts. Synthetic bytes
// and delayed callbacks only: no browser, network, Supabase, billing or AI.
async function exercise(tenants, mixed = false) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'media-matrix-'));
  const imageStore = new DurableJobStore(path.join(root, 'image-state'));
  const videoStore = new VideoJobPersistence(path.join(root, 'video-state'));
  const images = new AdvancedJobQueue(imageStore);
  const videos = new VideoJobQueue(1, videoStore);
  const cpu = process.cpuUsage();
  const start = Date.now();
  const receipts = [];
  const executions = new Set();
  let videoActive = 0, videoPeak = 0;
  const inputs = Array.from({length:tenants}, (_,n) => ({
    org: `fixture-org-${n}`, product: n%2 ? 'Delta 10L' : 'Bofe 16L',
  }));
  try {
    const videoTasks = [];
    for (const [n, input] of inputs.entries()) {
      const request = { tenantId: input.org, requestId: mixed ? `variation-${n}` : 'image',
        prompt: `${input.product} ${mixed ? 'variation' : 'image'} ${input.org}`, optimizePrompt: false };
      const image = images.createJob(request);
      assert.equal(images.createJob(request).id, image.id);
      const meta = { orgId: input.org, idempotencyKey: `${input.org}:video:${mixed ? 'revision' : 'initial'}`,
        requestHash: crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex') };
      const video = videos.createJob(meta);
      assert.equal(videos.createJob(meta).id, video.id);
      videoTasks.push(videos.enqueue(async ({attemptId,workerId}) => {
        assert.equal(executions.has(video.id), false);
        executions.add(video.id);
        videoPeak = Math.max(videoPeak, ++videoActive);
        const generationStart = Date.now();
        await pause(5);
        const bytes = Buffer.from(`MOCK_VIDEO:${input.org}:${video.id}:${attemptId}:${input.product}`);
        const output = path.join(root, input.org, video.id + '.fixture');
        fs.mkdirSync(path.dirname(output), {recursive:true}); fs.writeFileSync(output, bytes);
        const sha256 = crypto.createHash('sha256').update(fs.readFileSync(output)).digest('hex');
        receipts.push({org_id:input.org,job_id:video.id,attempt_id:attemptId,worker_id:workerId,
          account_id:'mock-video-account',flow_project_id:`mock-project-${video.id}`,job_type:'video',
          operation:mixed?'revision':'initial',product:input.product,queue_entry_time:video.enqueuedAt,
          claim_time:video.startedAt,generation_start:generationStart,generation_end:Date.now(),
          queue_wait_ms:video.startedAt-video.enqueuedAt,total_ms:Date.now()-video.enqueuedAt,
          retry_count:0,provider:'MOCK',model:'NONE',credit_consumption:null,output_storage_path:`${input.org}/${video.id}.fixture`,
          sha256,qa_status:'NOT_TESTED',final_delivery_status:'LOCAL_FIXTURE_ONLY'});
        videoActive--;
        return {sha256,flowProjectId:`mock-project-${video.id}`,orgId:input.org};
      }, video.id));
      await assert.rejects(videos.enqueue(() => { throw new Error('duplicate executed'); },video.id), error => error.code === 'DUPLICATE_SUBMISSION_PREVENTED');
    }
    assert.equal(images.jobs.size, tenants); assert.equal(videos.jobs.size, tenants);
    while (images.pendingQueue.length) {
      const job = images.getNextJob('chatgpt','mock-image-worker','mock-image-session');
      assert.ok(job); assert.equal(executions.has(job.id),false); executions.add(job.id);
      assert.equal(images.getNextJob('chatgpt','mock-image-worker','mock-image-session'),null);
      const generationStart = Date.now(); await pause(1);
      // This is deliberately labelled a fixture: completion does not prove media QA.
      const bytes = Buffer.from(`MOCK_IMAGE:${job.tenantId}:${job.id}:${job.originalPrompt}`);
      const filename = `${job.id}.fixture`;
      const completed = images.completeJob(job.id,filename,bytes);
      receipts.push({org_id:job.tenantId,job_id:job.id,attempt_id:null,worker_id:job.assignedTo,
        account_id:'mock-image-account',flow_project_id:null,job_type:'image',operation:mixed?'variation':'initial',
        queue_entry_time:job.createdAt,claim_time:job.startedAt,generation_start:generationStart,generation_end:job.completedAt,
        queue_wait_ms:job.startedAt-job.createdAt,total_ms:job.completedAt-job.createdAt,retry_count:job.attemptCount,
        provider:'MOCK',model:'NONE',credit_consumption:null,output_storage_path:null,
        sha256:completed.resultSha256,qa_status:'NOT_TESTED',final_delivery_status:'LOCAL_FIXTURE_ONLY'});
    }
    await Promise.all(videoTasks);
    assert.equal(executions.size,tenants*2); assert.equal(videoPeak,1);
    const restoredImages = new AdvancedJobQueue(imageStore);
    const restoredVideos = new VideoJobQueue(1,videoStore);
    assert.equal(restoredImages.jobs.size,tenants); assert.equal(restoredVideos.jobs.size,tenants);
    for (const job of restoredImages.jobs.values()) assert.equal(job.status,'completed');
    for (const job of restoredVideos.jobs.values()) {
      assert.equal(job.status,'completed'); assert.equal(job.orgId,job.result.orgId);
      await assert.rejects(restoredVideos.enqueue(() => assert.fail('terminal replay'),job.id),error => error.code === 'DUPLICATE_SUBMISSION_PREVENTED');
    }
    const report = {scope:'GATEWAY_IN_PROCESS_WITH_FILESYSTEM_AND_MOCK_PROVIDER',tenants,mixed,
      accepted:tenants*2,completed:receipts.length,completion_rate:receipts.length/(tenants*2),failed:0,
      duplicate_executions:executions.size-receipts.length,cross_tenant_violations:0,orphaned_jobs:0,
      p50_ms:percentile(receipts.map(r=>r.total_ms),.5),p95_ms:percentile(receipts.map(r=>r.total_ms),.95),
      elapsed_ms:Date.now()-start,video_peak_concurrency:videoPeak,queue_depth_end:images.pendingQueue.length+videos.queue.length,
      rss_bytes:process.memoryUsage().rss,cpu_microseconds:process.cpuUsage(cpu),
      billing_discrepancies:null,provider_calls:0,real_capacity:'NOT_TESTED',receipts};
    reports.push(report);
    console.log('MEDIA_MATRIX '+JSON.stringify({...report,receipts:undefined}));
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
}
for (const tenants of [3,5,10]) test(`Gateway mock matrix: ${tenants} tenants submit image and video`, () => exercise(tenants));
test('Gateway mock mixed variations/revisions: three independent tenants', () => exercise(3,true));
test.after(() => {
  if (process.env.MEDIA_MATRIX_REPORT) fs.writeFileSync(process.env.MEDIA_MATRIX_REPORT,JSON.stringify({
    generated_at:new Date().toISOString(),matrix_jobs:36,mixed_jobs:6,
    disclaimer:'No real provider, Supabase transaction, browser, SKU recognition, Storage or credit acceptance.',reports},null,2));
});
