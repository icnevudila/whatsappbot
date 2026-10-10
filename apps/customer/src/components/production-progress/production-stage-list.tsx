'use client'

import React from 'react'
import { StudioStageIcon, studioStageVisual } from './studio-stage-visual'
import {
  CANONICAL_VIDEO_STAGES,
  type StageDefinition,
} from '@/lib/creative/production-progress/progress-types'

export interface ProductionStageListProps {
  currentStageIndex: number
  displayMessage?: string | null
  detailHint?: string | null
  stages?: readonly StageDefinition[]
  className?: string
  kind?: 'image' | 'video'
}

export function ProductionStageList({
  currentStageIndex,
  displayMessage,
  detailHint,
  stages = CANONICAL_VIDEO_STAGES,
  className = '',
  kind = 'video',
}: ProductionStageListProps) {
  return (
    <div className={`mesajify-prod-stage-list ${className}`}>
      {stages.map((stage) => {
        const isDone = currentStageIndex > stage.index
        const isCurrent = currentStageIndex === stage.index
        const isPending = currentStageIndex < stage.index

        return (
          <div
            key={stage.key}
            className={`mesajify-prod-stage-row ${isCurrent ? 'is-current' : ''} ${isDone ? 'is-done' : ''}`}
          >
            <div className="mesajify-prod-stage-icon-wrap">
              <StudioStageIcon icon={isDone ? 'circle-check' : studioStageVisual(stage.key, stage.index, kind).icon} className={isDone ? 'is-done' : isCurrent ? 'is-current' : 'is-pending'} />
            </div>

            <div className="mesajify-prod-stage-texts">
              <div className="mesajify-prod-stage-name">{kind === 'image' && stage.key === 'GENERATING' ? 'Görsel Üretiliyor' : kind === 'image' && stage.key === 'MEDIA_PROCESSING' ? 'Görsel Düzenleniyor' : kind === 'image' && stage.key === 'READY' ? 'Görseliniz Hazır' : stage.title}</div>
              {isCurrent ? (
                <div className="mesajify-prod-stage-subtext font-medium text-[#2f5bff]">
                  {displayMessage || stage.description}
                  {detailHint && detailHint !== displayMessage ? (
                    <span className="block text-[#6b7280] text-[11px] mt-0.5">
                      {detailHint}
                    </span>
                  ) : null}
                </div>
              ) : isDone ? (
                <div className="mesajify-prod-stage-subtext text-[#6b7280]">
                  {stage.description}
                </div>
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
