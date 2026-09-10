'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

/** Ayarlar içinde animasyon yok — sekme geçişi anında olsun. */
export default function PanelTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith('/ayarlar')) return children
  return <div className="wb-page-enter">{children}</div>
}
