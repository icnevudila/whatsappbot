'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { publicHealthStats } = require('../public_health');

test('public health excludes tenant jobs, prompts, assets, tokens and worker details', () => {
  const confidentialPayload = 'tenant-private-customer-data';
  const result = publicHealthStats({ pending: 3, activeCount: 1,
    recent: [{ tenantId: confidentialPayload, prompt: confidentialPayload, referenceImages: [confidentialPayload] }],
    activeWorkers: { worker: confidentialPayload }, futureField: confidentialPayload,
    workersStatus: { worker: { status: 'busy', details: confidentialPayload, sessionKey: confidentialPayload, jobId: confidentialPayload } } });
  assert.equal(result.pending, 3);
  assert.equal(result.workersStatus.worker.status, 'busy');
  assert.equal(JSON.stringify(result).includes(confidentialPayload), false);
  assert.equal('recent' in result, false);
  assert.equal('activeWorkers' in result, false);
});

test('untrusted status and counter strings cannot become public data', () => {
  const result = publicHealthStats({ pending: 'private', total: NaN,
    workersStatus: { worker: { status: 'private' } } });
  assert.equal('pending' in result, false);
  assert.equal('total' in result, false);
  assert.equal(result.workersStatus.worker.status, 'unknown');
});
