'use client'

import { useEffect, useId, useState, type FormEvent } from 'react'

type StepId = 'marka' | 'liste' | 'wa-hat' | 'wa-kontrol' | 'ilk-mesaj'

type StepDef = {
  id: StepId
  title: string
  summary: string
  primaryCta: string
  allowSkip: boolean
}

const STEPS: StepDef[] = [
  {
    id: 'marka',
    title: 'Marka',
    summary: 'Gönderimlerde görünecek ad ve kısa tanıtım.',
    primaryCta: 'Devam',
    allowSkip: false,
  },
  {
    id: 'liste',
    title: 'Liste',
    summary: 'CSV yükleyin veya numaraları yapıştırın.',
    primaryCta: 'Devam',
    allowSkip: true,
  },
  {
    id: 'wa-hat',
    title: 'WA hat',
    summary: 'WhatsApp hattınızı QR veya telefon koduyla bağlayın.',
    primaryCta: 'Bağla',
    allowSkip: true,
  },
  {
    id: 'wa-kontrol',
    title: 'WA kontrol',
    summary: 'Numaraların WhatsApp kaydını doğrulayın.',
    primaryCta: 'Devam',
    allowSkip: true,
  },
  {
    id: 'ilk-mesaj',
    title: 'İlk mesaj',
    summary: 'İlk kampanya metnini yazıp gönderime başlayın.',
    primaryCta: 'Gönderime başla',
    allowSkip: false,
  },
]

type Draft = {
  brandName: string
  brandTagline: string
  numbers: string
  message: string
}

const INITIAL_DRAFT: Draft = {
  brandName: '',
  brandTagline: '',
  numbers: '',
  message: '',
}

export function OnboardingChecklist() {
  const formId = useId()
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<Draft>(INITIAL_DRAFT)
  const [entered, setEntered] = useState(true)
  const [finished, setFinished] = useState(false)

  const current = STEPS[stepIndex]
  const completed = finished ? STEPS.length : stepIndex
  const progressPct = (completed / STEPS.length) * 100

  useEffect(() => {
    setEntered(false)
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [stepIndex, finished])

  function advance() {
    if (stepIndex >= STEPS.length - 1) {
      setFinished(true)
      return
    }
    setStepIndex((i) => i + 1)
  }

  function onPrimary(e: FormEvent) {
    e.preventDefault()
    advance()
  }

  function updateDraft<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 50% -10%, var(--color-accent-soft), transparent 55%), linear-gradient(180deg, var(--color-canvas) 0%, #e8ecf4 100%)',
        }}
      />

      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
            Filo
          </p>
          <h1 className="max-w-md text-[18px] font-medium leading-snug text-ink sm:text-[20px]">
            Beş adımda markanızı kurun ve ilk mesajı gönderin
          </h1>

          <div className="mt-1 flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12px] font-medium text-ink-muted">İlerleme</span>
              <span className="tabular text-[12.5px] text-ink-faint">
                {completed} / {STEPS.length}
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-surface-raised"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={STEPS.length}
              aria-valuenow={completed}
              aria-label="Kurulum ilerlemesi"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </header>

        {finished ? (
          <section
            className={`flex flex-col gap-4 transition-all duration-300 ease-out ${
              entered ? 'translate-y-0 opacity-100' : 'translate-y-1.5 opacity-0'
            }`}
          >
            <div className="border-t border-hairline pt-6">
              <p className="text-[15px] font-semibold text-ink">Kurulum tamam</p>
              <p className="mt-1.5 max-w-md text-[13.5px] text-ink-muted">
                Marka, liste ve hat hazır. Panele geçip gönderimleri canlı izleyebilir,
                yeni kampanyalar oluşturabilirsiniz.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] bg-accent px-4 text-[13.5px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
              >
                Panele git
              </button>
              <button
                type="button"
                onClick={() => {
                  setFinished(false)
                  setStepIndex(0)
                  setDraft(INITIAL_DRAFT)
                }}
                className="inline-flex h-10 items-center justify-center px-2 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
              >
                Baştan gözden geçir
              </button>
            </div>
          </section>
        ) : (
          <ol className="flex flex-col">
            {STEPS.map((step, index) => {
              const status: 'done' | 'active' | 'locked' =
                index < stepIndex ? 'done' : index === stepIndex ? 'active' : 'locked'
              const isActive = status === 'active'

              return (
                <li
                  key={step.id}
                  className={`border-t border-hairline transition-colors duration-300 ${
                    isActive ? 'border-accent/25' : ''
                  }`}
                >
                  <div
                    className={`flex items-start gap-3.5 py-3.5 ${
                      status === 'locked' ? 'opacity-45' : ''
                    }`}
                  >
                    <StepBadge index={index} status={status} />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p
                          className={`text-[14px] font-semibold ${
                            status === 'locked' ? 'text-ink-muted' : 'text-ink'
                          }`}
                        >
                          {step.title}
                        </p>
                        {status === 'done' ? (
                          <span className="shrink-0 text-[11.5px] font-medium text-ok-dim">
                            Tamam
                          </span>
                        ) : status === 'locked' ? (
                          <span className="shrink-0 text-[11.5px] text-ink-faint">
                            Kilitli
                          </span>
                        ) : null}
                      </div>
                      {!isActive ? (
                        <p className="mt-0.5 text-[12.5px] text-ink-muted">{step.summary}</p>
                      ) : null}
                    </div>
                  </div>

                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      isActive
                        ? 'grid-rows-[1fr] opacity-100'
                        : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      {isActive ? (
                        <form
                          id={`${formId}-${step.id}`}
                          onSubmit={onPrimary}
                          className={`flex flex-col gap-4 pb-5 pl-[2.375rem] transition-all duration-300 ease-out ${
                            entered
                              ? 'translate-y-0 opacity-100'
                              : 'translate-y-1.5 opacity-0'
                          }`}
                        >
                          <p className="text-[13px] leading-relaxed text-ink-muted">
                            {step.summary}
                          </p>

                          <StepFields
                            stepId={step.id}
                            draft={draft}
                            onChange={updateDraft}
                          />

                          <div className="flex flex-wrap items-center gap-3 pt-0.5">
                            <button
                              type="submit"
                              className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] bg-accent px-4 text-[13.5px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
                            >
                              {step.primaryCta}
                            </button>
                            {step.allowSkip ? (
                              <button
                                type="button"
                                onClick={advance}
                                className="inline-flex h-10 items-center justify-center px-2 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
                              >
                                Atla
                              </button>
                            ) : null}
                          </div>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </div>
  )
}

function StepBadge({
  index,
  status,
}: {
  index: number
  status: 'done' | 'active' | 'locked'
}) {
  const base =
    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular transition-colors duration-300'

  if (status === 'done') {
    return (
      <span className={`${base} bg-ok text-white`} aria-hidden>
        ✓
      </span>
    )
  }

  if (status === 'active') {
    return (
      <span className={`${base} bg-accent text-accent-ink`} aria-hidden>
        {index + 1}
      </span>
    )
  }

  return (
    <span className={`${base} bg-surface-raised text-ink-faint`} aria-hidden>
      {index + 1}
    </span>
  )
}

function StepFields({
  stepId,
  draft,
  onChange,
}: {
  stepId: StepId
  draft: Draft
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void
}) {
  const field =
    'w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-2.5 text-[13.5px] text-ink shadow-[var(--shadow-card)] outline-none transition-colors placeholder:text-ink-faint focus:border-accent'

  if (stepId === 'marka') {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-ink-muted">Marka adı</span>
          <input
            name="brandName"
            value={draft.brandName}
            onChange={(e) => onChange('brandName', e.target.value)}
            placeholder="Örn. Messora"
            autoComplete="organization"
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-ink-muted">Kısa tanıtım</span>
          <textarea
            name="brandTagline"
            value={draft.brandTagline}
            onChange={(e) => onChange('brandTagline', e.target.value)}
            placeholder="Müşterilerinize nasıl görünmek istediğinizi yazın"
            rows={2}
            className={`${field} resize-none`}
          />
        </label>
      </div>
    )
  }

  if (stepId === 'liste') {
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-ink-muted">Numaralar</span>
          <textarea
            name="numbers"
            value={draft.numbers}
            onChange={(e) => onChange('numbers', e.target.value)}
            placeholder={'905xxxxxxxxx\n905yyyyyyyyy'}
            rows={4}
            className={`${field} resize-y font-mono text-[12.5px]`}
          />
        </label>
        <label className="flex cursor-pointer flex-col items-start gap-1 border border-dashed border-hairline-strong bg-surface/60 px-3 py-3 transition-colors hover:border-accent/40 hover:bg-accent-soft/40">
          <span className="text-[12.5px] font-medium text-ink">CSV yükle</span>
          <span className="text-[12px] text-ink-faint">
            .csv veya .txt — satır başına bir numara
          </span>
          <input type="file" accept=".csv,.txt,text/csv,text/plain" className="sr-only" />
        </label>
      </div>
    )
  }

  if (stepId === 'wa-hat') {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div
          className="flex aspect-square w-[140px] shrink-0 items-center justify-center border border-hairline bg-surface shadow-[var(--shadow-card)]"
          aria-hidden
        >
          <div
            className="grid size-[108px] grid-cols-5 grid-rows-5 gap-0.5 p-1"
            style={{
              backgroundImage:
                'linear-gradient(45deg, var(--color-ink) 25%, transparent 25%), linear-gradient(-45deg, var(--color-ink) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, var(--color-ink) 75%), linear-gradient(-45deg, transparent 75%, var(--color-ink) 75%)',
              backgroundSize: '12px 12px',
              backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0',
              opacity: 0.85,
            }}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            WhatsApp’ta Bağlı Cihazlar’ı açın ve bu QR kodu okutun. Bağlantı
            sunucuda kalır; paneli kapatabilirsiniz.
          </p>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-muted">
              veya 8 haneli telefon kodu
            </span>
            <input
              name="pairCode"
              inputMode="numeric"
              maxLength={8}
              placeholder="•••• ••••"
              className={`${field} tracking-[0.2em]`}
            />
          </label>
        </div>
      </div>
    )
  }

  if (stepId === 'wa-kontrol') {
    return (
      <div className="flex flex-col gap-2.5 border border-hairline bg-surface px-3.5 py-3 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-ink-muted">Kontrol edilecek</span>
          <span className="tabular font-medium text-ink">
            {countLines(draft.numbers) || '—'}
          </span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-ink-muted">WhatsApp’ta kayıtlı</span>
          <span className="tabular font-medium text-ok-dim">Hazır</span>
        </div>
        <div className="flex items-center justify-between gap-3 text-[13px]">
          <span className="text-ink-muted">Geçersiz / kayıtlı değil</span>
          <span className="tabular font-medium text-ink-faint">0</span>
        </div>
        <p className="pt-1 text-[12.5px] text-ink-muted">
          Geçersiz numaralar listeden otomatik elenir; yalnızca kayıtlı hatlara
          gönderim yapılır.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-[12px] font-medium text-ink-muted">Mesaj metni</span>
        <textarea
          name="message"
          value={draft.message}
          onChange={(e) => onChange('message', e.target.value)}
          placeholder={
            draft.brandName
              ? `Merhaba, ${draft.brandName} burada…`
              : 'Merhaba, size özel bir notumuz var…'
          }
          rows={4}
          className={`${field} resize-y`}
        />
      </label>
      <p className="text-[12px] text-ink-faint">
        Gönderim hızı hattınızı koruyacak şekilde otomatik ayarlanır.
      </p>
    </div>
  )
}

function countLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length
}
