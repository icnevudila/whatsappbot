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
  if (cached) return cached

  const client = createBrowserClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabasePublishableKey,
  )

  /**
   * Realtime, RLS kontrolunu HTTP baslugundan degil soket uzerindeki
   * token'dan yapiyor. Yeni sb_publishable_* anahtarlari (eski anon
   * anahtarinin yerini alan bicim) JWT degil; kullanici token'i elle
   * verilmezse soket "anon" rolunde baglaniyor ve owner_id kapsamli RLS
   * politikalari her satiri eliyor.
   *
   * Bunun kotu tarafi sessiz olmasi: kanal SUBSCRIBED donuyor, hicbir hata
   * cikmiyor, sadece hicbir olay gelmiyor. QR kodunun panele dusmemesinin
   * nedeni buydu.
   *
   * setAuth abone olduktan sonra cagrilsa da calisiyor: supabase-js token'i
   * acik olan tum kanallara ayrica gonderiyor.
   */
  void client.auth.getSession().then(({ data }) => {
    if (data.session?.access_token) {
      client.realtime.setAuth(data.session.access_token)
    }
  })

  // Token yenilendiginde (bir saatte bir) soketin de guncellenmesi gerekiyor,
  // yoksa uzun acik kalan sekmelerde olay akisi sessizce kesilir.
  client.auth.onAuthStateChange((_event, session) => {
    client.realtime.setAuth(session?.access_token ?? null)
  })

  cached = client
  return cached
}
