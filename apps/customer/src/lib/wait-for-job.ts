'use client'

import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type JobWaitOutcome =
  | { status: 'done' }
  | { status: 'failed' | 'cancelled'; error: string }
  | { status: 'timeout' }

/**
 * Tarayıcıda jobs satırını yoklar (gelenler yanıt formu ile aynı desen).
 * Liste / defter doğrulaması async; UI iş bitene kadar bekleyip refresh eder.
 */
export function waitForJob(
  jobId: string,
  options?: { intervalMs?: number; timeoutMs?: number },
): Promise<JobWaitOutcome> {
  const intervalMs = options?.intervalMs ?? 2000
  const timeoutMs = options?.timeoutMs ?? 5 * 60_000
  const numericId = Number(jobId)

  return new Promise((resolve) => {
    if (!Number.isFinite(numericId)) {
      resolve({ status: 'failed', error: 'İş kimliği geçersiz.' })
      return
    }

    const started = Date.now()
    let checking = false
    let settled = false

    const finish = (outcome: JobWaitOutcome) => {
      if (settled) return
      settled = true
      clearInterval(timer)
      resolve(outcome)
    }

    const check = async () => {
      if (checking || settled) return
      if (Date.now() - started > timeoutMs) {
        finish({ status: 'timeout' })
        return
      }
      checking = true
      try {
        const { data } = await getSupabaseBrowserClient()
          .from('jobs')
          .select('status, error')
          .eq('id', numericId)
          .maybeSingle()

        if (!data) return

        if (data.status === 'failed' || data.status === 'cancelled') {
          finish({
            status: data.status,
            error: data.error?.trim() || 'Doğrulama başarısız.',
          })
          return
        }

        if (data.status === 'done') {
          finish({ status: 'done' })
        }
      } finally {
        checking = false
      }
    }

    const timer = setInterval(() => {
      void check()
    }, intervalMs)
    void check()
  })
}
