const test = require('node:test');
const assert = require('node:assert/strict');
const { TabRegistry, OrphanTabReaper, TAB_STATES } = require('../orphan_tab_reaper.js');

test('TabRegistry registers and tracks worker canonical ownership', () => {
  const registry = new TabRegistry();
  registry.bindWorkerCanonical('chatgpt-1', 'tab-101', 'https://chatgpt.com/');
  registry.bindWorkerCanonical('chatgpt-2', 'tab-102', 'https://chatgpt.com/');

  assert.equal(registry.isCanonicalForAnyWorker('tab-101'), true);
  assert.equal(registry.isCanonicalForAnyWorker('tab-102'), true);
  assert.equal(registry.isCanonicalForAnyWorker('tab-999'), false);

  const worker1Canonical = registry.getWorkerCanonicalTab('chatgpt-1');
  assert.equal(worker1Canonical.tabId, 'tab-101');
  assert.equal(worker1Canonical.canonical, true);
});

test('OrphanTabReaper: Active worker tab running a job is NEVER closed', () => {
  const registry = new TabRegistry();
  registry.bindWorkerCanonical('chatgpt-1', 'tab-active', 'https://chatgpt.com/c/active-chat');
  registry.setTabJob('tab-active', 'job_xyz123');

  const reaper = new OrphanTabReaper({ registry, minAgeMs: 1000 });
  const targets = [
    { id: 'tab-active', type: 'page', url: 'https://chatgpt.com/c/active-chat' }
  ];

  const { keep, close } = reaper.classifyTargets(targets, { now: Date.now() + 100000 });
  assert.equal(close.length, 0);
  assert.equal(keep.length, 1);
  assert.ok(keep[0].reason.includes('CANONICAL') || keep[0].reason.includes('ACTIVE_JOB'));
});

test('OrphanTabReaper: Canonical tabs for multiple concurrent workers are NEVER closed', () => {
  const registry = new TabRegistry();
  registry.bindWorkerCanonical('chatgpt-1', 'tab-w1', 'https://chatgpt.com/');
  registry.bindWorkerCanonical('chatgpt-2', 'tab-w2', 'https://chatgpt.com/');

  const reaper = new OrphanTabReaper({ registry, minAgeMs: 1000 });
  const targets = [
    { id: 'tab-w1', type: 'page', url: 'https://chatgpt.com/' },
    { id: 'tab-w2', type: 'page', url: 'https://chatgpt.com/' },
  ];

  const { keep, close } = reaper.classifyTargets(targets, { now: Date.now() + 100000 });
  assert.equal(close.length, 0);
  assert.equal(keep.length, 2);
  assert.equal(keep[0].reason, 'CANONICAL_WORKER_TAB');
  assert.equal(keep[1].reason, 'CANONICAL_WORKER_TAB');
});

test('OrphanTabReaper: Protected system URLs (monitor, rotate cookies, gemini) are NEVER closed', () => {
  const registry = new TabRegistry();
  const reaper = new OrphanTabReaper({ registry, minAgeMs: 1000 });
  const targets = [
    { id: 'tab-monitor', type: 'page', url: 'http://localhost:3456/monitor' },
    { id: 'tab-rotate', type: 'page', url: 'https://accounts.google.com/RotateCookiesPage?og_pid=658' },
    { id: 'tab-gemini', type: 'page', url: 'https://gemini.google.com/videos' },
    { id: 'tab-flow', type: 'page', url: 'https://flow.google.com/project/123' },
  ];

  const { keep, close } = reaper.classifyTargets(targets, { now: Date.now() + 100000 });
  assert.equal(close.length, 0);
  assert.equal(keep.length, 4);
  for (const item of keep) {
    assert.equal(item.reason, 'PROTECTED_SYSTEM_PAGE');
  }
});

test('OrphanTabReaper: Grace period protects newly created tabs from immediate closing', () => {
  const registry = new TabRegistry();
  const now = Date.now();
  // Register newly created duplicate tab with age = 5s (grace period = 60s)
  registry.registerTab('tab-new', { url: 'https://chatgpt.com/' });

  const reaper = new OrphanTabReaper({ registry, minAgeMs: 60000 });
  const targets = [
    { id: 'tab-new', type: 'page', url: 'https://chatgpt.com/' }
  ];

  const { keep, close } = reaper.classifyTargets(targets, { now: now + 5000 });
  assert.equal(close.length, 0);
  assert.equal(keep.length, 1);
  assert.ok(keep[0].reason.startsWith('GRACE_PERIOD_ACTIVE'));
});

test('OrphanTabReaper: Duplicate idle ChatGPT tabs older than grace period are reaped', () => {
  const registry = new TabRegistry();
  const now = Date.now();
  registry.bindWorkerCanonical('chatgpt-1', 'tab-canonical', 'https://chatgpt.com/');
  registry.registerTab('tab-duplicate', { url: 'https://chatgpt.com/' });

  const reaper = new OrphanTabReaper({ registry, minAgeMs: 60000 });
  const targets = [
    { id: 'tab-canonical', type: 'page', url: 'https://chatgpt.com/' },
    { id: 'tab-duplicate', type: 'page', url: 'https://chatgpt.com/' },
  ];

  // Evaluate after 70s (> grace period)
  const { keep, close } = reaper.classifyTargets(targets, { now: now + 70000 });
  assert.equal(keep.length, 1);
  assert.equal(keep[0].target.id, 'tab-canonical');

  assert.equal(close.length, 1);
  assert.equal(close[0].target.id, 'tab-duplicate');
  assert.equal(close[0].reason, 'DUPLICATE_IDLE_CHATGPT_HOME');
});

test('OrphanTabReaper: Abandoned prompt-textarea tabs are identified and reaped after grace period', () => {
  const registry = new TabRegistry();
  const now = Date.now();
  registry.registerTab('tab-stray', { url: 'https://chatgpt.com/?prompt-textarea=Some+old+prompt' });

  const reaper = new OrphanTabReaper({ registry, minAgeMs: 60000 });
  const targets = [
    { id: 'tab-stray', type: 'page', url: 'https://chatgpt.com/?prompt-textarea=Some+old+prompt' }
  ];

  const { keep, close } = reaper.classifyTargets(targets, { now: now + 65000 });
  assert.equal(close.length, 1);
  assert.equal(close[0].target.id, 'tab-stray');
  assert.equal(close[0].reason, 'ABANDONED_PROMPT_TEXTAREA_TAB');
});

test('OrphanTabReaper: Worker busy state aborts cleanup unconditionally', () => {
  const registry = new TabRegistry();
  const reaper = new OrphanTabReaper({ registry, minAgeMs: 1000 });
  const targets = [
    { id: 'tab-orphan', type: 'page', url: 'https://chatgpt.com/?prompt-textarea=abc' }
  ];

  const { keep, close } = reaper.classifyTargets(targets, { isCallerBusy: true });
  assert.equal(close.length, 0);
  assert.equal(keep.length, 1);
  assert.equal(keep[0].reason, 'WORKER_BUSY_ABORT');
});

test('OrphanTabReaper: sweep executes PUT /json/close on candidates and emits telemetry', async () => {
  const registry = new TabRegistry();
  registry.bindWorkerCanonical('chatgpt-1', 'tab-canonical', 'https://chatgpt.com/');
  const now = Date.now();
  registry.registerTab('tab-orphan', { url: 'https://chatgpt.com/?prompt-textarea=stray' });

  const closedCalls = [];
  const mockFetch = async (url, opts = {}) => {
    if (url.endsWith('/json/list')) {
      return {
        ok: true,
        json: async () => [
          { id: 'tab-canonical', type: 'page', url: 'https://chatgpt.com/' },
          { id: 'tab-orphan', type: 'page', url: 'https://chatgpt.com/?prompt-textarea=stray' },
        ]
      };
    }
    if (url.includes('/json/close/')) {
      closedCalls.push(url.split('/json/close/')[1]);
      return { ok: true, text: async () => 'Target is closing' };
    }
    return { ok: false };
  };

  const reaper = new OrphanTabReaper({
    registry,
    minAgeMs: 1000,
    cooldownMs: 0,
    fetchImpl: mockFetch,
  });

  // Fast forward past grace period
  const entry = registry.tabs.get('tab-orphan');
  entry.createdAt = now - 5000;

  const result = await reaper.sweep({
    cdpHttpUrl: 'http://127.0.0.1:9222',
    reason: 'test_sweep',
    force: true,
  });

  assert.equal(result.orphan_tabs_detected, 1);
  assert.equal(result.orphan_tabs_closed, 1);
  assert.deepEqual(closedCalls, ['tab-orphan']);
  assert.equal(registry.tabs.has('tab-orphan'), false);
  assert.equal(registry.isCanonicalForAnyWorker('tab-canonical'), true);
});
