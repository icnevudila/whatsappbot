'use client'

import { useEffect } from 'react'
import { Nav } from './nav'

function syncKeyboard() {
  const vv = window.visualViewport
  const height = vv?.height ?? window.innerHeight
  const inset = Math.max(0, window.innerHeight - height - (vv?.offsetTop ?? 0))
  const open = inset > 120
  document.body.classList.toggle('wb-keyboard-open', open)
  document.documentElement.style.setProperty('--vv-height', `${Math.round(height)}px`)
}

export function MobileChrome() {
  useEffect(() => {
    const vv = window.visualViewport
    syncKeyboard()
    vv?.addEventListener('resize', syncKeyboard)
    vv?.addEventListener('scroll', syncKeyboard)
    window.addEventListener('orientationchange', syncKeyboard)
    return () => {
      vv?.removeEventListener('resize', syncKeyboard)
      vv?.removeEventListener('scroll', syncKeyboard)
      window.removeEventListener('orientationchange', syncKeyboard)
      document.body.classList.remove('wb-keyboard-open')
      document.documentElement.style.removeProperty('--vv-height')
    }
  }, [])

  return <Nav variant="tabbar" />
}
