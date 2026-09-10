export default function SettingsLoading() {
  return (
    <div
      className="wb-skeleton filo-fade-in"
      role="status"
      aria-busy="true"
      aria-label="Ayarlar yükleniyor"
    >
      <div className="wb-skeleton-head">
        <div className="wb-skel wb-skel-title" />
        <div className="wb-skel wb-skel-desc" />
      </div>
      <div className="wb-skeleton-main">
        <div className="wb-skel wb-skel-panel" />
      </div>
    </div>
  )
}
