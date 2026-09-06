'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const SHOW_AT = 380

export function StickyCta() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const zones = document.querySelectorAll('[data-landing-conversion-zone]')
    let zoneVisible = false

    const update = () => {
      setVisible(window.scrollY > SHOW_AT && !zoneVisible)
    }

    const zoneObserver =
      zones.length > 0
        ? new IntersectionObserver(
            (entries) => {
              zoneVisible = entries.some((e) => e.isIntersecting)
              update()
            },
            { threshold: 0.12 },
          )
        : null

    zones.forEach((el) => zoneObserver?.observe(el))
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => {
      window.removeEventListener('scroll', update)
      zoneObserver?.disconnect()
    }
  }, [])

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur transition-transform duration-300 md:hidden ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      aria-hidden={!visible}
    >
      <Link
        href="/giris?mod=kayit"
        className="flex h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-accent text-[13px] font-medium text-accent-ink"
      >
        7 gün ücretsiz dene
      </Link>
    </div>
  )
}
