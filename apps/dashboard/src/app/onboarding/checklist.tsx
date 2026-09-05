'use client'

import { useEffect, useId, useState, useTransition, type FormEvent } from 'react'
import {
  firstSendStep,
  finishToPanel,
  saveBrandStep,
  saveListStep,
  skipListStep,
  skipVerifyStep,
  skipWaHatStep,
  startWaConnect,
  verifyOnboardingList,
  type StepState,
} from './actions'
import { HatConnect } from './hat-connect'

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
    title: 'WhatsApp hattı',
    summary: 'WhatsApp hattınızı QR ile bağlayın.',
    primaryCta: 'Bağla',
    allowSkip: true,
  },
  {
    id: 'wa-kontrol',
    title: 'Numara kontrolü',
    summary: 'Numaraların WhatsApp kaydını doğrulayın.',
    primaryCta: 'Doğrula',
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
  listId: string
  accountId: string
  orgId: string
  validCount: number | null
  invalidCount: number | null
}

const INITIAL_DRAFT: Draft = {
  brandName: '',
  brandTagline: '',
  numbers: '',
  message: '',
  listId: '',
  accountId: '',
  orgId: '',
  validCount: null,
  invalidCount: null,
}

function stepIndexFromProfile(step: string | null | undefined): number {
  const map: Record<string, number> = {
    welcome: 0,
    marka: 0,
    liste: 1,
    'wa-hat': 2,
    'wa-kontrol': 3,
    'ilk-mesaj': 4,
    done: 5,
  }
  return map[step ?? 'welcome'] ?? 0
}

export function OnboardingChecklist({
  initialStep,
  orgId,
  panelUrl,
}: {
  initialStep: string
  orgId: string
  panelUrl: string
}) {
  const formId = useId()
  const startIndex = Math.min(stepIndexFromProfile(initialStep), STEPS.length - 1)
  const [stepIndex, setStepIndex] = useState(
    initialStep === 'done' ? STEPS.length - 1 : startIndex,
  )
  const [draft, setDraft] = useState<Draft>({ ...INITIAL_DRAFT, orgId })
  const [entered, setEntered] = useState(true)
  const [finished, setFinished] = useState(initialStep === 'done')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const current = STEPS[Math.min(stepIndex, STEPS.length - 1)]
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

  function applyResult(result: StepState, onOk?: () => void) {
    if (!result) return
    if (result.error) {
      setError(result.error)
      return
    }
    setError(null)
    if (result.listId) setDraft((d) => ({ ...d, listId: result.listId! }))
    if (result.accountId) setDraft((d) => ({ ...d, accountId: result.accountId! }))
    if (result.validCount != null || result.invalidCount != null) {
      setDraft((d) => ({
        ...d,
        validCount: result.validCount ?? d.validCount,
        invalidCount: result.invalidCount ?? d.invalidCount,
      }))
    }
    if (result.panelUrl) {
      window.location.href = result.panelUrl
      return
    }
    onOk?.()
  }

  function onPrimary(e: FormEvent) {
    e.preventDefault()
    const fd = new FormData(e.target as HTMLFormElement)
    startTransition(async () => {
      if (current.id === 'marka') {
        applyResult(await saveBrandStep(null, fd), advance)
      } else if (current.id === 'liste') {
        applyResult(await saveListStep(null, fd), advance)
      } else if (current.id === 'wa-hat') {
        applyResult(await startWaConnect(null, fd))
      } else if (current.id === 'wa-kontrol') {
        fd.set('listId', draft.listId)
        applyResult(await verifyOnboardingList(null, fd), advance)
      } else if (current.id === 'ilk-mesaj') {
        // Formdaki numbers (skip sonrası) draft ile birleştir.
        const formNumbers = String(fd.get('numbers') ?? '').trim()
        if (formNumbers) fd.set('numbers', formNumbers)
        else fd.set('numbers', draft.numbers)
        applyResult(await firstSendStep(null, fd))
      }
    })
  }

  function onSkip() {
    startTransition(async () => {
      if (current.id === 'liste') applyResult(await skipListStep(), advance)
      else if (current.id === 'wa-hat') applyResult(await skipWaHatStep(), advance)
      else if (current.id === 'wa-kontrol') applyResult(await skipVerifyStep(), advance)
    })
  }

  const field =
    'w-full rounded-[var(--radius-card)] border border-hairline bg-surface px-3 py-2.5 text-[13.5px] text-ink shadow-[var(--shadow-card)] outline-none transition-colors placeholder:text-ink-faint focus:border-accent'

  return (
    <div className="relative min-h-dvh bg-canvas">
      <div className="relative mx-auto flex w-full max-w-lg flex-col gap-8 px-4 py-10 sm:py-16">
        <header className="flex flex-col gap-3">
          <p className="inline-flex items-center gap-2 text-[28px] font-semibold tracking-tight text-ink sm:text-[32px]">
            <span
              aria-hidden
              className="inline-flex size-7 items-center justify-center"
            >
              <svg viewBox="0 0 16 16" fill="none" className="size-6">
                <circle cx="2.6" cy="2.6" r="2.2" className="fill-accent" />
                <rect x="0" y="6.6" width="16" height="1.7" rx="0.85" fill="currentColor" />
                <rect x="0" y="10" width="11" height="1.7" rx="0.85" fill="currentColor" opacity="0.72" />
                <rect x="0" y="13.4" width="6" height="1.7" rx="0.85" fill="currentColor" opacity="0.44" />
              </svg>
            </span>
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

        {error ? (
          <p className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-[12.5px] text-danger">
            {error}
          </p>
        ) : null}

        {finished ? (
          <section className="flex flex-col gap-4 border-t border-hairline pt-6">
            <p className="text-[15px] font-semibold text-ink">Kurulum tamam</p>
            <p className="text-[13.5px] text-ink-muted">
              Panele geçip gönderimleri canlı izleyebilirsiniz.
            </p>
            <a
              href={`${panelUrl}/ozet`}
              className="inline-flex h-10 w-fit items-center justify-center rounded-[var(--radius-card)] bg-accent px-4 text-[13.5px] font-medium text-accent-ink hover:bg-accent-dim"
            >
              Panele git
            </a>
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
                  className={`border-t border-hairline ${isActive ? 'border-accent/25' : ''}`}
                >
                  <div
                    className={`flex items-start gap-3.5 py-3.5 ${
                      status === 'locked' ? 'opacity-45' : ''
                    }`}
                  >
                    <StepBadge index={index} status={status} />
                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[14px] font-semibold text-ink">{step.title}</p>
                        {status === 'done' ? (
                          <span className="text-[11.5px] font-medium text-ok-dim">Tamam</span>
                        ) : status === 'locked' ? (
                          <span className="text-[11.5px] text-ink-faint">Kilitli</span>
                        ) : null}
                      </div>
                      {!isActive ? (
                        <p className="mt-0.5 text-[12.5px] text-ink-muted">{step.summary}</p>
                      ) : null}
                    </div>
                  </div>

                  {isActive ? (
                    <form
                      id={`${formId}-${step.id}`}
                      onSubmit={onPrimary}
                      className={`flex flex-col gap-4 pb-5 pl-[2.375rem] ${
                        entered ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <p className="text-[13px] text-ink-muted">{step.summary}</p>

                      {step.id === 'marka' ? (
                        <div className="flex flex-col gap-3">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[12px] font-medium text-ink-muted">
                              Marka adı
                            </span>
                            <input
                              name="brandName"
                              required
                              defaultValue={draft.brandName}
                              placeholder="Örn. Filo"
                              className={field}
                            />
                          </label>
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[12px] font-medium text-ink-muted">
                              Kısa tanıtım
                            </span>
                            <textarea
                              name="brandTagline"
                              defaultValue={draft.brandTagline}
                              rows={2}
                              className={`${field} resize-none`}
                            />
                          </label>
                        </div>
                      ) : null}

                      {step.id === 'liste' ? (
                        <div className="flex flex-col gap-3">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[12px] font-medium text-ink-muted">
                              Numaralar
                            </span>
                            <textarea
                              name="numbers"
                              value={draft.numbers}
                              onChange={(e) =>
                                setDraft((d) => ({ ...d, numbers: e.target.value }))
                              }
                              placeholder={'905xxxxxxxxx\n905yyyyyyyyy'}
                              rows={4}
                              className={`${field} resize-y font-mono text-[12.5px]`}
                            />
                          </label>
                          <label className="flex cursor-pointer flex-col gap-1 border border-dashed border-hairline-strong px-3 py-3 hover:border-accent/40">
                            <span className="text-[12.5px] font-medium text-ink">
                              CSV yükle
                            </span>
                            <input
                              type="file"
                              accept=".csv,.txt,text/csv,text/plain"
                              className="sr-only"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                void file.text().then((text) =>
                                  setDraft((d) => ({
                                    ...d,
                                    numbers: [d.numbers, text].filter(Boolean).join('\n'),
                                  })),
                                )
                              }}
                            />
                          </label>
                        </div>
                      ) : null}

                      {step.id === 'wa-hat' ? (
                        <div className="flex flex-col gap-3">
                          <input type="hidden" name="label" value="Ana hat" />
                          {draft.accountId ? (
                            <HatConnect
                              orgId={draft.orgId || orgId}
                              accountId={draft.accountId}
                              onConnected={advance}
                            />
                          ) : (
                            <p className="text-[13px] text-ink-muted">
                              Bağla’ya basınca QR üretilir; telefonunuzdan okutun.
                            </p>
                          )}
                        </div>
                      ) : null}

                      {step.id === 'wa-kontrol' ? (
                        <div className="flex flex-col gap-2.5 border border-hairline bg-surface px-3.5 py-3 shadow-[var(--shadow-card)]">
                          <div className="flex justify-between text-[13px]">
                            <span className="text-ink-muted">Kontrol edilecek</span>
                            <span className="tabular font-medium">
                              {countLines(draft.numbers) || 'liste'}
                            </span>
                          </div>
                          <div className="flex justify-between text-[13px]">
                            <span className="text-ink-muted">WhatsApp’ta kayıtlı</span>
                            <span className="tabular font-medium text-ok-dim">
                              {draft.validCount ?? '—'}
                            </span>
                          </div>
                          <div className="flex justify-between text-[13px]">
                            <span className="text-ink-muted">Geçersiz</span>
                            <span className="tabular font-medium text-ink-faint">
                              {draft.invalidCount ?? '—'}
                            </span>
                          </div>
                        </div>
                      ) : null}

                      {step.id === 'ilk-mesaj' ? (
                        <div className="flex flex-col gap-3">
                          <label className="flex flex-col gap-1.5">
                            <span className="text-[12px] font-medium text-ink-muted">
                              Mesaj metni
                            </span>
                            <textarea
                              name="message"
                              required
                              defaultValue={draft.message}
                              rows={4}
                              className={`${field} resize-y`}
                              placeholder="Merhaba, size özel bir notumuz var…"
                            />
                          </label>
                          {!draft.listId ? (
                            <label className="flex flex-col gap-1.5">
                              <span className="text-[12px] font-medium text-ink-muted">
                                Alıcı numaraları
                              </span>
                              <textarea
                                name="numbers"
                                value={draft.numbers}
                                onChange={(e) =>
                                  setDraft((d) => ({ ...d, numbers: e.target.value }))
                                }
                                rows={3}
                                className={`${field} resize-y font-mono text-[12.5px]`}
                                placeholder={'905xxxxxxxxx\n905yyyyyyyyy'}
                              />
                              <span className="text-[11.5px] text-ink-faint">
                                Liste adımı atlandıysa burada en az bir numara girin.
                              </span>
                            </label>
                          ) : null}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap items-center gap-3 pt-0.5">
                        <button
                          type="submit"
                          disabled={pending}
                          className="inline-flex h-10 items-center justify-center rounded-[var(--radius-card)] bg-accent px-4 text-[13.5px] font-medium text-accent-ink hover:bg-accent-dim disabled:opacity-60"
                        >
                          {pending ? 'Bekleyin…' : step.primaryCta}
                        </button>
                        {step.allowSkip ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={onSkip}
                            className="inline-flex h-10 items-center px-2 text-[13px] font-medium text-ink-muted hover:text-ink"
                          >
                            Atla
                          </button>
                        ) : null}
                        {step.id === 'ilk-mesaj' ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() =>
                              startTransition(async () => {
                                applyResult(await finishToPanel())
                              })
                            }
                            className="inline-flex h-10 items-center px-2 text-[13px] font-medium text-ink-muted hover:text-ink"
                          >
                            Mesajsız panele git
                          </button>
                        ) : null}
                      </div>
                    </form>
                  ) : null}
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
    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular'
  if (status === 'done') return <span className={`${base} bg-ok text-white`}>✓</span>
  if (status === 'active')
    return <span className={`${base} bg-accent text-accent-ink`}>{index + 1}</span>
  return <span className={`${base} bg-surface-raised text-ink-faint`}>{index + 1}</span>
}

function countLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean).length
}
