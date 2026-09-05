'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@wa/shared'
import { publicEnv } from '@/lib/env'

let cached: ReturnType<typeof createBrowserClient<Database>> | undefined

export function getSupabaseBrowserClient() {
  if (cached) return cached

  const client = createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
  )

  void client.auth.getSession().then(({ data }) => {
    if (data.session?.access_token) {
      client.realtime.setAuth(data.session.access_token)
    }
  })

  client.auth.onAuthStateChange((_event, session) => {
    client.realtime.setAuth(session?.access_token ?? null)
  })

  cached = client
  return cached
}
