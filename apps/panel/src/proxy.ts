import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/giris']

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
  const isPublic = PUBLIC_PATHS.some((publicPath) => path.startsWith(publicPath))

  if (!user && !isPublic) {
    const target = request.nextUrl.clone()
    target.pathname = '/giris'
    target.searchParams.set('devam', path)
    return NextResponse.redirect(target)
  }

  if (user && isPublic) {
    const target = request.nextUrl.clone()
    target.pathname = '/hesaplar'
    target.search = ''
    return NextResponse.redirect(target)
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
