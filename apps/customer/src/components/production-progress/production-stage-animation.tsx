'use client'

import React, { useState, useEffect } from 'react'
import type { ProductionStageKey } from '@/lib/creative/production-progress/progress-types'

export interface StageAnimationProps {
  stageKey?: ProductionStageKey
  stageIndex?: number
  kind?: 'video' | 'image'
  lottieSrc?: string | null
  className?: string
}

/** Stage-specific SVG illustrations for each canonical phase */
function StageSpecificGraphic({
  stageKey,
  stageIndex = 1,
  kind = 'video',
}: {
  stageKey?: ProductionStageKey
  stageIndex?: number
  kind?: 'video' | 'image'
}) {
  // Stage 1: REQUEST_ACCEPTED
  if (stageIndex === 1 || stageKey === 'REQUEST_ACCEPTED') {
    return (
      <svg viewBox="0 0 80 80" className="size-16 text-[#2f5bff]" fill="none">
        <rect x="18" y="14" width="44" height="52" rx="8" stroke="currentColor" strokeWidth="2.5" opacity="0.85" />
        <path d="M28 28h24M28 38h16M28 48h20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="54" cy="50" r="10" fill="#f4f6fc" stroke="currentColor" strokeWidth="2" />
        <path d="M50 50l3 3 5-5" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // Stage 2: QUEUED
  if (stageIndex === 2 || stageKey === 'QUEUED') {
    return (
      <svg viewBox="0 0 80 80" className="size-16 text-[#0d9488]" fill="none">
        <circle cx="40" cy="40" r="26" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
        <circle cx="40" cy="40" r="26" stroke="currentColor" strokeWidth="2.5" strokeDasharray="40 120" strokeLinecap="round" />
        <path d="M40 26v14l10 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }

  // Stage 3: ASSETS_PREPARING
  if (stageIndex === 3 || stageKey === 'ASSETS_PREPARING') {
    return (
      <svg viewBox="0 0 80 80" className="size-16 text-[#2f5bff]" fill="none">
        <rect x="16" y="24" width="34" height="34" rx="6" stroke="currentColor" strokeWidth="2.2" opacity="0.85" />
        <circle cx="26" cy="34" r="3.5" fill="currentColor" />
        <path d="M19 50l9-10 7 7 8-9 7 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="34" y="16" width="30" height="30" rx="6" stroke="#0d9488" strokeWidth="2.2" fill="#ffffff" />
        <path d="M42 31h14M49 24v14" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  // Stage 4: GENERATING
  if (stageIndex === 4 || stageKey === 'GENERATING') {
    return (
      <svg viewBox="0 0 80 80" className="size-16 text-[#2f5bff]" fill="none">
        <rect x="14" y="20" width="52" height="40" rx="8" stroke="currentColor" strokeWidth="2.5" />
        {kind === 'video' ? (
          <>
            <polygon points="36,32 48,40 36,48" fill="currentColor" />
            <circle cx="22" cy="26" r="2" fill="currentColor" opacity="0.5" />
            <circle cx="30" cy="26" r="2" fill="currentColor" opacity="0.5" />
            <circle cx="22" cy="54" r="2" fill="currentColor" opacity="0.5" />
            <circle cx="30" cy="54" r="2" fill="currentColor" opacity="0.5" />
          </>
        ) : (
          <>
            <circle cx="30" cy="34" r="4" fill="currentColor" />
            <path d="M20 54l14-14 10 10 12-14 6 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
    )
  }

  // Stage 5: MEDIA_PROCESSING
  if (stageIndex === 5 || stageKey === 'MEDIA_PROCESSING') {
    return (
      <svg viewBox="0 0 80 80" className="size-16 text-[#0d9488]" fill="none">
        <rect x="16" y="22" width="48" height="36" rx="6" stroke="currentColor" strokeWidth="2.2" opacity="0.8" />
        <path d="M26 44v-8M32 48v-16M38 52v-24M44 48v-16M50 44v-8M56 42v-4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    )
  }

  // Stage 6: QUALITY_CHECK
  if (stageIndex === 6 || stageKey === 'QUALITY_CHECK') {
    return (
      <svg viewBox="0 0 80 80" className="size-16 text-[#2f5bff]" fill="none">
        <path d="M40 14L20 22v18c0 14 8.5 24 20 28 11.5-4 20-14 20-28V22L40 14z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M32 40l6 6 12-12" stroke="#0d9488" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // Stage 7: READY / COMPLETED
  if (stageIndex === 7 || stageKey === 'READY') {
    return (
      <svg viewBox="0 0 80 80" className="size-16 text-[#0d9488]" fill="none">
        <circle cx="40" cy="40" r="28" fill="#ecfdf5" stroke="currentColor" strokeWidth="2.5" />
        <path d="M28 40l8 8 16-16" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // Fallback
  return (
    <svg viewBox="0 0 80 80" className="size-16 text-[#2f5bff]" fill="none">
      <circle cx="40" cy="40" r="26" stroke="currentColor" strokeWidth="2.5" strokeDasharray="6 6" />
      <polygon points="36,32 48,40 36,48" fill="currentColor" />
    </svg>
  )
}

/**
 * Production Stage Animation
 * Supports DotLottie dynamic rendering with zero-bloat SVG fallback.
 */
export function ProductionStageAnimation({
  stageKey,
  stageIndex = 1,
  kind = 'video',
  lottieSrc,
  className = '',
}: StageAnimationProps) {
  const [isClient, setIsClient] = useState(false)
  const [lottieError, setLottieError] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  // If DotLottie URL is given and client is ready, dynamically render DotLottieReact
  if (isClient && lottieSrc && !lottieError) {
    try {
      // Lazy load DotLottieReact component
      const { DotLottieReact } = require('@lottiefiles/dotlottie-react')
      return (
        <div className={`mesajify-prod-visual-host ${className}`}>
          <div className="mesajify-prod-visual-wrapper">
            <DotLottieReact
              src={lottieSrc}
              loop
              autoplay
              onError={() => setLottieError(true)}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
      )
    } catch {
      // Graceful fallback to SVG visual on any import or runtime issue
    }
  }

  return (
    <div className={`mesajify-prod-visual-host ${className}`} aria-hidden="true">
      <div className="mesajify-prod-ambient-orbit">
        <span className="mesajify-prod-ambient-dot" />
      </div>

      <div className="mesajify-prod-svg-visual">
        <div className="mesajify-prod-card-back" />
        <div className="mesajify-prod-card-front">
          <StageSpecificGraphic stageKey={stageKey} stageIndex={stageIndex} kind={kind} />
          <div className="mesajify-prod-scan-line" />
        </div>
      </div>
    </div>
  )
}
