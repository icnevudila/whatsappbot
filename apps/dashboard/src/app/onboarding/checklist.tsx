'use client'

import { useState } from 'react'

type StepId = 'marka' | 'liste' | 'wa-hat' | 'wa-kontrol' | 'ilk-mesaj'

type Step = {
  id: StepId
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    id: 'marka',
    title: 'Marka',
    body: 'Gönderimlerde görünecek marka adını ve kısa tanıtımı kaydedin.',
  },
  {
    id: 'liste',
    title: 'Liste',
    body: 'Kişi listenizi CSV ile yükleyin veya numaraları yapıştırın.',
  },
  {
    id: 'wa-hat',
    title: 'WA hat',
    body: 'WhatsApp hattınızı QR veya telefon koduyla bağlayın.',
  },
  {
    id: 'wa-kontrol',
    title: 'WA kontrol',
    body: 'Numaraların WhatsApp kaydını doğrulayın; geçersizleri eleyin.',
  },
  {
    id: 'ilk-mesaj',
    title: 'İlk mesaj',
    body: 'İlk kampanya metninizi yazıp güvenli hızda gönderime başlayın.',
  },
]

export function OnboardingChecklist() {
  const [done, setDone] = useState<Record<StepId, boolean>>({
    marka: false,
    liste: false,
    'wa-hat': false,
    'wa-kontrol': false,
    'ilk-mesaj': false,
  })

  const completed = STEPS.filter((step) => done[step.id]).length
  const allDone = completed === STEPS.length

  function toggle(id: StepId) {
    setDone((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:py-14">
      <header className="flex flex-col gap-2">
        <p className="text-[12px] font-medium tracking-wide text-accent uppercase">
          Kurulum
        </p>
        <h1 className="text-[22px] font-semibold text-ink sm:text-[26px]">
          Beş adımda yayına hazır
        </h1>
        <p className="max-w-md text-[13.5px] text-ink-muted">
          Şimdilik yalnızca görsel kontrol listesi — durumlar yerel olarak tutulur.
          Bağlantılar ve gerçek doğrulama sonraki sprintte gelecek.
        </p>
        <p className="tabular pt-1 text-[12.5px] text-ink-faint">
          {completed} / {STEPS.length} tamam
          {allDone ? ' — hazırsınız' : ''}
        </p>
      </header>

      <ol className="flex flex-col gap-2.5">
        {STEPS.map((step, index) => {
          const isDone = done[step.id]
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => toggle(step.id)}
                aria-pressed={isDone}
                className="flex w-full items-start gap-3.5 rounded-[var(--radius-card)] border border-hairline bg-surface p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-hairline-strong"
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular ${
                    isDone
                      ? 'bg-ok text-white'
                      : 'bg-surface-raised text-ink-muted'
                  }`}
                  aria-hidden
                >
                  {isDone ? '✓' : index + 1}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-semibold text-ink">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-[13px] text-ink-muted">
                    {step.body}
                  </span>
                </span>
                <span
                  className={`mt-1 shrink-0 text-[11.5px] font-medium ${
                    isDone ? 'text-ok-dim' : 'text-ink-faint'
                  }`}
                >
                  {isDone ? 'Tamam' : 'Bekliyor'}
                </span>
              </button>
            </li>
          )
        })}
      </ol>

      {allDone ? (
        <p className="rounded-[var(--radius-card)] border border-ok/30 bg-ok-soft px-4 py-3 text-[13px] text-ok-dim">
          Tüm adımlar işaretlendi. Gerçek onboarding akışı bağlandığında buradan
          panele geçiş yapılacak.
        </p>
      ) : null}
    </div>
  )
}
