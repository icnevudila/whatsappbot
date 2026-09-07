'use client'

import { InlineHint } from '@/components/ui'
import type { getSetupProgress } from '@/lib/setup-progress'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

/**
 * Soft tek satır — menüyü kilitlemez, ayrı kurulum sayfasına göndermez.
 */
export function SetupBanner({ progress }: { progress: Progress }) {
  const needsFirstSend = progress.allDone && progress.counts.outCount === 0

  if (needsFirstSend) {
    return (
      <InlineHint href="/kampanyalar#hizli" cta="Test gönder">
        İsteğe bağlı: kendine kısa bir test mesajı
      </InlineHint>
    )
  }

  if (progress.allDone) return null

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

  if (!progress.steps.brand) {
    return (
      <InlineHint href="/marka-kiti" cta="Aç">
        Marka adı eksik
      </InlineHint>
    )
  }

  return (
    <InlineHint href="/ozet" cta="Özet">
      Hazırlık eksik ({progress.doneCount}/3)
    </InlineHint>
  )
}
