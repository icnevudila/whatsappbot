'use client'

import React from 'react'
import { ProductionStageAnimation } from './production-progress/production-stage-animation'
import type { ProductionStageKey } from '@/lib/creative/production-progress/progress-types'

export interface CreativeProductionVisualProps {
  kind?: 'image' | 'video'
  stageKey?: ProductionStageKey
  stageIndex?: number
  lottieSrc?: string | null
}

/**
 * CreativeProductionVisual
 * Stage-aware premium production visual with DotLottie & SVG support.
 */
export function CreativeProductionVisual({
  kind = 'video',
  stageKey,
  stageIndex,
  lottieSrc,
}: CreativeProductionVisualProps) {
  if (!stageKey && !lottieSrc) {
    const animation = kind === 'video' ? 'pulse-rings-2' : 'blocks-scale'
    return (
      <div className="mx-auto mb-5 flex h-36 w-36 items-center justify-center rounded-[32px] border border-[#dbe4ff] bg-[radial-gradient(circle_at_50%_35%,#fff_0%,#edf2ff_75%)] shadow-[0_12px_36px_-18px_rgba(47,91,255,0.35)]" aria-hidden="true">
        {/* MIT SVG Spinners; pinned source and license are shipped with these local assets. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/animations/svg-spinners/${animation}.svg`}
          width={64}
          height={64}
          alt=""
          className="h-16 w-16 motion-reduce:hidden"
          style={{ filter: 'invert(32%) sepia(91%) saturate(3148%) hue-rotate(220deg) brightness(101%) contrast(101%)' }}
        />
        <svg className="hidden h-16 w-16 text-[#2f5bff] motion-reduce:block" viewBox="0 0 64 64" fill="none">
          <rect x="10" y="14" width="44" height="36" rx="8" stroke="currentColor" strokeWidth="3" />
          {kind === 'video' ? <path d="m27 24 14 8-14 8V24Z" fill="currentColor" /> : <path d="m17 41 11-12 9 9 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />}
        </svg>
      </div>
    )
  }
  return (
    <ProductionStageAnimation
      kind={kind}
      stageKey={stageKey}
      stageIndex={stageIndex}
      lottieSrc={lottieSrc}
    />
  )
}
