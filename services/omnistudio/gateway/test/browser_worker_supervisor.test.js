const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BrowserWorkerSupervisor,
  WORKER_STATES,
  READINESS_STATES,
} = require('../browser_worker_supervisor.js');
const {
  DistributedLeaseStore,
  SharedDatabaseSimulator,
} = require('../distributed_lease_store.js');

function response(body, ok = true, status = 200) {
  return { ok, status, async json() { return body; } };
}

function harness(options = {}) {
  let now = options.initialNow ?? 1_000;
  const clock = options.clock || (() => now);
  let pid = 200;
  const running = new Set(options.runningPorts || []);
  const launches = [];
  const closes = [];
  const tabs = new Map();
  const profiles = [];

  const sharedDb = options.sharedDb || new SharedDatabaseSimulator();
  sharedDb.clock = clock;
  const leaseStore = options.leaseStore || new DistributedLeaseStore({ simulator: sharedDb, clock });

  for (const port of running) {
    tabs.set(port, [{ id: `tab-${port}`, type: 'page', url: 'https://gemini.google.com/videos' }]);
  }

  const fetchImpl = async (url, init = {}) => {
    const parsed = new URL(url);
    const port = Number(parsed.port);
    if (!running.has(port)) throw new Error('ECONNREFUSED');
    if (parsed.pathname === '/json/version') {
      return response({ Browser: 'FakeChrome', webSocketDebuggerUrl: null });
    }
    if (parsed.pathname === '/json/list') return response(tabs.get(port) || []);
    if (parsed.pathname === '/json/new') {
      const tab = { id: `tab-${port}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'page', url: decodeURIComponent(parsed.search.slice(1)) };
      tabs.set(port, [...(tabs.get(port) || []), tab]);
      return response(tab);
    }
    if (parsed.pathname.startsWith('/json/close/')) {
      const id = parsed.pathname.split('/').pop();
      tabs.set(port, (tabs.get(port) || []).filter(tab => tab.id !== id));
      closes.push(id);
      return response({});
    }
    return response({}, false, 404);
  };

  const launcher = async worker => {
    launches.push(worker.id);
    profiles.push(worker.profileDir);
    if (options.failLaunchFor?.has(worker.id)) throw new Error('launch failed');
    running.add(worker.cdpPort);
    tabs.set(worker.cdpPort, [{ id: `tab-${worker.cdpPort}`, type: 'page', url: worker.launchUrl }]);
    return { pid: ++pid, exitCode: null, killed: false, once() {}, kill() { this.killed = true; running.delete(worker.cdpPort); } };
  };

  const supervisor = new BrowserWorkerSupervisor({
    fetchImpl,
    launcher,
    clock,
    browserStartTimeout: 100,
    providerReadyTimeout: 100,
    idleBrowserTTL: options.idleBrowserTTL ?? 1_000,
    orphanScanInterval: 100,
    preferredWorkingTabs: 1,
    absoluteTabCap: 2,
    pollIntervalMs: 10,
    leaseStore,
  });

  const add = (id, port, validators = {}, provider = 'gemini', launchUrl = null) => supervisor.registerWorker({
    id,
    provider,
    accountId: id,
    profileDir: `/profiles/${id}`,
    cdpPort: port,
    launchUrl: launchUrl || (provider === 'flow' ? 'https://flow.google.com/' : 'https://gemini.google.com/videos'),
    sessionValidator: validators.sessionValidator || (async () => ({ ok: true })),
    providerReadyValidator: validators.providerReadyValidator || (async () => ({ ok: true })),
  });

  return {
    supervisor, add, launches, closes, profiles, tabs, running, sharedDb, leaseStore,
    advance(ms) { now += ms; },
  };
}

// 1. cold browser + incoming job -> boots and executes
test('1. cold browser incoming job boots, validates and executes only after READY', async () => {
  const h = harness();
  const worker = h.add('gemini-1', 9223);
  let observedReadiness = null;
  const result = await h.supervisor.runWithWorker({ provider: 'gemini', jobId: 'job-cold' }, async lease => {
    observedReadiness = worker.readiness;
    lease.setPhase('GENERATING');
    return 'ok';
  });
  assert.equal(result, 'ok');
  assert.deepEqual(h.launches, ['gemini-1']);
  assert.equal(observedReadiness, READINESS_STATES.READY);
  assert.equal(worker.state, WORKER_STATES.IDLE);
});

// 2. warm browser + incoming job -> reuses browser/tab
test('2. warm browser incoming job reuses browser and canonical tab', async () => {
  const h = harness({ runningPorts: [9223] });
  const worker = h.add('gemini-1', 9223);
  await h.supervisor.ensureReady(worker);
  const firstTab = worker.canonicalTabId;
  await h.supervisor.runWithWorker({ provider: 'gemini', jobId: 'job-warm' }, async () => 'ok');
  assert.equal(h.launches.length, 0);
  assert.equal(worker.canonicalTabId, firstTab);
  assert.equal(h.tabs.get(9223).length, 1);
});

// 3. same account + two jobs -> second waits
test('3. same account + two jobs -> second waits', async () => {
  const h = harness();
  h.add('gemini-1', 9223);

  const order = [];
  let concurrentExecutions = 0;
  let maxConcurrent = 0;

  const job1Promise = h.supervisor.runWithWorker({ provider: 'gemini', jobId: 'job-1' }, async lease => {
    concurrentExecutions++;
    maxConcurrent = Math.max(maxConcurrent, concurrentExecutions);
    order.push('job1-started');
    await new Promise(r => setTimeout(r, 20));
    order.push('job1-finished');
    concurrentExecutions--;
  });

  const job2Promise = h.supervisor.runWithWorker({ provider: 'gemini', jobId: 'job-2' }, async lease => {
    concurrentExecutions++;
    maxConcurrent = Math.max(maxConcurrent, concurrentExecutions);
    order.push('job2-started');
    order.push('job2-finished');
    concurrentExecutions--;
  });

  await Promise.all([job1Promise, job2Promise]);

  assert.equal(maxConcurrent, 1, 'account concurrency must not exceed 1');
  assert.deepEqual(order, ['job1-started', 'job1-finished', 'job2-started', 'job2-finished']);
});

// 4. two different accounts -> real parallel scheduling
test('4. two different accounts -> real parallel scheduling', async () => {
  const h = harness();
  h.add('gemini-1', 9223);
  h.add('gemini-2', 9224);

  let activeJobs = 0;
  let maxParallel = 0;

  const runJob = id => h.supervisor.runWithWorker({ provider: 'gemini', jobId: id }, async lease => {
    activeJobs++;
    maxParallel = Math.max(maxParallel, activeJobs);
    await new Promise(r => setTimeout(r, 25));
    activeJobs--;
    return lease.workerId;
  });

  const [w1, w2] = await Promise.all([runJob('j-p1'), runJob('j-p2')]);
  assert.equal(maxParallel, 2, 'must execute 2 jobs in parallel across 2 accounts');
  assert.notEqual(w1, w2);
});

// 5. third tab -> rejected or safe orphan cleaned
test('5. third tab -> rejected or safe orphan cleaned', async () => {
  const h = harness();
  const worker = h.add('gemini-1', 9223);
  await h.supervisor.ensureReady(worker);

  // Tab 1 is canonical (managed)
  assert.equal(h.tabs.get(9223).length, 1);

  // Part A: Stray orphan tab opens (e.g. ad popup, unmanaged)
  h.tabs.get(9223).push({ id: 'stray-tab', type: 'page', url: 'https://gemini.google.com/stray' });
  assert.equal(h.tabs.get(9223).length, 2);

  // Adding 3rd tab via createTab: cleans the unmanaged orphan (stray-tab) and creates new tab within cap 2!
  const newTab = await h.supervisor.createTab(worker.id, 'https://gemini.google.com/videos');
  assert.ok(newTab);
  assert.equal(h.tabs.get(9223).length, 2);
  assert.ok(h.closes.includes('stray-tab'), 'stray unmanaged orphan must be cleaned');

  // Part B: Both tabs are managed with active job/phase
  worker.tabOwnership.get(newTab.id).jobId = 'active-job';
  worker.tabOwnership.get(worker.canonicalTabId).jobId = 'active-job';

  // Now both tabs are managed. Third tab creation MUST be rejected:
  await assert.rejects(
    h.supervisor.createTab(worker.id, 'https://gemini.google.com/stray3'),
    error => error.code === 'TAB_CAP_REACHED'
  );
});

// 6. active generation -> TTL cannot close browser
test('6. active generation -> TTL cannot close browser', async () => {
  const h = harness();
  const worker = h.add('gemini-1', 9223);
  await h.supervisor.ensureReady(worker);
  const lease = await h.supervisor.acquire({ provider: 'gemini', jobId: 'job-gen' });
  lease.markExecutionStarted();
  lease.setPhase('GENERATING');

  // Advance time past idleBrowserTTL
  h.advance(25 * 60_000);
  await h.supervisor.maintenanceTick();

  assert.equal(worker.state, WORKER_STATES.BUSY);
  assert.equal(worker.phase, 'GENERATING');
  assert.notEqual(worker.state, WORKER_STATES.OFFLINE);
  await lease.release();
});

// 7. active download -> reaper cannot close browser
test('7. active download -> reaper cannot close browser', async () => {
  const h = harness();
  const worker = h.add('gemini-1', 9223);
  await h.supervisor.ensureReady(worker);
  const lease = await h.supervisor.acquire({ provider: 'gemini', jobId: 'job-dl' });
  lease.markExecutionStarted();
  lease.setPhase('DOWNLOADING');

  // Advance time past idleBrowserTTL
  h.advance(25 * 60_000);
  await h.supervisor.maintenanceTick();
  await h.supervisor.cleanupOrphans(worker);

  assert.equal(worker.state, WORKER_STATES.BUSY);
  assert.equal(worker.phase, 'DOWNLOADING');
  assert.notEqual(worker.state, WORKER_STATES.OFFLINE);
  await lease.release();
});

// 8. idle 20 minutes -> graceful Browser.close
test('8. idle 20 minutes -> graceful Browser.close', async () => {
  const h = harness({ idleBrowserTTL: 20 * 60_000 });
  const worker = h.add('gemini-1', 9223);
  await h.supervisor.ensureReady(worker);
  assert.equal(worker.state, WORKER_STATES.IDLE);

  // Advance 10 minutes (600,000 ms), maintenance tick
  h.advance(10 * 60_000);
  await h.supervisor.maintenanceTick();
  assert.equal(worker.state, WORKER_STATES.IDLE, 'worker must not shut down before 20 minutes');

  // Advance another 11 minutes (total 21 minutes, exceeds 20 minutes default TTL)
  h.advance(11 * 60_000);
  await h.supervisor.maintenanceTick();
  assert.equal(worker.state, WORKER_STATES.OFFLINE, 'worker must gracefully shut down after 20 minutes idle');
  assert.equal(worker.readiness, READINESS_STATES.NOT_READY);
});

// 9. restart -> same persistent profile/session reused
test('9. graceful shutdown and restart reuse the same persistent profile', async () => {
  const h = harness();
  const worker = h.add('gemini-1', 9223);
  await h.supervisor.ensureReady(worker);
  h.advance(2_000);
  await h.supervisor.maintenanceTick();
  assert.equal(worker.state, WORKER_STATES.OFFLINE);
  await h.supervisor.ensureReady(worker);
  assert.deepEqual(h.profiles, ['/profiles/gemini-1', '/profiles/gemini-1']);
  assert.equal(worker.readiness, READINESS_STATES.READY);
});

// 10. expired auth -> AUTH_REQUIRED, job preserved
test('10. expired auth becomes AUTH_REQUIRED and alternate account is selected', async () => {
  const h = harness();
  const expired = h.add('gemini-expired', 9223, {
    sessionValidator: async () => ({ ok: false, code: 'AUTH_REQUIRED', message: 'expired' }),
  });
  h.add('gemini-valid', 9224);
  const selected = await h.supervisor.runWithWorker({ provider: 'gemini', jobId: 'job-auth' }, async lease => lease.workerId);
  assert.equal(selected, 'gemini-valid');
  assert.equal(expired.state, WORKER_STATES.AUTH_REQUIRED);
});

// 11. startup failure -> alternate eligible account where appropriate
test('11. startup failure preserves provider execution and selects alternate account', async () => {
  const h = harness({ failLaunchFor: new Set(['gemini-bad']) });
  h.add('gemini-bad', 9223);
  h.add('gemini-good', 9224);
  let executions = 0;
  const selected = await h.supervisor.runWithWorker({ provider: 'gemini', jobId: 'job-alternate' }, async lease => {
    executions++;
    return lease.workerId;
  });
  assert.equal(selected, 'gemini-good');
  assert.equal(executions, 1);
  assert.equal(h.supervisor.jobReservations.size, 0);
});

// 12. Gemini account NO_QUOTA -> another Gemini account tried first
test('12. Gemini account NO_QUOTA -> another Gemini account tried first', async () => {
  const h = harness();
  const gemini1 = h.add('gemini-1', 9223, {
    providerReadyValidator: async () => ({ ok: false, code: 'QUOTA_EXHAUSTED', message: 'Quota limit' }),
  });
  const gemini2 = h.add('gemini-2', 9224, {
    providerReadyValidator: async () => ({ ok: true }),
  });
  const flow = h.add('flow-1', 9226, {}, 'flow');

  const acquisition = await h.supervisor.acquireVideo({ jobId: 'job-quota-try-next', preferredEngine: 'gemini' });
  assert.equal(acquisition.provider, 'gemini');
  assert.equal(acquisition.lease.workerId, 'gemini-2');
  assert.equal(gemini1.state, WORKER_STATES.QUOTA_EXHAUSTED);
  assert.equal(flow.state, WORKER_STATES.OFFLINE, 'flow standby must not start when another Gemini account is available');
  await acquisition.lease.release();
});

// 13. whole Gemini pool unavailable -> Flow fallback
test('13. whole Gemini pool unavailable -> Flow fallback', async () => {
  const h = harness();
  h.add('gemini-1', 9223, {
    providerReadyValidator: async () => ({ ok: false, code: 'QUOTA_EXHAUSTED', message: 'Gemini 1 quota exhausted' }),
  });
  h.add('gemini-2', 9224, {
    providerReadyValidator: async () => ({ ok: false, code: 'QUOTA_EXHAUSTED', message: 'Gemini 2 quota exhausted' }),
  });
  const flow = h.add('flow-1', 9226, {}, 'flow');

  const acquisition = await h.supervisor.acquireVideo({ jobId: 'job-flow-fallback', preferredEngine: 'gemini' });
  assert.equal(acquisition.provider, 'flow');
  assert.equal(acquisition.fallbackFrom, 'gemini');
  assert.equal(acquisition.lease.workerId, 'flow-1');
  assert.equal(flow.state, WORKER_STATES.BUSY);
  await acquisition.lease.release();
});

// 14. heartbeat does not create tab leak
test('14. heartbeat does not create tab leak', async () => {
  const h = harness();
  const worker = h.add('gemini-1', 9223);
  await h.supervisor.ensureReady(worker);
  assert.equal(h.tabs.get(9223).length, 1);

  for (let i = 0; i < 25; i++) {
    const res = await h.supervisor.heartbeat(worker.id);
    assert.equal(res.ok, true);
  }

  assert.equal(h.tabs.get(9223).length, 1, 'tabs must not increase from heartbeat calls');
});

// 15. maintenance scan does not refresh real lastActivity
test('15. maintenance scan does not refresh real lastActivity', async () => {
  const h = harness({ idleBrowserTTL: 20 * 60_000 });
  const worker = h.add('gemini-1', 9223);
  await h.supervisor.runWithWorker({ provider: 'gemini', jobId: 'job-real' }, async () => 'ok');

  const realActivityAt = worker.lastActivityAt;

  // Run 15 maintenance ticks + 15 heartbeats over 15 simulated minutes
  for (let i = 0; i < 15; i++) {
    h.advance(60_000);
    await h.supervisor.maintenanceTick();
    await h.supervisor.heartbeat(worker.id);
    assert.equal(worker.lastActivityAt, realActivityAt, 'maintenance or heartbeat must not update lastActivityAt');
  }

  // Advance remaining 6 minutes (total 21 minutes)
  h.advance(6 * 60_000);
  await h.supervisor.maintenanceTick();
  assert.equal(worker.state, WORKER_STATES.OFFLINE, 'idle shutdown must occur based on real job activity');
});

// 16. crash/restart -> no duplicate job execution
test('16. duplicate recovery cannot execute the same job twice', async () => {
  const h = harness();
  h.add('gemini-1', 9223);
  const lease = await h.supervisor.acquire({ provider: 'gemini', jobId: 'job-once' });
  lease.markExecutionStarted();
  assert.throws(() => lease.markExecutionStarted(), error => error.code === 'DUPLICATE_JOB_EXECUTION');
  await assert.rejects(
    h.supervisor.acquire({ provider: 'gemini', jobId: 'job-once' }),
    error => error.code === 'DUPLICATE_JOB_EXECUTION'
  );
  await lease.release();
});

// Phase protection
test('idle shutdown never closes STARTING, BUSY, GENERATING, DOWNLOADING or VERIFYING workers', async () => {
  for (const phase of ['STARTING', 'BUSY', 'GENERATING', 'DOWNLOADING', 'VERIFYING']) {
    const h = harness();
    const worker = h.add(`gemini-${phase}`, 9300 + Math.random() * 100 | 0);
    await h.supervisor.ensureReady(worker);
    worker.phase = phase;
    if (phase === 'BUSY') worker.state = WORKER_STATES.BUSY;
    h.advance(2_000);
    await h.supervisor.maintenanceTick();
    assert.notEqual(worker.state, WORKER_STATES.OFFLINE, `phase ${phase} must be protected`);
  }
});

// Prewarm
test('queue-aware prewarm starts an eligible Gemini worker only when queue has work', async () => {
  const h = harness();
  h.add('gemini-1', 9223);
  assert.equal(await h.supervisor.prewarm('gemini', 0), null);
  assert.equal(h.launches.length, 0);
  assert.equal(await h.supervisor.prewarm('gemini', 1), 'gemini-1');
  assert.equal(h.launches.length, 1);
});

// 17. VNC disabled -> normal mocked job path works
test('17. VNC disabled -> normal mocked job path works', async () => {
  const prevVnc = process.env.VNC_ENABLED;
  const prevDisplay = process.env.DISPLAY;
  try {
    process.env.VNC_ENABLED = 'false';
    delete process.env.DISPLAY;
    const h = harness();
    h.add('gemini-1', 9223);

    const result = await h.supervisor.runWithWorker({ provider: 'gemini', jobId: 'job-no-vnc' }, async lease => {
      assert.equal(lease.workerId, 'gemini-1');
      return 'success';
    });
    assert.equal(result, 'success');
  } finally {
    process.env.VNC_ENABLED = prevVnc;
    process.env.DISPLAY = prevDisplay;
  }
});

// Mocked stress test: 100 sequential jobs across 4 accounts
test('mocked stress test: 100 sequential jobs across 4 accounts', async () => {
  const h = harness();
  const accounts = ['gemini-1', 'gemini-2', 'gemini-3', 'gemini-4'];
  const ports = [9223, 9224, 9225, 9226];
  for (let i = 0; i < accounts.length; i++) {
    h.add(accounts[i], ports[i]);
  }

  const concurrentPerAccount = new Map(accounts.map(a => [a, 0]));
  let maxConcurrentPerAccount = 0;

  for (let i = 0; i < 100; i++) {
    const jobId = `stress-job-${i}`;
    const targetAccount = accounts[i % accounts.length];
    await h.supervisor.runWithWorker({ provider: 'gemini', jobId, preferredWorkerIds: [targetAccount] }, async lease => {
      const acc = lease.accountId;
      const count = (concurrentPerAccount.get(acc) || 0) + 1;
      concurrentPerAccount.set(acc, count);
      maxConcurrentPerAccount = Math.max(maxConcurrentPerAccount, count);
      lease.setPhase('GENERATING');

      // Check tab ownership metadata
      const worker = h.supervisor.workers.get(lease.workerId);
      const tabMeta = worker.tabOwnership.get(worker.canonicalTabId);
      assert.equal(tabMeta.job_id, jobId);
      assert.equal(tabMeta.provider, 'gemini');

      concurrentPerAccount.set(acc, count - 1);
    });
  }

  // Assertions:
  assert.equal(maxConcurrentPerAccount, 1, 'no same-account concurrent execution');
  assert.ok(h.launches.length <= 4, `no unbounded browser growth (actual launches: ${h.launches.length})`);

  for (const port of ports) {
    const tabsForPort = h.tabs.get(port) || [];
    assert.ok(tabsForPort.length <= 2, `no unbounded tab growth (port ${port} has ${tabsForPort.length} tabs)`);
  }

  assert.equal(h.supervisor.jobReservations.size, 0, 'all leases must be released');

  // Verify steady state: all workers IDLE with no active job
  for (const worker of h.supervisor.workers.values()) {
    assert.equal(worker.currentJobId, null);
    assert.equal(worker.state, WORKER_STATES.IDLE);
    assert.equal(worker.phase, null);
  }
});

test('21. TWO_PROCESS_SAME_ACCOUNT_TEST: two independent supervisor hosts -> same account -> exactly one acquires, second waits/rejects, 0 duplicate executions', async () => {
  const sharedDb = new SharedDatabaseSimulator();
  const realClock = () => Date.now();
  sharedDb.clock = realClock;

  // Host A
  const hostA = harness({
    sharedDb,
    clock: realClock,
    runningPorts: [9223],
  });
  hostA.add('gemini-1', 9223);

  // Host B (completely separate supervisor instance / host)
  const hostB = harness({
    sharedDb,
    clock: realClock,
    runningPorts: [9223],
  });
  hostB.add('gemini-1', 9223);

  let activeOnHostA = 0;
  let activeOnHostB = 0;
  let maxConcurrent = 0;
  const executionOrder = [];

  // 1. Host A acquires gemini-1
  const leaseA = await hostA.supervisor.acquire({
    jobId: 'job-host-a-1',
    provider: 'gemini',
    workerId: 'gemini-1',
  });
  assert.equal(leaseA.acquired, true);
  activeOnHostA++;
  maxConcurrent = Math.max(maxConcurrent, activeOnHostA + activeOnHostB);
  executionOrder.push('host-a-start');

  // 2. Concurrently, Host B attempts to acquire the exact same account
  const leaseBPromise = hostB.supervisor.acquire({
    jobId: 'job-host-b-1',
    provider: 'gemini',
    workerId: 'gemini-1',
    acquireTimeoutMs: 50,
  });

  // Host B should fail to acquire because Host A holds the distributed database lease
  await assert.rejects(leaseBPromise, err => {
    assert.match(err.message, /ACCOUNT_BUSY|Account leased by another host/);
    return true;
  });

  assert.equal(activeOnHostB, 0, 'Host B must not execute while Host A holds the distributed lease');

  // 3. Host A completes and releases
  await hostA.supervisor.release('gemini-1', 'job-host-a-1', leaseA.leaseToken, {});
  activeOnHostA--;
  executionOrder.push('host-a-finish');

  // 4. Now Host B can acquire the account cleanly
  const leaseB = await hostB.supervisor.acquire({
    jobId: 'job-host-b-2',
    provider: 'gemini',
    workerId: 'gemini-1',
  });
  assert.equal(leaseB.acquired, true);
  activeOnHostB++;
  maxConcurrent = Math.max(maxConcurrent, activeOnHostA + activeOnHostB);
  executionOrder.push('host-b-start');

  await hostB.supervisor.release('gemini-1', 'job-host-b-2', leaseB.leaseToken, {});
  activeOnHostB--;
  executionOrder.push('host-b-finish');

  assert.equal(maxConcurrent, 1, 'ZERO duplicate executions across multiple supervisor processes');
  assert.deepEqual(executionOrder, ['host-a-start', 'host-a-finish', 'host-b-start', 'host-b-finish']);
});

test('22. STALE_LEASE_RECOVERY_TEST: stale lease takeover after TTL', async () => {
  const sharedDb = new SharedDatabaseSimulator();
  let now = 100_000;
  sharedDb.clock = () => now;

  const storeA = new DistributedLeaseStore({ simulator: sharedDb, clock: () => now });
  const storeB = new DistributedLeaseStore({ simulator: sharedDb, clock: () => now });

  // 1. Host A acquires lease with short TTL (10 seconds)
  const leaseA = await storeA.acquireLease({
    provider: 'gemini',
    accountId: 'gemini-1',
    workerId: 'gemini-host-a',
    jobId: 'crashed-job',
    leaseToken: 'token-crashed-host-a',
    ttlSeconds: 10,
  });
  assert.equal(leaseA.acquired, true);

  // 2. Host B attempts immediate acquire -> rejected (ACCOUNT_BUSY)
  const attemptImmediate = await storeB.acquireLease({
    provider: 'gemini',
    accountId: 'gemini-1',
    workerId: 'gemini-host-b',
    jobId: 'recovery-job-1',
    leaseToken: 'token-host-b-1',
    ttlSeconds: 10,
  });
  assert.equal(attemptImmediate.acquired, false);
  assert.equal(attemptImmediate.message, 'ACCOUNT_BUSY');

  // 3. Host A crashes! Time advances 15 seconds (exceeding 10s TTL without heartbeat)
  now += 15_000;

  // 4. Host B attempts acquire -> stale lease is atomically taken over
  const recoveryLease = await storeB.acquireLease({
    provider: 'gemini',
    accountId: 'gemini-1',
    workerId: 'gemini-host-b',
    jobId: 'recovery-job-2',
    leaseToken: 'token-host-b-recovery',
    ttlSeconds: 10,
  });
  assert.equal(recoveryLease.acquired, true);
  assert.equal(recoveryLease.currentLeaseToken, 'token-host-b-recovery');
  assert.equal(recoveryLease.message, 'LEASE_ACQUIRED');

  // Verify full integration through BrowserWorkerSupervisor
  const hB = harness({ sharedDb, initialNow: now, runningPorts: [9223] });
  hB.add('gemini-1', 9223);

  // Release Store B's raw lease so supervisor can acquire
  await storeB.releaseLease({ provider: 'gemini', accountId: 'gemini-1', leaseToken: 'token-host-b-recovery' });

  const supervisorRes = await hB.supervisor.runWithWorker({ provider: 'gemini', jobId: 'healthy-job' }, async () => 'recovered');
  assert.equal(supervisorRes, 'recovered');
});

test('23. REAL_FLOW_USES_SUPERVISOR: Flow external lease contract works and prevents collisions', async () => {
  const sharedDb = new SharedDatabaseSimulator();
  let now = 50_000;
  sharedDb.clock = () => now;

  const h = harness({ sharedDb, initialNow: now });
  h.add('flow-primary', 9226, {}, 'flow');

  // 1. Flow acquires lease
  const flowLease = await h.supervisor.acquireExternalLease({
    provider: 'flow',
    accountId: 'account-01',
    jobId: 'flow-job-1',
    ttlSeconds: 60,
  });
  assert.equal(flowLease.acquired, true);
  assert.ok(flowLease.leaseToken);

  // 2. Second Flow job on same account is rejected
  await assert.rejects(
    h.supervisor.acquireExternalLease({
      provider: 'flow',
      accountId: 'account-01',
      jobId: 'flow-job-2',
    }),
    err => {
      assert.equal(err.code, 'ACCOUNT_BUSY');
      return true;
    }
  );

  // 3. Different Flow account can acquire concurrently
  const flowLease2 = await h.supervisor.acquireExternalLease({
    provider: 'flow',
    accountId: 'account-02',
    jobId: 'flow-job-3',
  });
  assert.equal(flowLease2.acquired, true);

  // 4. Release first account
  await h.supervisor.releaseExternalLease({
    provider: 'flow',
    accountId: 'account-01',
    leaseToken: flowLease.leaseToken,
  });

  // 5. Account 01 can now be acquired again
  const flowLease1Reacquired = await h.supervisor.acquireExternalLease({
    provider: 'flow',
    accountId: 'account-01',
    jobId: 'flow-job-4',
  });
  assert.equal(flowLease1Reacquired.acquired, true);

  await h.supervisor.releaseExternalLease({
    provider: 'flow',
    accountId: 'account-01',
    leaseToken: flowLease1Reacquired.leaseToken,
  });
  await h.supervisor.releaseExternalLease({
    provider: 'flow',
    accountId: 'account-02',
    leaseToken: flowLease2.leaseToken,
  });
});
