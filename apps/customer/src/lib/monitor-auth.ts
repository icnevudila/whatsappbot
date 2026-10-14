import crypto from 'node:crypto'

type MonitorEnvironment = Record<string, string | undefined> & { CANLI_TAKIP_PIN?: string; SUPABASE_JWT_SECRET?: string }

export function expectedMonitorToken(env: MonitorEnvironment = process.env): string {
  if (!env.CANLI_TAKIP_PIN || !env.SUPABASE_JWT_SECRET) return ''
  return crypto.createHmac('sha256', env.SUPABASE_JWT_SECRET).update(env.CANLI_TAKIP_PIN).digest('hex')
}

function equalSecret(actual: string, expected: string): boolean {
  if (!actual || !expected) return false
  return crypto.timingSafeEqual(crypto.createHash('sha256').update(actual).digest(),
    crypto.createHash('sha256').update(expected).digest())
}

export function verifyMonitorPassword(input: string, env: MonitorEnvironment = process.env): boolean {
  return Boolean(expectedMonitorToken(env)) && equalSecret(input.trim(), env.CANLI_TAKIP_PIN || '')
}

export function verifyMonitorToken(token: string, env: MonitorEnvironment = process.env): boolean {
  return equalSecret(token, expectedMonitorToken(env))
}
