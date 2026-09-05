import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/auth-redirect'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const token_hash = params.get('token_hash')
  const type = params.get('type')
  if (token_hash && (type === 'email' || type === 'signup' || type === 'recovery' || type === 'invite')) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error) return NextResponse.redirect(new URL(type === 'recovery' ? '/sifre-yenile' : safeInternalPath(params.get('devam'), '/kurulum'), request.url))
  }
  return NextResponse.redirect(new URL('/giris?hata=baglanti', request.url))
}
