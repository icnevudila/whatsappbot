'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AccentLink,
  Button,
  Card,
  Field,
  FileUploadButton,
  Input,
  Meter,
  Notice,
  QuietLink,
  Textarea,
} from '@/components/ui'
import { Icon, type IconName } from '@/components/icon'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { getSetupProgress, SetupStepKey } from '@/lib/setup-progress'
import { saveBrandKit, type BrandKitState } from '../marka-kiti/actions'
import { ImportForm } from '../kisiler/import-form'

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

function BrandStep({ orgId, orgName }: { orgId: string; orgName: string }) {
  const router = useRouter()
  const toast = useToast()
  const [state, action, pending] = useActionState<BrandKitState, FormData>(saveBrandKit, null)

  const [name, setName] = useState(orgName || '')
  const [tone, setTone] = useState('')
  const [primary, setPrimary] = useState(DEFAULT_COLORS.primary)
  const [accent, setAccent] = useState(DEFAULT_COLORS.accent)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) {
      toast(state.ok, 'success')
      router.refresh()
    }
  }, [state?.error, state?.ok, toast, router])

  const uploadLogo = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      if (!file.type.startsWith('image/')) {
        setUploadError('Yalnızca görsel dosyası (PNG, JPG, WebP).')
        return
      }
      if (file.size > 2_000_000) {
        setUploadError('Logo en fazla 2 MB olsun.')
        return
      }
      const supabase = getSupabaseBrowserClient()
      const extension = file.name.split('.').pop() ?? 'png'
      const path = `${orgId}/logo-${crypto.randomUUID()}.${extension}`
      const { error } = await supabase.storage.from('creatives').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (error) throw error
      const { data } = supabase.storage.from('creatives').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Logo yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const previewName = name.trim() || 'İşletme adın'
  const previewTone = tone.trim() || 'Örn. Taze döner, hızlı servis'

  return (
    <div className="space-y-4">
      <HowTo
        title="Marka kiti ne işe yarar? (1–2 dk)"
        steps={[
          'Müşteriye giden mesajlarda ve kampanya görsellerinde işletme adın görünür.',
          'Logo ve renkler WhatsApp görsellerinde tutarlı durur — her seferinde sıfırdan tasarlamazsın.',
          'Slogan (isteğe bağlı) kampanya metninde / görselde kısa alt satır olur.',
          'Kaydettikten sonra istersen Marka sayfasından AI görsel de üretebilirsin; şimdi zorunlu değil.',
        ]}
      />

      <div className="rounded-md border border-hairline overflow-hidden">
        <div
          className="px-4 py-5 text-white"
          style={{ background: `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)` }}
        >
          <div className="flex items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="size-12 rounded-md border border-white/30 bg-white object-contain p-1"
              />
            ) : (
              <span className="grid size-12 place-items-center rounded-md bg-white/20 text-[18px] font-extrabold">
                {previewName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[18px] font-extrabold tracking-tight">{previewName}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-white/85">{previewTone}</p>
            </div>
          </div>
          <p className="mt-4 rounded-md bg-black/15 px-3 py-2 text-[12.5px] leading-snug">
            Merhaba! {previewName}’den yazıyoruz. Bu hafta size özel bir teklifimiz var…
          </p>
        </div>
        <p className="bg-canvas px-3 py-2 text-[11.5px] text-ink-faint">
          Canlı önizleme — kaydetmeden önce nasıl görüneceğini buradan kontrol et.
        </p>
      </div>

      <form action={action} className="space-y-3.5">
        <Field
          label="İşletme / marka adı"
          hint="Müşterinin tanıdığı isim. Örn. Dönerci Ali, Filo Cafe"
        >
          <Input
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dönerci Ali"
            maxLength={80}
          />
        </Field>

        <Field
          label="Kısa slogan (isteğe bağlı)"
          hint="Tek cümle. Örn. 15 dakikada kapında · Mahallenin favorisi"
        >
          <Textarea
            name="tone"
            rows={2}
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            placeholder="Taze döner, hızlı servis"
            maxLength={160}
          />
        </Field>

        <Field label="Logo (isteğe bağlı)" hint="Kare PNG/JPG en iyisi. Yoksa baş harf kullanılır.">
          <div className="flex flex-wrap items-center gap-2">
            <FileUploadButton
              accept="image/png,image/jpeg,image/webp"
              uploading={uploading || pending}
              label={logoUrl ? 'Logoyu değiştir' : 'Logo yükle'}
              onFile={uploadLogo}
            />
            {logoUrl ? (
              <button
                type="button"
                className="text-[12.5px] text-ink-muted underline underline-offset-2"
                onClick={() => setLogoUrl(null)}
              >
                Kaldır
              </button>
            ) : null}
          </div>
          {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}
        </Field>
        <input type="hidden" name="logo_url" value={logoUrl ?? ''} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Ana renk" hint="Buton, başlık, dolu zemin">
            <div className="flex items-center gap-2">
              <Input
                name="primary"
                type="color"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <span className="font-mono text-[12px] text-ink-faint">{primary}</span>
            </div>
          </Field>
          <Field label="Vurgu rengi" hint="WhatsApp yeşili veya kendi rengin">
            <div className="flex items-center gap-2">
              <Input
                name="accent"
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 w-16 cursor-pointer p-1"
              />
              <span className="font-mono text-[12px] text-ink-faint">{accent}</span>
            </div>
          </Field>
        </div>

        <input type="hidden" name="secondary" value={DEFAULT_COLORS.secondary} />
        <input type="hidden" name="background" value={DEFAULT_COLORS.background} />
        <input type="hidden" name="text" value={DEFAULT_COLORS.text} />

        <Notice tone="accent">
          İleride Marka sayfasından şablon + AI arka plan ile kampanya görseli üretebilirsin. Şimdilik
          ad + renk (+ logo) yeterli.
        </Notice>

        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
        <Button type="submit" variant="accent" disabled={pending || uploading}>
          {pending ? 'Kaydediliyor…' : 'Markayı kaydet ve devam et'}
        </Button>
      </form>
    </div>
  )
}

export function OnboardingWizard({
  progress,
  orgId,
  orgName,
}: {
  progress: Progress
  orgId: string
  orgName: string
}) {
  const router = useRouter()
  const t = useT()
  const refresh = () => router.refresh()

  const stepMeta = useMemo(
    () =>
      [
        {
          key: 'brand' as SetupStepKey,
          title: '1 · Markanı kur',
          lead: 'Ad, renk, logo. Mesajların bu markayla gidecek.',
          icon: 'brand' as IconName,
        },
        {
          key: 'contacts' as SetupStepKey,
          title: '2 · Kişi grubu ekle',
          lead: 'Excel yükle veya numaraları yapıştır. Kampanyada bu grubu seçeceksin.',
          icon: 'people' as IconName,
        },
        {
          key: 'connected' as SetupStepKey,
          title: '3 · WhatsApp hattını bağla',
          lead: 'Telefondaki WhatsApp’tan QR okut. Mesajlar bu hattan gider.',
          icon: 'phone' as IconName,
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
          İlk kurulum · ~3 dakika
        </p>
        <h1 className="mt-1 text-[22px] font-extrabold tracking-[-0.03em] text-ink sm:text-[26px]">
          {active.title}
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">{active.lead}</p>
      </div>

      <Notice tone="accent">
        Üç adım: marka → kişiler → hat. Bitince Özet’ten tek tıkla kampanya açarsın. Numara
        doğrulama arka planda; ekstra ekran yok.
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
          {activeKey === 'brand' ? <BrandStep orgId={orgId} orgName={orgName} /> : null}

          {activeKey === 'contacts' ? (
            <div className="space-y-4">
              <HowTo
                title="Nasıl yapılır?"
                steps={[
                  'Gruba bir ad ver (ör. Mahalle müşterileri).',
                  'Excel (.xlsx / .csv) seç veya numaraları satır satır yapıştır.',
                  '0532… veya +90… olur. Telefon hangi sütundaysa bulunur.',
                  '“Grubu oluştur”a bas. Bu sayfa yenilenince adım tamamlanır.',
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
                  {t('setup.lineOk', { count: progress.counts.connectedCount })} Hazırsın —
                  kampanya açabilirsin.
                </Notice>
              ) : (
                <Notice tone="warn">
                  Henüz bağlı hat yok. QR okutulmadan kampanya gönderilemez.
                </Notice>
              )}
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
        Liste hazırlığı / scrape için bize yaz — senin işin bu üç adım.
      </p>
    </div>
  )
}
