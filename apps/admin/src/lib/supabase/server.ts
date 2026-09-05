import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@wa/shared'
import { publicEnv } from '@/lib/env'

/**
 * Sunucu tarafi Supabase istemcisi.
 * Yalnizca publishable key; yetki kontrolu JWT app_metadata + RPC'de.
 */
export async function createSupabaseServerClient() {
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
            // Server Component icinden cookie yazilamaz; proxy oturumu tazeler.
          }
        },
      },
    },
  )
}

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}
