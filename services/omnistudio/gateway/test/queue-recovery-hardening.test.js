'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { AdvancedJobQueue, VideoJobQueue } = require('../server');
const { DistributedLeaseStore, SharedDatabaseSimulator } = require('../distributed_lease_store');

test('heartbeat and release fail closed on RPC errors or malformed responses', async () => {
  for (const response of [{ error: { code: 'OFFLINE' } }, { data: null }, { data: 'true' }]) {
    const store = new DistributedLeaseStore({ supabase: { rpc: async () => response } });
    const lease = { provider: 'FLOW', accountId: 'a', leaseToken: 't' };
    assert.equal(await store.heartbeatLease(lease), false);
    assert.equal(await store.releaseLease(lease), false);
  }
});

test('worker disappearance after image claim requires reconciliation rather than a second generation', () => {
  for (const reason of ['Browser worker timeout (200s)', 'Worker became idle or restarted', null]) {
    const queue = new AdvancedJobQueue();
    const job = queue.createJob({ tenantId: 'alpha', requestId: 'one', prompt: 'Bofe 16L', optimizePrompt: false });
    assert.equal(queue.getNextJob('chatgpt', 'worker-a').id, job.id);
    queue.releaseLock(job.id, reason);
    assert.equal(queue.getJob(job.id).status, 'reconciliation_required');
    assert.equal(queue.getNextJob('chatgpt', 'worker-b'), null);
    assert.equal(queue.createJob({ tenantId: 'alpha', requestId: 'one', prompt: 'Bofe 16L', optimizePrompt: false }).id, job.id);
  }
});

test('late worker error cannot turn a completed image into failed or pending', () => {
  const queue = new AdvancedJobQueue();
  const job = queue.createJob({ prompt: 'owned', optimizePrompt: false });
  queue.getNextJob('chatgpt', 'worker-a');
  job.status = 'completed';
  queue.releaseLock(job.id, 'Browser worker timeout (200s)');
  assert.equal(job.status, 'completed');
});

test('video status does not fabricate a wait estimate or an unqueued position', () => {
  const queue = new VideoJobQueue(1);
  const job = queue.createJob({ orgId: 'alpha' });
  assert.equal(queue.getJob(job.id).estimated_wait_seconds, null);
  assert.equal(queue.getJob(job.id).queue_position, null);
});

test('expired account authority cannot be revived by an old heartbeat', async () => {
  const simulator = new SharedDatabaseSimulator();
  let now = 1000; simulator.clock = () => now;
  const store = new DistributedLeaseStore({simulator});
  const input = {provider:'FLOW',accountId:'account',workerId:'old',jobId:'old-job',leaseToken:'old-token',ttlSeconds:1};
  assert.equal((await store.acquireLease(input)).acquired,true);
  now += 1001;
  assert.equal(await store.heartbeatLease(input),false);
  assert.equal((await store.acquireLease({...input,workerId:'new',jobId:'new-job',leaseToken:'new-token'})).acquired,true);
  assert.equal(await store.releaseLease(input),false);
});
