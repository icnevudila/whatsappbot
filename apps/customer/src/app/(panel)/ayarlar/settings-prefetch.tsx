'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SETTINGS_PREFETCH_HREFS } from './sections'

export function prefetchSettingsRoutes(router: { prefetch: (href: string) => void }) {
  SETTINGS_PREFETCH_HREFS.forEach((href, index) => {
    window.setTimeout(() => {
      void router.prefetch(href)
    }, index * 40)
  })
}

export function SettingsPrefetch() {
  const router = useRouter()

  useEffect(() => {
    prefetchSettingsRoutes(router)
  }, [router])

  return null
}
