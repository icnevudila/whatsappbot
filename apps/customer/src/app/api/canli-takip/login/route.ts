import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { COOKIE_NAME, getExpectedToken, verifyPassword } from '@/app/canli-takip/auth'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const password = String(body.password ?? '').trim()

    if (!password) {
      return NextResponse.json({ success: false, error: 'Lütfen şifreyi girin.' }, { status: 400 })
    }

    if (!verifyPassword(password)) {
      return NextResponse.json({ success: false, error: 'Hatalı şifre. Giriş reddedildi.' }, { status: 401 })
    }

    const cookieStore = await cookies()
    const token = getExpectedToken()

    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 gün
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Giriş yapılamadı' },
      { status: 500 },
    )
  }
}
