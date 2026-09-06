'use client'

import { useEffect, useState } from 'react'

export function LandingScrollTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 900)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      aria-label="Yukarı çık"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-40 hidden size-10 items-center justify-center rounded-full border border-hairline bg-surface text-[16px] text-ink-muted shadow-[var(--shadow-md)] transition-colors hover:text-ink sm:bottom-6 sm:flex"
    >
      ↑
    </button>
  )
}
