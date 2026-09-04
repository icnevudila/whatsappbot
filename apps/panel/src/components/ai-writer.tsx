'use client'

import { useState } from 'react'
import { Button, Field, Input, Notice, Select } from '@/components/ui'

const TONES = [
  { value: 'samimi', label: 'Samimi' },
  { value: 'resmi', label: 'Resmi' },
  { value: 'kısa ve net', label: 'Kısa ve net' },
  { value: 'heyecanlı kampanya dili', label: 'Heyecanlı' },
] as const

/**
 * Kampanya metnini yapay zekaya yazdırma paneli.
 * Üretilen metni doğrudan forma yazmıyor; önce önizleme gösteriyor.
 */
export function AiWriter({
  enabled,
  brand,
  onApply,
}: {
  enabled: boolean
  brand?: string
  onApply: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState('')
  const [tone, setTone] = useState<string>('samimi')
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const write = async () => {
    setBusy(true)
    setError(null)

    try {
      const response = await fetch('/api/mesaj-yaz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, brand, tone }),
      })

      const json = (await response.json()) as { text?: string; error?: string }
      if (!response.ok) throw new Error(json.error ?? `Hata ${response.status}`)

      setDraft(json.text ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Metin üretilemedi.')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) {
    return (
      <p className="text-[11.5px] leading-relaxed text-ink-faint">
        Yapay zeka ile metin yazdırmak için sunucuya{' '}
        <code className="text-ink-muted">OPENAI_API_KEY</code> veya{' '}
        <code className="text-ink-muted">GEMINI_API_KEY</code> ekleyin.
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
        Yapay zeka ile yazdır
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-hairline bg-canvas p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-ink">Yapay zeka ile yazdır</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11.5px] text-ink-muted hover:text-ink"
        >
          kapat
        </button>
      </div>

      <Field
        label="Ne duyurmak istiyorsunuz?"
        hint="Tek cümle yeterli. İndirim oranı, tarih, ürün gibi somut bilgileri yazın."
      >
        <Input
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Ocak sonuna kadar tüm kış montlarında yüzde 30 indirim"
        />
      </Field>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px]">
          <Field label="Ton">
            <Select value={tone} onChange={(event) => setTone(event.target.value)}>
              {TONES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button
          type="button"
          onClick={() => void write()}
          disabled={busy || brief.trim().length < 8}
        >
          {busy ? 'Yazılıyor…' : draft ? 'Tekrar yaz' : 'Yaz'}
        </Button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {draft ? (
        <div className="space-y-2">
          <p className="text-[11.5px] font-medium text-ink-faint">Öneri</p>
          <p className="rounded-md border border-hairline bg-surface p-3 text-[12.5px] leading-relaxed whitespace-pre-wrap text-ink">
            {draft}
          </p>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="accent"
              onClick={() => {
                onApply(draft)
                setOpen(false)
              }}
            >
              Bunu kullan
            </Button>
            <Button type="button" onClick={() => void write()} disabled={busy}>
              Başka bir tane
            </Button>
          </div>

          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            Göndermeden önce okuyun. Metin binlerce kişiye gidiyor; şikayet oranı
            doğrudan hattın kilitlenmesine yol açıyor.
          </p>
        </div>
      ) : null}
    </div>
  )
}
