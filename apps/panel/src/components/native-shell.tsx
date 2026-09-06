'use client'

import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { useEffect } from 'react'

/**
 * Capacitor shell — tüm sayfalarda (landing/giriş/panel).
 * Status bar WebView’in üstüne binmesin; native’de kök → /giris.
 */
export function NativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    document.documentElement.classList.add('filo-native')

    const path = window.location.pathname.replace(/\/$/, '') || '/'
    if (path === '/') {
      window.location.replace('/giris')
      return
    }

    void (async () => {
      try {
        await StatusBar.setOverlaysWebView({ overlay: false })
        await StatusBar.setStyle({ style: Style.Light })
        await StatusBar.setBackgroundColor({ color: '#f3f5f9' })
      } catch {
        /* web / plugin yok */
      }
    })()

    const sub = App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack || window.history.length > 1) window.history.back()
      else void App.minimizeApp()
    })

    return () => {
      void sub.then((h) => h.remove())
      document.documentElement.classList.remove('filo-native')
    }
  }, [])

  return null
}
