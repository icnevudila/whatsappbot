'use client'

import React from 'react'
import { TypewriterText } from '@/components/typewriter-text'

export function CraftMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | string }) {
  return (
    <div className={`wb-craft-mark wb-craft-mark--${size}`} aria-hidden>
      <span className="wb-craft-spark wb-craft-spark-a">✦</span>
      <span className="wb-craft-spark wb-craft-spark-b">✧</span>
      <span className="wb-craft-spark wb-craft-spark-c">✦</span>
      <div className="wb-craft-polaroid">
        <div className="wb-craft-canvas">
          <span className="wb-craft-wash wb-craft-wash-a" />
          <span className="wb-craft-wash wb-craft-wash-b" />
          <span className="wb-craft-scan" />
          <svg viewBox="0 0 64 80" className="wb-craft-sketch">
            <rect x="8" y="10" width="48" height="48" rx="4" className="wb-craft-stroke" />
            <path d="M14 46l10-12 8 8 7-10 11 14" className="wb-craft-stroke wb-craft-draw" />
            <circle cx="22" cy="24" r="4.5" className="wb-craft-stroke wb-craft-draw-slow" />
            <path d="M18 64h28" className="wb-craft-stroke" />
          </svg>
        </div>
      </div>
    </div>
  )
}

export interface CreativeGeneratingProps {
  title?: string
  line?: string
  detail?: React.ReactNode
  compact?: boolean
  children?: React.ReactNode
}

export function CreativeGenerating({
  title = 'Tatlı bir görsel oluşuyor',
  line = '',
  detail = null,
  compact = false,
  children = null,
}: CreativeGeneratingProps) {
  return (
    <div className={compact ? 'wb-craft wb-craft--compact' : 'wb-craft'}>
      <CraftMark size={compact ? 'sm' : 'md'} />
      {compact ? null : <p className="wb-craft-title">{title}</p>}
      <p className={compact ? 'wb-craft-line wb-craft-line--compact' : 'wb-craft-line'}>
        <TypewriterText text={line} speed={compact ? 28 : 32} />
      </p>
      {compact || !detail ? null : <p className="wb-craft-detail">{detail}</p>}
      {children}
    </div>
  )
}
