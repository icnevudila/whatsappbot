'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

const {
  acquireSessionFlightLease,
  releaseSessionFlightLease
} = require('../orphan_tab_reaper.js');

// Test pacing directory
const testPacingDir = path.join(os.tmpdir(), `test_omnistudio_leases_${Date.now()}_${Math.random().toString(36).slice(2)}`);

test('SESSION COORDINATOR: acquireSessionFlightLease ensures single-flight on same session', async () => {
  const sessionKey = 'session_test_single';
  const jobA = 'job_A';
  const jobB = 'job_B';

  const leaseA = await acquireSessionFlightLease(sessionKey, jobA, { pacingDir: testPacingDir, timeoutMs: 5000 });
  assert.equal(leaseA.acquired, true);
  assert.equal(leaseA.jobId, jobA);

  let jobBStarted = false;
  let jobBCompleted = false;

  const promiseB = (async () => {
    const leaseB = await acquireSessionFlightLease(sessionKey, jobB, { pacingDir: testPacingDir, timeoutMs: 5000, pollIntervalMs: 20 });
    jobBStarted = true;
    assert.equal(leaseB.acquired, true);
    assert.equal(leaseB.jobId, jobB);
    releaseSessionFlightLease(sessionKey, jobB, { pacingDir: testPacingDir });
    jobBCompleted = true;
  })();

  // Wait a short time: job B MUST NOT start while job A holds the lease
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(jobBStarted, false, 'Job B must wait while Job A holds session lease');

  // Job A finishes and releases lease
  releaseSessionFlightLease(sessionKey, jobA, { pacingDir: testPacingDir });

  // Now Job B must acquire lease and complete
  await promiseB;
  assert.equal(jobBCompleted, true, 'Job B must execute and complete after Job A releases lease');
});

test('SESSION COORDINATOR: same profile A/B/C executes in FIFO order with zero overlap', async () => {
  const sessionKey = 'session_test_fifo';
  const executionOrder = [];

  async function runJob(jobId, delayMs = 50) {
    const lease = await acquireSessionFlightLease(sessionKey, jobId, { pacingDir: testPacingDir, timeoutMs: 5000, pollIntervalMs: 20 });
    executionOrder.push(`start_${jobId}`);
    await new Promise((r) => setTimeout(r, delayMs));
    executionOrder.push(`end_${jobId}`);
    releaseSessionFlightLease(sessionKey, jobId, { pacingDir: testPacingDir });
  }

  // Submit A, then B, then C
  const pA = runJob('job_1');
  await new Promise((r) => setTimeout(r, 10));
  const pB = runJob('job_2');
  await new Promise((r) => setTimeout(r, 10));
  const pC = runJob('job_3');

  await Promise.all([pA, pB, pC]);

  assert.deepEqual(executionOrder, [
    'start_job_1', 'end_job_1',
    'start_job_2', 'end_job_2',
    'start_job_3', 'end_job_3'
  ], 'Jobs on same profile must run strictly sequentially without overlap');
});

test('SESSION COORDINATOR: different profiles A and B are allowed to execute concurrently', async () => {
  const sessionA = 'session_alpha';
  const sessionB = 'session_beta';
  let aActive = false;
  let bActive = false;
  let concurrentOverlap = false;

  async function runAlpha() {
    await acquireSessionFlightLease(sessionA, 'job_a', { pacingDir: testPacingDir, timeoutMs: 5000 });
    aActive = true;
    if (bActive) concurrentOverlap = true;
    await new Promise((r) => setTimeout(r, 100));
    if (bActive) concurrentOverlap = true;
    aActive = false;
    releaseSessionFlightLease(sessionA, 'job_a', { pacingDir: testPacingDir });
  }

  async function runBeta() {
    await acquireSessionFlightLease(sessionB, 'job_b', { pacingDir: testPacingDir, timeoutMs: 5000 });
    bActive = true;
    if (aActive) concurrentOverlap = true;
    await new Promise((r) => setTimeout(r, 100));
    if (aActive) concurrentOverlap = true;
    bActive = false;
    releaseSessionFlightLease(sessionB, 'job_b', { pacingDir: testPacingDir });
  }

  await Promise.all([runAlpha(), runBeta()]);
  assert.equal(concurrentOverlap, true, 'Independent profiles must be allowed to execute concurrently');
});

test('SESSION COORDINATOR: failed first request safely releases lease for next job', async () => {
  const sessionKey = 'session_fail_recovery';

  // Job 1 acquires lease then throws
  try {
    await acquireSessionFlightLease(sessionKey, 'job_fail', { pacingDir: testPacingDir, timeoutMs: 5000 });
    throw new Error('SIMULATED_WORKER_CRASH');
  } catch (err) {
    releaseSessionFlightLease(sessionKey, 'job_fail', { pacingDir: testPacingDir });
  }

  // Job 2 must be able to acquire lease immediately
  const lease2 = await acquireSessionFlightLease(sessionKey, 'job_next', { pacingDir: testPacingDir, timeoutMs: 5000 });
  assert.equal(lease2.acquired, true);
  releaseSessionFlightLease(sessionKey, 'job_next', { pacingDir: testPacingDir });
});

test('SESSION COORDINATOR: timed out lease is reclaimed without deadlocking', async () => {
  const sessionKey = 'session_timeout_reclaim';
  const leaseFile = path.join(testPacingDir, `session_lease_${sessionKey}.json`);

  fs.writeFileSync(leaseFile, JSON.stringify({
    sessionKey,
    activeJobId: 'job_abandoned',
    acquiredAt: Date.now() - 150000,
  }));

  const leaseNew = await acquireSessionFlightLease(sessionKey, 'job_new', { pacingDir: testPacingDir, timeoutMs: 5000 });
  assert.equal(leaseNew.acquired, true);
  assert.equal(leaseNew.jobId, 'job_new');
  releaseSessionFlightLease(sessionKey, 'job_new', { pacingDir: testPacingDir });
});

test('GATEWAY QUEUE: same profile A & B submitted simultaneously -> B waits in queue until A completes', () => {
  // Require AdvancedJobQueue from server.js
  const { AdvancedJobQueue } = require('../server.js');
  const queue = new AdvancedJobQueue();

  const jobA = queue.createJob({
    prompt: 'Prompt A',
    customer: 'CustA',
    platform: 'chatgpt',
    type: 'chat_suggestions',
    incomingMessage: 'Mesaj A',
  });

  const jobB = queue.createJob({
    prompt: 'Prompt B',
    customer: 'CustB',
    platform: 'chatgpt',
    type: 'chat_suggestions',
    incomingMessage: 'Mesaj B',
  });

  // Worker 1 on session 'profile_shared' asks for job
  const assignedA = queue.getNextJob('chatgpt', 'worker-1', 'profile_shared');
  assert.equal(assignedA.id, jobA.id);
  assert.equal(assignedA.status, 'processing');
  assert.equal(assignedA.sessionKey, 'profile_shared');
  assert.equal(assignedA.session_queue_depth, 1); // Job B is waiting

  // Worker 2 on SAME session 'profile_shared' asks for job -> MUST BE NULL
  const assignedB = queue.getNextJob('chatgpt', 'worker-2', 'profile_shared');
  assert.equal(assignedB, null, 'Worker 2 must not receive Job B while Job A is in-flight on same session');

  // Job B remains pending in queue
  assert.equal(queue.jobs.get(jobB.id).status, 'pending');

  // Now complete Job A
  queue.completeTextJob(jobA.id, { suggestions: [{ label: 'A', text: 'Res A' }] });
  assert.equal(queue.jobs.get(jobA.id).status, 'completed');
  assert.equal(queue.getSession('profile_shared').activeTextJobId, null, 'Session lease must be cleared');

  // Now Worker 2 asks for job -> receives Job B
  const assignedBNow = queue.getNextJob('chatgpt', 'worker-2', 'profile_shared');
  assert.equal(assignedBNow.id, jobB.id);
  assert.equal(assignedBNow.status, 'processing');
  assert.equal(assignedBNow.session_queue_depth, 0); // No more waiting
});

test('GATEWAY QUEUE: different profile workers can execute text jobs concurrently', () => {
  const { AdvancedJobQueue } = require('../server.js');
  const queue = new AdvancedJobQueue();

  const jobA = queue.createJob({
    prompt: 'Prompt A',
    customer: 'CustA',
    platform: 'chatgpt',
    type: 'chat_suggestions',
    incomingMessage: 'Mesaj A',
  });

  const jobB = queue.createJob({
    prompt: 'Prompt B',
    customer: 'CustB',
    platform: 'chatgpt',
    type: 'chat_suggestions',
    incomingMessage: 'Mesaj B',
  });

  // Worker 1 on profile_A takes job A
  const assignedA = queue.getNextJob('chatgpt', 'worker-1', 'profile_A');
  assert.equal(assignedA.id, jobA.id);

  // Worker 2 on profile_B takes job B concurrently
  const assignedB = queue.getNextJob('chatgpt', 'worker-2', 'profile_B');
  assert.equal(assignedB.id, jobB.id);
  assert.equal(assignedB.status, 'processing');
  assert.equal(assignedB.sessionKey, 'profile_B');
});

test('GATEWAY QUEUE: rate limit error triggers WEB_SESSION_RATE_LIMITED and session cooldown', () => {
  const { AdvancedJobQueue } = require('../server.js');
  const queue = new AdvancedJobQueue();

  const jobA = queue.createJob({
    prompt: 'Prompt A',
    customer: 'CustA',
    platform: 'chatgpt',
    type: 'chat_suggestions',
    incomingMessage: 'Mesaj A',
  });

  const jobB = queue.createJob({
    prompt: 'Prompt B',
    customer: 'CustB',
    platform: 'chatgpt',
    type: 'chat_suggestions',
    incomingMessage: 'Mesaj B',
  });

  const assignedA = queue.getNextJob('chatgpt', 'worker-1', 'profile_rl');
  assert.equal(assignedA.id, jobA.id);

  // Job A triggers rate limit modal in web UI
  queue.releaseLock(jobA.id, 'WEB_SESSION_RATE_LIMITED: ChatGPT web "Too many requests" rate-limit modal detected');

  const session = queue.getSession('profile_rl');
  assert.equal(session.rateLimitCount, 1);
  assert.ok(session.cooldownUntil > Date.now(), 'Session must have active cooldown');

  // While in cooldown, worker cannot take Job B
  const blockedB = queue.getNextJob('chatgpt', 'worker-1', 'profile_rl');
  assert.equal(blockedB, null, 'Worker must not pick up text job during session cooldown');

  // But an independent profile CAN pick up Job B
  const otherB = queue.getNextJob('chatgpt', 'worker-other', 'profile_other');
  assert.equal(otherB.id, jobB.id);
});

test('GATEWAY QUEUE: cancelled pending request is cleaned up without blocking session', () => {
  const { AdvancedJobQueue } = require('../server.js');
  const queue = new AdvancedJobQueue();

  // Create Job 1 for tenant-cancel, scopeKey will be generated
  const job1 = queue.createJob({
    prompt: 'Prompt 1',
    customer: 'CustomerCancel',
    platform: 'chatgpt',
    type: 'chat_suggestions',
    incomingMessage: 'First msg',
    tenantId: 'tenant-cancel',
  });

  // Create Job 2 with same scopeKey before Job 1 is dispatched
  // This automatically cancels pending Job 1
  const job2 = queue.createJob({
    prompt: 'Prompt 2',
    customer: 'CustomerCancel',
    platform: 'chatgpt',
    type: 'chat_suggestions',
    incomingMessage: 'Second msg',
    tenantId: 'tenant-cancel',
  });

  assert.equal(queue.jobs.get(job1.id).status, 'failed');
  assert.equal(queue.jobs.get(job2.id).status, 'pending');

  // Session remains completely clean and can take Job 2
  const assigned = queue.getNextJob('chatgpt', 'worker-1', 'profile_clean');
  assert.equal(assigned.id, job2.id);
  assert.equal(queue.getSession('profile_clean').activeTextJobId, job2.id);
});
