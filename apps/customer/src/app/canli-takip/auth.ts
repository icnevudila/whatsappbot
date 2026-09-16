import crypto from 'node:crypto'
import { cookies } from 'next/headers'

export const MASTER_PIN = process.env.CANLI_TAKIP_PIN || 'mesafiy123@!'
export const COOKIE_NAME = 'canli_takip_token'

// Güvenli hash üretici
export function getExpectedToken(): string {
  const secret = process.env.SUPABASE_JWT_SECRET || 'filo-canli-takip-secure-salt-2026'
  return crypto.createHmac('sha256', secret).update(MASTER_PIN).digest('hex')
}

export function verifyPassword(input: string): boolean {
  if (!input) return false
  return input.trim() === MASTER_PIN
}

export async function checkIsAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return false
  return token === getExpectedToken()
}
