'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { isAuthorizedGateway } = require('../gateway_request_guard');
process.env.NODE_ENV = 'test';
process.env.OMNISTUDIO_GATEWAY_TOKEN = 'audit-gateway-fixture';
process.env.WORKER_CONTROL_TOKEN = 'audit-worker-fixture';
process.env.CHATGPT_API_KEY = 'audit-chat-fixture';
const { server, queue } = require('../server');
let base;
before(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
});
test('anonymous generation cannot enqueue or consume provider capacity', async () => {
  const beforeCount = queue.jobs.size;
  const res = await fetch(base + '/v1/images/generations?async=true', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ prompt: 'Neutral isolated auth fixture', tenant_id: 'audit-a', async: true }),
  });
  assert.equal(res.status, 401);
  assert.equal(queue.jobs.size, beforeCount);
});
test('anonymous job status cannot expose a tenant output or text result', async () => {
  const job = queue.createJob({ prompt: 'Private fixture', tenantId: 'audit-a', type: 'image' });
  const res = await fetch(base + '/v1/images/status/' + job.id);
  assert.equal(res.status, 401);
});
test('anonymous operational and video routes are protected before side effects', async () => {
  for (const route of ['/v1/videos/status/missing', '/videos/status/missing', '/v1/videos/queue',
    '/v1/ai-engine/accounts', '/v1/company-chats', '/monitor']) {
    assert.equal((await fetch(base + route)).status, 401, route);
  }
  for (const route of ['/v1/canary/run', '/v1/ai-engine/accounts/provision', '/v1/seed-chats']) {
    assert.equal((await fetch(base + route, { method: 'POST', body: '{}' })).status, 401, route);
  }
});
test('invalid, unset and none credentials fail closed; existing service credentials work', () => {
  for (const env of [{}, { CHATGPT_API_KEY: 'none' }, { OMNISTUDIO_GATEWAY_TOKEN: '' }]) {
    assert.equal(isAuthorizedGateway({ headers: { authorization: 'Bearer none' } }, env), false);
  }
  assert.equal(isAuthorizedGateway({ headers: { authorization: 'Bearer wrong' } }), false);
  assert.equal(isAuthorizedGateway({ headers: { authorization: 'Bearer audit-gateway-fixture' } }), true);
  assert.equal(isAuthorizedGateway({ headers: { 'x-api-key': 'audit-chat-fixture' } }), true);
});
test('authorized backend can submit while a wrong tenant cannot read its receipt', async () => {
  const headers = { authorization: 'Bearer audit-gateway-fixture', 'content-type': 'application/json' };
  const created = await fetch(base + '/images/generations?async=true', {
    method: 'POST', headers, body: JSON.stringify({ prompt: 'Owned neutral fixture', tenant_id: 'audit-owned', async: true }),
  });
  assert.equal(created.status, 202);
  const { job_id } = await created.json();
  assert.equal((await fetch(base + '/v1/images/status/' + job_id + '?tenant_id=audit-other', { headers })).status, 404);
  assert.equal((await fetch(base + '/v1/images/status/' + job_id + '?tenant_id=audit-owned', { headers })).status, 200);
  assert.equal((await fetch(base + '/job/next', { headers })).status, 403);
});
test('production boot without a distributed store cannot silently enable a simulator', () => {
  const env = { ...process.env, NODE_ENV: 'production', ALLOW_SIMULATOR: '',
    SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '', SUPABASE_SERVICE_KEY: '',
    GATEWAY_DURABLE_QUEUE: '0' };
  const result = spawnSync(process.execPath, ['-e', "require('./server')"], {
    cwd: path.resolve(__dirname, '..'), env, encoding: 'utf8', timeout: 10000,
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DISTRIBUTED_LEASE_STORE_REQUIRED/);
});
test('same tenant request ID cannot silently reuse a different SKU or reference set', () => {
  const input = { tenantId: 'sku-tenant', requestId: 'sku-request', prompt: '16L sprayer', type: 'image',
    referenceImages: [{url:'https://fixture.invalid/16L.png',role:'product'}] };
  const original = queue.createJob(input);
  assert.equal(queue.createJob(input).id, original.id);
  assert.throws(() => queue.createJob({...input,prompt:'10L sprayer'}), /IMAGE_IDEMPOTENCY_CONFLICT/);
  assert.throws(() => queue.createJob({...input,referenceImages:[{url:'https://fixture.invalid/10L.png',role:'product'}]}), /IMAGE_IDEMPOTENCY_CONFLICT/);
});
