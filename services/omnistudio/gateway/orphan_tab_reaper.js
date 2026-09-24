/**
 * OmniStudio Autonomous Orphan Tab Reaper
 *
 * Safe, conservative cleanup of duplicate and orphan Chrome tabs
 * without disturbing active jobs, canonical worker tabs, or logged-in accounts.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const ORPHAN_TAB_MIN_AGE_MS = Math.max(10000, parseInt(process.env.ORPHAN_TAB_MIN_AGE_MS || '60000', 10)); // Default 60 seconds
const REAPER_COOLDOWN_MS = Math.max(5000, parseInt(process.env.REAPER_COOLDOWN_MS || '30000', 10)); // Default 30 seconds
const REGISTRY_DIR = process.env.OMNISTUDIO_TAB_DIR || path.join(os.tmpdir(), 'omnistudio_tabs');

try {
  if (!fs.existsSync(REGISTRY_DIR)) {
    fs.mkdirSync(REGISTRY_DIR, { recursive: true });
  }
} catch (_) {}

// Tab states
const TAB_STATES = {
  CANONICAL_IDLE: 'CANONICAL_IDLE',
  ACTIVE_JOB: 'ACTIVE_JOB',
  TRANSIENT: 'TRANSIENT',
  ORPHAN_CANDIDATE: 'ORPHAN_CANDIDATE',
  PROTECTED: 'PROTECTED',
};

class TabRegistry {
  constructor(registryDir = REGISTRY_DIR) {
    this.dir = registryDir;
    this.tabs = new Map(); // tabId -> TabInfo
    this.workerBindings = new Map(); // workerId -> canonicalTabId
    this._ensureDir();
  }

  _ensureDir() {
    try {
      if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
    } catch (_) {}
  }

  _workerFile(workerId) {
    return path.join(this.dir, `worker_${String(workerId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  }

  _jobFile(tabId) {
    return path.join(this.dir, `job_${String(tabId).replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  }

  registerTab(tabId, { workerId = null, canonical = false, activeJobId = null, url = '', isProtected = false } = {}) {
    if (!tabId) return null;
    const now = Date.now();
    let entry = this.tabs.get(tabId);
    if (!entry) {
      entry = {
        tabId,
        workerId,
        canonical: !!canonical,
        activeJobId,
        url,
        isProtected: !!isProtected,
        createdAt: now,
        lastUsedAt: now,
        state: canonical ? TAB_STATES.CANONICAL_IDLE : (isProtected ? TAB_STATES.PROTECTED : TAB_STATES.TRANSIENT),
      };
      this.tabs.set(tabId, entry);
    } else {
      if (workerId !== null && workerId !== undefined) entry.workerId = workerId;
      if (canonical !== undefined) entry.canonical = !!canonical;
      if (activeJobId !== undefined) entry.activeJobId = activeJobId;
      if (url) entry.url = url;
      if (isProtected) entry.isProtected = true;
      entry.lastUsedAt = now;
      entry.state = entry.activeJobId
        ? TAB_STATES.ACTIVE_JOB
        : (entry.canonical ? TAB_STATES.CANONICAL_IDLE : (entry.isProtected ? TAB_STATES.PROTECTED : entry.state));
    }

    if (workerId && canonical) {
      this.workerBindings.set(workerId, tabId);
    }
    return entry;
  }

  bindWorkerCanonical(workerId, tabId, url = '') {
    if (!workerId || !tabId) return;
    this.workerBindings.set(workerId, tabId);
    this.registerTab(tabId, { workerId, canonical: true, url });
    try {
      this._ensureDir();
      fs.writeFileSync(this._workerFile(workerId), JSON.stringify({ workerId, tabId, url, updatedAt: Date.now() }));
    } catch (_) {}
  }

  getWorkerCanonicalTab(workerId) {
    if (!workerId) return null;
    const tabId = this.workerBindings.get(workerId);
    if (tabId && this.tabs.has(tabId)) {
      return this.tabs.get(tabId);
    }
    try {
      const file = this._workerFile(workerId);
      if (fs.existsSync(file)) {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        if (data && data.tabId) {
          this.workerBindings.set(workerId, data.tabId);
          return this.registerTab(data.tabId, { workerId, canonical: true, url: data.url || '' });
        }
      }
    } catch (_) {}
    return null;
  }

  isCanonicalForAnyWorker(tabId) {
    if (!tabId) return false;
    for (const canonicalTabId of this.workerBindings.values()) {
      if (canonicalTabId === tabId) return true;
    }
    const entry = this.tabs.get(tabId);
    if (entry && entry.canonical) return true;
    try {
      this._ensureDir();
      const files = fs.readdirSync(this.dir);
      for (const f of files) {
        if (f.startsWith('worker_') && f.endsWith('.json')) {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(this.dir, f), 'utf8'));
            if (data && data.tabId === tabId) return true;
          } catch (_) {}
        }
      }
    } catch (_) {}
    return false;
  }

  setTabJob(tabId, jobId) {
    const entry = this.tabs.get(tabId);
    if (entry) {
      entry.activeJobId = jobId;
      entry.lastUsedAt = Date.now();
      entry.state = jobId ? TAB_STATES.ACTIVE_JOB : (entry.canonical ? TAB_STATES.CANONICAL_IDLE : TAB_STATES.TRANSIENT);
    }
    try {
      this._ensureDir();
      const jobFile = this._jobFile(tabId);
      if (jobId) {
        fs.writeFileSync(jobFile, JSON.stringify({ tabId, jobId, updatedAt: Date.now() }));
      } else {
        if (fs.existsSync(jobFile)) fs.unlinkSync(jobFile);
      }
    } catch (_) {}
  }

  hasActiveJob(tabId) {
    const entry = this.tabs.get(tabId);
    if (entry && entry.activeJobId) return true;
    try {
      const jobFile = this._jobFile(tabId);
      return fs.existsSync(jobFile);
    } catch (_) {}
    return false;
  }

  touchTab(tabId, url = '') {
    const entry = this.tabs.get(tabId);
    if (entry) {
      entry.lastUsedAt = Date.now();
      if (url) entry.url = url;
    } else {
      this.registerTab(tabId, { url });
    }
  }

  removeTab(tabId) {
    this.tabs.delete(tabId);
    for (const [wid, tid] of this.workerBindings.entries()) {
      if (tid === tabId) this.workerBindings.delete(wid);
    }
  }
}

class OrphanTabReaper {
  constructor(options = {}) {
    this.registry = options.registry || new TabRegistry();
    this.minAgeMs = options.minAgeMs || ORPHAN_TAB_MIN_AGE_MS;
    this.cooldownMs = options.cooldownMs || REAPER_COOLDOWN_MS;
    this.lastSweepAt = 0;
    this.fetchImpl = options.fetchImpl || globalThis.fetch;
    this.history = [];
  }

  isProtectedSystemUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const lower = url.toLowerCase();
    return (
      lower.includes('localhost:3456/monitor') ||
      lower.includes('127.0.0.1:3456/monitor') ||
      lower.includes('gemini.google.com/videos') ||
      lower.includes('flow.google.com') ||
      lower.includes('accounts.google.com/rotatecookiespage') ||
      lower.includes('chrome://') ||
      lower.startsWith('devtools://')
    );
  }

  classifyTargets(targets, options = {}) {
    const now = options.now || Date.now();
    const callerWorkerId = options.workerId || null;
    const isCallerBusy = options.isCallerBusy || false;
    const activeJobTabIds = options.activeJobTabIds || new Set();

    const keep = [];
    const close = [];

    if (isCallerBusy) {
      // Rule: Never run cleanup while calling worker is busy
      for (const t of targets) {
        keep.push({ target: t, reason: 'WORKER_BUSY_ABORT' });
      }
      return { keep, close };
    }

    for (const t of targets) {
      const tid = t.id;
      const url = t.url || '';
      const type = t.type || 'page';

      // Record target in registry to track creation/first-seen time
      const reg = this.registry.tabs.get(tid);
      if (!reg) {
        this.registry.registerTab(tid, { url });
      } else if (url) {
        this.registry.touchTab(tid, url);
      }
      const ageMs = reg ? (now - reg.createdAt) : 0;

      // 1. Only 'page' targets can ever be closed
      if (type !== 'page') {
        keep.push({ target: t, reason: 'NON_PAGE_TARGET' });
        continue;
      }

      // 2. Critical persistent system URLs must NEVER be closed
      if (this.isProtectedSystemUrl(url)) {
        keep.push({ target: t, reason: 'PROTECTED_SYSTEM_PAGE' });
        continue;
      }

      // 3. Worker canonical tab protection (Strict Invariant: never close canonical tab for ANY worker)
      if (this.registry.isCanonicalForAnyWorker(tid)) {
        keep.push({ target: t, reason: 'CANONICAL_WORKER_TAB' });
        continue;
      }

      // 4. Active job protection (Strict Invariant: never close tab running a job)
      if (this.registry.hasActiveJob(tid) || activeJobTabIds.has(tid)) {
        keep.push({ target: t, reason: 'ACTIVE_JOB_IN_PROGRESS' });
        continue;
      }

      // 5. Grace period protection (Rule: newly created targets must not be reaped immediately)
      if (ageMs < this.minAgeMs) {
        keep.push({ target: t, reason: `GRACE_PERIOD_ACTIVE_${Math.round((this.minAgeMs - ageMs) / 1000)}s_REMAINING` });
        continue;
      }

      // 6. Abandoned ?prompt-textarea=... query tabs (Left behind after form submit)
      if (url.includes('chatgpt.com/?prompt-textarea=') || url.includes('prompt-textarea=')) {
        close.push({ target: t, reason: 'ABANDONED_PROMPT_TEXTAREA_TAB', ageMs });
        continue;
      }

      // 7. Abandoned blank/failed tabs (e.g. about:blank or error navigations)
      if (url === 'about:blank' || url.startsWith('chrome-error://')) {
        close.push({ target: t, reason: 'ORPHAN_BLANK_OR_ERROR_TAB', ageMs });
        continue;
      }

      // 8. Duplicate blank chatgpt.com home tabs:
      // If a tab is just https://chatgpt.com/ and is NOT any worker's canonical tab,
      // and has exceeded the grace period with no active job, it is a duplicate idle tab.
      const isChatHome = url === 'https://chatgpt.com/' || url === 'https://chatgpt.com';
      if (isChatHome && !this.registry.isCanonicalForAnyWorker(tid)) {
        close.push({ target: t, reason: 'DUPLICATE_IDLE_CHATGPT_HOME', ageMs });
        continue;
      }

      // 9. Fail-safe default: When in doubt, KEEP TAB
      keep.push({ target: t, reason: 'DEFAULT_FAILSAFE_KEEP' });
    }

    return { keep, close };
  }

  measureMemoryFast() {
    let chromeRssKb = 0;
    let rendererCount = 0;
    let totalProcesses = 0;

    try {
      if (fs.existsSync('/proc')) {
        const entries = fs.readdirSync('/proc');
        for (const entry of entries) {
          if (!/^\d+$/.test(entry)) continue;
          totalProcesses++;
          try {
            const cmd = fs.readFileSync(`/proc/${entry}/cmdline`, 'utf8');
            if (cmd.includes('chrome') || cmd.includes('chromium')) {
              if (cmd.includes('--type=renderer')) rendererCount++;
              const status = fs.readFileSync(`/proc/${entry}/status`, 'utf8');
              const m = status.match(/VmRSS:\s+(\d+)\s+kB/);
              if (m) chromeRssKb += parseInt(m[1], 10);
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    return {
      chrome_rss_mb: Math.round((chromeRssKb / 1024) * 100) / 100,
      chrome_renderer_count: rendererCount,
      total_processes: totalProcesses,
    };
  }

  async sweep({ cdpHttpUrl = 'http://127.0.0.1:9222', workerId = null, isCallerBusy = false, reason = 'manual', force = false } = {}) {
    const now = Date.now();
    if (!force && now - this.lastSweepAt < this.cooldownMs) {
      return { skipped: true, reason: 'COOLDOWN_ACTIVE' };
    }
    this.lastSweepAt = now;

    if (isCallerBusy) {
      return { skipped: true, reason: 'WORKER_IS_BUSY' };
    }

    const memBefore = this.measureMemoryFast();
    let targets = [];
    try {
      const resp = await this.fetchImpl(`${cdpHttpUrl}/json/list`, { signal: AbortSignal.timeout(4000) });
      if (!resp.ok) return { skipped: true, reason: 'CDP_LIST_FAILED' };
      targets = await resp.json();
    } catch (err) {
      return { skipped: true, reason: `CDP_CONNECT_ERROR: ${err.message}` };
    }

    const { keep, close } = this.classifyTargets(targets, {
      now,
      workerId,
      isCallerBusy,
    });

    const closed = [];
    for (const item of close) {
      const t = item.target;
      try {
        const closeResp = await this.fetchImpl(`${cdpHttpUrl}/json/close/${t.id}`, {
          method: 'PUT',
          signal: AbortSignal.timeout(3000),
        });
        if (closeResp.ok) {
          closed.push({ id: t.id, url: t.url, reason: item.reason });
          this.registry.removeTab(t.id);
        }
      } catch (err) {
        // Safe fail: cleanup failure never stops system
      }
    }

    // Brief settling pause before reading reclaimed memory
    if (closed.length > 0) {
      await new Promise(r => setTimeout(r, 1200));
    }

    const memAfter = this.measureMemoryFast();
    const reclaimedMb = Math.max(0, Math.round((memBefore.chrome_rss_mb - memAfter.chrome_rss_mb) * 100) / 100);

    const metrics = {
      event: 'omnistudio_orphan_reaper_metric',
      reason,
      timestamp: now,
      chrome_tab_count: targets.length - closed.length,
      chrome_renderer_count: memAfter.chrome_renderer_count,
      orphan_tabs_detected: close.length,
      orphan_tabs_closed: closed.length,
      chrome_rss_mb: memAfter.chrome_rss_mb,
      memory_before_cleanup_mb: memBefore.chrome_rss_mb,
      memory_after_cleanup_mb: memAfter.chrome_rss_mb,
      reclaimed_memory_mb: reclaimedMb,
      closed_details: closed,
    };

    if (closed.length > 0) {
      console.log(`[OrphanTabReaper] 🧹 Swept ${closed.length} orphan tab(s) (${reason}). Reclaimed: ${reclaimedMb} MB. Renderers: ${memBefore.chrome_renderer_count} -> ${memAfter.chrome_renderer_count}`);
      try {
        console.log(JSON.stringify(metrics));
      } catch (_) {}
    }

    this.history.push(metrics);
    if (this.history.length > 50) this.history.shift();

    return metrics;
  }

  scheduleAsyncSweep({ cdpHttpUrl = 'http://127.0.0.1:9222', workerId = null, reason = 'post_job', delayMs = 1500 } = {}) {
    // Keep cleanup off the critical path: completely decoupled from request-response latency
    setTimeout(async () => {
      try {
        await this.sweep({ cdpHttpUrl, workerId, reason });
      } catch (err) {
        console.warn('[OrphanTabReaper] Background sweep warning:', err.message);
      }
    }, delayMs).unref?.();
  }
}

const CHATGPT_SUBMIT_MIN_INTERVAL_MS = Math.max(100, parseInt(process.env.CHATGPT_SUBMIT_MIN_INTERVAL_MS || '750', 10));

async function acquireSubmitPacing(sessionKey = 'chatgpt_default', minIntervalMs = CHATGPT_SUBMIT_MIN_INTERVAL_MS, pacingDir = REGISTRY_DIR) {
  try {
    if (!fs.existsSync(pacingDir)) fs.mkdirSync(pacingDir, { recursive: true });
  } catch (_) {}

  const safeKey = String(sessionKey).replace(/[^a-zA-Z0-9_-]/g, '_');
  const pacingFile = path.join(pacingDir, `submit_pacing_${safeKey}.json`);
  const lockFile = path.join(pacingDir, `submit_pacing_${safeKey}.lock`);

  const start = Date.now();
  while (Date.now() - start < 30000) {
    try {
      if (fs.existsSync(lockFile)) {
        const stat = fs.statSync(lockFile);
        if (Date.now() - stat.mtimeMs > 3000) {
          try { fs.unlinkSync(lockFile); } catch (_) {}
        }
      }
    } catch (_) {}

    let fd = null;
    try {
      fd = fs.openSync(lockFile, 'wx');
      let lastSubmitAt = 0;
      try {
        if (fs.existsSync(pacingFile)) {
          const content = JSON.parse(fs.readFileSync(pacingFile, 'utf8'));
          lastSubmitAt = content.submittedAt || 0;
        }
      } catch (_) {}

      const now = Date.now();
      const elapsed = now - lastSubmitAt;
      if (elapsed < minIntervalMs) {
        const waitNeeded = minIntervalMs - elapsed;
        const nextSubmitAt = now + waitNeeded;
        fs.writeFileSync(pacingFile, JSON.stringify({ submittedAt: nextSubmitAt }));
        try { fs.closeSync(fd); } catch (_) {}
        try { fs.unlinkSync(lockFile); } catch (_) {}
        await new Promise(r => setTimeout(r, waitNeeded));
        return { waitedMs: waitNeeded, nextSubmitAt };
      }

      fs.writeFileSync(pacingFile, JSON.stringify({ submittedAt: now }));
      try { fs.closeSync(fd); } catch (_) {}
      try { fs.unlinkSync(lockFile); } catch (_) {}
      return { waitedMs: 0, nextSubmitAt: now };
    } catch (e) {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (_) {}
      }
      await new Promise(r => setTimeout(r, 40));
    }
  }
  return { waitedMs: 0, nextSubmitAt: Date.now() };
}

function _removeLeaseAndQueue(leaseFile, queueFile, lockFile, jobId) {
  const start = Date.now();
  while (Date.now() - start < 3000) {
    let fd = null;
    try {
      if (fs.existsSync(lockFile)) {
        const stat = fs.statSync(lockFile);
        if (Date.now() - stat.mtimeMs > 3000) {
          try { fs.unlinkSync(lockFile); } catch (_) {}
        }
      }
      fd = fs.openSync(lockFile, 'wx');
      if (fs.existsSync(leaseFile)) {
        try {
          const currentLease = JSON.parse(fs.readFileSync(leaseFile, 'utf8'));
          if (!jobId || currentLease.activeJobId === jobId) {
            fs.unlinkSync(leaseFile);
          }
        } catch (_) {
          fs.unlinkSync(leaseFile);
        }
      }
      if (fs.existsSync(queueFile)) {
        try {
          const queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
          if (Array.isArray(queueData.waiting)) {
            if (jobId) {
              queueData.waiting = queueData.waiting.filter(item => (typeof item === 'object' ? item.id : item) !== jobId);
            } else {
              queueData.waiting.shift();
            }
            fs.writeFileSync(queueFile, JSON.stringify(queueData));
          }
        } catch (_) {}
      }
      try { fs.closeSync(fd); } catch (_) {}
      try { fs.unlinkSync(lockFile); } catch (_) {}
      return;
    } catch (_) {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (_) {}
      }
      const waitUntil = Date.now() + 20;
      while (Date.now() < waitUntil) {}
    }
  }

  try {
    if (fs.existsSync(leaseFile)) {
      const currentLease = JSON.parse(fs.readFileSync(leaseFile, 'utf8'));
      if (!jobId || currentLease.activeJobId === jobId) {
        fs.unlinkSync(leaseFile);
      }
    }
  } catch (_) {}
  try {
    if (fs.existsSync(queueFile)) {
      const queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
      if (Array.isArray(queueData.waiting)) {
        queueData.waiting = queueData.waiting.filter(item => (typeof item === 'object' ? item.id : item) !== jobId);
        fs.writeFileSync(queueFile, JSON.stringify(queueData));
      }
    }
  } catch (_) {}
}

async function acquireSessionFlightLease(sessionKey, jobId, options = {}) {
  const leaseDir = options.pacingDir || process.env.PACING_DIR || '/tmp/omnistudio_tabs';
  const timeoutMs = options.timeoutMs || 120000;
  const pollIntervalMs = options.pollIntervalMs || 50;
  const safeKey = String(sessionKey || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const leaseFile = path.join(leaseDir, `session_lease_${safeKey}.json`);
  const queueFile = path.join(leaseDir, `session_queue_${safeKey}.json`);
  const lockFile = path.join(leaseDir, `session_lease_${safeKey}.lock`);

  if (!fs.existsSync(leaseDir)) {
    try { fs.mkdirSync(leaseDir, { recursive: true }); } catch (_) {}
  }

  const enqueuedAt = Date.now();
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      if (fs.existsSync(lockFile)) {
        const stat = fs.statSync(lockFile);
        if (Date.now() - stat.mtimeMs > 5000) {
          try { fs.unlinkSync(lockFile); } catch (_) {}
        }
      }
    } catch (_) {}

    let fd = null;
    try {
      fd = fs.openSync(lockFile, 'wx');

      // 1. Maintain FIFO waiting queue
      let queueData = { waiting: [] };
      try {
        if (fs.existsSync(queueFile)) {
          queueData = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
          if (!Array.isArray(queueData.waiting)) queueData.waiting = [];
        }
      } catch (_) {
        queueData = { waiting: [] };
      }

      const now = Date.now();
      // Clean any expired entries in waiting queue (older than timeoutMs)
      queueData.waiting = queueData.waiting.filter(item => {
        const t = typeof item === 'object' && item !== null ? item.enqueuedAt : now;
        return now - t < timeoutMs;
      });

      // Register this jobId in FIFO waiting queue if not present
      const existingIdx = queueData.waiting.findIndex(item => (typeof item === 'object' ? item.id : item) === jobId);
      if (existingIdx === -1) {
        queueData.waiting.push({ id: jobId, enqueuedAt });
        try { fs.writeFileSync(queueFile, JSON.stringify(queueData)); } catch (_) {}
      }

      // 2. Check current lease
      let currentLease = null;
      try {
        if (fs.existsSync(leaseFile)) {
          currentLease = JSON.parse(fs.readFileSync(leaseFile, 'utf8'));
        }
      } catch (_) {}

      let leaseIsActive = false;
      if (currentLease && currentLease.activeJobId && currentLease.activeJobId !== jobId) {
        const leaseAge = now - (currentLease.acquiredAt || 0);
        if (leaseAge < timeoutMs) {
          leaseIsActive = true;
        }
      }

      // 3. FIFO check: must be head of waiting queue
      const headItem = queueData.waiting[0];
      const headId = typeof headItem === 'object' ? headItem?.id : headItem;
      const isHead = !headId || headId === jobId;

      if (leaseIsActive || !isHead) {
        try { fs.closeSync(fd); } catch (_) {}
        try { fs.unlinkSync(lockFile); } catch (_) {}
        fd = null;
        await new Promise(r => setTimeout(r, pollIntervalMs));
        continue;
      }

      // 4. Acquire lease
      const acquiredAt = Date.now();
      fs.writeFileSync(leaseFile, JSON.stringify({
        sessionKey: safeKey,
        activeJobId: jobId,
        acquiredAt,
      }));

      try { fs.closeSync(fd); } catch (_) {}
      try { fs.unlinkSync(lockFile); } catch (_) {}
      return {
        acquired: true,
        sessionKey: safeKey,
        jobId,
        waitedMs: Date.now() - start,
        acquiredAt,
      };
    } catch (e) {
      if (fd !== null) {
        try { fs.closeSync(fd); } catch (_) {}
      }
      await new Promise(r => setTimeout(r, pollIntervalMs));
    }
  }

  // Cleanup from queue on timeout
  _removeLeaseAndQueue(leaseFile, queueFile, lockFile, jobId);
  throw new Error(`SESSION_LEASE_TIMEOUT: Could not acquire lease for session ${sessionKey} within ${timeoutMs}ms`);
}

function releaseSessionFlightLease(sessionKey, jobId = null, options = {}) {
  const leaseDir = options.pacingDir || process.env.PACING_DIR || '/tmp/omnistudio_tabs';
  const safeKey = String(sessionKey || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const leaseFile = path.join(leaseDir, `session_lease_${safeKey}.json`);
  const queueFile = path.join(leaseDir, `session_queue_${safeKey}.json`);
  const lockFile = path.join(leaseDir, `session_lease_${safeKey}.lock`);

  _removeLeaseAndQueue(leaseFile, queueFile, lockFile, jobId);
  return true;
}

module.exports = {
  TabRegistry,
  OrphanTabReaper,
  TAB_STATES,
  ORPHAN_TAB_MIN_AGE_MS,
  REAPER_COOLDOWN_MS,
  CHATGPT_SUBMIT_MIN_INTERVAL_MS,
  acquireSubmitPacing,
  acquireSessionFlightLease,
  releaseSessionFlightLease,
};


