'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SETTINGS_PREFETCH_HREFS } from './sections'

const PRIMARY_SETTINGS_ROUTES = ['/ayarlar', '/ayarlar/isletme', '/ayarlar/profil']

export function prefetchSettingsRoutes(router: { prefetch: (href: string) => void }) {
  PRIMARY_SETTINGS_ROUTES.forEach((href, index) => {
    window.setTimeout(() => {
      void router.prefetch(href)
    }, index * 100)
  })
}

export function SettingsPrefetch() {
  const router = useRouter()

  useEffect(() => {
    // Ayarlar sayfasındayken diğer sekmeleri hafifçe önbelleğe al
    SETTINGS_PREFETCH_HREFS.forEach((href, index) => {
      window.setTimeout(() => {
        void router.prefetch(href)
      }, 500 + index * 120)
    })
  }, [router])

  return null
}
