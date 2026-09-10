'use client'

import { AccentLink, Card, QuietLink } from '@/components/ui'
import type { getSetupProgress } from '@/lib/setup-progress'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

type Step = {
  n: number
  title: string
  body: string
  href: string
  cta: string
  done: boolean
  current: boolean
}

function buildSteps(progress: Progress): Step[] {
  const s1 = progress.steps.connected
  const s2 = progress.steps.contacts

  return [
    {
      n: 1,
      title: 'WhatsApp hattını bağla',
      body: 'Telefondaki WhatsApp → Bağlı cihazlar → QR veya kod ile bağla. Durum “Bağlı” olmalı.',
      href: '/ayarlar/hatlar',
      cta: 'Hatlar’a git',
      done: s1,
      current: !s1,
    },
    {
      n: 2,
      title: 'Kişi grubu ekle',
      body: 'Excel yükle, yapıştır veya WhatsApp rehberinden çek. Kampanyada bu grubu seçeceksin.',
      href: '/kisiler',
      cta: 'Kişiler’e git',
      done: s2,
      current: s1 && !s2,
    },
  ]
}

/** Üye için net 2 adım — menüyü kilitlemez. */
export function SetupGuideCard({
  progress,
  variant = 'card',
}: {
  progress: Progress
  /** card = Özet; page = /kurulum tam sayfa */
  variant?: 'card' | 'page'
}) {
  const steps = buildSteps(progress)
  const current = steps.find((s) => s.current) ?? null
  const doneCount = steps.filter((s) => s.done).length
  const allGuideDone = doneCount === steps.length

  if (allGuideDone && variant === 'card') return null

  return (
    <Card className={variant === 'page' ? 'border-accent/25' : 'mb-3 border-accent/20'}>
      <div className="border-b border-hairline px-3.5 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold tracking-wide text-accent uppercase">
              Başlangıç
            </p>
            <h2 className="mt-0.5 text-[15px] font-bold tracking-[-0.02em] text-ink">
              {allGuideDone ? 'Kurulum tamam' : '2 adımda gönderime hazır ol'}
            </h2>
            <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">
              {allGuideDone
                ? 'Hat ve kişiler hazır.'
                : `${doneCount}/2 bitti · Sıradaki: ${current?.title ?? '—'}`}
            </p>
          </div>
          {variant === 'card' ? <QuietLink href="/kurulum">Tüm adımlar</QuietLink> : null}
        </div>

        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas"
          role="progressbar"
          aria-valuenow={doneCount}
          aria-valuemin={0}
          aria-valuemax={2}
        >
          <div
            className="h-full rounded-full bg-accent transition-[width] duration-300"
            style={{ width: `${(doneCount / 2) * 100}%` }}
          />
        </div>
      </div>

      <ol className="divide-y divide-hairline">
        {steps.map((step) => (
          <li
            key={step.n}
            className={`flex gap-3 px-3.5 py-3 ${
              step.current ? 'bg-accent-soft/35' : ''
            }`}
          >
            <span
              className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
                step.done
                  ? 'bg-ok-soft text-ok'
                  : step.current
                    ? 'bg-accent text-white'
                    : 'border border-hairline bg-canvas text-ink-faint'
              }`}
              aria-hidden
            >
              {step.done ? '✓' : step.n}
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={`text-[13.5px] font-semibold ${
                  step.done ? 'text-ink-muted line-through decoration-hairline' : 'text-ink'
                }`}
              >
                {step.title}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-ink-muted">{step.body}</p>
              {step.current ? (
                <div className="mt-2.5">
                  <AccentLink href={step.href}>{step.cta} →</AccentLink>
                </div>
              ) : step.done ? (
                <p className="mt-1 text-[11.5px] font-medium text-ok">Tamam</p>
              ) : (
                <p className="mt-1 text-[11.5px] text-ink-faint">Önce önceki adımı bitir</p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {current && variant === 'page' ? (
        <div className="border-t border-hairline px-3.5 py-3">
          <AccentLink href={current.href} className="w-full justify-center sm:w-auto">
            {current.cta} →
          </AccentLink>
        </div>
      ) : null}

      {allGuideDone && variant === 'page' ? (
        <div className="border-t border-hairline px-3.5 py-3">
          <AccentLink href="/ozet">Özet’e dön →</AccentLink>
        </div>
      ) : null}
    </Card>
  )
}

/** Sayfa içi ince ipucu — Hesaplar / Kişiler’de sıradaki tek iş. */
export function SetupBanner({ progress }: { progress: Progress }) {
  if (!progress.steps.connected) {
    return (
      <div className="mb-3 rounded-md border border-accent/25 bg-accent-soft/40 px-3.5 py-3">
        <p className="text-[13px] font-semibold text-ink">1 / 2 · WhatsApp hattını bağla</p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">
          QR veya telefon koduyla bağla. Durum “Bağlı” olunca 2. adıma geçersin.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <AccentLink href="/ayarlar/hatlar">Hat bağla →</AccentLink>
          <QuietLink href="/kurulum">Tüm adımlar</QuietLink>
        </div>
      </div>
    )
  }

  if (!progress.steps.contacts) {
    return (
      <div className="mb-3 rounded-md border border-accent/25 bg-accent-soft/40 px-3.5 py-3">
        <p className="text-[13px] font-semibold text-ink">2 / 2 · Kişi grubu ekle</p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink-muted">
          Excel / yapıştır veya WhatsApp rehberinden çek. Kampanya için grup şart.
        </p>
        <div className="mt-2 flex flex-wrap gap-3">
          <AccentLink href="/kisiler">Grup ekle →</AccentLink>
          <QuietLink href="/kurulum">Tüm adımlar</QuietLink>
        </div>
      </div>
    )
  }

  return null
}
