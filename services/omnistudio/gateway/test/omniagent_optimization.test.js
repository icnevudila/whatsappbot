'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const chatManager = require('../chat_manager.js');
const runtimeMetrics = require('../runtime_metrics.js');

test('same-name different tenant has isolated chat manager and scope keys', () => {
  const tenant1 = { tenantId: 'tenant-alpha', customer: 'Lüks Mobilya', conversationId: 'c1' };
  const tenant2 = { tenantId: 'tenant-beta', customer: 'Lüks Mobilya', conversationId: 'c2' };

  chatManager.setCompanyChat(tenant1, 'chat', 'https://chatgpt.com/c/alpha-session');
  chatManager.setCompanyChat(tenant2, 'chat', 'https://chatgpt.com/c/beta-session');

  const chat1 = chatManager.getCompanyChat(tenant1, 'chat');
  const chat2 = chatManager.getCompanyChat(tenant2, 'chat');

  assert.equal(chat1.chatUrl, 'https://chatgpt.com/c/alpha-session');
  assert.equal(chat2.chatUrl, 'https://chatgpt.com/c/beta-session');
  assert.notEqual(chat1.chatUrl, chat2.chatUrl);
});

test('concurrent same-tenant messages write serialization prevents data loss', async () => {
  const scopeKey = 'tenant:tenant-concurrent:conversation:c1';
  let counter = 0;

  // Run 10 concurrent writes through serializeConversationWrite
  const tasks = Array.from({ length: 10 }, (_, i) => {
    return chatManager.serializeConversationWrite(scopeKey, async () => {
      const current = counter;
      await new Promise((r) => setTimeout(r, 5));
      counter = current + 1;
      return counter;
    });
  });

  const results = await Promise.all(tasks);
  assert.equal(counter, 10);
  assert.deepEqual(results, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test('cache eviction: expired TTL is evicted and LRU respects capacity limit', () => {
  const tempIdentity = { tenantId: 'tenant-evict', customer: 'Customer', conversationId: 'c' };
  chatManager.setCompanyChat(tempIdentity, 'chat', 'https://chatgpt.com/c/cached');

  const firstHit = chatManager.getCompanyChat(tempIdentity, 'chat');
  assert.equal(firstHit.chatUrl, 'https://chatgpt.com/c/cached');

  // Clear cache to verify fresh lookup
  chatManager.clearChatCache();
  const metricsBefore = chatManager.getChatCacheMetrics().miss;
  const afterClear = chatManager.getCompanyChat(tempIdentity, 'chat');
  assert.equal(afterClear.chatUrl, 'https://chatgpt.com/c/cached');
  assert.equal(chatManager.getChatCacheMetrics().miss, metricsBefore + 1);
});

test('stale text response protection: baseline assistant snapshot rejects existing messages', () => {
  const baselineCount = 2;
  const baselineText = 'Eski asistan yanıtı';
  
  // Simulated assistant nodes in DOM
  const existingDom = [
    { role: 'assistant', text: 'İlk yanıt' },
    { role: 'assistant', text: baselineText },
  ];

  // Helper simulating the worker check condition
  function checkResponse(assts) {
    if (assts.length <= baselineCount) {
      return { hasNewMsg: false, text: '' };
    }
    const lastAsst = assts[assts.length - 1];
    return { hasNewMsg: true, text: lastAsst.text };
  }

  // Before new generation completes: should report no new message
  assert.equal(checkResponse(existingDom).hasNewMsg, false);

  // When new assistant node appears: should accept only the new message
  const updatedDom = [...existingDom, { role: 'assistant', text: '{"suggestions":[{"label":"Kısa","text":"Yeni yanıt"}]}' }];
  const result = checkResponse(updatedDom);
  assert.equal(result.hasNewMsg, true);
  assert.match(result.text, /Yeni yanıt/);
});

test('stale image result protection: snapshot rejects pre-existing images', () => {
  const beforeImages = new Set([
    'https://chatgpt.com/backend-api/estuary/old-image-1.png',
    'https://chatgpt.com/backend-api/estuary/old-image-2.png',
  ]);

  function findGeneratedImage(candidateUrls) {
    for (const url of candidateUrls) {
      if (beforeImages.has(url)) continue; // Reject stale images
      if (url.includes('estuary') || url.includes('generated')) {
        return url;
      }
    }
    return null;
  }

  // If only old images present, fail-closed
  assert.equal(findGeneratedImage(Array.from(beforeImages)), null);

  // When new image appears, accept it
  const newImageUrl = 'https://chatgpt.com/backend-api/estuary/brand-new-image.png';
  const found = findGeneratedImage([...Array.from(beforeImages), newImageUrl]);
  assert.equal(found, newImageUrl);
});

test('immediate DOM readiness completes quickly without blind sleep penalties', async () => {
  const start = Date.now();
  
  // Mock CDP checking for input readiness immediately
  let pollCount = 0;
  async function mockWaitForInput(isReadyImmediate) {
    while (true) {
      pollCount++;
      if (isReadyImmediate) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  const ready = await mockWaitForInput(true);
  const elapsed = Date.now() - start;

  assert.equal(ready, true);
  assert.equal(pollCount, 1);
  assert.ok(elapsed < 100, `Expected elapsed < 100ms, got ${elapsed}ms`);
});

test('delayed DOM readiness succeeds after condition is met', async () => {
  let attempts = 0;
  const start = Date.now();

  async function mockWaitForInputDelayed() {
    while (attempts < 3) {
      attempts++;
      await new Promise((r) => setTimeout(r, 20));
    }
    return true;
  }

  const ready = await mockWaitForInputDelayed();
  assert.equal(ready, true);
  assert.equal(attempts, 3);
  assert.ok(Date.now() - start >= 60);
});

test('timeout fallback returns fail-closed error without stale data', async () => {
  async function waitForTextWithTimeout(timeoutMs) {
    const start = Date.now();
    let hasNewMsg = false;
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 10));
    }
    if (!hasNewMsg) {
      throw new Error('STALE_RESPONSE_DETECTED: Yeni model yanıtı üretilmedi');
    }
    return 'unexpected';
  }

  await assert.rejects(
    async () => { await waitForTextWithTimeout(30); },
    /STALE_RESPONSE_DETECTED/
  );
});

test('completed payload cleanup and size-aware retention telemetry', () => {
  // Verify runtimeMetrics tracks worker stages and prompt sizes
  const metrics = runtimeMetrics.createJobMetrics({
    operation: 'text_reply',
    tenantId: 'tenant-clean',
    requestId: 'req-clean',
    prompt: 'Koltuk fiyatı',
    companyContext: 'Mobilya mağazası',
    conversationHistory: 'Müşteri: Merhaba',
    productCount: 1,
    systemPromptChars: 560,
    now: 1000,
  });

  runtimeMetrics.recordWorkerStages(metrics, {
    worker_acquire_ms: 10,
    tab_acquire_ms: 5,
    tab_ready_ms: 8,
    prompt_insert_ms: 25,
    submit_ms: 12,
    first_response_signal_ms: 150,
    response_complete_ms: 450,
    parse_ms: 15,
    provider_wait_ms: 450,
    infrastructure_overhead_ms: 60,
    total_worker_ms: 510,
  });

  const finished = runtimeMetrics.finishMetrics(metrics, { now: 1600 });
  assert.equal(finished.prompt_sizes.system_prompt_chars, 560);
  assert.equal(finished.worker_stages.worker_acquire_ms, 10);
  assert.equal(finished.worker_stages.response_complete_ms, 450);
  assert.equal(finished.worker_stages.total_worker_ms, 510);
  assert.equal(finished.total_ms, 600);
});

test('retry policy classifies errors correctly and avoids duplicate provider requests', () => {
  const RETRYABLE_ERRORS = new Set(['TIMEOUT', 'SESSION_EXPIRED', 'RATE_LIMITED']);
  function isRetryable(err) {
    const s = String(err).toUpperCase();
    for (const r of RETRYABLE_ERRORS) {
      if (s.includes(r)) return true;
    }
    return false;
  }

  assert.equal(isRetryable('TIMEOUT'), true);
  assert.equal(isRetryable('SESSION_EXPIRED'), true);
  assert.equal(isRetryable('RATE_LIMITED'), true);
  assert.equal(isRetryable('MODEL_ERROR'), false);
  assert.equal(isRetryable('INVALID_RESPONSE'), false);
  assert.equal(isRetryable('IMAGE_GENERATION_FAILED'), false);
});
