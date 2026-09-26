const { spawn } = require('child_process');
const crypto = require('crypto');
const EventEmitter = require('events');

const WORKER_STATES = Object.freeze({
  OFFLINE: 'OFFLINE',
  STARTING: 'STARTING',
  IDLE: 'IDLE',
  BUSY: 'BUSY',
  COOLDOWN: 'COOLDOWN',
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  QUOTA_EXHAUSTED: 'QUOTA_EXHAUSTED',
  UNHEALTHY: 'UNHEALTHY',
});

const READINESS_STATES = Object.freeze({
  NOT_READY: 'NOT_READY',
  WORKER_STARTING: 'WORKER_STARTING',
  CDP_READY: 'CDP_READY',
  SESSION_VALID: 'SESSION_VALID',
  PROVIDER_READY: 'PROVIDER_READY',
  READY: 'READY',
});

const ACTIVE_PHASES = new Set(['STARTING', 'BUSY', 'GENERATING', 'DOWNLOADING', 'VERIFYING']);
const ELIGIBLE_STATES = new Set([WORKER_STATES.OFFLINE, WORKER_STATES.IDLE, WORKER_STATES.UNHEALTHY]);

function numberFromEnv(name, fallback, minimum = 1) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.max(minimum, value) : fallback;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function workerError(code, message, worker = null) {
  const error = new Error(message);
  error.code = code;
  error.workerId = worker?.id || null;
  error.accountId = worker?.accountId || null;
  error.retryable = ['BROWSER_START_TIMEOUT', 'CDP_NOT_READY', 'PROVIDER_NOT_READY', 'NO_ELIGIBLE_WORKER'].includes(code);
  return error;
}

const { DistributedLeaseStore } = require('./distributed_lease_store.js');

class BrowserWorkerSupervisor extends EventEmitter {
  constructor(options = {}) {
    super();
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.launcher = options.launcher || this._defaultLauncher.bind(this);
    this.clock = options.clock || (() => Date.now());
    this.sleep = options.sleep || sleep;
    this.leaseStore = options.leaseStore || new DistributedLeaseStore({ clock: this.clock });
    this.leaseHeartbeatInterval = options.leaseHeartbeatInterval ?? 20_000;
    this.activeLeaseHeartbeats = new Map();
    this.browserStartTimeout = options.browserStartTimeout ?? numberFromEnv('BROWSER_START_TIMEOUT_MS', 45_000, 1000);
    this.providerReadyTimeout = options.providerReadyTimeout ?? numberFromEnv('PROVIDER_READY_TIMEOUT_MS', 30_000, 1000);
    this.idleBrowserTTL = options.idleBrowserTTL ?? numberFromEnv('IDLE_BROWSER_TTL_MS', 20 * 60_000, 1000);
    this.orphanScanInterval = options.orphanScanInterval ?? numberFromEnv('ORPHAN_SCAN_INTERVAL_MS', 60_000, 1000);
    this.preferredWorkingTabs = options.preferredWorkingTabs ?? numberFromEnv('PREFERRED_WORKING_TABS', 1, 1);
    this.absoluteTabCap = options.absoluteTabCap ?? numberFromEnv('ABSOLUTE_TAB_CAP', 2, 1);
    this.pollIntervalMs = options.pollIntervalMs ?? 25;
    this.workers = new Map();
    this.jobReservations = new Map();
    this.timer = null;
  }

  registerWorker(config) {
    if (!config?.provider || !config?.accountId || !config?.profileDir || !config?.cdpPort) {
      throw new Error('provider, accountId, profileDir and cdpPort are required');
    }
    const id = config.id || `${config.provider}:${config.accountId}`;
    if (this.workers.has(id)) throw new Error(`Worker already registered: ${id}`);
    const now = this.clock();
    const worker = {
      id,
      provider: config.provider,
      accountId: config.accountId,
      canonicalAccountId: config.canonicalAccountId ? String(config.canonicalAccountId).toLowerCase().trim() : null,
      aliases: Array.isArray(config.aliases) ? config.aliases : [],
      profileDir: config.profileDir,
      cdpPort: Number(config.cdpPort),
      launchUrl: config.launchUrl || 'about:blank',
      warm: config.warm === true,
      sessionValidator: config.sessionValidator || null,
      providerReadyValidator: config.providerReadyValidator || null,
      state: WORKER_STATES.OFFLINE,
      readiness: READINESS_STATES.NOT_READY,
      phase: null,
      browserPid: null,
      process: null,
      currentJobId: null,
      leaseToken: null,
      canonicalTabId: null,
      tabOwnership: new Map(),
      startedAt: null,
      lastActivityAt: now,
      lastHeartbeatAt: now,
      crashCount: 0,
      restartCount: 0,
      lastError: null,
      startupPromise: null,
      stopping: false,
      executionStarted: false,
    };
    this.workers.set(id, worker);
    return worker;
  }

  getCanonicalAccountId(worker) {
    if (worker?.canonicalAccountId) return String(worker.canonicalAccountId).toLowerCase().trim();
    if (worker?.accountId && worker.accountId.includes('@')) {
      return String(worker.accountId).toLowerCase().trim();
    }
    return worker?.accountId || worker?.id;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.maintenanceTick().catch(error => console.warn('[BrowserSupervisor] maintenance warning:', error.message));
    }, Math.min(this.orphanScanInterval, 60_000));
    this.timer.unref?.();
    for (const worker of this.workers.values()) {
      if (worker.warm) this.prewarm(worker.provider, 1, [worker.id]).catch(() => {});
    }
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async _defaultLauncher(worker) {
    const args = [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-search-engine-choice-screen',
      `--user-data-dir=${worker.profileDir}`,
      `--remote-debugging-port=${worker.cdpPort}`,
      '--start-maximized',
      worker.launchUrl,
    ];
    const child = spawn(process.env.CHROME_BIN || '/usr/bin/google-chrome-stable', args, {
      detached: false,
      stdio: 'ignore',
      env: { ...process.env, DISPLAY: process.env.DISPLAY || ':99' },
    });
    child.once('exit', (code, signal) => {
      if (worker.stopping) return;
      worker.browserPid = null;
      worker.process = null;
      worker.crashCount++;
      worker.readiness = READINESS_STATES.NOT_READY;
      worker.lastError = `Chrome exited (${code ?? 'null'}/${signal || 'none'})`;
      worker.state = worker.currentJobId ? WORKER_STATES.UNHEALTHY : WORKER_STATES.OFFLINE;
    });
    return child;
  }

  _cdpUrl(worker, path = '/json/list') {
    return `http://127.0.0.1:${worker.cdpPort}${path}`;
  }

  async _fetchJson(url, options = {}, timeoutMs = 4000) {
    const response = await this.fetchImpl(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async _isCdpReady(worker) {
    try {
      await this._fetchJson(this._cdpUrl(worker, '/json/version'), {}, 1500);
      return true;
    } catch {
      return false;
    }
  }

  async _waitForCdp(worker) {
    const deadline = this.clock() + this.browserStartTimeout;
    while (this.clock() < deadline) {
      if (await this._isCdpReady(worker)) return;
      if (worker.process && worker.process.exitCode !== null) break;
      await sleep(250);
    }
    throw workerError('BROWSER_START_TIMEOUT', `CDP did not become ready on port ${worker.cdpPort}`, worker);
  }

  async _listTabs(worker) {
    const targets = await this._fetchJson(this._cdpUrl(worker));
    return targets.filter(target => target.type === 'page');
  }

  async _closeTab(worker, tabId) {
    try {
      await this.fetchImpl(this._cdpUrl(worker, `/json/close/${tabId}`), {
        method: 'PUT',
        signal: AbortSignal.timeout(3000),
      });
      worker.tabOwnership.delete(tabId);
      if (worker.canonicalTabId === tabId) worker.canonicalTabId = null;
      return true;
    } catch {
      return false;
    }
  }

  _buildTabOwnership(worker, tab, options = {}) {
    const now = this.clock();
    const isCanonical = options.canonical ?? true;
    const purpose = options.purpose || (isCanonical ? 'working' : 'subordinate');
    const jobId = options.jobId ?? worker.currentJobId ?? null;
    const phase = options.phase ?? worker.phase ?? null;
    return {
      provider: worker.provider,
      accountId: worker.accountId,
      account_id: worker.accountId,
      workerId: worker.id,
      worker_id: worker.id,
      jobId,
      job_id: jobId,
      purpose,
      createdAt: now,
      created_at: now,
      lastActivityAt: now,
      last_activity: now,
      activityPhase: phase,
      activity_phase: phase,
      phase,
      openerId: tab.openerId || null,
      opener_id: tab.openerId || null,
      canonical: isCanonical,
    };
  }

  async createTab(workerId, url = null, options = {}) {
    const worker = typeof workerId === 'string' ? this.workers.get(workerId) : workerId;
    if (!worker) throw workerError('NO_ELIGIBLE_WORKER', 'Unknown worker');
    let tabs = await this._listTabs(worker);
    if (tabs.length >= this.absoluteTabCap) {
      await this.cleanupOrphans(worker, { forceCap: true });
      tabs = await this._listTabs(worker);
    }
    if (tabs.length >= this.absoluteTabCap) {
      throw workerError('TAB_CAP_REACHED', `Tab cap ${this.absoluteTabCap} reached for ${worker.id}`, worker);
    }
    const targetUrl = url || worker.launchUrl;
    const tab = await this._fetchJson(
      this._cdpUrl(worker, `/json/new?${encodeURIComponent(targetUrl)}`),
      { method: 'PUT' },
      5000
    );
    const ownership = this._buildTabOwnership(worker, tab, {
      canonical: options.canonical ?? false,
      purpose: options.purpose || 'working',
      jobId: options.jobId ?? worker.currentJobId,
      phase: options.phase ?? worker.phase,
    });
    worker.tabOwnership.set(tab.id, ownership);
    return tab;
  }

  async _ensureWorkingTab(worker) {
    let tabs = await this._listTabs(worker);
    const host = new URL(worker.launchUrl).host;
    let tab = tabs.find(target => {
      try { return new URL(target.url).host === host; } catch { return false; }
    });
    if (!tab) {
      tab = await this.createTab(worker, worker.launchUrl, { canonical: true, purpose: 'working' });
    }
    worker.canonicalTabId = tab.id;
    if (!worker.tabOwnership.has(tab.id)) {
      worker.tabOwnership.set(tab.id, this._buildTabOwnership(worker, tab, { canonical: true, purpose: 'working' }));
    } else {
      const ownership = worker.tabOwnership.get(tab.id);
      ownership.canonical = true;
      ownership.jobId = worker.currentJobId;
      ownership.job_id = worker.currentJobId;
      ownership.phase = worker.phase;
      ownership.activityPhase = worker.phase;
      ownership.activity_phase = worker.phase;
    }
    return tab;
  }

  async ensureReady(worker) {
    if (typeof worker === 'string') worker = this.workers.get(worker);
    if (!worker) throw workerError('NO_ELIGIBLE_WORKER', 'Unknown worker');
    if (worker.readiness === READINESS_STATES.READY && await this._isCdpReady(worker)) return worker;
    if (worker.startupPromise) return worker.startupPromise;

    worker.startupPromise = (async () => {
      worker.state = WORKER_STATES.STARTING;
      worker.readiness = READINESS_STATES.WORKER_STARTING;
      worker.phase = 'STARTING';
      worker.lastActivityAt = this.clock();
      worker.lastError = null;
      try {
        if (!await this._isCdpReady(worker)) {
          const child = await this.launcher(worker);
          worker.process = child || null;
          worker.browserPid = child?.pid || null;
          worker.startedAt = this.clock();
          worker.restartCount++;
        }
        await this._waitForCdp(worker);
        worker.readiness = READINESS_STATES.CDP_READY;
        await this._ensureWorkingTab(worker);

        if (worker.sessionValidator) {
          const session = await Promise.race([
            Promise.resolve(worker.sessionValidator(worker)),
            sleep(this.providerReadyTimeout).then(() => ({ ok: false, code: 'SESSION_VALIDATION_TIMEOUT' })),
          ]);
          if (!session || session.ok !== true) {
            const code = session?.code || 'AUTH_REQUIRED';
            worker.state = code.includes('AUTH') ? WORKER_STATES.AUTH_REQUIRED : WORKER_STATES.UNHEALTHY;
            throw workerError(code, session?.message || `Persistent session validation failed for ${worker.id}`, worker);
          }
        }
        worker.readiness = READINESS_STATES.SESSION_VALID;

        if (worker.providerReadyValidator) {
          const ready = await Promise.race([
            Promise.resolve(worker.providerReadyValidator(worker)),
            sleep(this.providerReadyTimeout).then(() => ({ ok: false, code: 'PROVIDER_READY_TIMEOUT' })),
          ]);
          if (!ready || ready.ok !== true) {
            const code = ready?.code || 'PROVIDER_NOT_READY';
            if (code.includes('AUTH')) worker.state = WORKER_STATES.AUTH_REQUIRED;
            else if (code.includes('QUOTA')) worker.state = WORKER_STATES.QUOTA_EXHAUSTED;
            else worker.state = WORKER_STATES.UNHEALTHY;
            throw workerError(code, ready?.message || `Provider readiness failed for ${worker.id}`, worker);
          }
        }
        worker.readiness = READINESS_STATES.PROVIDER_READY;
        worker.readiness = READINESS_STATES.READY;
        worker.state = worker.currentJobId ? WORKER_STATES.BUSY : WORKER_STATES.IDLE;
        worker.phase = worker.currentJobId ? 'BUSY' : null;
        worker.lastActivityAt = this.clock();
        return worker;
      } catch (error) {
        worker.lastError = error.message;
        worker.readiness = READINESS_STATES.NOT_READY;
        if (![WORKER_STATES.AUTH_REQUIRED, WORKER_STATES.QUOTA_EXHAUSTED].includes(worker.state)) {
          worker.state = WORKER_STATES.UNHEALTHY;
        }
        throw error;
      } finally {
        worker.startupPromise = null;
      }
    })();
    return worker.startupPromise;
  }

  _candidates(provider, preferredIds = null) {
    const preferred = Array.isArray(preferredIds) && preferredIds.length > 0 ? new Set(preferredIds) : null;
    return [...this.workers.values()]
      .filter(worker => worker.provider === provider)
      .filter(worker => !preferred || preferred.has(worker.id) || preferred.has(worker.accountId) || preferred.has(this.getCanonicalAccountId(worker)))
      .filter(worker => !worker.currentJobId && ELIGIBLE_STATES.has(worker.state))
      .sort((a, b) => {
        if (a.readiness === READINESS_STATES.READY && b.readiness !== READINESS_STATES.READY) return -1;
        if (b.readiness === READINESS_STATES.READY && a.readiness !== READINESS_STATES.READY) return 1;
        return a.lastActivityAt - b.lastActivityAt;
      });
  }

  async acquire(options) {
    const provider = typeof options === 'string' ? options : options?.provider;
    const jobId = options?.jobId;
    const preferredWorkerIds = options?.preferredWorkerIds || null;
    const acquireTimeoutMs = options?.acquireTimeoutMs ?? numberFromEnv('ACQUIRE_TIMEOUT_MS', 30_000, 100);
    const pollIntervalMs = options?.pollIntervalMs ?? this.pollIntervalMs ?? 25;

    if (!provider || !jobId) throw new Error('provider and jobId are required');
    if (this.jobReservations.has(jobId)) {
      throw workerError('DUPLICATE_JOB_EXECUTION', `Job ${jobId} already has a browser worker reservation`);
    }

    const startTime = this.clock();
    const deadline = startTime + acquireTimeoutMs;

    while (true) {
      const candidates = this._candidates(provider, preferredWorkerIds);
      const failures = [];

      for (const worker of candidates) {
        if (worker.currentJobId) continue;
        const canonicalAccount = this.getCanonicalAccountId(worker);
        const leaseToken = crypto.randomUUID();

        // 1. Database-backed distributed lease acquisition protecting (provider, canonical_account)
        const dbLease = await this.leaseStore.acquireLease({
          provider: worker.provider.toUpperCase(),
          accountId: canonicalAccount,
          workerId: worker.id,
          jobId,
          leaseToken,
        });

        if (!dbLease.acquired) {
          failures.push({ workerId: worker.id, code: 'ACCOUNT_BUSY', message: dbLease.message || `Account ${canonicalAccount} leased by another host/worker` });
          continue;
        }

        const hbTimer = setInterval(() => {
          this.leaseStore.heartbeatLease({
            provider: worker.provider.toUpperCase(),
            accountId: canonicalAccount,
            leaseToken,
          }).catch(() => {});
        }, this.leaseHeartbeatInterval);
        hbTimer.unref?.();
        this.activeLeaseHeartbeats.set(leaseToken, hbTimer);

        worker.currentJobId = jobId;
        worker.leaseToken = leaseToken;
        worker.executionStarted = false;
        this.jobReservations.set(jobId, { workerId: worker.id, leaseToken });
        try {
          await this.ensureReady(worker);
          if (worker.readiness !== READINESS_STATES.READY) {
            throw workerError('PROVIDER_NOT_READY', `${worker.id} did not reach READY`, worker);
          }
          worker.state = WORKER_STATES.BUSY;
          worker.phase = 'BUSY';
          worker.lastActivityAt = this.clock();
          const ownership = worker.tabOwnership.get(worker.canonicalTabId);
          if (ownership) {
            ownership.jobId = jobId;
            ownership.job_id = jobId;
            ownership.phase = 'BUSY';
            ownership.activityPhase = 'BUSY';
            ownership.activity_phase = 'BUSY';
            ownership.lastActivityAt = this.clock();
            ownership.last_activity = this.clock();
          }
          return this._leaseHandle(worker, jobId, leaseToken);
        } catch (error) {
          failures.push({ workerId: worker.id, code: error.code || 'STARTUP_FAILED', message: error.message });
          await this._clearReservation(worker, jobId, leaseToken);
        }
      }

      // Check if any matching worker is currently busy/starting locally, or busy on another host in distributed lease store
      const hasDistributedBusy = failures.some(f => f.code === 'ACCOUNT_BUSY');
      const busyMatches = [...this.workers.values()].filter(worker =>
        worker.provider === provider &&
        (!preferredWorkerIds || preferredWorkerIds.includes(worker.id) || preferredWorkerIds.includes(worker.accountId)) &&
        (worker.currentJobId || worker.state === WORKER_STATES.STARTING || worker.state === WORKER_STATES.BUSY)
      );

      // If no candidate is free, and none are currently busy (locally or distributed), OR deadline passed:
      if ((busyMatches.length === 0 && !hasDistributedBusy) || this.clock() >= deadline) {
        const busyFailure = failures.find(f => f.code === 'ACCOUNT_BUSY');
        if (busyFailure) {
          const error = workerError('ACCOUNT_BUSY', busyFailure.message || `Account leased by another host for ${jobId}`);
          error.failures = failures;
          error.retryable = true;
          throw error;
        }
        const error = workerError('NO_ELIGIBLE_WORKER', `No READY ${provider} worker is available`);
        error.failures = failures;
        error.retryable = true;
        throw error;
      }

      // Wait for release event or next poll
      await new Promise(resolve => {
        const timer = setTimeout(resolve, Math.min(pollIntervalMs, Math.max(1, deadline - this.clock())));
        this.once('released', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }

  _leaseHandle(worker, jobId, leaseToken) {
    let released = false;
    return {
      acquired: true,
      leaseToken,
      workerId: worker.id,
      worker,
      accountId: worker.accountId,
      canonicalAccountId: this.getCanonicalAccountId(worker),
      provider: worker.provider,
      cdpPort: worker.cdpPort,
      profileDir: worker.profileDir,
      markExecutionStarted: () => {
        if (released || worker.leaseToken !== leaseToken) throw workerError('LEASE_LOST', `Lease lost for ${jobId}`, worker);
        if (worker.executionStarted) throw workerError('DUPLICATE_JOB_EXECUTION', `Provider execution already started for ${jobId}`, worker);
        worker.executionStarted = true;
      },
      setPhase: phase => this.setPhase(worker.id, jobId, leaseToken, phase),
      createTab: (url, opts) => this.createTab(worker.id, url, { ...opts, jobId }),
      release: async outcome => {
        if (released) return false;
        released = true;
        return this.release(worker.id, jobId, leaseToken, outcome);
      },
    };
  }

  setPhase(workerId, jobId, leaseToken, phase) {
    const worker = this.workers.get(workerId);
    if (!worker || worker.currentJobId !== jobId || worker.leaseToken !== leaseToken) return false;
    worker.phase = String(phase || 'BUSY').toUpperCase();
    worker.state = WORKER_STATES.BUSY;
    worker.lastActivityAt = this.clock();
    const ownership = worker.tabOwnership.get(worker.canonicalTabId);
    if (ownership) {
      ownership.phase = worker.phase;
      ownership.activityPhase = worker.phase;
      ownership.activity_phase = worker.phase;
      ownership.lastActivityAt = this.clock();
      ownership.last_activity = this.clock();
    }
    return true;
  }

  async _clearReservation(worker, jobId, leaseToken) {
    const reservation = this.jobReservations.get(jobId);
    if (reservation?.leaseToken === leaseToken) this.jobReservations.delete(jobId);
    if (worker.leaseToken === leaseToken) {
      worker.currentJobId = null;
      worker.leaseToken = null;
      worker.executionStarted = false;
      if (worker.readiness === READINESS_STATES.READY) worker.state = WORKER_STATES.IDLE;
      worker.phase = null;
      worker.lastActivityAt = this.clock();
    }
    const timer = this.activeLeaseHeartbeats.get(leaseToken);
    if (timer) {
      clearInterval(timer);
      this.activeLeaseHeartbeats.delete(leaseToken);
    }
    const canonicalAccount = this.getCanonicalAccountId(worker);
    await this.leaseStore.releaseLease({
      provider: worker.provider.toUpperCase(),
      accountId: canonicalAccount,
      leaseToken,
    }).catch(() => {});
  }

  async release(workerId, jobId, leaseToken, outcome = {}) {
    const worker = this.workers.get(workerId);
    if (!worker || worker.currentJobId !== jobId || worker.leaseToken !== leaseToken) return false;
    if (outcome?.authRequired) worker.state = WORKER_STATES.AUTH_REQUIRED;
    else if (outcome?.quotaExhausted) worker.state = WORKER_STATES.QUOTA_EXHAUSTED;
    await this._clearReservation(worker, jobId, leaseToken);
    if ([WORKER_STATES.AUTH_REQUIRED, WORKER_STATES.QUOTA_EXHAUSTED].includes(worker.state)) {
      worker.readiness = READINESS_STATES.NOT_READY;
    }
    const ownership = worker.tabOwnership.get(worker.canonicalTabId);
    if (ownership) {
      ownership.jobId = null;
      ownership.job_id = null;
      ownership.phase = null;
      ownership.activityPhase = null;
      ownership.activity_phase = null;
      ownership.lastActivityAt = this.clock();
      ownership.last_activity = this.clock();
    }
    await this.cleanupOrphans(worker);
    const canonicalAccount = this.getCanonicalAccountId(worker);
    this.emit('released', { workerId: worker.id, accountId: canonicalAccount, provider: worker.provider });
    return true;
  }

  async acquireExternalLease({ provider, accountId, jobId, workerId = null, ttlSeconds = 60 }) {
    const canonicalAccount = String(accountId).toLowerCase().trim();
    const targetWorkerId = workerId || `${provider}:${canonicalAccount}`;
    const leaseToken = crypto.randomUUID();
    const leaseRes = await this.leaseStore.acquireLease({
      provider: provider.toUpperCase(),
      accountId: canonicalAccount,
      workerId: targetWorkerId,
      jobId,
      leaseToken,
      ttlSeconds,
    });
    if (!leaseRes.acquired) {
      const error = workerError('ACCOUNT_BUSY', leaseRes.message || `Account ${canonicalAccount} is leased by another host`);
      error.currentLeaseToken = leaseRes.currentLeaseToken;
      throw error;
    }

    const worker = this.workers.get(targetWorkerId) || this.workers.get(`${provider}-${canonicalAccount}`) || this.workers.get('flow-primary');
    if (worker) {
      worker.currentJobId = jobId;
      worker.leaseToken = leaseToken;
      worker.state = WORKER_STATES.BUSY;
      worker.phase = 'GENERATING';
      worker.lastActivityAt = this.clock();
    }

    const hbTimer = setInterval(() => {
      this.leaseStore.heartbeatLease({
        provider: provider.toUpperCase(),
        accountId: canonicalAccount,
        leaseToken,
        ttlSeconds,
      }).catch(() => {});
    }, Math.min(20_000, ttlSeconds * 500));
    hbTimer.unref?.();
    this.activeLeaseHeartbeats.set(leaseToken, hbTimer);

    return {
      acquired: true,
      leaseToken,
      provider: provider.toUpperCase(),
      accountId: canonicalAccount,
      jobId,
      workerId: targetWorkerId,
      expiresAt: leaseRes.expiresAt,
    };
  }

  async releaseExternalLease({ provider, accountId, leaseToken, outcome = {} }) {
    const canonicalAccount = String(accountId).toLowerCase().trim();
    const timer = this.activeLeaseHeartbeats.get(leaseToken);
    if (timer) {
      clearInterval(timer);
      this.activeLeaseHeartbeats.delete(leaseToken);
    }
    await this.leaseStore.releaseLease({
      provider: provider.toUpperCase(),
      accountId: canonicalAccount,
      leaseToken,
    }).catch(() => {});

    const targetWorkerId = `${provider}:${canonicalAccount}`;
    const worker = this.workers.get(targetWorkerId) || this.workers.get(`${provider}-${canonicalAccount}`) || this.workers.get('flow-primary');
    if (worker && worker.leaseToken === leaseToken) {
      worker.currentJobId = null;
      worker.leaseToken = null;
      worker.state = WORKER_STATES.IDLE;
      worker.phase = null;
      worker.lastActivityAt = this.clock();
      if (outcome?.authRequired) worker.state = WORKER_STATES.AUTH_REQUIRED;
      if (outcome?.quotaExhausted) worker.state = WORKER_STATES.QUOTA_EXHAUSTED;
    }
    this.emit('released', { accountId: canonicalAccount, provider, leaseToken });
    return true;
  }

  async acquireVideo({ jobId, preferredEngine = 'gemini', preferredWorkerIds = null, disableProviderFallback = false, acquireTimeoutMs = 30_000 }) {
    if (preferredEngine === 'gemini') {
      try {
        const lease = await this.acquire({
          provider: 'gemini',
          jobId,
          preferredWorkerIds,
          acquireTimeoutMs,
        });
        return { lease, provider: 'gemini' };
      } catch (err) {
        if (disableProviderFallback) throw err;
        const flowLease = await this.acquire({
          provider: 'flow',
          jobId,
          acquireTimeoutMs,
        });
        return { lease: flowLease, provider: 'flow', fallbackFrom: 'gemini' };
      }
    } else {
      const lease = await this.acquire({
        provider: preferredEngine,
        jobId,
        preferredWorkerIds,
        acquireTimeoutMs,
      });
      return { lease, provider: preferredEngine };
    }
  }

  async heartbeat(workerId, payload = {}) {
    const worker = typeof workerId === 'string' ? this.workers.get(workerId) : workerId;
    if (!worker) return { ok: false, error: 'WORKER_NOT_FOUND' };
    const now = this.clock();
    worker.lastHeartbeatAt = now;
    let cdpResponsive = false;
    if (worker.state !== WORKER_STATES.OFFLINE && worker.readiness !== READINESS_STATES.NOT_READY) {
      cdpResponsive = await this._isCdpReady(worker);
    }
    return {
      ok: true,
      workerId: worker.id,
      state: worker.state,
      readiness: worker.readiness,
      cdpResponsive,
      lastActivityAt: worker.lastActivityAt,
      lastHeartbeatAt: worker.lastHeartbeatAt,
    };
  }

  async runWithWorker(request, callback) {
    const lease = await this.acquire(request);
    try {
      lease.markExecutionStarted();
      return await callback(lease);
    } finally {
      await lease.release();
    }
  }

  async prewarm(provider, queueDepth = 0, preferredWorkerIds = null) {
    if (queueDepth <= 0) return null;
    const candidate = this._candidates(provider, preferredWorkerIds)[0];
    if (!candidate) return null;
    try {
      await this.ensureReady(candidate);
      return candidate.id;
    } catch {
      return null;
    }
  }

  async cleanupOrphans(worker, options = {}) {
    if (typeof worker === 'string') worker = this.workers.get(worker);
    if (!worker) return { skipped: true, reason: 'NO_WORKER' };
    let tabs;
    try { tabs = await this._listTabs(worker); } catch { return { skipped: true, reason: 'CDP_UNAVAILABLE' }; }

    const closable = tabs
      .filter(tab => tab.id !== worker.canonicalTabId)
      .filter(tab => {
        const ownership = worker.tabOwnership.get(tab.id);
        if (ownership?.jobId) return false;
        if (ownership?.purpose === 'download' && ACTIVE_PHASES.has(worker.phase)) return false;
        return true;
      })
      .sort((a, b) => {
        const aOwned = worker.tabOwnership.get(a.id)?.createdAt || 0;
        const bOwned = worker.tabOwnership.get(b.id)?.createdAt || 0;
        return aOwned - bOwned;
      });

    if ((worker.currentJobId || ACTIVE_PHASES.has(worker.phase)) && !options.forceCap) {
      if (tabs.length <= this.absoluteTabCap) {
        return { skipped: true, reason: 'ACTIVE_WORKER_WITHIN_CAP' };
      }
    }

    const desired = options.forceCap ? this.absoluteTabCap - 1 : this.preferredWorkingTabs;
    const closeCount = Math.max(0, tabs.length - desired);
    const closed = [];
    for (const tab of closable.slice(0, closeCount)) {
      if (await this._closeTab(worker, tab.id)) closed.push(tab.id);
    }
    return { skipped: false, closed };
  }

  async gracefulShutdown(worker, reason = 'idle_ttl', options = {}) {
    if (typeof worker === 'string') worker = this.workers.get(worker);
    if (!worker) return false;
    const allowStarting = options.allowStarting === true;
    const activePhase = ACTIVE_PHASES.has(worker.phase) && !(allowStarting && worker.phase === 'STARTING');
    const activeState = [WORKER_STATES.STARTING, WORKER_STATES.BUSY].includes(worker.state) &&
      !(allowStarting && worker.state === WORKER_STATES.STARTING);
    if (worker.currentJobId || activePhase || activeState) {
      return false;
    }
    worker.stopping = true;
    try {
      if (await this._isCdpReady(worker)) {
        try {
          await this.fetchImpl(this._cdpUrl(worker, '/json/version'), { signal: AbortSignal.timeout(1500) });
          const version = await this._fetchJson(this._cdpUrl(worker, '/json/version'));
          if (version.webSocketDebuggerUrl && typeof WebSocket !== 'undefined') {
            await new Promise(resolve => {
              const ws = new WebSocket(version.webSocketDebuggerUrl);
              const timer = setTimeout(resolve, 1500);
              ws.addEventListener('open', () => ws.send(JSON.stringify({ id: 1, method: 'Browser.close' })));
              ws.addEventListener('close', () => { clearTimeout(timer); resolve(); });
              ws.addEventListener('error', () => { clearTimeout(timer); resolve(); });
            });
          } else if (worker.process && !worker.process.killed) {
            worker.process.kill('SIGTERM');
          }
        } catch {
          if (worker.process && !worker.process.killed) worker.process.kill('SIGTERM');
        }
      }
      worker.state = WORKER_STATES.OFFLINE;
      worker.readiness = READINESS_STATES.NOT_READY;
      worker.phase = null;
      worker.browserPid = null;
      worker.process = null;
      worker.canonicalTabId = null;
      worker.tabOwnership.clear();
      worker.lastError = reason;
      return true;
    } finally {
      worker.stopping = false;
    }
  }

  async restart(workerId, reason = 'health_restart') {
    const worker = this.workers.get(workerId);
    if (!worker || worker.currentJobId || ACTIVE_PHASES.has(worker.phase)) return false;
    await this.gracefulShutdown(worker, reason);
    await this.ensureReady(worker);
    return true;
  }

  async maintenanceTick() {
    const now = this.clock();
    for (const worker of this.workers.values()) {
      if (await this._isCdpReady(worker)) {
        await this.cleanupOrphans(worker);
        if (!worker.warm && !worker.currentJobId && !ACTIVE_PHASES.has(worker.phase) && now - worker.lastActivityAt >= this.idleBrowserTTL) {
          await this.gracefulShutdown(worker);
        }
      } else if (worker.readiness === READINESS_STATES.READY && !worker.stopping) {
        worker.crashCount++;
        worker.state = WORKER_STATES.OFFLINE;
        worker.readiness = READINESS_STATES.NOT_READY;
        worker.browserPid = null;
      }
    }
  }

  async telemetry() {
    const values = [];
    for (const worker of this.workers.values()) {
      let tabs = [];
      try { tabs = await this._listTabs(worker); } catch {}
      values.push({
        worker_id: worker.id,
        state: worker.state,
        readiness: worker.readiness,
        account: worker.accountId,
        canonical_account: this.getCanonicalAccountId(worker),
        provider: worker.provider,
        current_job_id: worker.currentJobId,
        active_phase: worker.phase,
        browser_pid: worker.browserPid,
        cdp_port: worker.cdpPort,
        tab_count: tabs.length,
        profile_path: worker.profileDir,
        uptime_seconds: worker.startedAt ? Math.round((this.clock() - worker.startedAt) / 1000) : 0,
        last_activity: new Date(worker.lastActivityAt).toISOString(),
        last_heartbeat: worker.lastHeartbeatAt ? new Date(worker.lastHeartbeatAt).toISOString() : null,
        crash_count: worker.crashCount,
        restart_count: worker.restartCount,
        warm_policy: worker.warm ? 'WARM' : 'ON_DEMAND',
        last_error: worker.lastError,
      });
    }
    return values;
  }
}

module.exports = {
  BrowserWorkerSupervisor,
  WORKER_STATES,
  READINESS_STATES,
  ACTIVE_PHASES,
  workerError,
};
