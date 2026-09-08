import process from 'node:process'

export function requiredEnv(name: string, fallback?: string): string {
  const value = process.env[name]?.trim()
  if (value) return value
  if (fallback !== undefined) return fallback
  throw new Error(`Ortam degiskeni eksik: ${name}`)
}

export function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim()
  if (!raw) return fallback
  if (!/^-?\d+$/.test(raw)) {
    throw new Error(`${name} gecersiz sayi: "${raw}"`)
  }
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} gecersiz sayi: "${raw}"`)
  }
  return parsed
}

export function assertEnum<T extends string>(
  name: string,
  value: string,
  allowed: readonly T[],
): T {
  if ((allowed as readonly string[]).includes(value)) return value as T
  throw new Error(`${name} gecersiz: "${value}". Izin verilen: ${allowed.join(' | ')}`)
}

export type WorkerRole = 'worker' | 'scaler'

/**
 * Worker icin WORKER_ID zorunlu. Scaler icin varsayilan scaler-1.
 */
export function resolveWorkerId(role: WorkerRole = 'worker'): string {
  const value = process.env.WORKER_ID?.trim()
  if (value) return value
  if (role === 'scaler') return 'scaler-1'
  throw new Error(
    'WORKER_ID zorunlu (worker). Ornek: WORKER_ID=tg-1 veya entrypoint ile otomatik.',
  )
}
