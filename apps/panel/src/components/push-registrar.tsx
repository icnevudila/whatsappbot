'use client'

import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useEffect, useRef } from 'react'

function openPushPath(path: unknown) {
  if (typeof path !== 'string') return
  const clean = path.trim()
  if (!clean.startsWith('/')) return
  window.location.assign(clean)
}

/**
 * FCM token → /api/push/register; tap → data.path (yalnızca Capacitor).
 */
export function PushRegistrar({ enabled }: { enabled: boolean }) {
  const once = useRef(false)

  useEffect(() => {
    if (!enabled || once.current) return
    if (!Capacitor.isNativePlatform()) return
    if (Capacitor.getPlatform() !== 'android' && Capacitor.getPlatform() !== 'ios') return

    once.current = true
    const cleans: Array<() => void> = []
    let cancelled = false

    void (async () => {
      try {
        const perm = await PushNotifications.requestPermissions()
        if (perm.receive !== 'granted' || cancelled) return
        await PushNotifications.register()

        const reg = await PushNotifications.addListener('registration', (token) => {
          if (cancelled || !token.value) return
          void fetch('/api/push/register', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              token: token.value,
              platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android',
            }),
          })
        })
        cleans.push(() => reg.remove())

        const tap = await PushNotifications.addListener(
          'pushNotificationActionPerformed',
          (event) => {
            const data = event.notification?.data as { path?: string } | undefined
            openPushPath(data?.path)
          },
        )
        cleans.push(() => tap.remove())

        // App açıkken gelen bildirim (opsiyonel — sessiz; tap yok)
        const recv = await PushNotifications.addListener('pushNotificationReceived', () => {})
        cleans.push(() => recv.remove())
      } catch (error) {
        console.warn('[push] init failed', error)
      }
    })()

    return () => {
      cancelled = true
      for (const c of cleans) c()
    }
  }, [enabled])

  return null
}
