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
  return (
    <ProductionStageAnimation
      kind={kind}
      stageKey={stageKey}
      stageIndex={stageIndex}
      lottieSrc={lottieSrc}
    />
  )
}
