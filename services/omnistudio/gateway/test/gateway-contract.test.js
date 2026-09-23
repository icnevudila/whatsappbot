'use strict';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

const gatewayDir = path.resolve(__dirname, '..');
const port = 41000 + Math.floor(Math.random() * 1000);
const baseUrl = `http://127.0.0.1:${port}`;
let gateway;

async function request(pathname, options = {}) {
  const response = await fetch(`${baseUrl}${pathname}`, options);
  const body = await response.json();
  return { response, body };
}

async function nextJob(workerId) {
  for (let i = 0; i < 30; i++) {
    const { body } = await request(`/job/next?platform=chatgpt&workerId=${encodeURIComponent(workerId)}`);
    if (body.job) return body.job;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Timed out waiting for queued job');
}

async function submitText(body, result = { suggestions: [{ label: 'Kısa & Net', text: 'Test yanıtı' }], raw: '{"suggestions":[]}' }) {
  const pendingResponse = request('/v1/chat/suggestions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const job = await nextJob(`text-${Math.random()}`);
  await request('/job/complete-text', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id, result }),
  });
  return { job, response: await pendingResponse };
}

before(async () => {
  gateway = spawn(process.execPath, ['server.js'], {
    cwd: gatewayDir,
    env: {
      ...process.env, PORT: String(port), PUBLIC_HOST: '127.0.0.1',
      COMPLETED_JOB_TTL_MS: '10', FAILED_JOB_TTL_MS: '10', MAX_RETAINED_COMPLETED_JOBS: '3',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  gateway.stdout.on('data', (chunk) => { output += chunk; });
  gateway.stderr.on('data', (chunk) => { output += chunk; });
  for (let i = 0; i < 80; i++) {
    if (output.includes('OmniStudio AI Visual Gateway')) return;
    if (gateway.exitCode !== null) throw new Error(output);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Gateway did not start: ${output}`);
});

after(() => {
  gateway?.kill('SIGTERM');
});

test('normal WhatsApp reply preserves company, tone and supplied history', async () => {
  const { job, response } = await submitText({
    customer: 'Mobilya A', tenant_id: 'tenant-a', request_id: 'normal-1', incomingMessage: 'Merhaba',
    tone: 'samimi', companyContext: 'Ev mobilyası', conversationHistory: 'Müşteri: koltuk bakıyorum',
  });
  assert.equal(job.tenantId, 'tenant-a');
  assert.equal(job.requestId, 'normal-1');
  assert.equal(job.companyContext, 'Ev mobilyası');
  assert.equal(job.conversationHistory, 'Müşteri: koltuk bakıyorum');
  assert.equal(response.response.status, 200);
  assert.equal(response.body.suggestions[0].text, 'Test yanıtı');
});

test('product, price and unknown-product messages remain distinct worker inputs', async () => {
  for (const incomingMessage of ['Koltuk modeliniz var mı?', 'Bu pompa ne kadar?', 'Bilinmeyen ürünün fiyatı nedir?']) {
    const { job } = await submitText({ customer: 'Mağaza', incomingMessage });
    assert.equal(job.incomingMessage, incomingMessage);
    assert.equal(job.type, 'chat_suggestions');
  }
});

test('missing company context is accepted and remains empty', async () => {
  const { job, response } = await submitText({ customer: 'Genel', incomingMessage: 'Saat kaçta açıksınız?' });
  assert.equal(job.companyContext, '');
  assert.equal(response.response.status, 200);
});

test('worker errors complete the synchronous text request with the existing 500 contract', async () => {
  const pendingResponse = request('/v1/chat/suggestions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: 'Hata', incomingMessage: 'Merhaba' }),
  });
  const job = await nextJob('text-error');
  await request('/job/release', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id, error: 'MODEL_ERROR' }),
  });
  const response = await pendingResponse;
  assert.equal(response.response.status, 500);
  assert.equal(response.body.error, 'MODEL_ERROR');
});

test('image generation remains an async queue contract and returns a URL after upload', async () => {
  const created = await request('/v1/images/generations?async=true', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: 'Kırmızı sandalye', tenant_id: 'tenant-image', request_id: 'image-1', async: true }),
  });
  assert.equal(created.response.status, 202);
  const job = await nextJob('image-worker');
  assert.equal(job.type, 'image');
  assert.equal(job.tenantId, 'tenant-image');
  await request(`/upload?jobId=${encodeURIComponent(job.id)}&filename=contract-test.png`, {
    method: 'POST', headers: { 'Content-Type': 'image/png' }, body: Buffer.from([137, 80, 78, 71]),
  });
  const status = await request(`/v1/images/status/${job.id}`);
  assert.equal(status.body.status, 'completed');
  assert.match(status.body.result_url, /contract-test\.png$/);
});

test('malformed worker text result preserves the existing pass-through response shape', async () => {
  const { response } = await submitText({ customer: 'Bozuk', incomingMessage: 'Yanıtla' }, { raw: 'not-json' });
  assert.equal(response.response.status, 200);
  assert.deepEqual(response.body.suggestions, []);
  assert.equal(response.body.raw, 'not-json');
});

test('same customer display name from different tenants cannot cancel each other', async () => {
  const first = request('/v1/chat/suggestions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_id: 'tenant-a', conversation_id: 'conv-a', customer: 'Ahmet', incomingMessage: 'A mesajı' }),
  });
  const second = request('/v1/chat/suggestions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_id: 'tenant-b', conversation_id: 'conv-b', customer: 'Ahmet', incomingMessage: 'B mesajı' }),
  });
  const firstJob = await nextJob('tenant-a-worker');
  const secondJob = await nextJob('tenant-b-worker');
  assert.notEqual(firstJob.scopeKey, secondJob.scopeKey);
  await Promise.all([firstJob, secondJob].map((job) => request('/job/complete-text', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobId: job.id, result: { suggestions: [{ label: 'Test', text: job.incomingMessage }], raw: '' } }),
  })));
  assert.equal((await first).response.status, 200);
  assert.equal((await second).response.status, 200);
});

test('a duplicate tenant/request/operation is executed once and shares its result', async () => {
  const body = { tenant_id: 'tenant-a', request_id: 'same-request', customer: 'Ahmet', incomingMessage: 'Tek sefer üret' };
  const first = request('/v1/chat/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const second = request('/v1/chat/suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const job = await nextJob('idempotency-worker');
  const noDuplicate = await request('/job/next?platform=chatgpt&workerId=idempotency-worker-2');
  assert.equal(noDuplicate.body.job, null);
  await request('/job/complete-text', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jobId: job.id, result: { suggestions: [{ label: 'Test', text: 'Tek sonuç' }], raw: '' } }),
  });
  assert.deepEqual((await first).body.suggestions, (await second).body.suggestions);
});

test('completed jobs expire without deleting an active response', async () => {
  const created = await request('/v1/images/generations?async=true', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Retention test', async: true }),
  });
  const job = await nextJob('retention-worker');
  await request(`/upload?jobId=${job.id}&filename=retention-test.png`, { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: Buffer.from([1, 2, 3]) });
  assert.equal((await request(`/v1/images/status/${job.id}`)).response.status, 200);
  await new Promise((resolve) => setTimeout(resolve, 20));
  await request('/v1/images/generations?async=true', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Cleanup trigger', async: true }),
  });
  assert.equal((await request(`/v1/images/status/${job.id}`)).response.status, 404);
  assert.equal(created.body.status, 'pending');
});
