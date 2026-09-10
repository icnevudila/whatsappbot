'use client'
import { usePathname, useRouter } from 'next/navigation'
import { useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui'

const labels: Record<string, string> = {
  ozet: 'Özet',
  durum: 'Durum',
  hesaplar: 'Hatlar',
  kisiler: 'Kişiler',
  kampanyalar: 'Kampanyalar',
  icerik: 'İçerik',
  gelenler: 'Mesajlar',
  gidenler: 'Mesajlar',
  mesajlar: 'Mesajlar',
  raporlar: 'Raporlar',
  ayarlar: 'Ayarlar',
  'hizli-gonderim': 'Hızlı gönderim',
  kurulum: 'Başlangıç',
  'marka-kiti': 'Marka',
  yardim: 'Yardım',
  'kara-liste': 'Engellenenler',
  isletme: 'İşletme',
  profil: 'Profil',
  hatlar: 'Hatlar',
  engellenenler: 'Engellenenler',
  gelismis: 'Gelişmiş',
  marka: 'Marka kitleri',
  sosyal: 'Sosyal medya',
  urunler: 'Ürünlerim',
}
export function WorkspaceHeader({ orgName }: { orgName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const segment = pathname.split('/').filter(Boolean)
  return <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-hairline bg-surface px-4 py-3 md:px-8">
    <nav aria-label="Sayfa yolu" className="flex min-w-0 items-center gap-2 text-xs"><span className="max-w-36 truncate text-ink-muted">{orgName}</span><span className="text-hairline-strong">/</span><Link href={`/${segment[0]}`} className="font-medium">{labels[segment[0]] ?? 'Çalışma alanı'}</Link>{segment.length > 1 && <span className="text-ink-muted">/ {labels[segment[1]] ?? 'Ayrıntı'}</span>}</nav>
    <Button onClick={() => startTransition(() => router.refresh())} disabled={pending} aria-label="Sayfa verilerini yenile" className="min-h-8 py-1 text-xs">{pending ? 'Yenileniyor…' : '↻ Yenile'}</Button>
  </header>
}
