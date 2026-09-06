'use client'

import { useActionState, useEffect, useMemo } from 'react'
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
import { Icon, type IconName } from '@/components/icon'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import type { getSetupProgress, SetupStepKey } from '@/lib/setup-progress'
import { saveBrandKit, type BrandKitState } from '../marka-kiti/actions'
import { ImportForm } from '../kisiler/import-form'
import { WaCheckForm } from '../kisiler/wa-check-form'
import { VerifyAllButton } from '../kisiler/verify-all-button'

type Progress = Awaited<ReturnType<typeof getSetupProgress>>

function HowTo({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-md border border-hairline bg-canvas/80 px-3.5 py-3">
      <p className="text-[12.5px] font-semibold text-ink">{title}</p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-[12.5px] leading-snug text-ink-muted">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  )
}

function BrandStep() {
  const router = useRouter()
  const toast = useToast()
  const t = useT()
  const [state, action, pending] = useActionState<BrandKitState, FormData>(saveBrandKit, null)

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) {
      toast(state.ok, 'success')
      router.refresh()
    }
  }, [state?.error, state?.ok, toast, router])

  return (
    <div className="space-y-4">
      <HowTo
        title="Bu adım ne işe yarar?"
        steps={[
          'İşletme adın kampanya önizlemesinde ve marka görsellerinde görünür.',
          'Ana renk buton / vurgu rengi olur — sonra Marka sayfasından da değiştirebilirsin.',
          'Kaydet’e basınca bir sonraki adıma geçersin.',
        ]}
      />
      <form action={action} className="space-y-3">
        <Field label={t('setup.brandName')} hint="Müşterinin gördüğü isim — örn. Dönerci Ali">
          <Input name="name" required placeholder={t('setup.brandNamePh')} maxLength={80} />
        </Field>
        <Field label={t('setup.primaryColor')} hint="Parmakla renk seç">
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
          {pending ? t('setup.saving') : t('setup.saveContinue')}
        </Button>
      </form>
    </div>
  )
}

export function OnboardingWizard({ progress }: { progress: Progress }) {
  const router = useRouter()
  const t = useT()
  const refresh = () => router.refresh()

  const stepMeta = useMemo(
    () =>
      [
        {
          key: 'brand' as SetupStepKey,
          title: '1 · Markanı yaz',
          lead: 'İşletme adın ve rengin. 30 saniye.',
          icon: 'brand' as IconName,
        },
        {
          key: 'contacts' as SetupStepKey,
          title: '2 · Kişi grubu ekle',
          lead: 'Excel veya numaraları yapıştır. Kampanyada bu grubu seçeceksin.',
          icon: 'people' as IconName,
        },
        {
          key: 'connected' as SetupStepKey,
          title: '3 · WhatsApp hattını bağla',
          lead: 'Telefondaki WhatsApp’tan QR okut. Mesajlar bu hattan gider.',
          icon: 'phone' as IconName,
        },
        {
          key: 'verified' as SetupStepKey,
          title: '4 · Bir numarayı kontrol et',
          lead: 'En az bir numaranın WhatsApp’ta kayıtlı olduğunu doğrula.',
          icon: 'check' as IconName,
        },
      ] as const,
    [],
  )

  const activeKey = progress.nextStep ?? 'brand'
  const activeIndex = stepMeta.findIndex((s) => s.key === activeKey)
  const active = stepMeta[activeIndex] ?? stepMeta[0]!

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-accent">
          İlk kurulum · ~3–5 dakika
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-ink sm:text-[26px]">
          {active.title}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{active.lead}</p>
      </div>

      <Notice tone="accent">
        Dört adımı bitirmeden kampanya açılamaz. Her adımda ne yapacağın aşağıda maddeler halinde
        yazıyor — başka yere bakmana gerek yok.
      </Notice>

      <div>
        <div className="mb-1.5 flex justify-between text-[12px] text-ink-muted">
          <span>
            {t('setup.stepOf', {
              current: Math.min(activeIndex + 1, stepMeta.length),
              total: stepMeta.length,
            })}
          </span>
          <span className="tabular">{t('setup.completedCount', { count: progress.doneCount })}</span>
        </div>
        <Meter value={progress.doneCount} max={stepMeta.length} />
      </div>

      <ol className="flex flex-wrap gap-2">
        {stepMeta.map((step, index) => {
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
              <Icon name={done ? 'check' : step.icon} className="size-3.5 shrink-0" />
              {done ? null : <span className="tabular">{index + 1}</span>}
              {step.title.replace(/^\d+\s·\s/, '')}
            </li>
          )
        })}
      </ol>

      <Card>
        <div className="space-y-4 p-4">
          {activeKey === 'brand' ? <BrandStep /> : null}

          {activeKey === 'contacts' ? (
            <div className="space-y-4">
              <HowTo
                title="Nasıl yapılır?"
                steps={[
                  'Gruba bir ad ver (ör. Mahalle müşterileri).',
                  'Excel (.xlsx) seç veya numaraları satır satır yapıştır. Başında 0 olan Türkiye numaraları olur.',
                  '“Grubu oluştur”a bas. Bu sayfa yenilenince adım tamamlanır.',
                  'İstersen sonra Kişiler’den daha fazla grup ekleyebilirsin.',
                ]}
              />
              <ImportForm />
              <Button type="button" onClick={refresh}>
                {t('setup.contactsRefresh')}
              </Button>
            </div>
          ) : null}

          {activeKey === 'connected' ? (
            <div className="space-y-4">
              <HowTo
                title="Telefonda QR nasıl okutulur?"
                steps={[
                  'Aşağıdaki “Hat bağla”ya bas → Hatlar sayfası açılır.',
                  'Yeni hat ekle (veya mevcut satıra bak).',
                  'Telefonda WhatsApp → Ayarlar → Bağlı cihazlar → Cihaz bağla.',
                  'Ekrandaki QR’ı okut. Durum “Bağlı” olunca buraya dönüp “Bağladım — yenile”ye bas.',
                  'QR süresi dolarsa Yeniden bağla ile yenile.',
                ]}
              />
              <div className="flex flex-wrap gap-2">
                <AccentLink href="/hesaplar#yeni-hat">{t('setup.lineCta')}</AccentLink>
                <Button type="button" onClick={refresh}>
                  {t('setup.lineRefresh')}
                </Button>
              </div>
              {progress.counts.connectedCount > 0 ? (
                <Notice tone="success">
                  {t('setup.lineOk', { count: progress.counts.connectedCount })}
                </Notice>
              ) : (
                <Notice tone="warn">
                  Henüz bağlı hat yok. QR okutulmadan kampanya gönderilemez.
                </Notice>
              )}
            </div>
          ) : null}

          {activeKey === 'verified' ? (
            <div className="space-y-4">
              <HowTo
                title="Neden kontrol?"
                steps={[
                  'WhatsApp’ta kaydı olmayan numaraya mesaj gitmez — boşuna denemezsin.',
                  'Tek bir numarayı aşağıya yazıp Kontrol et.',
                  'Veya “Tüm defteri doğrula” (bağlı hat gerekir; biraz sürebilir).',
                  'En az bir ✓ görününce kurulum biter → kampanya açılır.',
                ]}
              />
              <WaCheckForm />
              <div className="border-t border-hairline pt-3">
                <VerifyAllButton />
              </div>
              <Button type="button" onClick={refresh}>
                {t('setup.verifyRefresh')}
              </Button>
              <Notice tone="accent">
                Bittiğinde Özet’te tek yeşil “Şimdi yap” ile mesaj göndermeye geçersin. Başka
                ayar yok.
              </Notice>
            </div>
          ) : null}
        </div>
      </Card>

      <p className="text-center text-[12px] leading-relaxed text-ink-faint">
        Takıldın mı?{' '}
        <QuietLink href="/yardim" className="text-[12px]">
          Yardım
        </QuietLink>
        {' · '}
        Scrape / hazır liste için bize yaz — senin işin sadece bu dört adım.
      </p>
    </div>
  )
}
