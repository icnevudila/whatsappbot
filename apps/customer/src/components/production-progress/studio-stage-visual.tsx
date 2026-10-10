import type { ProductionStageKey } from '@/lib/creative/production-progress/progress-types'

const indexKeys: ProductionStageKey[] = ['QUEUED', 'REQUEST_ACCEPTED', 'QUEUED', 'ASSETS_PREPARING', 'GENERATING', 'MEDIA_PROCESSING', 'QUALITY_CHECK', 'READY']

export function studioStageVisual(stageKey?: ProductionStageKey, stageIndex = 1, kind: 'image' | 'video' = 'video') {
  const key = stageKey ?? indexKeys[stageIndex] ?? 'QUEUED'
  const visuals = {
    REQUEST_ACCEPTED: { icon: 'clipboard-check', animation: '3-dots-fade', label: 'İstek hazırlanıyor' },
    QUEUED: { icon: 'clock-3', animation: 'clock', label: 'Üretim sırası bekleniyor' },
    ASSETS_PREPARING: { icon: 'images', animation: 'blocks-shuffle-3', label: 'Referanslar hazırlanıyor' },
    GENERATING: { icon: kind === 'image' ? 'image' : 'clapperboard', animation: kind === 'image' ? 'blocks-scale' : 'bars-scale', label: kind === 'image' ? 'Görsel oluşturuluyor' : 'Video oluşturuluyor' },
    MEDIA_PROCESSING: { icon: 'sliders-horizontal', animation: 'blocks-wave', label: 'Son düzenlemeler yapılıyor' },
    QUALITY_CHECK: { icon: 'scan-line', animation: '12-dots-scale-rotate', label: 'Kalite kontrol ediliyor' },
    READY: { icon: 'circle-check', animation: null, label: 'İçerik hazır' },
    NEEDS_REVIEW: { icon: 'circle-alert', animation: null, label: 'İnceleme bekleniyor' },
    FAILED: { icon: 'circle-x', animation: null, label: 'Üretim tamamlanamadı' },
  }
  return { key, ...visuals[key] }
}

export function StudioStageIcon({ icon, className = '' }: { icon: string; className?: string }) {
  return <span aria-hidden="true" className={`studio-stage-icon ${className}`} style={{ maskImage: `url(/animations/studio-icons/${icon}.svg)`, WebkitMaskImage: `url(/animations/studio-icons/${icon}.svg)` }} />
}

export function StudioStageVisual({ stageKey, stageIndex, kind = 'video', className = '' }: { stageKey?: ProductionStageKey; stageIndex?: number; kind?: 'image' | 'video'; className?: string }) {
  const visual = studioStageVisual(stageKey, stageIndex, kind)
  return <div className={`studio-stage-visual ${className}`} data-stage={visual.key} aria-hidden="true">
    <div key={`${kind}-${visual.key}`} className={`studio-stage-tile ${visual.key === 'FAILED' ? 'is-failed' : visual.key === 'NEEDS_REVIEW' ? 'is-review' : ''}`}>
      {visual.animation ? <>
        {/* MIT SVG Spinners; original assets and pinned provenance shipped locally. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="studio-stage-motion" src={`/animations/svg-spinners/${visual.animation}.svg`} width={64} height={64} alt="" />
        <StudioStageIcon icon={visual.icon} className="studio-stage-static" />
        <span className="studio-stage-badge"><StudioStageIcon icon={visual.icon} /></span>
      </> : <StudioStageIcon icon={visual.icon} className="studio-stage-terminal" />}
    </div>
    <span className="studio-stage-caption">{visual.label}</span>
  </div>
}
