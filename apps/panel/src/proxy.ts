import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** Oturum acmis kullaniciyi panele geri gonderdigimiz tek yer. */
const AUTH_PATHS = ['/giris']

/** Herkese acik pazarlama yollari. Tam eslesme: '/' prefix olarak her seyi tutar. */
const MARKETING_PATHS = new Set(['/', '/kvkk', '/kosullar'])

/**
 * Her istekte Supabase oturumunu tazeler ve korumali yollari kapatir.
 * getUser() cagrisi sart: token'i sunucu tarafinda dogrulamadan sadece
 * cookie varligina bakmak sahte oturumla panele girmeyi mumkun kilar.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

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

  const path = request.nextUrl.pathname
  const isAuthPath = AUTH_PATHS.some((authPath) => path.startsWith(authPath))
  const isPublic = isAuthPath || MARKETING_PATHS.has(path)

  if (!user && !isPublic) {
    const target = request.nextUrl.clone()
    target.pathname = '/giris'
    target.searchParams.set('devam', path)
    return NextResponse.redirect(target)
  }

  // Landing oturum acikken de gezilebilir olmali; yalnizca giris ekranindan
  // panele geri gonderiyoruz.
  if (user && isAuthPath) {
    const target = request.nextUrl.clone()
    target.pathname = '/durum'
    target.search = ''
    return NextResponse.redirect(target)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
