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

/** Oturum yoksa null doner. Korumali sayfalar bunu kullanip yonlendirir. */
export async function getSessionUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
