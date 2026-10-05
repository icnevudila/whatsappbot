'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { warmRoutesInBackground } from '../route-warmup'
import { SETTINGS_SECTIONS } from './sections'

export function SettingsPrefetch() {
  const router = useRouter()

  useEffect(
    () =>
      warmRoutesInBackground(
        router,
        SETTINGS_SECTIONS.map((section) => section.href),
        { delayMs: 400 },
      ),
    [router],
  )

  return null
}
