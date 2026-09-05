import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { safeInternalPath } from '@/lib/auth-redirect'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  if (code) {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(safeInternalPath(request.nextUrl.searchParams.get('devam')), request.url))
  }
  return NextResponse.redirect(new URL('/giris?hata=baglanti', request.url))
}
