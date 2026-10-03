'use client'

import React from 'react'
import Link from 'next/link'
import type { JobUserViewModel } from '@/app/(panel)/icerik/wizard-types'
import { ProductionStageAnimation } from './production-stage-animation'
import { ProductionEta } from './production-eta'
import { ProductionStageList } from './production-stage-list'
import './production-progress.css'

export interface ProductionProgressProps {
  viewModel: JobUserViewModel
  kind?: 'video' | 'image'
  onCancel?: () => void
  onNavigateLibrary?: () => void
  className?: string
}

export function ProductionProgress({
  viewModel,
  kind = 'video',
  onCancel,
  onNavigateLibrary,
  className = '',
}: ProductionProgressProps) {
  const queueAhead = viewModel.queue_ahead_count ?? 0
  const isQueued = queueAhead > 0 || viewModel.state === 'QUEUED'
  const isCompleted = viewModel.state === 'COMPLETED' || viewModel.stage_index === 7
  const isFailed = viewModel.state === 'FAILED'
  const isNeedsReview = viewModel.state === 'NEEDS_REVIEW'

  return (
    <div className={`mesajify-prod-container ${className}`}>
      {/* 1. Stage Animation Visual */}
      <ProductionStageAnimation
        stageKey={viewModel.stage_key}
        stageIndex={viewModel.stage_index}
        kind={kind}
      />

      {/* 2. Authoritative Header */}
      <div className="mesajify-prod-header">
        <h3 className="mesajify-prod-title">
          {viewModel.display_title || (kind === 'video' ? 'Reklam Videonuz Prodüksiyonda' : 'Görseliniz Hazırlanıyor')}
        </h3>
        <p className="mesajify-prod-subtitle">
          {viewModel.display_message || 'İşlemler stüdyoda aşama aşama yürütülüyor.'}
        </p>
      </div>

      {/* 3. Authoritative Timer & Progress Bar */}
      {!isFailed && !isNeedsReview ? (
        <ProductionEta
          jobStartedAt={viewModel.job_started_at}
          etaDisplayText={viewModel.eta_display_text}
          etaConfidence={viewModel.eta_confidence}
          stageIndex={viewModel.stage_index}
          stageCount={viewModel.stage_count || 7}
          isCompleted={isCompleted}
        />
      ) : null}

      {/* 4. Queue Notification Banner (Clean studio design, no emoji) */}
      {isQueued && queueAhead > 0 && !isCompleted ? (
        <div className="mesajify-prod-queue-banner">
          <div className="mesajify-prod-queue-header">
            <span className="mesajify-prod-queue-pill">#{queueAhead + 1}</span>
            <span>Kuyruk Sıranız: #{queueAhead + 1} ({queueAhead} video önünüzde)</span>
          </div>
          <div className="mesajify-prod-queue-body">
            İşleminiz sıraya alınmıştır. Ekran başında beklemenize gerek yoktur;
            tamamlandığında doğrudan İçerik Kütüphanenize eklenecektir.
          </div>
        </div>
      ) : null}

      {/* 5. Authoritative Stage Checklist */}
      {!isFailed && !isNeedsReview ? (
        <ProductionStageList
          currentStageIndex={viewModel.stage_index}
          displayMessage={viewModel.display_message}
          detailHint={viewModel.detail_hint}
        />
      ) : null}

      {/* 6. Background Processing Safety Notice */}
      <div className="mesajify-prod-safe-notice">
        <svg viewBox="0 0 20 20" fill="currentColor" className="size-4 shrink-0 text-[#2f5bff]">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <span>
          Bu pencereden ayrılabilir veya başka sayfalarla ilgilenebilirsiniz.
          Üretim tamamlandığında içerik kütüphanenizde otomatik olarak görünecektir.
        </span>
      </div>

      {/* 7. Action Controls */}
      <div className="mesajify-prod-footer">
        {viewModel.can_cancel && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-[12.5px] font-medium text-rose-600 hover:text-rose-700 transition-colors"
          >
            Üretimi İptal Et
          </button>
        ) : (
          <span />
        )}

        <Link
          href="/icerik"
          onClick={onNavigateLibrary}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[#2f5bff] hover:underline"
        >
          Kütüphaneye Git
          <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
            <path fillRule="evenodd" d="M3 8a.75.75 0 01.75-.75h7.19L8.22 4.53a.75.75 0 011.06-1.06l4 4a.75.75 0 010 1.06l-4 4a.75.75 0 01-1.06-1.06l2.72-2.72H3.75A.75.75 0 013 8z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
