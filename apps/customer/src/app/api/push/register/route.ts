import { NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'

/** Capacitor FCM token kaydı. */
export async function POST(request: Request) {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch {
    return NextResponse.json({ error: 'Oturum yok.' }, { status: 401 })
  }

  let body: { token?: string; platform?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz gövde.' }, { status: 400 })
  }

  const token = String(body.token ?? '').trim()
  const platform = String(body.platform ?? 'android').trim().toLowerCase()
  if (!token || token.length < 20 || token.length > 4096) {
    return NextResponse.json({ error: 'Token geçersiz.' }, { status: 400 })
  }
  if (!['android', 'ios', 'web'].includes(platform)) {
    return NextResponse.json({ error: 'Platform geçersiz.' }, { status: 400 })
  }

  const { error } = await supabase.from('device_push_tokens' as never).upsert(
    {
      org_id: org.id,
      user_id: userId,
      platform,
      token,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'user_id,token' },
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  let userId: string
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, supabase } = await requireActiveOrg())
  } catch {
    return NextResponse.json({ error: 'Oturum yok.' }, { status: 401 })
  }

  let body: { token?: string }
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const token = String(body.token ?? '').trim()

  let q = supabase.from('device_push_tokens' as never).delete().eq('user_id' as never, userId as never)
  if (token) q = q.eq('token' as never, token as never)
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
