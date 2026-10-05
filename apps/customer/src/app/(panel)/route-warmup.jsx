'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export const TAB_HREFS = ['/ozet', '/kampanyalar', '/mesajlar', '/kisiler', '/ayarlar']

const REWARM_MS = 150_000
const STEP_MS = 350
const warmedAt = new Map()

function isSlowNetwork() {
  const connection = navigator.connection
  if (!connection) return false
  return Boolean(connection.saveData) || /(^|-)2g$/.test(connection.effectiveType ?? '')
}

function onIdle(callback) {
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(callback, { timeout: 2500 })
    return () => window.cancelIdleCallback(id)
  }
  const id = window.setTimeout(callback, 1200)
  return () => window.clearTimeout(id)
}

export function warmRoute(router, href) {
  const last = warmedAt.get(href) ?? 0
  if (Date.now() - last < REWARM_MS) return
  warmedAt.set(href, Date.now())
  router.prefetch(href, { kind: 'full' })
}

export function warmRoutesInBackground(router, hrefs, { delayMs = 0 } = {}) {
  if (isSlowNetwork()) return () => {}
  const timers = []
  const cancelIdle = onIdle(() => {
    hrefs.forEach((href, index) => {
      timers.push(window.setTimeout(() => warmRoute(router, href), delayMs + index * STEP_MS))
    })
  })
  return () => {
    cancelIdle()
    timers.forEach((id) => window.clearTimeout(id))
  }
}

function isCurrent(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** Sayfa çizildikten sonra boşta kalınca diğer sekmeleri sırayla hazırlar. */
export function TabWarmup() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const queue = TAB_HREFS.filter((href) => !isCurrent(pathname, href))
    let cancel = warmRoutesInBackground(router, queue, { delayMs: 600 })
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      cancel()
      cancel = warmRoutesInBackground(router, queue)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancel()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, pathname])

  return null
}
