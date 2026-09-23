'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createJobMetrics, setStage, finishMetrics } = require('../runtime_metrics.js');

test('metrics preserve only request metadata and prompt sizes', () => {
  const metrics = createJobMetrics({
    operation: 'text_reply', tenantId: 'tenant-a', requestId: 'request-1',
    prompt: 'Merhaba', companyContext: 'Mobilya', conversationHistory: 'Önceki mesaj', productCount: 2, now: 100,
  });
  setStage(metrics, 'queue_wait_ms', 12.6);
  const payload = finishMetrics(metrics, { now: 145 });

  assert.equal(payload.total_ms, 45);
  assert.equal(payload.stages.queue_wait_ms, 13);
  assert.equal(payload.prompt_sizes.context_chars, 'Mobilya'.length);
  assert.equal(JSON.stringify(payload).includes('Merhaba'), false);
  assert.equal(JSON.stringify(payload).includes('Önceki mesaj'), false);
});

test('unknown or negative stages are rejected without corrupting metrics', () => {
  const metrics = createJobMetrics({ operation: 'image_generation', now: 10 });
  setStage(metrics, 'not_a_stage', 20);
  setStage(metrics, 'ai_request_ms', -1);
  assert.equal(metrics.stages.ai_request_ms, null);
  assert.equal(Object.hasOwn(metrics.stages, 'not_a_stage'), false);
});
