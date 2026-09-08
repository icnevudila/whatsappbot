export function requiredEnv(key: string, fallback?: string): string {
  const value = process.env[key]
  if (value !== undefined && value !== '') return value
  if (fallback !== undefined) return fallback
  throw new Error(`Missing required env: ${key}`)
}

export function readEnv(key: string, fallback?: string): string {
  return requiredEnv(key, fallback)
}

export function readOptionalEnv(key: string): string | undefined {
  const value = process.env[key]
  return value !== undefined && value !== '' ? value : undefined
}

export function boolEnv(key: string, fallback = false): boolean {
  const value = process.env[key]
  if (value === undefined || value === '') return fallback
  return value === '1' || value.toLowerCase() === 'true'
}

export function readBoolEnv(key: string, fallback = false): boolean {
  return boolEnv(key, fallback)
}

export function intEnv(key: string, fallback: number): number {
  const value = process.env[key]
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function readPort(defaultPort = 8080): number {
  return intEnv('PORT', intEnv('HEALTH_PORT', defaultPort))
}

/** MOCK_MODE varsayilan true — canli credential gerektirmez. */
export function isMockMode(defaultValue = true): boolean {
  return boolEnv('MOCK_MODE', defaultValue)
}
