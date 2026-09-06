'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button, Field, Input, Notice, Select } from '@/components/ui'

const STYLES = [
  { value: 'urun', label: 'Ürün / teklif' },
  { value: 'duyuru', label: 'Duyuru / indirim' },
  { value: 'minimal', label: 'Sade / minimal' },
  { value: 'fotograf', label: 'Gerçekçi foto' },
] as const

export type BrandKitOption = {
  id: string
  name: string
  isDefault: boolean
}

function pickDefaultKitId(kits: BrandKitOption[]): string {
  return kits.find((kit) => kit.isDefault)?.id ?? kits[0]?.id ?? ''
}

/**
 * Kampanya / hızlı gönderim için AI görsel üretimi.
 * Varsa marka kiti renk/ton/ad ile üretir; birden fazla kitte seçim sunar.
 */
export function AiImage({
  enabled,
  brandKits = [],
  brand,
  onApply,
}: {
  enabled: boolean
  brandKits?: BrandKitOption[]
  /** Kit yoksa yedek marka adı. */
  brand?: string
  onApply: (url: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState('')
  const [style, setStyle] = useState<string>('duyuru')
  const [brandKitId, setBrandKitId] = useState(() => pickDefaultKitId(brandKits))
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedKit = brandKits.find((kit) => kit.id === brandKitId)

  const generate = async () => {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/gorsel-uret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brief,
          style,
          brandKitId: brandKitId || null,
          brand: brandKitId ? undefined : brand,
        }),
      })

      const json = (await response.json()) as { url?: string; error?: string }
      if (!response.ok) throw new Error(json.error ?? `Hata ${response.status}`)
      if (!json.url) throw new Error('Görsel URL dönmedi.')

      setPreview(json.url)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Görsel üretilemedi.')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) {
    return (
      <p className="text-[11.5px] leading-relaxed text-ink-faint">
        Yapay zeka ile görsel üretme bu hesapta kapalı. Açılması için destekle iletişime geçin.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-medium text-accent underline underline-offset-2 hover:text-accent-dim"
      >
        Yapay zeka ile görsel üret
        {selectedKit ? ` · ${selectedKit.name}` : ''}
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-hairline bg-canvas p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-ink">Yapay zeka ile görsel üret</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11.5px] text-ink-muted hover:text-ink"
        >
          kapat
        </button>
      </div>

      {brandKits.length > 0 ? (
        <Field
          label="Marka kiti"
          hint={
            brandKits.length === 1
              ? 'Kayıtlı kitiniz renk ve ton için kullanılacak.'
              : 'Varsayılan kit seçili; isterseniz başka kit seçin.'
          }
        >
          <Select
            value={brandKitId}
            onChange={(event) => setBrandKitId(event.target.value)}
          >
            {brandKits.map((kit) => (
              <option key={kit.id} value={kit.id}>
                {kit.name}
                {kit.isDefault ? ' (varsayılan)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-[11.5px] leading-relaxed text-ink-faint">
          Marka kiti yok — genel üretim yapılır.{' '}
          <Link href="/marka-kiti" className="font-medium text-accent underline underline-offset-2">
            Marka kiti oluştur
          </Link>
          {brand ? ` · şimdilik “${brand}” adı kullanılıyor` : null}
        </p>
      )}

      <Field
        label="Ne çizilsin?"
        hint="Ürün, indirim veya atmosferi yazın. Metin balonda ayrı gider; görselde uzun yazı istemeyin."
      >
        <Input
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Kış montu, %30 indirim, sıcak mağaza vitrini"
        />
      </Field>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px]">
          <Field label="Stil">
            <Select value={style} onChange={(event) => setStyle(event.target.value)}>
              {STYLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button
          type="button"
          onClick={() => void generate()}
          disabled={busy || brief.trim().length < 8}
        >
          {busy ? 'Üretiliyor…' : preview ? 'Tekrar üret' : 'Üret'}
        </Button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {preview ? (
        <div className="space-y-2">
          <p className="text-[11.5px] font-medium text-ink-faint">Önizleme</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Üretilen kampanya görseli"
            className="max-h-56 w-full max-w-xs rounded-md border border-hairline object-cover"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="accent"
              onClick={() => {
                onApply(preview)
                setOpen(false)
              }}
            >
              Bunu kullan
            </Button>
            <Button type="button" onClick={() => void generate()} disabled={busy}>
              Başka bir tane
            </Button>
          </div>

          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            Üretim 10–40 sn sürebilir. OpenAI kotası biterse diğer sağlayıcılar denenir.
          </p>
        </div>
      ) : null}
    </div>
  )
}
