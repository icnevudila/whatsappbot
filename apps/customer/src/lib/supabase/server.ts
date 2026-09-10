import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@wa/shared'
import { publicEnv } from '@/lib/env'
import { getFastSessionClaims } from './fast-jwt'

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

/** JWT'yi yerelde (0ms) doğrular; Auth sunucusuna gitmez. Süresi dolmuşsa getUser() fallback yapar. */
export const getAuthIdentity = cache(async () => {
  const cookieStore = await cookies()
  const fast = getFastSessionClaims(cookieStore.getAll())
  const supabase = await createSupabaseServerClient()

  let claims = fast?.claims
  let userId = claims?.sub ?? null
  let email = claims?.email ?? null
  let appMeta = claims?.app_metadata

  if (!userId) {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
      return { supabase, userId: null as string | null, email: null as string | null, jwtPlatformAdmin: false }
    }
    userId = data.user.id
    email = data.user.email ?? null
    appMeta = data.user.app_metadata
  }

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
