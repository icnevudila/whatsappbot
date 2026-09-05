'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@wa/shared'
import { publicEnv } from '@/lib/env'

let cached: ReturnType<typeof createBrowserClient<Database>> | undefined

/** Tarayici istemcisi — oturum kontrolu icin publishable key. */
export function getSupabaseBrowserClient() {
  if (cached) return cached

  cached = createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
  )
  return cached
}
