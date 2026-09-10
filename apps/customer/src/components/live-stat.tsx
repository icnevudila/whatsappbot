'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Stat } from '@/components/ui'

/** Canlı sayaç — değer değişince kısa tick animasyonu. */
export function LiveStat({
  value,
  label,
  tone = 'default',
  detail,
  className,
}: {
  value: ReactNode
  label: string
  tone?: 'default' | 'accent' | 'muted' | 'danger' | 'warn'
  detail?: ReactNode
  className?: string
}) {
  const [tick, setTick] = useState(false)
  const prev = useRef(value)

  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    setTick(true)
    const t = setTimeout(() => setTick(false), 420)
    return () => clearTimeout(t)
  }, [value])

  return (
    <Stat
      value={value}
      label={label}
      tone={tone}
      detail={detail}
      className={[tick && 'wb-stat-tick', className].filter(Boolean).join(' ')}
    />
  )
}
