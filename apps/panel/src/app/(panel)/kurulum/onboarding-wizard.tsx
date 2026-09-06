'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  AccentLink,
  Button,
  Card,
  Field,
  Input,
  Meter,
  Notice,
  QuietLink,
} from '@/components/ui'
import { useToast } from '@/components/toast'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import type { getSetupProgress, SetupStepKey } from '@/lib/setup-progress'
import { saveBrandKit, type BrandKitState } from '../marka-kiti/actions'
import { ImportForm } from '../kisiler/import-form'
import { WaCheckForm } from '../kisiler/wa-check-form'
import { VerifyAllButton } from '../kisiler/verify-all-button'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

const STEP_META: {
  key: SetupStepKey
  title: string
  lead: string
}[] = [
  {
    key: 'brand',
    title: 'Marka',
    lead: 'Gönderimlerde görünecek işletme adı ve ana renk.',
  },
  {
    key: 'contacts',
    title: 'Kişi listesi',
    lead: 'Kampanyada kullanacağınız numaraları ekleyin.',
  },
  {
    key: 'connected',
    title: 'WhatsApp hattı',
    lead: 'QR veya telefon koduyla en az bir hat bağlayın.',
  },
  {
    key: 'verified',
    title: 'Numara kontrolü',
    lead: 'En az bir numaranın WhatsApp’ta kayıtlı olduğunu doğrulayın.',
  },
]

function BrandStep() {
  const router = useRouter()
  const toast = useToast()
  const [state, action, pending] = useActionState<BrandKitState, FormData>(saveBrandKit, null)

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) {
      toast(state.ok, 'success')
      router.refresh()
    }
  }, [state?.error, state?.ok, toast, router])

  return (
    <form action={action} className="space-y-3">
      <Field label="Marka / işletme adı" hint="Kampanya önizlemesinde görünür.">
        <Input name="name" required placeholder="Örn. Filo Demir" maxLength={80} />
      </Field>
      <Field label="Ana renk">
        <Input
          name="primary"
          type="color"
          defaultValue={DEFAULT_COLORS.primary}
          className="h-10 w-20 cursor-pointer p-1"
        />
      </Field>
      <input type="hidden" name="secondary" value={DEFAULT_COLORS.secondary} />
      <input type="hidden" name="accent" value={DEFAULT_COLORS.accent} />
      <input type="hidden" name="background" value={DEFAULT_COLORS.background} />
      <input type="hidden" name="text" value={DEFAULT_COLORS.text} />
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Kaydet ve devam →'}
      </Button>
    </form>
  )
}

export function OnboardingWizard({ progress }: { progress: Progress }) {
  const router = useRouter()
  const refresh = () => router.refresh()

  const activeKey = progress.nextStep ?? 'brand'
  const activeIndex = STEP_META.findIndex((s) => s.key === activeKey)
  const active = STEP_META[activeIndex] ?? STEP_META[0]!

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
          Zorunlu kurulum
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-ink">
          {active.title}
        </h1>
        <p className="mt-1.5 text-[13px] text-ink-muted">{active.lead}</p>
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-[12px] text-ink-muted">
          <span>
            Adım {Math.min(activeIndex + 1, STEP_META.length)} / {STEP_META.length}
          </span>
          <span className="tabular">
            {progress.doneCount} tamamlandı
          </span>
        </div>
        <Meter value={progress.doneCount} max={STEP_META.length} />
      </div>

      <ol className="flex flex-wrap gap-2">
        {STEP_META.map((step, index) => {
          const done = progress.steps[step.key]
          const current = step.key === activeKey
          return (
            <li
              key={step.key}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] ${
                current
                  ? 'border-accent/35 bg-accent-soft font-semibold text-accent-dim'
                  : done
                    ? 'border-ok/30 bg-ok-soft text-ok-dim'
                    : 'border-hairline text-ink-faint'
              }`}
            >
              <span className="tabular">{done ? '✓' : index + 1}</span>
              {step.title}
            </li>
          )
        })}
      </ol>

      <Card>
        <div className="space-y-4 p-4">
          {activeKey === 'brand' ? <BrandStep /> : null}

          {activeKey === 'contacts' ? (
            <div className="space-y-3">
              <p className="text-[12.5px] text-ink-muted">
                Liste oluşturunca bu adım otomatik tamamlanır. Kayıttan sonra sayfa yenilenir.
              </p>
              <ImportForm />
              <Button type="button" onClick={refresh}>
                Liste ekledim — yenile
              </Button>
            </div>
          ) : null}

          {activeKey === 'connected' ? (
            <div className="space-y-3">
              <p className="text-[12.5px] leading-relaxed text-ink-muted">
                Hesaplar’da hat ekleyip QR veya telefon koduyla bağlayın. Durum{' '}
                <strong className="font-semibold text-ink">Bağlı</strong> olunca buraya dönün.
              </p>
              <div className="flex flex-wrap gap-2">
                <AccentLink href="/hesaplar#yeni-hat">Hat bağla →</AccentLink>
                <Button type="button" onClick={refresh}>
                  Bağladım — yenile
                </Button>
              </div>
              {progress.counts.connectedCount > 0 ? (
                <Notice tone="success">
                  {progress.counts.connectedCount} hat bağlı. Sonraki adıma geçiliyor…
                </Notice>
              ) : null}
            </div>
          ) : null}

          {activeKey === 'verified' ? (
            <div className="space-y-4">
              <p className="text-[12.5px] text-ink-muted">
                Tek numara kontrol edin veya tüm defteri doğrulayın. En az bir ✓ yeterli.
              </p>
              <WaCheckForm />
              <div className="border-t border-hairline pt-3">
                <VerifyAllButton />
              </div>
              <Button type="button" onClick={refresh}>
                Doğruladım — yenile
              </Button>
            </div>
          ) : null}
        </div>
      </Card>

      <p className="text-center text-[11.5px] text-ink-faint">
        Bu adımlar bitince doğrudan kampanya oluşturursunuz.{' '}
        <QuietLink href="/yardim" className="text-[11.5px]">
          Yardım
        </QuietLink>
      </p>
    </div>
  )
}
