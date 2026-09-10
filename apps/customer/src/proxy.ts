import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getFastSessionClaims } from '@/lib/supabase/fast-jwt'

const AUTH_PATHS = new Set(['/giris'])

const PUBLIC_PATHS = new Set([
  '/',
  '/giris',
  '/erisim-yok',
  '/kvkk',
  '/kosullar',
  '/sifremi-unuttum',
  '/sifre-yenile',
  '/auth/callback',
  '/auth/confirm',
  '/robots.txt',
  '/sitemap.xml',
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

  const fast = getFastSessionClaims(request.cookies.getAll())
  let hasUser = Boolean(fast?.claims?.sub)
  let userId = fast?.claims?.sub ?? null

  let supabase: ReturnType<typeof createServerClient> | null = null
  function getSupabase() {
    if (!supabase) {
      supabase = createServerClient(
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
    }
    return supabase
  }

  const isAuthPath = AUTH_PATHS.has(path)
  const isNoOrgPath = path === '/erisim-yok'
  const isPublic = isAuthPath || isNoOrgPath || PUBLIC_PATHS.has(path)

  // Token yerelde cozulememisse veya suresi bitmisse, getUser ile dogrula / tazele
  if (!hasUser && (!isPublic || isAuthPath)) {
    const client = getSupabase()
    const { data } = await client.auth.getUser()
    if (data?.user) {
      hasUser = true
      userId = data.user.id
    }
  }

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
    const client = getSupabase()
    const { data: membership } = await client
      .from('organization_members')
      .select('org_id')
      .eq('user_id', userId!)
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
