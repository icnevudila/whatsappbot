'use client'

import { InlineHint } from '@/components/ui'
import type { getSetupProgress } from '@/lib/setup-progress'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

/**
 * Soft tek satır — menüyü kilitlemez, ayrı kurulum sayfasına göndermez.
 * Marka zorunlu değil; hat + grup sonrası isteğe bağlı öneri.
 */
export function SetupBanner({ progress }: { progress: Progress }) {
  if (!progress.steps.connected) {
    return (
      <InlineHint href="/hesaplar" cta="Bağla">
        Hat bağlı değil
      </InlineHint>
    )
  }

  if (!progress.steps.contacts) {
    return (
      <InlineHint href="/kisiler" cta="Grup ekle">
        Kampanya grubu yok
      </InlineHint>
    )
  }

  if (progress.counts.outCount === 0) {
    return (
      <InlineHint href="/kampanyalar#hizli" cta="Test gönder">
        İsteğe bağlı: kendine kısa bir test mesajı
      </InlineHint>
    )
  }

  if (progress.suggestBrand) {
    return (
      <InlineHint href="/marka-kiti" cta="Düzenle">
        İsteğe bağlı: marka adı ve renkler AI metin/görselde kullanılır
      </InlineHint>
    )
  }

  return null
}
