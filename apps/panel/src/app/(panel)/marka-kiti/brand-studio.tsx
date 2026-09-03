'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Button, Card, CardHeader, Field, Input, Notice } from '@/components/ui'
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

const COLOR_FIELDS: { key: keyof BrandColors; label: string; hint: string }[] = [
  { key: 'primary', label: 'Ana renk', hint: 'Dolu zeminler' },
  { key: 'accent', label: 'Vurgu', hint: 'Rozet, cerceve, alt baslik' },
  { key: 'background', label: 'Zemin', hint: 'Acik alanlar ve metin ustu' },
  { key: 'text', label: 'Metin', hint: 'Acik zeminde baslik' },
  { key: 'secondary', label: 'Ikincil metin', hint: 'Alt baslik' },
]

export function BrandStudio({
  initialName,
  initialColors,
  initialLogoUrl,
  brandKitId,
  userId,
}: {
  initialName: string
  initialColors: BrandColors
  initialLogoUrl: string | null
  brandKitId: string | null
  userId: string
}) {
  const [state, formAction, saving] = useActionState<BrandKitState, FormData>(
    saveBrandKit,
    null,
  )

  const [colors, setColors] = useState<BrandColors>(initialColors)
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl)
  const [uploading, setUploading] = useState(false)

  const [template, setTemplate] = useState<TemplateKey>('bold')
  const [format, setFormat] = useState<FormatKey>('square')
  const [headline, setHeadline] = useState('Bahar indirimi basladi')
  const [subline, setSubline] = useState('Tum urunlerde 30 Nisan\u2019a kadar gecerli')
  const [badge, setBadge] = useState('%20 indirim')
  const [backgroundPrompt, setBackgroundPrompt] = useState('')

  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadLogo = async (file: File) => {
    setUploading(true)
    setError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const extension = file.name.split('.').pop() ?? 'png'
      const path = `${userId}/logo-${crypto.randomUUID()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('creatives')
        .upload(path, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('creatives').getPublicUrl(path)
      setLogoUrl(data.publicUrl)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Logo yuklenemedi.')
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
    // Onizleme arka planini bilerek bos birakiyoruz: uretilen PNG metni zaten
    // icinde tasiyor, onu arka plan olarak koymak basligi iki kez cizerdi.
    // AI arka plani ancak uretim aninda olustugu icin burada yalnizca
    // yerlesim gosteriliyor.
    backgroundUrl: null,
  }

  const generate = async () => {
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
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Gorsel uretilemedi.')

      setResult(data.url)
    } catch (generateError) {
      setError(
        generateError instanceof Error ? generateError.message : 'Gorsel uretilemedi.',
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="flex flex-col gap-4">
        {/* Marka kiti */}
        <Card>
          <CardHeader
            title="Marka kiti"
            subtitle="Renkler ve logo tum sablonlarda kullanilir."
          />

          <form action={formAction} className="space-y-4 p-4">
            <input type="hidden" name="logo_url" value={logoUrl ?? ''} />
            {COLOR_FIELDS.map((field) => (
              <input
                key={field.key}
                type="hidden"
                name={field.key}
                value={colors[field.key]}
              />
            ))}

            <Field label="Kit adi">
              <Input name="name" defaultValue={initialName} placeholder="Varsayilan" />
            </Field>

            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
                Renkler
              </span>
              <div className="divide-y divide-hairline rounded-md border border-hairline">
                {COLOR_FIELDS.map((field) => (
                  <div key={field.key} className="flex items-center gap-3 px-3 py-2">
                    <input
                      type="color"
                      value={colors[field.key]}
                      onChange={(event) =>
                        setColors((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                      className="size-6 shrink-0 cursor-pointer rounded border border-hairline-strong bg-transparent"
                      aria-label={field.label}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px]">{field.label}</span>
                      <span className="block text-[11px] text-ink-faint">
                        {field.hint}
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[11.5px] text-ink-faint">
                      {colors[field.key]}
                    </span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setColors(DEFAULT_COLORS)}
                className="mt-1.5 text-[11.5px] text-ink-faint underline underline-offset-2 hover:text-ink-muted"
              >
                Varsayilanlara don
              </button>
            </div>

            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
                Logo
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer rounded-md border border-hairline-strong bg-surface-raised px-3 py-1.5 text-[12.5px] transition-colors hover:border-ink-faint">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) void uploadLogo(file)
                    }}
                  />
                  {uploading ? 'Yukleniyor...' : logoUrl ? 'Degistir' : 'Logo sec'}
                </label>

                {logoUrl ? (
                  <span className="flex items-center gap-2 text-[11.5px] text-ink-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt="Logo"
                      className="size-8 rounded border border-hairline bg-white object-contain p-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="underline underline-offset-2 hover:text-danger"
                    >
                      kaldir
                    </button>
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[11.5px] text-ink-faint">
                Saydam zeminli PNG en iyi sonucu verir.
              </p>
            </div>

            {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
            {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

            <Button type="submit" variant="quiet" disabled={saving}>
              {saving ? 'Kaydediliyor...' : 'Marka kitini kaydet'}
            </Button>
          </form>
        </Card>

        {/* Kreatif */}
        <Card>
          <CardHeader
            title="Kampanya gorseli"
            subtitle="Metni yazin, sablonu secin; gorsel sunucuda uretilir."
          />

          <div className="space-y-4 p-4">
            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
                Sablon
              </span>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.keys(TEMPLATES) as TemplateKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTemplate(key)}
                    className={`rounded-md border px-3 py-2 text-left transition-colors ${
                      template === key
                        ? 'border-accent/40 bg-accent/10'
                        : 'border-hairline-strong bg-surface-raised hover:border-ink-faint'
                    }`}
                  >
                    <span
                      className={`block text-[12.5px] font-medium ${
                        template === key ? 'text-accent' : 'text-ink'
                      }`}
                    >
                      {TEMPLATES[key].label}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-ink-faint">
                      {TEMPLATES[key].hint}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
                Olcu
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(FORMATS) as FormatKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFormat(key)}
                    className={`h-8 rounded-md border px-3 text-[12.5px] font-medium transition-colors ${
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

            <Field label="Baslik">
              <Input
                value={headline}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Bahar indirimi basladi"
              />
            </Field>

            <Field label="Alt baslik">
              <Input
                value={subline}
                onChange={(event) => setSubline(event.target.value)}
                placeholder="Tum urunlerde gecerli"
              />
            </Field>

            <Field label="Rozet" hint="Kisa tutun: iki-uc kelime.">
              <Input
                value={badge}
                onChange={(event) => setBadge(event.target.value)}
                placeholder="%20 indirim"
              />
            </Field>

            {template === 'photo' ? (
              <div className="rounded-md border border-hairline bg-canvas p-3">
                <Field
                  label="AI arka plan istemi"
                  hint="Bos birakirsaniz basliktan otomatik uretilir. Ingilizce yazmak daha iyi sonuc veriyor."
                >
                  <Input
                    value={backgroundPrompt}
                    onChange={(event) => setBackgroundPrompt(event.target.value)}
                    placeholder={suggestBackgroundPrompt(headline).slice(0, 60)}
                  />
                </Field>
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                  Arka plan Pollinations.ai ile ucretsiz uretiliyor; anahtar veya
                  kart gerekmiyor. Baslik ve logo AI&apos;a yazdirilmiyor, uzerine
                  ayrica biniyor: uretilen yazi ozellikle Turkce karakterlerde
                  bozuk cikiyor. Uretim 10-40 saniye surebilir ve anonim
                  kullanimda 15 saniyede bir istek siniri var.
                </p>
              </div>
            ) : null}

            {error ? <Notice tone="danger">{error}</Notice> : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="accent"
                onClick={() => void generate()}
                disabled={generating || !headline.trim()}
              >
                {generating
                  ? template === 'photo'
                    ? 'AI gorseli uretiliyor...'
                    : 'Uretiliyor...'
                  : template === 'photo'
                    ? 'AI ile uret'
                    : 'Gorseli uret'}
              </Button>

              {result ? (
                <>
                  <Link
                    href="/hizli-gonderim"
                    className="text-[12.5px] text-accent underline underline-offset-2"
                  >
                    Hizli gonderimde kullan
                  </Link>
                  <a
                    href={result}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12.5px] text-ink-muted underline underline-offset-2 hover:text-ink"
                  >
                    Tam boyut ac
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </Card>
      </div>

      {/* Onizleme */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader
            title="Onizleme"
            action={
              <span className="text-[11.5px] text-ink-faint">
                {FORMATS[format].width}&times;{FORMATS[format].height}
              </span>
            }
          />
          <div className="flex flex-col items-center gap-3 p-4">
            <CreativePreview input={input} />

            {result ? (
              <div className="w-full border-t border-hairline pt-3">
                <p className="mb-2 text-[11.5px] font-medium text-accent">
                  Uretilen gorsel
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result}
                  alt="Uretilen kampanya gorseli"
                  className="w-full rounded border border-hairline"
                />
              </div>
            ) : (
              <p className="text-center text-[11.5px] text-ink-faint">
                Onizleme sunucudaki sablonla ayni olculeri kullaniyor; uretilen
                gorsel bunun yuksek cozunurluklu hali olur.
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
