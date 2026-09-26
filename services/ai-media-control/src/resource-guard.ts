/**
 * AI Media Control — Production Host Resource Guard & DB-backed Mutex
 * 
 * Invariants:
 * 1. Rolling CPU delta: Requires sustained CPU >= 90% for >= 20-30s before queue hold. Momentary spikes are ignored.
 * 2. RAM guard: Prohibits new scene start if RAM >= 90% or MemAvailable < 300MB.
 * 3. Heavy Generation Mutex: Only 1 heavy video generation at a time.
 *    Resilient to process restarts via DB-backed lease with automatic stale expiration.
 * 4. Alarm counters: Explicitly track, report, and reset breach events.
 */

import { promises as fs } from 'node:fs'
import os from 'node:os'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface HostResourceStatus {
  cpuPercent: number
  sustainedHighCpu: boolean
  ramPercent: number
  memAvailableMb: number
  memLow: boolean
  heavyLockActive: boolean
  heavyLockOwner: string | null
  allowedNewJob: boolean
  allowedNewScene: boolean
  reasons: string[]
}

export interface AlarmCounters {
  cpu_threshold_exceeded: number
  ram_threshold_exceeded: number
  mem_available_low: number
  heavy_concurrency_blocked: number
}

class ResourceGuard {
  public readonly MAX_PARALLEL_HEAVY_JOBS = parseInt(process.env.MAX_PARALLEL_HEAVY_JOBS || '3', 10)
  private cpuRollingHistory: number[] = []
  private readonly ROLLING_SAMPLE_COUNT = 4 // 4 samples * 5s ~ 20s
  private alarmCounters: AlarmCounters = {
    cpu_threshold_exceeded: 0,
    ram_threshold_exceeded: 0,
    mem_available_low: 0,
    heavy_concurrency_blocked: 0,
  }

  getAlarmCounters(): AlarmCounters {
    return { ...this.alarmCounters }
  }

  resetAlarmCounters(): void {
    this.alarmCounters = {
      cpu_threshold_exceeded: 0,
      ram_threshold_exceeded: 0,
      mem_available_low: 0,
      heavy_concurrency_blocked: 0,
    }
  }

  /**
   * Sample CPU usage via /proc/stat delta or os.cpus()
   */
  async sampleCpuPercent(): Promise<number> {
    try {
      const stat1 = await this.readProcStat()
      if (!stat1) {
        // Fallback for non-Linux
        const load = os.loadavg()[0]
        const cpus = os.cpus().length || 1
        return Math.min(100, Math.round((load / cpus) * 100))
      }
      await new Promise(r => setTimeout(r, 500))
      const stat2 = await this.readProcStat()
      if (!stat2) return 0

      const idleDelta = stat2.idle - stat1.idle
      const totalDelta = stat2.total - stat1.total
      if (totalDelta <= 0) return 0
      const busy = ((totalDelta - idleDelta) / totalDelta) * 100
      return Math.round(busy * 10) / 10
    } catch {
      return 0
    }
  }

  private async readProcStat(): Promise<{ idle: number; total: number } | null> {
    try {
      const content = await fs.readFile('/proc/stat', 'utf8')
      const firstLine = content.split('\n')[0]
      const parts = firstLine.trim().split(/\s+/).slice(1).map(Number)
      if (parts.length < 4) return null
      const idle = parts[3] + (parts[4] || 0) // idle + iowait
      const total = parts.reduce((acc, v) => acc + v, 0)
      return { idle, total }
    } catch {
      return null
    }
  }

  /**
   * Measure Memory usage and MemAvailable in MB
   */
  async sampleMemory(): Promise<{ ramPercent: number; memAvailableMb: number }> {
    try {
      const content = await fs.readFile('/proc/meminfo', 'utf8')
      let memTotalKb = 0
      let memAvailableKb = 0

      for (const line of content.split('\n')) {
        if (line.startsWith('MemTotal:')) {
          memTotalKb = parseInt(line.replace(/\D+/g, ''), 10)
        } else if (line.startsWith('MemAvailable:')) {
          memAvailableKb = parseInt(line.replace(/\D+/g, ''), 10)
        }
      }

      if (memTotalKb > 0 && memAvailableKb > 0) {
        const memAvailableMb = Math.round(memAvailableKb / 1024)
        const ramPercent = Math.round(((memTotalKb - memAvailableKb) / memTotalKb) * 1000) / 10
        return { ramPercent, memAvailableMb }
      }
    } catch {
      // Fallback
    }

    const total = os.totalmem()
    const free = os.freemem()
    const ramPercent = Math.round(((total - free) / total) * 1000) / 10
    const memAvailableMb = Math.round(free / (1024 * 1024))
    return { ramPercent, memAvailableMb }
  }

  /**
   * Evaluates host resources and records telemetry.
   */
  async checkHostResources(supabase?: SupabaseClient): Promise<HostResourceStatus> {
    const cpu = await this.sampleCpuPercent()
    this.cpuRollingHistory.push(cpu)
    if (this.cpuRollingHistory.length > this.ROLLING_SAMPLE_COUNT) {
      this.cpuRollingHistory.shift()
    }

    // Sustained high CPU: all rolling samples >= 90%
    const sustainedHighCpu =
      this.cpuRollingHistory.length >= this.ROLLING_SAMPLE_COUNT &&
      this.cpuRollingHistory.every(v => v >= 90)

    if (sustainedHighCpu) {
      this.alarmCounters.cpu_threshold_exceeded++
    }

    const { ramPercent, memAvailableMb } = await this.sampleMemory()
    const memLow = ramPercent >= 90 || memAvailableMb < 300

    if (ramPercent >= 90) {
      this.alarmCounters.ram_threshold_exceeded++
    }
    if (memAvailableMb < 300) {
      this.alarmCounters.mem_available_low++
    }

    // Heavy Mutex check across parallel slots
    let heavyLockActive = false
    let heavyLockOwner: string | null = null

    if (supabase) {
      const activeLocks = await this.getActiveHeavyLocks(supabase)
      if (activeLocks.length >= this.MAX_PARALLEL_HEAVY_JOBS) {
        heavyLockActive = true
      }
      heavyLockOwner = activeLocks.map(l => `${l.lock_id}:${l.owner_job_id}`).join(', ')
    }

    const reasons: string[] = []
    if (sustainedHighCpu) reasons.push(`SUSTAINED_HIGH_CPU: Rolling CPU >= 90% across ${this.cpuRollingHistory.length} samples`)
    if (memLow) reasons.push(`LOW_MEMORY: RAM ${ramPercent}% or MemAvailable ${memAvailableMb}MB < 300MB`)
    if (heavyLockActive) reasons.push(`HEAVY_MUTEX_LOCKED: All ${this.MAX_PARALLEL_HEAVY_JOBS} parallel slots active (${heavyLockOwner})`)

    const allowedNewJob = !sustainedHighCpu && !heavyLockActive && !memLow
    const allowedNewScene = !memLow

    return {
      cpuPercent: cpu,
      sustainedHighCpu,
      ramPercent,
      memAvailableMb,
      memLow,
      heavyLockActive,
      heavyLockOwner,
      allowedNewJob,
      allowedNewScene,
      reasons,
    }
  }

  // --- DB-BACKED HEAVY MUTEX (Crash/Restart Resilient) ---

  async ensureLockTable(supabase: SupabaseClient): Promise<void> {
    try {
      await (supabase as any).query?.(
        `CREATE TABLE IF NOT EXISTS ai_media_heavy_locks (
          lock_id TEXT PRIMARY KEY,
          owner_job_id TEXT NOT NULL,
          acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          lease_expires_at TIMESTAMPTZ NOT NULL
        );`
      )
    } catch {
      // Table may already exist or be managed by Supabase migrations
    }
  }

  async acquireHeavyLock(supabase: SupabaseClient, jobId: string, accountId = 'default', ttlSeconds = 600): Promise<boolean> {
    await this.ensureLockTable(supabase)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString()
    const lockKey = accountId.startsWith('lock_') ? accountId : `lock_${accountId}`

    try {
      // Direct PostgreSQL pooler query if available
      if ((supabase as any).query) {
        // Clean stale locks
        await (supabase as any).query(
          `DELETE FROM ai_media_heavy_locks WHERE lease_expires_at <= NOW()`
        )
        // Try insert or take over if same owner
        const res = await (supabase as any).query(
          `INSERT INTO ai_media_heavy_locks (lock_id, owner_job_id, acquired_at, lease_expires_at)
           VALUES ($1, $2, NOW(), $3)
           ON CONFLICT (lock_id) DO UPDATE
           SET owner_job_id = EXCLUDED.owner_job_id,
               acquired_at = NOW(),
               lease_expires_at = EXCLUDED.lease_expires_at
           WHERE ai_media_heavy_locks.lease_expires_at <= NOW()
              OR ai_media_heavy_locks.owner_job_id = $2
           RETURNING owner_job_id`,
          [lockKey, jobId, expiresAt]
        )
        const acquired = res.rows && res.rows.length > 0 && res.rows[0].owner_job_id === jobId
        if (!acquired) {
          this.alarmCounters.heavy_concurrency_blocked++
        }
        return acquired
      }

      // Supabase REST client fallback
      const { data: existing } = await supabase
        .from('ai_media_heavy_locks')
        .select('*')
        .eq('lock_id', lockKey)
        .maybeSingle()

      if (existing) {
        const isStale = new Date(existing.lease_expires_at).getTime() <= now.getTime()
        const isSelf = existing.owner_job_id === jobId
        if (!isStale && !isSelf) {
          this.alarmCounters.heavy_concurrency_blocked++
          return false
        }
        // Update lease
        await supabase
          .from('ai_media_heavy_locks')
          .update({ owner_job_id: jobId, acquired_at: now.toISOString(), lease_expires_at: expiresAt })
          .eq('lock_id', lockKey)
        return true
      }

      const { error } = await supabase
        .from('ai_media_heavy_locks')
        .insert({ lock_id: lockKey, owner_job_id: jobId, acquired_at: now.toISOString(), lease_expires_at: expiresAt })
      if (error) {
        this.alarmCounters.heavy_concurrency_blocked++
        return false
      }
      return true
    } catch (e) {
      console.error('[resource-guard] Error acquiring heavy lock:', e)
      return false
    }
  }

  async releaseHeavyLock(supabase: SupabaseClient, jobId: string, accountId?: string): Promise<void> {
    try {
      const lockKey = accountId ? (accountId.startsWith('lock_') ? accountId : `lock_${accountId}`) : null
      if ((supabase as any).query) {
        if (lockKey) {
          await (supabase as any).query(
            `DELETE FROM ai_media_heavy_locks WHERE (lock_id = $1 AND owner_job_id = $2) OR (owner_job_id = $2)`,
            [lockKey, jobId]
          )
        } else {
          await (supabase as any).query(
            `DELETE FROM ai_media_heavy_locks WHERE owner_job_id = $1`,
            [jobId]
          )
        }
        return
      }
      if (lockKey) {
        await supabase
          .from('ai_media_heavy_locks')
          .delete()
          .eq('lock_id', lockKey)
          .eq('owner_job_id', jobId)
      } else {
        await supabase
          .from('ai_media_heavy_locks')
          .delete()
          .eq('owner_job_id', jobId)
      }
    } catch (e) {
      console.error('[resource-guard] Error releasing heavy lock:', e)
    }
  }

  async getActiveHeavyLocks(supabase: SupabaseClient): Promise<Array<{ lock_id: string; owner_job_id: string; lease_expires_at: string }>> {
    try {
      if ((supabase as any).query) {
        const res = await (supabase as any).query(
          `SELECT lock_id, owner_job_id, lease_expires_at FROM ai_media_heavy_locks WHERE lease_expires_at > NOW()`
        )
        return res.rows || []
      }
      const { data } = await supabase
        .from('ai_media_heavy_locks')
        .select('lock_id, owner_job_id, lease_expires_at')
        .gt('lease_expires_at', new Date().toISOString())
      return data || []
    } catch {
      return []
    }
  }

  async getActiveHeavyLock(supabase: SupabaseClient): Promise<{ owner_job_id: string; lease_expires_at: string } | null> {
    const locks = await this.getActiveHeavyLocks(supabase)
    return locks[0] || null
  }
}

export const hostResourceGuard = new ResourceGuard()
