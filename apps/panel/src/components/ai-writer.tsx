'use client'

import { useState } from 'react'
import { Button, Field, Input, Notice, Select } from '@/components/ui'

const TONES = [
  { value: 'samimi', label: 'Samimi' },
  { value: 'resmi', label: 'Resmi' },
  { value: 'kisa ve net', label: 'Kisa ve net' },
  { value: 'heyecanli kampanya dili', label: 'Heyecanli' },
] as const

/**
 * Kampanya metnini yapay zekaya yazdirma paneli.
 *
 * Uretilen metni dogrudan forma YAZMIYOR, once onizleme olarak gosteriyor.
 * Nedeni: bu metin binlerce kisiye gidiyor ve modelin urettigi her cikti
 * gonderilebilir kalitede olmuyor. Kullanicinin okuyup onaylamasi ya da
 * tekrar uretmesi gereken bir adim olmali.
 */
export function AiWriter({
  enabled,
  brand,
  onApply,
}: {
  /** Sunucuda OPENAI_API_KEY veya GEMINI_API_KEY var mi? */
  enabled: boolean
  /** Marka adi varsa modele veriliyor, metnin basina koysun diye. */
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
      setError(cause instanceof Error ? cause.message : 'Metin uretilemedi.')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) {
    return (
      <p className="text-[11.5px] leading-relaxed text-ink-faint">
        Yapay zeka ile metin yazdirmak icin sunucuya{' '}
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
        Yapay zeka ile yazdir
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-hairline bg-canvas p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-ink">Yapay zeka ile yazdir</p>
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
        hint="Tek cumle yeterli. Indirim orani, tarih, urun gibi somut bilgileri yazin."
      >
        <Input
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Ocak sonuna kadar tum kis montlarinda yuzde 30 indirim"
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
          {busy ? 'Yaziliyor...' : draft ? 'Tekrar yaz' : 'Yaz'}
        </Button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {draft ? (
        <div className="space-y-2">
          <p className="text-[11.5px] font-medium text-ink-faint">Oneri</p>
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
              Baska bir tane
            </Button>
          </div>

          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            Gondermeden once okuyun. Metin binlerce kisiye gidiyor; sikayet orani
            dogrudan hattin kilitlenmesine yol aciyor.
          </p>
        </div>
      ) : null}
    </div>
  )
}
