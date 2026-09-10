import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@wa/shared'
import { publicEnv } from '@/lib/env'

/**
 * Sunucu tarafi Supabase istemcisi.
 * Yalnizca publishable key kullanir; butun yetki kontrolu RLS'te.
 * Panelin secret / service_role anahtarina hic ihtiyaci yok.
 * Ayni istek icinde tekrar kullanilir (React cache).
 */
export const createSupabaseServerClient = cache(async () => {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server Component icinden cagrildiginda cookie yazilamaz.
            // Oturum tazeleme src/proxy.ts'te yapiliyor, burada sessizce geciyoruz.
          }
        },
      },
    },
  )
})

/** JWT'yi yerelde doğrular; Auth sunucusuna gitmez. */
export const getAuthIdentity = cache(async () => {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims
  const userId = typeof claims?.sub === 'string' ? claims.sub : null
  if (error || !userId || !claims) {
    return { supabase, userId: null as string | null, email: null as string | null, jwtPlatformAdmin: false }
  }

  const email = typeof claims.email === 'string' ? claims.email : null
  const appMeta = claims.app_metadata
  const flag =
    appMeta && typeof appMeta === 'object'
      ? (appMeta as Record<string, unknown>).platform_admin
      : undefined
  const jwtPlatformAdmin = flag === true || flag === 'true' || flag === '1'

  return { supabase, userId, email, jwtPlatformAdmin }
})

/** Oturum yoksa null doner. Korumali sayfalar bunu kullanip yonlendirir. */
export async function getSessionUser() {
  const identity = await getAuthIdentity()
  if (!identity.userId) return null
  return { id: identity.userId, email: identity.email ?? undefined }
}
