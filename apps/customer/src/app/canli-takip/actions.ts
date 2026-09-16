'use server'

import { cookies } from 'next/headers'
import { COOKIE_NAME, getExpectedToken, verifyPassword } from './auth'

export type AuthActionResult = {
  success: boolean
  error?: string
}

export async function loginCanliTakip(
  _prevState: AuthActionResult | null,
  formData: FormData,
): Promise<AuthActionResult> {
  const password = String(formData.get('password') ?? '').trim()

  if (!password) {
    return { success: false, error: 'Lütfen şifreyi girin.' }
  }

  if (!verifyPassword(password)) {
    return { success: false, error: 'Hatalı şifre. Giriş reddedildi.' }
  }

  const cookieStore = await cookies()
  const token = getExpectedToken()

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 gün geçerli
  })

  return { success: true }
}

export async function logoutCanliTakip(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
