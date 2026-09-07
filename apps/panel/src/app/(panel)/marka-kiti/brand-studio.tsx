'use client'

import { useActionState, useEffect, useState } from 'react'
import {
  AccentLink,
  Button,
  Card,
  CardHeader,
  Field,
  FileUploadButton,
  InlineHint,
  Input,
  Notice,
  QuietLink,
  Textarea,
} from '@/components/ui'
import { useToast } from '@/components/toast'
import { useSyncBusy } from '@/components/busy'
import {
  DEFAULT_COLORS,
  FORMATS,
  suggestBackgroundPrompt,
  TEMPLATES,
  type BrandColors,
  type CreativeInput,
  type FormatKey,
  type TemplateKey,
} from '@/lib/creative-templates'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { saveBrandKit, type BrandKitState } from './actions'
import { CreativePreview } from './creative-preview'

const PRIMARY_COLOR_FIELDS: { key: keyof BrandColors; label: string; hint: string }[] = [
  { key: 'primary', label: 'Ana renk', hint: 'Dolu zeminler, güçlü alanlar' },
  { key: 'accent', label: 'Vurgu', hint: 'Rozet, çerçeve, alt başlık' },
]

const EXTRA_COLOR_FIELDS: { key: keyof BrandColors; label: string; hint: string }[] = [
  { key: 'background', label: 'Zemin', hint: 'Açık alanlar' },
  { key: 'text', label: 'Metin', hint: 'Açık zeminde başlık' },
  { key: 'secondary', label: 'İkincil metin', hint: 'Alt başlık' },
]

const ALL_COLOR_FIELDS = [...PRIMARY_COLOR_FIELDS, ...EXTRA_COLOR_FIELDS]

const TEMPLATE_COPY: Record<TemplateKey, { label: string; hint: string }> = {
  bold: { label: 'Tam zemin', hint: 'Marka renginde dolu zemin, büyük başlık' },
  split: { label: 'Bölünmüş', hint: 'Solda renk bloğu, sağda metin' },
  frame: { label: 'Çerçeve', hint: 'İnce çerçeve, ortalanmış metin' },
  photo: { label: 'AI arka plan', hint: 'Yapay zeka görseli üzerine marka metni' },
}

function ColorRow({
  field,
  value,
  disabled,
  onChange,
}: {
  field: { key: keyof BrandColors; label: string; hint: string }
  value: string
  disabled?: boolean
  onChange: (key: keyof BrandColors, next: string) => void
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <input
        type="color"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="size-6 shrink-0 cursor-pointer rounded border border-hairline-strong bg-transparent disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={field.label}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12.5px]">{field.label}</span>
        <span className="block text-[11px] text-ink-faint">{field.hint}</span>
      </span>
      <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">{value}</span>
    </div>
  )
}

export function BrandStudio({
  initialName,
  initialColors,
  initialLogoUrl,
  initialTone = '',
  brandKitId,
  orgId,
  hasSavedKit = false,
  canEdit = true,
}: {
  initialName: string
  initialColors: BrandColors
  initialLogoUrl: string | null
  initialTone?: string
  brandKitId: string | null
  orgId: string
  hasSavedKit?: boolean
  canEdit?: boolean
}) {
  const toast = useToast()
  const [state, formAction, saving] = useActionState<BrandKitState, FormData>(
    saveBrandKit,
    null,
  )
  useSyncBusy(saving, 'Marka kaydediliyor…')

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) toast(state.ok, 'success')
  }, [state?.error, state?.ok, toast])

  const [colors, setColors] = useState<BrandColors>(initialColors)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [uploading, setUploading] = useState(false)

  const [template, setTemplate] = useState<TemplateKey>('bold')
  const [format, setFormat] = useState<FormatKey>('square')
  const [headline, setHeadline] = useState('')
  const [subline, setSubline] = useState('')
  const [badge, setBadge] = useState('')
  const [backgroundPrompt, setBackgroundPrompt] = useState('')

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const setColor = (key: keyof BrandColors, next: string) => {
    if (!canEdit) return
    setColors((current) => ({ ...current, [key]: next }))
  }

  const uploadLogo = async (file: File) => {
    if (!canEdit) return
    setUploading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const extension = file.name.split('.').pop() ?? 'png'
      const path = `${orgId}/logo-${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('creatives')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('creatives').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
      toast('Logo yüklendi. Kaydetmeyi unutmayın.', 'accent')
    } catch (uploadError) {
      const msg = uploadError instanceof Error ? uploadError.message : 'Logo yüklenemedi.'
      setError(msg)
      toast(msg, 'danger')
    } finally {
      setUploading(false)
    }
  }

  const input: CreativeInput = {
    template,
    format,
    headline,
    subline,
    badge,
    colors,
    logoUrl,
    backgroundPrompt,
    backgroundUrl: null,
  }

  const generate = async () => {
    if (!canEdit) return
    setGenerating(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/kreatif', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...input, brandKitId }),
      })

      const data = (await response.json()) as { url?: string; error?: string }
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Görsel üretilemedi.')

      setResult(data.url)
      toast('Görsel üretildi.', 'success')
    } catch (generateError) {
      const msg =
        generateError instanceof Error ? generateError.message : 'Görsel üretilemedi.'
      setError(msg)
      toast(msg, 'danger')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="space-y-2.5">
      {/* A — Kimlik */}
      <Card lift className="filo-fade-in">
        <CardHeader
          title="Kimlik"
          subtitle={
            hasSavedKit
              ? 'Kayıtlı ad, renk ve logo kampanya AI’sında kullanılır.'
              : 'Ad ve ana renk yeterli. Zorunlu değil; kaydedince AI metin/görselde geçer.'
          }
        />

        <form action={formAction} className="space-y-3 p-3.5">
          <input type="hidden" name="logo_url" value={logoUrl ?? ''} />
          {ALL_COLOR_FIELDS.map((field) => (
            <input key={field.key} type="hidden" name={field.key} value={colors[field.key]} />
          ))}

          <Field label="Marka adı" hint="AI metinlerinde ve görsellerde görünür ad.">
            <Input
              name="name"
              defaultValue={initialName}
              placeholder="Örn. Demo Dönerci"
              disabled={!canEdit}
              required
            />
          </Field>

          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Logo</span>
            {logoUrl ? (
              <div className="flex flex-wrap items-center gap-3">
                {canEdit ? (
                  <FileUploadButton
                    accept="image/png,image/jpeg,image/webp"
                    uploading={uploading}
                    label="Değiştir"
                    onFile={(file) => void uploadLogo(file)}
                  />
                ) : null}
                <span className="flex items-center gap-2 text-[11.5px] text-ink-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="size-9 rounded border border-hairline bg-white object-contain p-0.5"
                  />
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="underline underline-offset-2 hover:text-danger"
                    >
                      Kaldır
                    </button>
                  ) : null}
                </span>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-hairline bg-canvas px-3 py-3.5">
                <p className="text-[12.5px] text-ink-muted">
                  Logo yok — şablonlar renk ve metinle çizilir.
                </p>
                {canEdit ? (
                  <div className="mt-2.5">
                    <FileUploadButton
                      accept="image/png,image/jpeg,image/webp"
                      uploading={uploading}
                      label="Logo seç"
                      onFile={(file) => void uploadLogo(file)}
                    />
                    <p className="mt-2 text-[11.5px] text-ink-faint">
                      Saydam PNG en iyi sonucu verir.
                    </p>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div>
            <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Renkler</span>
            <div className="divide-y divide-hairline rounded-md border border-hairline">
              {PRIMARY_COLOR_FIELDS.map((field) => (
                <ColorRow
                  key={field.key}
                  field={field}
                  value={colors[field.key]}
                  disabled={!canEdit}
                  onChange={setColor}
                />
              ))}
            </div>
            <details className="mt-2 rounded-md border border-hairline bg-canvas open:bg-surface">
              <summary className="cursor-pointer list-none px-3 py-2 text-[12.5px] font-medium text-ink-muted marker:content-none [&::-webkit-details-marker]:hidden">
                Diğer renkler
                <span className="ml-2 font-normal text-ink-faint">zemin · metin · ikincil</span>
              </summary>
              <div className="divide-y divide-hairline border-t border-hairline">
                {EXTRA_COLOR_FIELDS.map((field) => (
                  <ColorRow
                    key={field.key}
                    field={field}
                    value={colors[field.key]}
                    disabled={!canEdit}
                    onChange={setColor}
                  />
                ))}
              </div>
            </details>
            {canEdit ? (
              <button
                type="button"
                onClick={() => setColors(DEFAULT_COLORS)}
                className="mt-1.5 text-[11.5px] text-ink-faint underline underline-offset-2 hover:text-ink-muted"
              >
                Varsayılanlara dön
              </button>
            ) : null}
          </div>

          <Field
            label="Yazım tonu"
            hint="Kampanya AI metin ve görselinde varsayılan dil. Kısa tutun."
          >
            <Textarea
              name="tone"
              defaultValue={initialTone}
              rows={2}
              disabled={!canEdit}
              placeholder="Örn. Samimi, kısa ve net; abartısız."
              maxLength={160}
            />
          </Field>

          {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
          {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

          {canEdit ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" variant="accent" disabled={saving}>
                {saving ? 'Kaydediliyor…' : hasSavedKit ? 'Değişiklikleri kaydet' : 'Markayı kaydet'}
              </Button>
              <p className="text-[11.5px] text-ink-faint">
                Kaydetmeden stüdyoda önizleme yapılabilir; kalıcılık için kaydedin.
              </p>
            </div>
          ) : (
            <Notice tone="warn">
              Markayı yalnızca sahip veya yönetici kaydedebilir. Görüntüleme açık.
            </Notice>
          )}
        </form>
      </Card>

      <InlineHint href="/kampanyalar" cta="Kampanyalar">
        Bu ad, renkler ve ton; kampanya ile tek numara gönderiminde AI yazı/görselde kullanılır.
      </InlineHint>

      {/* B — Stüdyo + önizleme */}
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <Card>
          <div id="kampanya-gorseli" className="scroll-mt-6">
            <CardHeader
              title="Kampanya görseli"
              subtitle="İsteğe bağlı · şablon PNG. Başlık yazıp üretin; gönderimde kullanın."
            />
          </div>

          <div className="space-y-2.5 p-3.5">
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Şablon</span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => {
                  const copy = TEMPLATE_COPY[key]
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => setTemplate(key)}
                      className={`rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-50 ${
                        template === key
                          ? 'border-accent/40 bg-accent-soft'
                          : 'border-hairline bg-canvas hover:border-hairline-strong'
                      }`}
                    >
                      <span className="block text-[12.5px] font-medium text-ink">
                        {copy.label}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-ink-faint">{copy.hint}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Ölçü</span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(FORMATS) as FormatKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setFormat(key)}
                    className={`h-8 rounded-md border px-3 text-[12.5px] font-medium transition-colors disabled:opacity-50 ${
                      format === key
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-hairline-strong bg-surface-raised text-ink-muted hover:text-ink'
                    }`}
                  >
                    {FORMATS[key].label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Başlık" hint="Görseldeki ana satır. Kısa tutun.">
              <Input
                value={headline}
                disabled={!canEdit}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Örn. Bahar indirimi başladı"
              />
            </Field>

            <Field label="Alt başlık" hint="İsteğe bağlı.">
              <Input
                value={subline}
                disabled={!canEdit}
                onChange={(event) => setSubline(event.target.value)}
                placeholder="Örn. Tüm ürünlerde geçerli"
              />
            </Field>

            <Field label="Rozet" hint="İsteğe bağlı · iki-üç kelime.">
              <Input
                value={badge}
                disabled={!canEdit}
                onChange={(event) => setBadge(event.target.value)}
                placeholder="Örn. %20 indirim"
              />
            </Field>

            {template === 'photo' ? (
              <div className="rounded-md border border-hairline bg-canvas p-3">
                <Field
                  label="AI arka plan istemi"
                  hint="Boş bırakırsanız başlıktan üretilir. İngilizce daha iyi sonuç verir."
                >
                  <Input
                    value={backgroundPrompt}
                    disabled={!canEdit}
                    onChange={(event) => setBackgroundPrompt(event.target.value)}
                    placeholder={
                      headline.trim()
                        ? suggestBackgroundPrompt(headline).slice(0, 56) + '…'
                        : 'Örn. soft studio product photography…'
                    }
                  />
                </Field>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                  Arka plan ayrı üretilir; başlık ve logo üzerine biner. 10–40 sn sürebilir.
                </p>
              </div>
            ) : null}

            {error ? <Notice tone="danger">{error}</Notice> : null}

            <div className="flex flex-wrap items-center gap-3">
              {canEdit ? (
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => void generate()}
                  disabled={generating || !headline.trim()}
                >
                  {generating
                    ? template === 'photo'
                      ? 'AI görseli üretiliyor…'
                      : 'Üretiliyor…'
                    : template === 'photo'
                      ? 'AI ile üret'
                      : 'Görseli üret'}
                </Button>
              ) : null}

              {result ? (
                <>
                  <AccentLink
                    href={`/kampanyalar?media=${encodeURIComponent(result)}#hizli`}
                  >
                    Gönderimde kullan
                  </AccentLink>
                  <a
                    href={result}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] text-ink-muted underline underline-offset-2 hover:text-ink"
                  >
                    Tam boyut aç
                  </a>
                </>
              ) : canEdit ? (
                <p className="text-[11.5px] text-ink-faint">
                  {headline.trim()
                    ? 'Sağdaki önizleme ile aynı yerleşim üretilir.'
                    : 'Başlık girince üret açılır.'}
                </p>
              ) : null}
            </div>
          </div>
        </Card>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader
              title="Önizleme"
              action={
                <span className="tabular text-[11.5px] text-ink-faint">
                  {FORMATS[format].width}&times;{FORMATS[format].height}
                </span>
              }
            />
            <div className="flex flex-col items-center gap-2.5 p-3.5">
              <CreativePreview input={input} />

              {result ? (
                <div className="w-full border-t border-hairline pt-3">
                  <p className="mb-2 text-[11.5px] font-medium text-accent">Üretilen görsel</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result}
                    alt="Üretilen kampanya görseli"
                    className="w-full rounded border border-hairline"
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <AccentLink
                      href={`/kampanyalar?media=${encodeURIComponent(result)}#hizli`}
                      className="text-[12.5px]"
                    >
                      Gönderimde kullan
                    </AccentLink>
                    <QuietLink href="/kampanyalar" className="text-[12.5px]">
                      Kampanyalar
                    </QuietLink>
                  </div>
                </div>
              ) : (
                <p className="text-center text-[11.5px] leading-relaxed text-ink-faint">
                  Canlı yerleşim. Üretilen PNG aynı ölçünün yüksek çözünürlüklü hali.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
