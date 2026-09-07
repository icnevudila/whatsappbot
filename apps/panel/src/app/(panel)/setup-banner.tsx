'use client'

import Link from 'next/link'
import { InlineHint } from '@/components/ui'
import { useT } from '@/lib/i18n/provider'
import type { getSetupProgress } from '@/lib/setup-progress'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

/**
 * Soft tek satır — menüyü kilitlemez, büyük checklist kartı yok.
 */
export function SetupBanner({ progress }: { progress: Progress }) {
  const t = useT()
  const needsFirstSend = progress.allDone && progress.counts.outCount === 0

  if (needsFirstSend) {
    return (
      <InlineHint href="/hizli-gonderim" cta={t('setup.firstSendCta')}>
        {t('setup.firstSendSub')}
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
      <InlineHint href="/kisiler" cta="Ekle">
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
    <InlineHint href="/kurulum" cta={t('setup.bannerCta')}>
      <Link href="/kurulum" className="text-ink-muted">
        Kurulum eksik ({progress.doneCount}/3)
      </Link>
    </InlineHint>
  )
}
