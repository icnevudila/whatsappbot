import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_PATHS = new Set(['/giris'])

const PUBLIC_PATHS = new Set([
  '/giris',
  '/erisim-yok',
  '/kvkk',
  '/kosullar',
  '/sifremi-unuttum',
  '/sifre-yenile',
  '/auth/callback',
  '/auth/confirm',
])

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const path = request.nextUrl.pathname

  // Worker Bearer secret ile gelir; oturum yok.
  if (path.startsWith('/api/internal/') || path.startsWith('/api/push/notify')) {
    return NextResponse.next({ request })
  }

  if (PUBLIC_PATHS.has(path) && path !== '/giris' && path !== '/erisim-yok') {
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const { data } = await supabase.auth.getClaims()
  const hasUser = Boolean(data?.claims?.sub)

  const isAuthPath = AUTH_PATHS.has(path)
  const isNoOrgPath = path === '/erisim-yok'
  const isPublic = isAuthPath || isNoOrgPath || PUBLIC_PATHS.has(path)

  function withSessionCookies(next: NextResponse) {
    for (const cookie of response.cookies.getAll()) next.cookies.set(cookie)
    next.headers.set('Cache-Control', 'private, no-store')
    return next
  }

  if (!hasUser && !isPublic) {
    if (path.startsWith('/api/')) {
      return withSessionCookies(
        NextResponse.json({ error: 'Oturumunuz sona erdi. Tekrar giriş yapın.' }, { status: 401 }),
      )
    }
    const target = request.nextUrl.clone()
    target.pathname = '/giris'
    target.search = ''
    target.searchParams.set('devam', path + request.nextUrl.search)
    return withSessionCookies(NextResponse.redirect(target))
  }

  if (hasUser && isAuthPath) {
    const userId = String(data?.claims?.sub ?? '')
    const { data: membership } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    const target = request.nextUrl.clone()
    target.pathname = membership ? '/ozet' : '/erisim-yok'
    target.search = ''
    return withSessionCookies(NextResponse.redirect(target))
  }

  if (!hasUser && isNoOrgPath) {
    const target = request.nextUrl.clone()
    target.pathname = '/giris'
    target.search = ''
    return withSessionCookies(NextResponse.redirect(target))
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-filo-pathname', path)
  const next = NextResponse.next({
    request: { headers: requestHeaders },
  })
  for (const cookie of response.cookies.getAll()) next.cookies.set(cookie)
  next.headers.set('Cache-Control', 'private, no-store')
  return next
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
