'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { performance } = require('node:perf_hooks');
const { AdvancedJobQueue } = require('../server');

// In-process queue / stub completion only. No browser, DB, Storage or AI provider.
for (const tenants of [10, 50, 100, 200, 300]) {
  test(`isolated queue: ${tenants} tenants retain exact results with duplicate submissions`, async () => {
    const queue = new AdvancedJobQueue();
    const start = performance.now();
    const cpu = process.cpuUsage();
    const requests = Array.from({ length: tenants }, (_, index) => ({
      tenantId: `load-tenant-${index}`, requestId: 'same-request', customer: 'Same display name',
      prompt: `Owned neutral ${index}`, incomingMessage: `Owned neutral ${index}`, type: 'chat_suggestions',
    }));
    const jobs = await Promise.all(requests.map(async input => queue.createJob(input)));
    for (let index = 0; index < tenants; index++) {
      assert.equal(queue.createJob(requests[index]).id, jobs[index].id);
    }
    assert.equal(queue.jobs.size, tenants);
    const latencies = [];
    const completed = new Set();
    for (let index = 0; index < tenants; index++) {
      const job = queue.getNextJob('chatgpt', 'load-worker', 'load-session');
      assert.ok(job);
      assert.equal(completed.has(job.id), false);
      completed.add(job.id);
      latencies.push(performance.now() - start);
      queue.completeTextJob(job.id, { reply: job.tenantId });
      assert.equal(queue.getJob(job.id).result.reply, job.tenantId);
    }
    assert.equal(completed.size, tenants);
    assert.equal(queue.getNextJob('chatgpt', 'load-worker', 'load-session'), null);
    const elapsedMs = performance.now() - start;
    const usage = process.cpuUsage(cpu);
    console.log('AUDIT_STUB_LOAD ' + JSON.stringify({ tenants, jobs: completed.size,
      duplicateJobs: 0, wrongTenantResults: 0, elapsedMs: +elapsedMs.toFixed(2),
      queueP95Ms: +latencies[Math.ceil(latencies.length * .95) - 1].toFixed(2),
      throughputPerSecond: +(tenants * 1000 / elapsedMs).toFixed(2),
      rssBytes: process.memoryUsage().rss, cpuMicroseconds: usage.user + usage.system,
      providerCalls: 0, creditExposure: 0,
      databaseLatency: null, storageLatency: null, providerCapacity: 'NOT_TESTED' }));
  });
}
