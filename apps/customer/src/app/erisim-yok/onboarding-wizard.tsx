'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Wordmark } from '@/components/brand'
import { Button, Field, Input, Notice } from '@/components/ui'
import { PairingPanel } from '@/app/(panel)/hesaplar/pairing-panel'
import { readRehberSyncJob } from '@/app/(panel)/hesaplar/actions'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  ONBOARDING_STEPS,
  e164ToMaskedTr,
  formatTrMobileMask,
  isTrMobileMasked,
  stepIndex,
  type OnboardingStep,
} from '@/lib/onboarding'
import type { OnboardingSnapshot } from '@/lib/onboarding-state'
import {
  advanceAfterWhatsApp,
  completeOnboarding,
  finishContactsImport,
  saveAbout,
  saveAddress,
  saveBrandKitStep,
  saveBusinessName,
  skipContactsImport,
  startContactsImport,
  startWelcome,
  startWhatsAppPairing,
  type OnboardState,
} from './actions'

const LABELS: Record<OnboardingStep, string> = {
  hosgeldin: 'Karşılama',
  isletme: 'İşletme',
  adres: 'Adres',
  hat: 'WhatsApp',
  rehber: 'Rehber',
  tanitim: 'Tanıtım',
  marka: 'Marka',
}

function go(router: ReturnType<typeof useRouter>, step: OnboardingStep) {
  router.replace(`/erisim-yok?adim=${step}`)
}

function StepDots({ current }: { current: OnboardingStep }) {
  const idx = stepIndex(current)
  return (
    <ol className="flex items-center gap-1.5" aria-label="Kurulum adımları">
      {ONBOARDING_STEPS.map((step, i) => (
        <li
          key={step}
          className={`h-1.5 rounded-full transition-all ${
            i === idx ? 'w-6 bg-accent' : i < idx ? 'w-3 bg-accent/50' : 'w-3 bg-hairline'
          }`}
        />
      ))}
    </ol>
  )
}

function Pager({
  current,
  onBack,
  nextLabel,
  nextDisabled,
  nextPending,
  hideNext,
}: {
  current: OnboardingStep
  onBack?: () => void
  nextLabel?: string
  nextDisabled?: boolean
  nextPending?: boolean
  hideNext?: boolean
}) {
  const idx = stepIndex(current)
  return (
    <div className="mt-6 flex items-center justify-between gap-3">
      {idx > 0 ? (
        <Button type="button" onClick={onBack} disabled={nextPending}>
          Geri
        </Button>
      ) : (
        <span />
      )}
      <p className="text-[12px] tabular text-ink-faint">
        {idx + 1} / {ONBOARDING_STEPS.length}
      </p>
      {hideNext ? (
        <span />
      ) : (
        <Button type="submit" variant="accent" disabled={nextDisabled || nextPending}>
          {nextPending ? 'Kaydediliyor…' : nextLabel ?? 'Devam'}
        </Button>
      )}
    </div>
  )
}

export function OnboardingWizard({
  snapshot,
  step,
}: {
  snapshot: OnboardingSnapshot
  step: OnboardingStep
}) {
  const router = useRouter()
  const idx = stepIndex(step)

  const back = () => {
    const prev = ONBOARDING_STEPS[Math.max(0, idx - 1)]
    if (prev) go(router, prev)
  }

  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col px-5 py-8 md:py-12">
        <div className="mb-8 flex items-center justify-between gap-3">
          <Wordmark />
          <StepDots current={step} />
        </div>

        <div className="filo-fade-up rounded-[16px] border border-hairline bg-surface px-6 py-7 shadow-[var(--shadow-card)] md:px-8 md:py-8">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-faint uppercase">
            {LABELS[step]}
          </p>

          {step === 'hosgeldin' ? <WelcomeStep snapshot={snapshot} /> : null}
          {step === 'isletme' ? <BusinessStep snapshot={snapshot} onBack={back} /> : null}
          {step === 'adres' ? <AddressStep snapshot={snapshot} onBack={back} /> : null}
          {step === 'hat' ? <HatStep snapshot={snapshot} onBack={back} /> : null}
          {step === 'rehber' ? <RehberStep snapshot={snapshot} onBack={back} /> : null}
          {step === 'tanitim' ? <AboutStep snapshot={snapshot} onBack={back} /> : null}
          {step === 'marka' ? <BrandStep snapshot={snapshot} onBack={back} /> : null}
        </div>
      </div>
    </main>
  )
}

function WelcomeStep({ snapshot }: { snapshot: OnboardingSnapshot }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <div>
      <h1 className="mt-2 text-[26px] font-semibold tracking-[-0.03em] text-ink">
        Hoş geldiniz
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
        Birkaç adımda işletmenizi kuralım. WhatsApp satış sisteminizi birkaç dakikada
        hazırlayalım.
      </p>
      {error ? (
        <div className="mt-4">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}
      <div className="mt-7">
        <Button
          type="button"
          variant="accent"
          className="w-full"
          disabled={pending}
          onClick={() => {
            setError(null)
            start(async () => {
              const result = await startWelcome()
              if (result?.error) {
                setError(result.error)
                return
              }
              go(router, (result?.next as OnboardingStep) || (snapshot.org ? 'adres' : 'isletme'))
            })
          }}
        >
          {pending ? 'Hazırlanıyor…' : 'Başla'}
        </Button>
      </div>
    </div>
  )
}

function BusinessStep({
  snapshot,
  onBack,
}: {
  snapshot: OnboardingSnapshot
  onBack: () => void
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState<OnboardState, FormData>(saveBusinessName, null)

  useEffect(() => {
    if (state?.next) go(router, state.next as OnboardingStep)
  }, [state?.next, router])

  return (
    <form action={action}>
      <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">
        İşletmenizi hızlıca ekleyelim
      </h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">Kampanya ve gönderimlerde bu ad görünür.</p>
      <div className="mt-5">
        <Field label="İşletme adı">
          <Input
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={snapshot.org?.name ?? ''}
            placeholder="Örn. Filo Butik"
          />
        </Field>
      </div>
      {state?.error ? (
        <div className="mt-3">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      ) : null}
      <Pager current="isletme" onBack={onBack} nextPending={pending} />
    </form>
  )
}

function AddressStep({
  snapshot,
  onBack,
}: {
  snapshot: OnboardingSnapshot
  onBack: () => void
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState<OnboardState, FormData>(saveAddress, null)

  useEffect(() => {
    if (state?.next) go(router, state.next as OnboardingStep)
  }, [state?.next, router])

  return (
    <form action={action}>
      <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">Açık adres</h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        Müşterilerinizin sizi bulduğu adres. Sokak, no, ilçe ve il yazın.
      </p>
      <div className="mt-5">
        <Field label="Adres">
          <textarea
            name="address"
            required
            minLength={8}
            maxLength={400}
            rows={4}
            defaultValue={snapshot.org?.address ?? ''}
            placeholder="Örn. Bağdat Cad. No 12, Kadıköy / İstanbul"
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2.5 text-[13.5px] text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </Field>
      </div>
      {state?.error ? (
        <div className="mt-3">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      ) : null}
      <Pager current="adres" onBack={onBack} nextPending={pending} />
    </form>
  )
}

function HatStep({
  snapshot,
  onBack,
}: {
  snapshot: OnboardingSnapshot
  onBack: () => void
}) {
  const router = useRouter()
  const [phone, setPhone] = useState(
    e164ToMaskedTr(snapshot.org?.phone_e164 || snapshot.account?.phone_e164),
  )
  const [account, setAccount] = useState(snapshot.account)
  const [connected, setConnected] = useState(snapshot.accountConnected)
  const [state, action, pending] = useActionState<OnboardState, FormData>(
    startWhatsAppPairing,
    null,
  )
  const [advanceError, setAdvanceError] = useState<string | null>(null)
  const [advancing, startAdvance] = useTransition()

  useEffect(() => {
    if (!state?.accountId) return
    setAccount((prev) =>
      prev?.id === state.accountId
        ? prev
        : {
            id: state.accountId!,
            status: 'disconnected',
            phone_e164: null,
            pairing_code: null,
            pairing_expires_at: null,
          },
    )
    router.refresh()
  }, [state?.accountId, router])

  useEffect(() => {
    const id = account?.id
    if (!id || connected) return
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`onboard-hat-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts', filter: `id=eq.${id}` },
        (payload) => {
          const next = payload.new as {
            id: string
            status: string
            phone_e164: string | null
            pairing_code: string | null
            pairing_expires_at: string | null
          }
          setAccount({
            id: next.id,
            status: next.status,
            phone_e164: next.phone_e164,
            pairing_code: next.pairing_code,
            pairing_expires_at: next.pairing_expires_at,
          })
          if (next.status === 'connected') setConnected(true)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [account?.id, connected])

  useEffect(() => {
    if (snapshot.account) setAccount(snapshot.account)
    if (snapshot.accountConnected) setConnected(true)
  }, [snapshot.account, snapshot.accountConnected])

  return (
    <div>
      <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">WhatsApp hattı</h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        Tek numara. Bağlantı eşleştirme kodu ile kurulur; bağlanmadan sonraki adıma geçilemez.
      </p>

      <form action={action} className="mt-5 space-y-3">
        <Field label="Telefon" hint="Yalnızca 05XX XXX XX XX">
          <Input
            name="phone"
            inputMode="numeric"
            autoComplete="tel-national"
            required
            value={phone}
            placeholder="05XX XXX XX XX"
            onChange={(e) => setPhone(formatTrMobileMask(e.target.value))}
          />
        </Field>
        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
        {!connected ? (
          <Button
            type="submit"
            variant="accent"
            disabled={pending || !isTrMobileMasked(phone)}
          >
            {pending ? 'Kod isteniyor…' : account?.pairing_code ? 'Kodu yenile' : 'Eşleştirme kodu al'}
          </Button>
        ) : (
          <Notice tone="success">WhatsApp hattı bağlı. Devam edebilirsiniz.</Notice>
        )}
      </form>

      {account?.pairing_code && !connected ? (
        <div className="mt-4">
          <PairingPanel code={account.pairing_code} expiresAt={account.pairing_expires_at} />
        </div>
      ) : null}

      {advanceError ? (
        <div className="mt-3">
          <Notice tone="danger">{advanceError}</Notice>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button type="button" onClick={onBack} disabled={advancing}>
          Geri
        </Button>
        <p className="text-[12px] tabular text-ink-faint">
          {stepIndex('hat') + 1} / {ONBOARDING_STEPS.length}
        </p>
        <Button
          type="button"
          variant="accent"
          disabled={!connected || advancing}
          onClick={() => {
            setAdvanceError(null)
            startAdvance(async () => {
              const result = await advanceAfterWhatsApp()
              if (result?.error) {
                setAdvanceError(result.error)
                return
              }
              go(router, 'rehber')
            })
          }}
        >
          {advancing ? 'Kaydediliyor…' : 'Devam'}
        </Button>
      </div>
    </div>
  )
}

function rehberPercent(seen: number, done: boolean): number {
  if (done) return 100
  if (seen <= 0) return 8
  return Math.min(92, 12 + Math.round(80 * (1 - Math.exp(-seen / 80))))
}

function RehberStep({
  snapshot,
  onBack,
}: {
  snapshot: OnboardingSnapshot
  onBack: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [running, setRunning] = useState(false)
  const [percent, setPercent] = useState(snapshot.org?.onboarding.contacts_imported ? 100 : 0)
  const [importedCount, setImportedCount] = useState<number | null>(
    snapshot.org?.onboarding.contacts_imported
      ? (snapshot.org.onboarding.contacts_imported_count ?? null)
      : null,
  )
  const done = snapshot.org?.onboarding.contacts_imported || percent === 100
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (snapshot.org?.onboarding.contacts_imported) {
      setPercent(100)
      if (typeof snapshot.org.onboarding.contacts_imported_count === 'number') {
        setImportedCount(snapshot.org.onboarding.contacts_imported_count)
      }
    }
  }, [
    snapshot.org?.onboarding.contacts_imported,
    snapshot.org?.onboarding.contacts_imported_count,
  ])

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  const pollJob = (jobId: string) => {
    setRunning(true)
    setPercent(8)
    pollRef.current = setInterval(() => {
      void readRehberSyncJob(jobId).then((out) => {
        if (out.error) {
          setError(out.error)
          setRunning(false)
          if (pollRef.current) clearInterval(pollRef.current)
          return
        }
        const seen = out.progress?.seen ?? out.result?.imported ?? 0
        const finished = out.status === 'done'
        setPercent(rehberPercent(seen, finished))
        if (finished) {
          setRunning(false)
          const total = out.result?.imported ?? seen
          setImportedCount(total)
          if (pollRef.current) clearInterval(pollRef.current)
          start(async () => {
            const result = await finishContactsImport(total)
            if (result?.error) setError(result.error)
            if (typeof result?.importedCount === 'number') setImportedCount(result.importedCount)
            router.refresh()
          })
        }
      })
    }, 1500)
  }

  return (
    <div>
      <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">WhatsApp rehberi</h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        İsteğe bağlı. İçe aktarılırsa grup adı <span className="font-medium text-ink">Rehberim</span>{' '}
        olur.
      </p>
      {done && importedCount !== null ? (
        <p className="mt-2 text-[13.5px] font-medium text-ink">
          İçe aktarma tamamlandı · {new Intl.NumberFormat('tr-TR').format(importedCount)} kayıt
        </p>
      ) : null}

      {running || percent > 0 ? (
        <div className="mt-5">
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-[13px] tabular text-ink-muted">%{percent}</p>
        </div>
      ) : null}

      {error ? (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <Button type="button" onClick={onBack} disabled={pending || running}>
          Geri
        </Button>
        <p className="text-[12px] tabular text-ink-faint">
          {stepIndex('rehber') + 1} / {ONBOARDING_STEPS.length}
        </p>
        <div className="flex gap-2">
          {done ? null : (
            <Button
              type="button"
              disabled={pending || running}
              onClick={() => {
                setError(null)
                start(async () => {
                  const result = await skipContactsImport()
                  if (result?.error) setError(result.error)
                  else go(router, 'tanitim')
                })
              }}
            >
              Atla
            </Button>
          )}
          {done ? (
            <Button type="button" variant="accent" onClick={() => go(router, 'tanitim')}>
              Devam
            </Button>
          ) : (
            <Button
              type="button"
              variant="accent"
              disabled={pending || running}
              onClick={() => {
                setError(null)
                start(async () => {
                  const result = await startContactsImport()
                  if (result?.error) {
                    setError(result.error)
                    return
                  }
                  if (result?.jobId) pollJob(result.jobId)
                })
              }}
            >
              {running ? 'Aktarılıyor…' : 'İçe aktar'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function AboutStep({
  snapshot,
  onBack,
}: {
  snapshot: OnboardingSnapshot
  onBack: () => void
}) {
  const router = useRouter()
  const [state, action, pending] = useActionState<OnboardState, FormData>(saveAbout, null)

  useEffect(() => {
    if (state?.next) go(router, state.next as OnboardingStep)
  }, [state?.next, router])

  return (
    <form action={action}>
      <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">
        İşletmenizi kısaca tanıtın
      </h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        Ne sattığınızı, kime hitap ettiğinizi bir-iki cümleyle yazın. Marka kiti buna göre kurulur.
      </p>
      <div className="mt-5">
        <Field label="Kısa tanıtım">
          <textarea
            name="about"
            required
            minLength={12}
            maxLength={600}
            rows={5}
            defaultValue={snapshot.org?.about ?? ''}
            placeholder="Örn. Kadıköy’de butik ev tekstili satıyoruz. Sıcak, sade ve güvenilir bir dil kullanırız."
            className="w-full rounded-md border border-hairline bg-surface px-3 py-2.5 text-[13.5px] text-ink shadow-[var(--shadow-card)] outline-none placeholder:text-ink-faint focus:border-accent"
          />
        </Field>
      </div>
      {state?.error ? (
        <div className="mt-3">
          <Notice tone="danger">{state.error}</Notice>
        </div>
      ) : null}
      <Pager current="tanitim" onBack={onBack} nextPending={pending} />
    </form>
  )
}

const BRAND_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const BRAND_IMAGE_EXT = /\.(png|jpe?g|webp)$/i
const BRAND_IMAGE_MAX = 5 * 1024 * 1024

function isBrandImageFile(file: File) {
  if (BRAND_IMAGE_TYPES.includes(file.type)) return true
  return !file.type && BRAND_IMAGE_EXT.test(file.name)
}

function BrandAssetDropzone({
  file,
  disabled,
  onFile,
  onClear,
}: {
  file: File | null
  disabled?: boolean
  onFile: (file: File) => void
  onClear: () => void
}) {
  const dragDepth = useRef(0)
  const [over, setOver] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const take = (list: FileList | File[] | null) => {
    const next = list && list[0]
    if (!next) return
    onFile(next)
  }

  return (
    <div>
      <span className="mb-1.5 block text-[13px] font-semibold text-ink-muted">
        Örnek kampanya görseli yükleyiniz
      </span>
      <div
        onDragEnter={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (disabled) return
          dragDepth.current += 1
          setOver(true)
        }}
        onDragOver={(event) => {
          event.preventDefault()
          event.stopPropagation()
          if (!disabled) event.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={(event) => {
          event.preventDefault()
          event.stopPropagation()
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setOver(false)
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          dragDepth.current = 0
          setOver(false)
          if (!disabled) take(event.dataTransfer.files)
        }}
        className={`relative min-h-[168px] overflow-hidden rounded-md border border-dashed transition-colors touch-manipulation sm:min-h-[180px] ${
          over ? 'border-accent bg-accent/5' : 'border-hairline-strong bg-canvas'
        } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          id="brand-asset-upload"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg,image/*"
          disabled={disabled}
          aria-label="Örnek kampanya görseli yükleyiniz"
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => {
            take(event.target.files)
            event.target.value = ''
          }}
        />
        {preview && file ? (
          <div className="pointer-events-none flex h-full min-h-[168px] items-center justify-center bg-surface p-3 sm:min-h-[180px] sm:p-4">
            <img
              src={preview}
              alt="Yüklenen görsel önizlemesi"
              className="max-h-[200px] w-full object-contain"
            />
          </div>
        ) : (
          <div className="pointer-events-none flex min-h-[168px] flex-col items-center justify-center gap-1.5 px-4 py-8 text-center sm:min-h-[180px]">
            <p className="text-[14px] font-medium text-ink">Buraya sürükle veya tıklayın</p>
            <p className="max-w-[260px] text-[12.5px] leading-relaxed text-ink-faint">
              PNG, JPG veya WEBP · en fazla 5 MB · isteğe bağlı
            </p>
          </div>
        )}
      </div>
      {file ? (
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="min-w-0 truncate text-[12.5px] text-ink">
            {file.name}
            <span className="ml-1.5 text-ink-faint">
              {file.size >= 1024 * 1024
                ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                : `${Math.max(1, Math.round(file.size / 1024))} KB`}
            </span>
          </p>
          <button
            type="button"
            disabled={disabled}
            className="min-h-11 shrink-0 rounded-md border border-hairline bg-surface px-3 py-2 text-[12.5px] font-medium text-ink touch-manipulation"
            onClick={onClear}
          >
            Kaldır
          </button>
        </div>
      ) : null}
    </div>
  )
}

function BrandStep({
  snapshot,
  onBack,
}: {
  snapshot: OnboardingSnapshot
  onBack: () => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [brand, setBrand] = useState(snapshot.brand)
  const [assetFile, setAssetFile] = useState<File | null>(null)
  const analyzed = Boolean(snapshot.org?.onboarding.brand_analyzed && snapshot.brand?.tone) || Boolean(brand?.tone)

  const setPickedFile = (next: File) => {
    if (next.size > BRAND_IMAGE_MAX) {
      setError('Görsel en fazla 5 MB olabilir.')
      return
    }
    if (!isBrandImageFile(next)) {
      setError('PNG, JPG veya WEBP yükleyin.')
      return
    }
    setError(null)
    setAssetFile(next)
  }

  return (
    <div>
      <h1 className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">Marka kiti</h1>
      <p className="mt-2 text-[13.5px] text-ink-muted">
        Logo veya örnek bir kampanya görseli yükleyin. Yapay zeka renk, font ve tasarım dilini çıkarır.
        Görsel yoksa tanıtımınıza göre kit üretiriz.
      </p>

      {brand?.tone ? (
        <div className="mt-5 space-y-3 rounded-md border border-hairline bg-canvas p-4">
          <p className="text-[13px] font-semibold">{brand.name}</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(brand.colors)
              .slice(0, 5)
              .map(([key, value]) => (
                <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <span
                    className="size-4 rounded-sm border border-hairline"
                    style={{ background: value }}
                  />
                  {value}
                </span>
              ))}
          </div>
          <p className="text-[12.5px] leading-relaxed text-ink-muted">{brand.tone}</p>
          {brand.fonts?.heading ? (
            <p className="text-[11.5px] text-ink-faint">
              {brand.fonts.heading} / {brand.fonts.body}
            </p>
          ) : null}
        </div>
      ) : null}

      {!analyzed ? (
        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            const data = new FormData(e.currentTarget)
            if (assetFile) data.set('asset', assetFile)
            setError(null)
            start(async () => {
              const result = await saveBrandKitStep(data)
              if (result?.error) {
                setError(result.error)
                return
              }
              if (result?.brand) {
                setBrand({
                  name: result.brand.name,
                  colors: result.brand.colors,
                  fonts: result.brand.fonts,
                  tone: result.brand.tone,
                  logo_path: null,
                })
              }
              router.refresh()
            })
          }}
        >
          <BrandAssetDropzone
            file={assetFile}
            disabled={pending}
            onFile={setPickedFile}
            onClear={() => {
              setAssetFile(null)
              setError(null)
            }}
          />
          {error ? <Notice tone="danger">{error}</Notice> : null}
          <Button type="submit" variant="accent" disabled={pending}>
            {pending ? 'Analiz ediliyor…' : 'Marka kitini oluştur'}
          </Button>
        </form>
      ) : (
        <p className="mt-4 text-[12.5px] text-ink-faint">Analiz kaydedildi; tekrar çalıştırılmaz.</p>
      )}

      {error && analyzed ? (
        <div className="mt-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button type="button" onClick={onBack} disabled={pending}>
          Geri
        </Button>
        <p className="text-[12px] tabular text-ink-faint">
          {stepIndex('marka') + 1} / {ONBOARDING_STEPS.length}
        </p>
        <Button
          type="button"
          variant="accent"
          disabled={pending || !analyzed}
          onClick={() => {
            setError(null)
            start(async () => {
              const result = await completeOnboarding()
              if (result?.error) setError(result.error)
            })
          }}
        >
          {pending ? 'Açılıyor…' : 'Kaydı tamamla'}
        </Button>
      </div>
    </div>
  )
}
