export default function Loading() {
  return <div role="status" aria-label="Sayfa yükleniyor" className="space-y-6"><p className="text-sm text-ink-muted">Çalışma alanınız hazırlanıyor…</p><div className="h-8 w-52 animate-pulse rounded bg-hairline/70" /><div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map(n => <div key={n} className="h-28 animate-pulse rounded-card border border-hairline bg-surface" />)}</div><div className="h-64 animate-pulse rounded-card border border-hairline bg-surface" /></div>
}
