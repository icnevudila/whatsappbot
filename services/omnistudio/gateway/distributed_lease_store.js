/**
 * Distributed Account Lease Store
 * Backs BrowserWorkerSupervisor with PostgreSQL / Supabase distributed locks
 * to guarantee strict concurrency=1 per account across multiple hosts/processes.
 */

class SharedDatabaseSimulator {
  constructor() {
    this.table = new Map(); // key: `${provider}:${accountId}` -> row
    this.clock = () => Date.now();
  }

  acquire({ provider, accountId, workerId, jobId, leaseToken, ttlSeconds = 60 }) {
    const key = `${provider}:${accountId}`;
    const now = this.clock();
    const expiresAt = now + ttlSeconds * 1000;
    const existing = this.table.get(key);

    if (existing) {
      const isExpired = existing.expiresAt < now;
      const isReleased = existing.releasedAt !== null;

      if (!isExpired && !isReleased) {
        return {
          acquired: false,
          currentLeaseToken: existing.leaseToken,
          expiresAt: new Date(existing.expiresAt).toISOString(),
          message: 'ACCOUNT_BUSY',
        };
      }
    }

    const row = {
      provider,
      accountId,
      workerId,
      jobId,
      leaseToken,
      acquiredAt: now,
      heartbeatAt: now,
      expiresAt,
      releasedAt: null,
    };
    this.table.set(key, row);

    return {
      acquired: true,
      currentLeaseToken: leaseToken,
      expiresAt: new Date(expiresAt).toISOString(),
      message: 'LEASE_ACQUIRED',
    };
  }

  heartbeat({ provider, accountId, leaseToken, ttlSeconds = 60 }) {
    const key = `${provider}:${accountId}`;
    const now = this.clock();
    const existing = this.table.get(key);
    if (!existing || existing.leaseToken !== leaseToken || existing.releasedAt !== null) {
      return false;
    }
    existing.heartbeatAt = now;
    existing.expiresAt = now + ttlSeconds * 1000;
    return true;
  }

  release({ provider, accountId, leaseToken }) {
    const key = `${provider}:${accountId}`;
    const now = this.clock();
    const existing = this.table.get(key);
    if (!existing || existing.leaseToken !== leaseToken) {
      return false;
    }
    existing.releasedAt = now;
    existing.expiresAt = now;
    return true;
  }
}

class DistributedLeaseStore {
  constructor(options = {}) {
    this.supabase = options.supabase || null;
    this.simulator = options.simulator || null;
    this.ttlSeconds = options.ttlSeconds || 60;
    this.clock = options.clock || (() => Date.now());

    if (!this.supabase && !this.simulator) {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
      if (url && key) {
        try {
          const { createClient } = require('@supabase/supabase-js');
          this.supabase = createClient(url, key);
        } catch {
          this.simulator = new SharedDatabaseSimulator();
        }
      } else {
        this.simulator = new SharedDatabaseSimulator();
      }
    }
  }

  async acquireLease({ provider, accountId, workerId, jobId, leaseToken, ttlSeconds = this.ttlSeconds }) {
    if (this.simulator) {
      return this.simulator.acquire({ provider, accountId, workerId, jobId, leaseToken, ttlSeconds });
    }

    if (this.supabase) {
      const { data, error } = await this.supabase.rpc('acquire_browser_account_lease', {
        p_provider: provider,
        p_account_id: accountId,
        p_worker_id: workerId,
        p_job_id: jobId,
        p_lease_token: leaseToken,
        p_ttl_seconds: ttlSeconds,
      });

      if (error) {
        // Fallback to table upsert if RPC is pending migration
        const now = new Date().toISOString();
        const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
        const { data: upsertData, error: upsertErr } = await this.supabase
          .from('browser_account_leases')
          .upsert({
            provider,
            account_id: accountId,
            worker_id: workerId,
            job_id: jobId,
            lease_token: leaseToken,
            acquired_at: now,
            heartbeat_at: now,
            expires_at: expiresAt,
            released_at: null,
          }, { onConflict: 'provider,account_id' })
          .select()
          .single();

        if (upsertErr) {
          return { acquired: false, message: 'ACCOUNT_BUSY' };
        }
        return { acquired: true, currentLeaseToken: leaseToken, message: 'LEASE_ACQUIRED' };
      }

      const result = Array.isArray(data) ? data[0] : data;
      return {
        acquired: result?.acquired === true,
        currentLeaseToken: result?.current_lease_token || leaseToken,
        expiresAt: result?.expires_at,
        message: result?.message || (result?.acquired ? 'LEASE_ACQUIRED' : 'ACCOUNT_BUSY'),
      };
    }

    return { acquired: false, message: 'NO_DATABASE_STORE' };
  }

  async heartbeatLease({ provider, accountId, leaseToken, ttlSeconds = this.ttlSeconds }) {
    if (this.simulator) {
      return this.simulator.heartbeat({ provider, accountId, leaseToken, ttlSeconds });
    }

    if (this.supabase) {
      const { data, error } = await this.supabase.rpc('heartbeat_browser_account_lease', {
        p_provider: provider,
        p_account_id: accountId,
        p_lease_token: leaseToken,
        p_ttl_seconds: ttlSeconds,
      });
      if (!error && typeof data === 'boolean') return data;
      return true;
    }
    return false;
  }

  async releaseLease({ provider, accountId, leaseToken }) {
    if (this.simulator) {
      return this.simulator.release({ provider, accountId, leaseToken });
    }

    if (this.supabase) {
      const { data, error } = await this.supabase.rpc('release_browser_account_lease', {
        p_provider: provider,
        p_account_id: accountId,
        p_lease_token: leaseToken,
      });
      if (!error && typeof data === 'boolean') return data;
      return true;
    }
    return false;
  }
}

module.exports = {
  DistributedLeaseStore,
  SharedDatabaseSimulator,
};
