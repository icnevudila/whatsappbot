import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Oturum acmis kullaniciyi panele geri gonderdigimiz tek yer. */
const AUTH_PATHS = new Set(['/giris'])

/** Herkese acik pazarlama yollari. Tam eslesme: '/' prefix olarak her seyi tutar. */
const MARKETING_PATHS = new Set([
  '/',
  '/kvkk',
  '/kosullar',
  '/sifremi-unuttum',
  '/sifre-yenile',
  '/auth/callback',
  '/auth/confirm',
  '/robots.txt',
  '/sitemap.xml',
])

/**
 * Her istekte Supabase oturumunu tazeler ve korumali yollari kapatir.
 * getUser() cagrisi sart: token'i sunucu tarafinda dogrulamadan sadece
 * cookie varligina bakmak sahte oturumla panele girmeyi mumkun kilar.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })
  const path = request.nextUrl.pathname
  // Public pages do not depend on the availability of the authentication service.
  if (MARKETING_PATHS.has(path)) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthPath = AUTH_PATHS.has(path)
  const isPublic = isAuthPath || MARKETING_PATHS.has(path)

  function withSessionCookies(next: NextResponse) {
    for (const cookie of response.cookies.getAll()) next.cookies.set(cookie)
    next.headers.set('Cache-Control', 'private, no-store')
    return next
  }

  if (!user && !isPublic) {
    if (path.startsWith('/api/')) {
      return withSessionCookies(NextResponse.json({ error: 'Oturumunuz sona erdi. Tekrar giriş yapın.' }, { status: 401 }))
    }
    const target = request.nextUrl.clone()
    target.pathname = '/giris'
    target.search = ''
    target.searchParams.set('devam', path + request.nextUrl.search)
    return withSessionCookies(NextResponse.redirect(target))
  }

  // Landing oturum acikken de gezilebilir olmali; yalnizca giris ekranindan
  // panele geri gonderiyoruz. Layout setup tamam degilse /kurulum'a cevirir.
  if (user && isAuthPath) {
    const target = request.nextUrl.clone()
    target.pathname = '/ozet'
    target.search = ''
    return withSessionCookies(NextResponse.redirect(target))
  }

  // RSC layout gate icin pathname (zorunlu onboarding).
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
