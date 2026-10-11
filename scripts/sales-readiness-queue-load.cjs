'use strict';
// Executes the current queue class bodies, not a reimplemented scheduling model.
// Provider callbacks are synthetic. This is NOT Customer/Next.js load or paid AI.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const root = path.resolve(__dirname, '..');
const gateway = path.join(root, 'services/omnistudio/gateway');
const source = fs.readFileSync(path.join(gateway, 'server.js'), 'utf8');
const { DurableJobStore } = require(path.join(gateway, 'durable_job_store'));
const { VideoJobPersistence } = require(path.join(gateway, 'video_job_persistence'));
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'mesajify-readiness-'));
const context = { crypto, os, Buffer, Date, Map, Set, Promise, setTimeout, clearTimeout,
  console: { log() {} }, ...require(path.join(gateway, 'tenant_scope')),
  ...require(path.join(gateway, 'runtime_metrics')),
  ...require(path.join(gateway, 'image_reference_contract')),
  ...require(path.join(gateway, 'gateway_request_guard')),
  broadcastEvent() {}, sanitizeJobForBroadcast: j => ({ id: j.id }),
  enhancePrompt: p => p, cleanupOutputFiles() {}, estimateJobPayloadBytes: () => 0,
  COMPLETED_JOB_TTL_MS: Infinity, FAILED_JOB_TTL_MS: Infinity,
  MAX_RETAINED_COMPLETED_JOBS: Infinity, MAX_RETAINED_RESULT_BYTES: Infinity,
  PUBLIC_HOST: '127.0.0.1', PORT: 0 };
vm.createContext(context);
function extract(name, end) {
  const start = source.indexOf('class ' + name + ' {');
  const finish = source.indexOf(end, start);
  assert(start >= 0 && finish > start, 'queue source boundary changed; review harness');
  vm.runInContext(source.slice(start, finish) + '\nthis.' + name + '=' + name, context);
  return context[name];
}
const ImageQueue = extract('AdvancedJobQueue', '\nconst queue = new AdvancedJobQueue');
const VideoQueue = extract('VideoJobQueue', '\nconst videoQueue = new VideoJobQueue');
function percentile(values, fraction) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] || 0;
}
const results = [];
async function scenario(tenants, concurrentUsers, kind) {
  const storeDir = path.join(temporary, `${kind}-${tenants}-${concurrentUsers}`);
  const queue = kind === 'image' ? new ImageQueue(new DurableJobStore(storeDir)) : new VideoQueue(2, new VideoJobPersistence(storeDir));
  const admissions = [], waits = [], jobs = [], durations = [];
  const beforeCpu = process.cpuUsage();
  const started = performance.now();
  for (let offset = 0; offset < tenants * 2; offset += concurrentUsers) {
    await Promise.all(Array.from({ length: Math.min(concurrentUsers, tenants * 2 - offset) }, async (_, j) => {
      const index = offset + j, org = 'staging-tenant-' + (index % tenants), request = 'request-' + index;
      const input = kind === 'image'
        ? { tenantId: org, requestId: request, prompt: org, customer: org, platform: 'chatgpt', optimizePrompt: false }
        : { jobId: 'stage-video-' + index, orgId: org, idempotencyKey: org + ':' + request, requestHash: crypto.createHash('sha256').update(org).digest('hex') };
      const before = performance.now();
      const job = queue.createJob(input);
      assert.equal(queue.createJob(input).id, job.id, 'repeat admission changed logical job');
      admissions.push(performance.now() - before);
      jobs.push({ job, org });
    }));
  }
  assert.equal(new Set(jobs.map(j => j.job.id)).size, tenants * 2);
  let active = 0, maxActive = 0;
  const consume = async (record, begin) => {
    active++; maxActive = Math.max(active, maxActive);
    await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(kind === 'image' ? record.job.tenantId : record.job.orgId, record.org);
    durations.push(performance.now() - begin);
    active--;
  };
  if (kind === 'image') {
    await Promise.all(Array.from({ length: 4 }, async (_, worker) => {
      while (true) {
        const job = queue.getNextJob('chatgpt', 'staging-worker-' + worker, 'staging-session-' + worker);
        if (!job) break;
        const record = jobs.find(r => r.job.id === job.id);
        waits.push(job.startedAt - job.createdAt);
        const begin = performance.now();
        await consume(record, begin);
        queue.completeJob(job.id, 'synthetic-' + job.id + '.png', Buffer.from(record.org));
        assert.equal(job.resultSha256, crypto.createHash('sha256').update(record.org).digest('hex'));
      }
    }));
  } else {
    await Promise.all(jobs.map(record => queue.enqueue(async () => {
      waits.push(queue.jobs.get(record.job.id).startedAt - record.job.enqueuedAt);
      await consume(record, performance.now());
      return { synthetic: true, tenant: record.org };
    }, record.job.id)));
  }
  assert.equal(active, 0);
  assert(maxActive <= (kind === 'image' ? 4 : 2));
  assert(jobs.every(record => queue.getJob(record.job.id).status === 'completed'));
  const recovered = kind === 'image' ? new ImageQueue(new DurableJobStore(storeDir)) : new VideoQueue(2, new VideoJobPersistence(storeDir));
  assert(jobs.every(record => recovered.getJob(record.job.id)?.status === 'completed'));
  const cpu = process.cpuUsage(beforeCpu);
  results.push({ tenants, concurrentUsers, kind, logicalJobs: jobs.length, completed: jobs.length,
    duplicatesPrevented: jobs.length, isolationAssertions: jobs.length, maximumProviderStubs: maxActive,
    admissionAverageMs: admissions.reduce((a,b)=>a+b,0)/admissions.length,
    admissionP95Ms: percentile(admissions,.95), admissionP99Ms: percentile(admissions,.99),
    queueWaitP95Ms: percentile(waits,.95), queueWaitP99Ms: percentile(waits,.99),
    stubServiceAverageMs: durations.reduce((a,b)=>a+b,0)/durations.length,
    elapsedMs: performance.now()-started, cpuUserMs: cpu.user/1000, cpuSystemMs: cpu.system/1000,
    processRssBytes: process.memoryUsage().rss,
    httpErrorRate: null, timeoutRate: null, postgresConnections: null,
    caveat: 'Real queue classes and filesystem persistence; synthetic 5ms providers. No actual AI, HTTP, Postgres or Customer routes.' });
}
(async () => {
  for (const tenants of [3,5,10,30,50]) for (const concurrent of [5,10,30,50]) for (const kind of ['image','video']) {
    await scenario(tenants,concurrent,kind);
  }
  // Restart during processing cannot silently start another paid request.
  const recoveryStore = new DurableJobStore(path.join(temporary,'crash-image'));
  let q = new ImageQueue(recoveryStore);
  const accepted = q.createJob({ tenantId:'staging-crash',requestId:'crash',prompt:'synthetic',optimizePrompt:false });
  q.getNextJob('chatgpt','crashed-worker','crashed-session');
  q = new ImageQueue(recoveryStore);
  assert.equal(q.getJob(accepted.id).reconciliationRequired,true);
  assert.equal(q.getNextJob('chatgpt','replacement-worker','replacement-session'),null);
  const report = { measuredAt:new Date().toISOString(), sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),
    classification:'ISOLATED_REAL_QUEUE_SYNTHETIC_PROVIDER', productionLoad:false, scenarios:results,
    recovery:{ imageInFlightRestart:'RECONCILIATION_REQUIRED_NO_RESUBMISSION' }, temporaryDirectory:temporary };
  const output=path.join(root,'docs/sales-readiness/evidence/queue-load.json');
  fs.writeFileSync(output,JSON.stringify(report,null,2));
  console.log(JSON.stringify({scenarios:results.length,logicalJobs:results.reduce((s,r)=>s+r.logicalJobs,0),status:'PASS',output}));
})().catch(error=>{console.error(error);process.exitCode=1;});
