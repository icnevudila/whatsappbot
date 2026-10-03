'use client'

import React, { useState, useEffect } from 'react'
import type { EtaConfidence } from '@/lib/creative/production-progress/progress-types'

export interface ProductionEtaProps {
  jobStartedAt?: string | null
  etaDisplayText?: string | null
  etaConfidence?: EtaConfidence
  stageIndex: number
  stageCount?: number
  isCompleted?: boolean
  className?: string
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ProductionEta({
  jobStartedAt,
  etaDisplayText,
  etaConfidence = 'LOW',
  stageIndex,
  stageCount = 7,
  isCompleted = false,
  className = '',
}: ProductionEtaProps) {
  // Authoritative elapsed time calculation based on server jobStartedAt
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(() => {
    if (!jobStartedAt) return 0
    const start = new Date(jobStartedAt).getTime()
    return Math.max(0, Math.floor((Date.now() - start) / 1000))
  })

  useEffect(() => {
    if (isCompleted || stageIndex === 7) return

    const update = () => {
      if (!jobStartedAt) {
        setElapsedSeconds((prev) => prev + 1)
        return
      }
      const start = new Date(jobStartedAt).getTime()
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)))
    }

    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [jobStartedAt, isCompleted, stageIndex])

  // Progress percentage derived strictly from authoritative stage_index
  const progressPercent = isCompleted || stageIndex === 7
    ? 100
    : Math.min(95, Math.max(8, Math.round((Math.max(1, stageIndex) / stageCount) * 100)))

  const confidenceClass = etaConfidence ? etaConfidence.toLowerCase() : 'low'
  const confidenceLabel = etaConfidence === 'HIGH' ? 'Yüksek Doğruluk' : etaConfidence === 'MEDIUM' ? 'Tahmini' : 'Hesaplanıyor'

  return (
    <div className={`mesajify-prod-timer-box ${className}`}>
      <div className="mesajify-prod-timer-meta">
        <span className="mesajify-prod-elapsed">
          <span className="mesajify-prod-pulse-dot" />
          Geçen Süre: {formatDuration(elapsedSeconds)}
        </span>
        <span className="mesajify-prod-stage-num">
          Aşama {Math.max(1, stageIndex)} / {stageCount}
        </span>
      </div>

      <div className="mesajify-prod-bar-track">
        <div
          className="mesajify-prod-bar-fill"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="mesajify-prod-eta-strip">
        <span className="font-medium text-[#374151] truncate">
          {etaDisplayText || 'Tahmini süre hesaplanıyor…'}
        </span>
        {etaDisplayText && !isCompleted && stageIndex < 7 ? (
          <span className={`mesajify-prod-confidence-badge ${confidenceClass}`}>
            {confidenceLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}
