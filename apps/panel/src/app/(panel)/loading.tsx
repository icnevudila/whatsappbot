export default function Loading() {
  return (
    <div className="wb-skeleton" role="status" aria-label="Sayfa yükleniyor">
      <div className="wb-skeleton-head">
        <div className="wb-skel wb-skel-title" />
        <div className="wb-skel wb-skel-desc" />
      </div>
      <div className="wb-skeleton-kpis">
        {[0, 1, 2, 3].map((n) => (
          <div key={n} className="wb-skel wb-skel-card" />
        ))}
      </div>
      <div className="wb-skeleton-main">
        <div className="wb-skel wb-skel-panel" />
        <div className="wb-skel wb-skel-panel" />
      </div>
    </div>
  )
}
