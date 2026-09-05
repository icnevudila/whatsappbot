'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Sayfa gecislerinde ustte ince kobalt cubuk — Pilot workbench hissi.
 * Link tiklamasinda baslar, pathname/search degisince biter.
 */
export function RouteProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [active, setActive] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const routeKey = `${pathname}?${searchParams?.toString() ?? ''}`

  useEffect(() => {
    setActive(false)
    if (timer.current) clearTimeout(timer.current)
  }, [routeKey])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (event.button !== 0) return
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

      const target = event.target as HTMLElement | null
      const anchor = target?.closest('a')
      if (!anchor) return

      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#')) return
      if (anchor.target && anchor.target !== '_self') return
      if (anchor.hasAttribute('download')) return

      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return
        if (url.pathname === pathname && url.search === window.location.search) return
      } catch {
        return
      }

      setActive(true)
      if (timer.current) clearTimeout(timer.current)
      // Takılı kalmasın — yavaş sayfalarda da en fazla 8 sn
      timer.current = setTimeout(() => setActive(false), 8_000)
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      if (timer.current) clearTimeout(timer.current)
    }
  }, [pathname])

  return (
    <div
      className={`wb-route-progress ${active ? 'is-active' : ''}`}
      role="progressbar"
      aria-hidden={!active}
      aria-valuetext={active ? 'Sayfa yükleniyor' : undefined}
    >
      <span />
    </div>
  )
}
