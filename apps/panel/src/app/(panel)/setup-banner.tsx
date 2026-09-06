'use client'

import Link from 'next/link'
import { AccentLink, Card, Meter } from '@/components/ui'
import { useT } from '@/lib/i18n/provider'
import type { getSetupProgress } from '@/lib/setup-progress'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

/**
 * Kurulum bitmeden gösterilen şerit — zorunlu wizard’a yönlendirir.
 * Kurulum bitip henüz giden yoksa yumuşak ilk-test CTA gösterir (zorunlu kapı değil).
 */
export function SetupBanner({ progress }: { progress: Progress }) {
  const t = useT()
  const needsFirstSend = progress.allDone && progress.counts.outCount === 0

  if (needsFirstSend) {
    return (
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-[13px] font-semibold text-ink">{t('setup.firstSendTitle')}</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">{t('setup.firstSendSub')}</p>
          </div>
          <AccentLink href="/hizli-gonderim">{t('setup.firstSendCta')}</AccentLink>
        </div>
      </Card>
    )
  }

  if (progress.allDone) return null

  const steps: { key: keyof Progress['steps']; label: string; href: string }[] = [
    { key: 'brand', label: t('setup.brandTitle'), href: '/kurulum' },
    { key: 'contacts', label: t('setup.contactsTitle'), href: '/kurulum' },
    { key: 'connected', label: t('setup.lineTitle'), href: '/hesaplar' },
    { key: 'verified', label: t('setup.verifyTitle'), href: '/kisiler' },
  ]

  return (
    <Card className="mb-4">
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-[13px] font-semibold text-ink">{t('setup.bannerTitle')}</p>
            <p className="mt-0.5 text-[12px] text-ink-muted">{t('setup.bannerSub')}</p>
          </div>
          <span className="tabular text-[12px] text-ink-muted">
            {progress.doneCount}/{steps.length}
          </span>
        </div>

        <Meter value={progress.doneCount} max={steps.length} />

        <ul className="flex flex-wrap gap-x-4 gap-y-2">
          {steps.map((step, index) => {
            const done = progress.steps[step.key]
            return (
              <li key={step.key} className="flex items-center gap-1.5 text-[12.5px]">
                <span
                  className={`grid size-4 shrink-0 place-items-center rounded-full border text-[9px] ${
                    done
                      ? 'border-accent/40 bg-accent/15 text-accent'
                      : 'border-hairline-strong text-ink-faint'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                {done ? (
                  <span className="text-ink-faint line-through">{step.label}</span>
                ) : (
                  <Link
                    href={step.href}
                    className="text-ink-muted underline decoration-hairline-strong underline-offset-2 hover:text-ink"
                  >
                    {step.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>

        <div>
          <AccentLink href="/kurulum">{t('setup.bannerCta')}</AccentLink>
        </div>
      </div>
    </Card>
  )
}
