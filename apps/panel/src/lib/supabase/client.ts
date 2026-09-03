'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@wa/shared'
import { publicEnv } from '@/lib/env'

let cached: ReturnType<typeof createBrowserClient<Database>> | undefined

/**
 * Tarayici istemcisi. Realtime aboneligi buradan kuruluyor:
 * QR kodu ve kampanya ilerlemesi sayfa yenilemeden guncelleniyor.
 */
export function getSupabaseBrowserClient() {
  cached ??= createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
  )
  return cached
}
