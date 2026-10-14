import { cookies } from 'next/headers'
import { expectedMonitorToken, verifyMonitorPassword, verifyMonitorToken } from '@/lib/monitor-auth'

export const MASTER_PIN = process.env.CANLI_TAKIP_PIN || ''
export const COOKIE_NAME = 'canli_takip_token'

// Güvenli hash üretici
export function getExpectedToken(): string {
  return expectedMonitorToken()
}

export function verifyPassword(input: string): boolean {
  return verifyMonitorPassword(input)
}

export async function checkIsAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return false
  return verifyMonitorToken(token)
}
