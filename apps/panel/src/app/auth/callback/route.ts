import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/auth-redirect'

/**
 * PKCE code exchange (+ opsiyonel token_hash OTP) — davet/şifre/e-posta confirm.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const next = safeInternalPath(params.get('devam'), '/kurulum')
  const supabase = await createSupabaseServerClient()

  const code = params.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  const token_hash = params.get('token_hash')
  const type = params.get('type')
  if (
    token_hash &&
    (type === 'email' || type === 'signup' || type === 'recovery' || type === 'invite')
  ) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type,
    })
    if (!error) {
      const dest = type === 'recovery' ? '/sifre-yenile' : next
      return NextResponse.redirect(new URL(dest, request.url))
    }
  }

  return NextResponse.redirect(new URL('/giris?hata=baglanti', request.url))
}
