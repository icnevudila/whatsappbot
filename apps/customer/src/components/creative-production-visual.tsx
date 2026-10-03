import './creative-production.css'

/** Decorative motion only: progress and completion always come from the caller. */
export function CreativeProductionVisual({ kind = 'video' }: { kind?: 'image' | 'video' }) {
  return (
    <div className="creative-production-visual" data-kind={kind} aria-hidden="true">
      <div className="creative-production-frame creative-production-frame--back" />
      <div className="creative-production-frame creative-production-frame--front">
        <svg viewBox="0 0 120 150" fill="none">
          <rect x="12" y="12" width="96" height="126" rx="10" stroke="currentColor" opacity=".18" />
          <circle cx="80" cy="48" r="10" fill="currentColor" opacity=".18" />
          <path d="m20 112 27-35 19 22 12-14 22 27" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {kind === 'video' ? <path d="m52 57 21 14-21 14V57Z" fill="currentColor" /> : <path d="M40 42h12m-6-6v12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
        </svg>
        <span className="creative-production-scan" />
      </div>
      <span className="creative-production-orbit creative-production-orbit--one" />
      <span className="creative-production-orbit creative-production-orbit--two" />
    </div>
  )
}
