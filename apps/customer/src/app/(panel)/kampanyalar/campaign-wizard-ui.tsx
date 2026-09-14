'use client'

import Link from 'next/link'
import { useEffect, useId, useRef, useState } from 'react'
import { AiImage } from '@/components/ai-image'
import { Icon } from '@/components/icon'
import { Button, Field, FileUploadButton, Notice, Textarea } from '@/components/ui'
import {
  CAMPAIGN_TONES,
  REWRITE_MORE,
  REWRITE_PRIMARY,
  type RewriteAction,
} from '@/lib/ai/campaign-message'
import type {
  AccountOption,
  CreativeOption,
  ListOption,
  WizardStepId,
} from './campaign-wizard-types'
import { WIZARD_STEPS, formatCount } from './campaign-wizard-types'
import { Stepper } from '@/components/stepper'

export function WizardStepper({
  current,
  onJump,
}: {
  current: WizardStepId
  onJump: (id: WizardStepId) => void
}) {
  return (
    <Stepper
      label="Kampanya adımları"
      steps={[...WIZARD_STEPS]}
      current={current}
      onJump={(id) => onJump(id as WizardStepId)}
      className="border-b border-hairline px-4 py-3 sm:px-5"
    />
  )
}

export function AudiencePicker({
  lists,
  selected,
  uniqueCount,
  counting,
  locked,
  onToggle,
}: {
  lists: ListOption[]
  selected: string[]
  uniqueCount: number | null
  counting: boolean
  locked?: boolean
  onToggle: (id: string) => void
}) {
  if (lists.length === 0) {
    return (
      <p className="rounded-md border border-hairline bg-canvas px-3 py-3 text-[13px] text-ink-muted">
        Önce{' '}
        <Link href="/kisiler" className="font-medium text-accent underline underline-offset-2">
          Kişiler
        </Link>
        ’den bir grup oluşturun.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {lists.map((list) => {
          const on = selected.includes(list.id)
          return (
            <label
              key={list.id}
              className={`flex min-h-12 cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 ${
                on ? 'border-accent bg-accent-soft/60' : 'border-hairline bg-canvas'
              } ${locked ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-accent)]"
                checked={on}
                disabled={locked}
                onChange={() => onToggle(list.id)}
              />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{list.label}</span>
                <span className="text-[12px] text-ink-faint">{list.detail}</span>
              </span>
            </label>
          )
        })}
      </div>
      {selected.length > 0 ? (
        <p className="rounded-md border border-accent/25 bg-accent-soft px-3 py-2 text-[13.5px] font-medium text-ink">
          {counting
            ? 'Alıcı sayısı hesaplanıyor…'
            : uniqueCount != null
              ? `Bu kampanya yaklaşık ${formatCount(uniqueCount)} kişiye gönderilecek.`
              : 'Grup seçildi.'}
        </p>
      ) : (
        <p className="text-[12.5px] text-ink-faint">En az bir grup seçin. Aynı kişi iki grupta olsa bile bir kez sayılır.</p>
      )}
    </div>
  )
}

export function SenderPicker({
  accounts,
  selected,
  locked,
  onToggle,
}: {
  accounts: AccountOption[]
  selected: string[]
  locked?: boolean
  onToggle: (id: string) => void
}) {
  const enabled = accounts.filter((account) => !account.disabled)
  const lockSingle = enabled.length === 1

  if (accounts.length === 0) {
    return (
      <p className="rounded-md border border-hairline bg-canvas px-3 py-3 text-[13px] text-ink-muted">
        Önce{' '}
        <Link href="/ayarlar/hatlar" className="font-medium text-accent underline underline-offset-2">
          Hatlar
        </Link>
        ’dan WhatsApp bağlayın.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {lockSingle ? (
        <p className="text-[12.5px] text-ink-faint">Bağlı tek hat var; gönderim bu numaradan gider.</p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {accounts.map((account) => {
          const on = selected.includes(account.id)
          const forceOn = lockSingle && enabled[0]?.id === account.id
          const frozen = locked || account.disabled || forceOn
          return (
            <label
              key={account.id}
              className={`flex min-h-14 items-start gap-2.5 rounded-md border px-3 py-2.5 ${
                account.disabled || locked ? 'cursor-not-allowed opacity-55' : forceOn ? 'cursor-default' : 'cursor-pointer'
              } ${on || forceOn ? 'border-accent bg-accent-soft/60' : 'border-hairline bg-canvas'}`}
            >
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--color-accent)]"
                checked={on || forceOn}
                disabled={frozen}
                onChange={() => onToggle(account.id)}
              />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-ink">{account.label}</span>
                <span className="block text-[12.5px] tabular text-ink-muted">{account.phone || 'Numara yok'}</span>
                <span className={`text-[11.5px] font-medium ${account.connected ? 'text-ok-dim' : 'text-warn'}`}>
                  ● {account.detail}
                </span>
              </span>
            </label>
          )
        })}
      </div>
      {selected.length > 1 ? (
        <p className="text-[12.5px] text-ink-faint">
          Birden fazla hat seçildiğinde gönderim hatlar arasında paylaşılır.
        </p>
      ) : null}
    </div>
  )
}

export function WaPreview({ body, mediaUrl }: { body: string; mediaUrl: string | null }) {
  const preview = body.replaceAll('{{ad}}', 'Ahmet').replaceAll('{{name}}', 'Ahmet')
  return (
    <div className="wb-wa-phone" style={{ width: 'min(100%, 320px)' }}>
      <p className="wb-wa-phone-label">WhatsApp önizleme</p>
      <div className="wb-wa-phone-screen" style={{ height: 580, minHeight: 580 }}>
        <div className="wb-wa-phone-top">
          <span className="wb-wa-phone-avatar" aria-hidden />
          <div>
            <p className="wb-wa-phone-name">Ahmet</p>
            <p className="wb-wa-phone-status">çevrimiçi</p>
          </div>
        </div>
        <div className="wb-wa-phone-thread">
          <div className="wb-wa-phone-bubble">
            {mediaUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mediaUrl} alt="" className="wb-wa-phone-media" />
            ) : null}
            <div className="wb-wa-phone-text">
              <p>{preview || <span style={{ color: 'rgba(0,0,0,0.4)' }}>Mesaj yazılmadı</span>}</p>
              <p className="wb-wa-phone-time">12:04</p>
            </div>
          </div>
        </div>
        <div className="wb-wa-phone-composer">
          <span className="wb-wa-phone-input" aria-hidden />
          <span className="wb-wa-phone-send" aria-hidden />
        </div>
      </div>
    </div>
  )
}

export function MediaPicker({
  orgId,
  mediaUrl,
  creatives,
  imageAiEnabled,
  brandName,
  brandKits,
  uploading,
  onUpload,
  onSelect,
  onClear,
}: {
  orgId: string
  mediaUrl: string
  creatives: CreativeOption[]
  imageAiEnabled: boolean
  brandName?: string
  brandKits: { id: string; name: string; isDefault: boolean }[]
  uploading: boolean
  onUpload: (file: File) => void
  onSelect: (url: string) => void
  onClear: () => void
}) {
  const [libraryOpen, setLibraryOpen] = useState(false)
  void orgId

  return (
    <div className="space-y-2">
      <p className="text-[13px] font-semibold text-ink-muted">Görsel ekle</p>
      <p className="text-[12.5px] text-ink-faint">İsteğe bağlı. Seçmezseniz yalnızca metin gider.</p>
      {mediaUrl ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-md border border-hairline bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl} alt="" className="block w-full max-h-[min(70dvh,32rem)] object-contain" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => setLibraryOpen(true)}>
              <Icon name="refresh" className="size-3.5" />
              Değiştir
            </Button>
            <Button type="button" onClick={onClear}>
              <Icon name="trash" className="size-3.5" />
              Kaldır
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <FileUploadButton
            accept="image/png,image/jpeg,image/webp,image/*"
            uploading={uploading}
            label="Dosya yükle"
            onFile={onUpload}
          />
          <Button type="button" onClick={() => setLibraryOpen(true)}>
            Görsel kütüphanesinden seç
          </Button>
        </div>
      )}
      <AiImage
        enabled={imageAiEnabled}
        brand={brandName}
        brandKits={brandKits}
        onApply={(url) => onSelect(url)}
      />
      {libraryOpen ? (
        <LibraryModal
          creatives={creatives}
          onClose={() => setLibraryOpen(false)}
          onSelect={(url) => {
            onSelect(url)
            setLibraryOpen(false)
          }}
          onUpload={onUpload}
          uploading={uploading}
        />
      ) : null}
    </div>
  )
}

function LibraryModal({
  creatives,
  onClose,
  onSelect,
  onUpload,
  uploading,
}: {
  creatives: CreativeOption[]
  onClose: () => void
  onSelect: (url: string) => void
  onUpload: (file: File) => void
  uploading: boolean
}) {
  const titleId = useId()
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="wb-modal-root">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="wb-modal-panel wb-modal-panel--wide" role="dialog" aria-labelledby={titleId}>
        <h2 id={titleId} className="wb-modal-title">
          Görsel kütüphanesi
        </h2>
        <p className="wb-modal-desc">Hazır bir görsel seçin veya yeni yükleyin.</p>
        <div className="mt-3">
          <FileUploadButton
            accept="image/png,image/jpeg,image/webp,image/*"
            uploading={uploading}
            label="Yeni görsel yükle"
            onFile={onUpload}
          />
        </div>
        {creatives.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-faint">Henüz kayıtlı görsel yok.</p>
        ) : (
          <div className="wb-modal-scroll mt-3 grid grid-cols-3 gap-2">
            {creatives.map((item) => (
              <button
                key={item.id}
                type="button"
                className="overflow-hidden rounded-md border border-hairline"
                onClick={() => onSelect(item.url)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        )}
        <div className="wb-modal-actions mt-4">
          <Button type="button" onClick={onClose}>
            Kapat
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AiWriteModal({
  open,
  onClose,
  defaultTone,
  initialBrief,
  onApply,
}: {
  open: boolean
  onClose: () => void
  defaultTone?: string
  initialBrief?: string
  onApply: (text: string) => void
}) {
  const titleId = useId()
  const [brief, setBrief] = useState('')
  const [tone, setTone] = useState(defaultTone && CAMPAIGN_TONES.some((t) => t.value === defaultTone) ? defaultTone : 'samimi')
  const [draft, setDraft] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setDraft(null)
      setError(null)
      setBusy(false)
      return
    }
    setBrief(initialBrief?.trim() ?? '')
  }, [open, initialBrief])

  const write = async () => {
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/mesaj-yaz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate', brief, tone }),
      })
      const json = (await response.json()) as { text?: string; error?: string }
      if (!response.ok) throw new Error(json.error ?? 'Metin üretilemedi.')
      setDraft(json.text ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Metin üretilemedi.')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="wb-modal-root">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="wb-modal-panel wb-modal-panel--wide" role="dialog" aria-labelledby={titleId}>
        <h2 id={titleId} className="wb-modal-title">
          AI ile yaz
        </h2>
        <p className="wb-modal-desc">Kampanyanızdan kısaca bahsedin. Fiyat veya tarih uydurulmaz.</p>
        <div className="mt-3 space-y-3">
          <Field label="Kampanyanızdan kısaca bahsedin">
            <Textarea
              rows={4}
              value={brief}
              onChange={(event) => setBrief(event.target.value)}
              placeholder="Erkek ayakkabılarında 15 Eylül'e kadar %30 indirim yapıyoruz. Müşterileri mağazamıza davet etmek istiyoruz."
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {CAMPAIGN_TONES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setTone(item.value)}
                className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                  tone === item.value ? 'bg-accent text-white' : 'bg-canvas text-ink-muted'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          {busy ? (
            <p className="rounded-md border border-hairline bg-canvas px-3 py-4 text-center text-[13px] text-ink-muted">
              Mesajınız hazırlanıyor...
            </p>
          ) : null}
          {error ? <Notice tone="danger">{error}</Notice> : null}
          {draft && !busy ? (
            <div className="space-y-2">
              <p className="text-[12px] font-medium text-ink-faint">Öneri</p>
              <p className="whitespace-pre-wrap rounded-md border border-hairline bg-canvas p-3 text-[13.5px]">{draft}</p>
            </div>
          ) : null}
        </div>
        <div className="wb-modal-actions mt-4 flex flex-wrap gap-2">
          {draft ? (
            <>
              <Button
                type="button"
                variant="accent"
                onClick={() => {
                  onApply(draft)
                  onClose()
                }}
              >
                Mesajı Kullan
              </Button>
              <Button type="button" disabled={busy || brief.trim().length < 8} onClick={() => void write()}>
                Tekrar Oluştur
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="accent"
              disabled={busy || brief.trim().length < 8}
              onClick={() => void write()}
            >
              Mesaj Oluştur
            </Button>
          )}
          <Button type="button" onClick={onClose}>
            İptal
          </Button>
        </div>
      </div>
    </div>
  )
}

export function AiRewriteBar({
  currentMessage,
  onApply,
}: {
  currentMessage: string
  onApply: (text: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [action, setAction] = useState<RewriteAction | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const run = async (next: RewriteAction) => {
    setOpen(false)
    setMore(false)
    setAction(next)
    setBusy(true)
    setError(null)
    try {
      const response = await fetch('/api/mesaj-yaz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'rewrite', currentMessage, action: next }),
      })
      const json = (await response.json()) as { text?: string; error?: string }
      if (!response.ok) throw new Error(json.error ?? 'İyileştirme başarısız.')
      setSuggestion(json.text ?? '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'İyileştirme başarısız.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="relative" ref={menuRef}>
        <Button type="button" disabled={!currentMessage.trim()} onClick={() => setOpen((value) => !value)}>
          <Icon name="tune" className="size-3.5" />
          AI ile İyileştir
        </Button>
        {open ? (
          <div className="absolute z-20 mt-1 w-[min(100%,280px)] rounded-md border border-hairline bg-surface p-1.5 shadow-[var(--shadow-md)]">
            {REWRITE_PRIMARY.map((item) => (
              <button
                key={item.value}
                type="button"
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[13px] hover:bg-canvas"
                onClick={() => void run(item.value)}
              >
                <span>{item.mark}</span>
                <span>{item.label}</span>
              </button>
            ))}
            <button
              type="button"
              className="mt-1 w-full rounded px-2 py-1.5 text-left text-[12.5px] font-medium text-ink-muted hover:bg-canvas"
              onClick={() => setMore((value) => !value)}
            >
              Daha fazla
            </button>
            {more
              ? REWRITE_MORE.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="flex w-full rounded px-2 py-1.5 text-left text-[13px] hover:bg-canvas"
                    onClick={() => void run(item.value)}
                  >
                    {item.label}
                  </button>
                ))
              : null}
          </div>
        ) : null}
      </div>

      {busy ? (
        <p className="rounded-md border border-hairline bg-canvas px-3 py-3 text-[13px] text-ink-muted">
          Mesajınız hazırlanıyor...
        </p>
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {suggestion && !busy ? (
        <div className="space-y-2 rounded-md border border-hairline p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11.5px] font-semibold text-ink-faint">MEVCUT MESAJ</p>
              <p className="whitespace-pre-wrap text-[12.5px] text-ink-muted">{currentMessage}</p>
            </div>
            <div>
              <p className="mb-1 text-[11.5px] font-semibold text-accent">AI ÖNERİSİ</p>
              <p className="whitespace-pre-wrap text-[12.5px] text-ink">{suggestion}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="accent"
              onClick={() => {
                onApply(suggestion)
                setSuggestion(null)
              }}
            >
              Uygula
            </Button>
            <Button type="button" disabled={!action} onClick={() => action && void run(action)}>
              Tekrar Oluştur
            </Button>
            <Button type="button" onClick={() => setSuggestion(null)}>
              Vazgeç
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES_60 = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

function splitScheduleValue(value: string) {
  const match = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(value.trim())
  if (!match) return { date: '', hour: '', minute: '' }
  return { date: match[1], hour: match[2], minute: match[3] }
}

function joinScheduleValue(date: string, hour: string, minute: string) {
  if (!date || !hour || !minute) return ''
  return `${date}T${hour}:${minute}`
}

function ScheduleAtInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const parts = splitScheduleValue(value)
  const hour = parts.hour || '09'
  const minute = parts.minute || '00'

  const emit = (nextDate: string, nextHour: string, nextMinute: string) => {
    onChange(joinScheduleValue(nextDate, nextHour, nextMinute))
  }

  const selectClass =
    'h-[43px] rounded-md border border-hairline-strong bg-surface px-2.5 text-[14px] text-ink tabular-nums focus:border-accent focus:outline-none'

  return (
    <div className="mt-3 space-y-1.5" lang="tr-TR">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="date"
          lang="tr-TR"
          className="h-[43px] min-w-[10.5rem] rounded-md border border-hairline-strong bg-surface px-3 text-[14px] text-ink focus:border-accent focus:outline-none"
          value={parts.date}
          onChange={(event) => emit(event.target.value, hour, minute)}
        />
        <span className="flex items-center gap-1" aria-label="Saat, 24 saat">
          <select
            aria-label="Saat"
            className={selectClass}
            value={hour}
            onChange={(event) => emit(parts.date, event.target.value, minute)}
          >
            {HOURS_24.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <span className="text-[14px] font-semibold text-ink-muted" aria-hidden>
            :
          </span>
          <select
            aria-label="Dakika"
            className={selectClass}
            value={minute}
            onChange={(event) => emit(parts.date, hour, event.target.value)}
          >
            {MINUTES_60.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </span>
      </div>
      <p className="text-[12px] text-ink-faint">Saat 24 saat formatında (00–23). Örn. 09:30 veya 21:45.</p>
    </div>
  )
}

export function PublishCards({
  mode,
  selected,
  onSelect,
  scheduledAt,
  onSchedule,
  uniqueCount,
  accountCount,
}: {
  mode: 'create' | 'edit'
  selected: 'draft' | 'schedule' | 'now'
  onSelect: (value: 'draft' | 'schedule' | 'now') => void
  scheduledAt: string
  onSchedule: (value: string) => void
  uniqueCount: number
  accountCount: number
}) {
  const cards: {
    id: 'draft' | 'schedule' | 'now'
    title: string
    body: string
    icon: 'file' | 'clock' | 'send'
    danger?: boolean
  }[] = [
    {
      id: 'draft',
      title: 'Taslak olarak kaydet',
      body: 'Daha sonra düzenleyip yayınlarsınız.',
      icon: 'file',
    },
    {
      id: 'schedule',
      title: 'Planla',
      body: 'Seçtiğiniz tarih ve saatte gönderim başlar.',
      icon: 'clock',
    },
    {
      id: 'now',
      title: 'Hemen gönderime başla',
      body:
        uniqueCount > 0
          ? `${formatCount(uniqueCount)} kişiye ${accountCount} hattan gönderilir.`
          : 'Kayıttan sonra gönderim hemen başlar.',
      icon: 'send',
      danger: true,
    },
  ]

  return (
    <div className="space-y-3">
      {mode === 'edit' ? (
        <p className="text-[12.5px] text-ink-muted">Değişiklikler kaydedilir. Gönderilmiş mesajlar değişmez.</p>
      ) : null}
      <div className="grid gap-2">
        {cards.map((card) => {
          const on = selected === card.id
          return (
            <label
              key={card.id}
              className={`block cursor-pointer rounded-md border px-3 py-3 ${
                on
                  ? card.danger
                    ? 'border-danger bg-danger/5'
                    : 'border-accent bg-accent-soft/70'
                  : 'border-hairline bg-canvas'
              }`}
            >
              <span className="flex items-start gap-2.5">
                <input
                  type="radio"
                  className="mt-2 accent-[var(--color-accent)]"
                  checked={on}
                  onChange={() => onSelect(card.id)}
                />
                <span
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md border ${
                    on
                      ? card.danger
                        ? 'border-danger/30 bg-danger/10 text-danger'
                        : 'border-accent/30 bg-accent-soft text-accent'
                      : 'border-hairline bg-surface text-ink-muted'
                  }`}
                >
                  <Icon name={card.icon} className="size-4" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold text-ink">{card.title}</span>
                  <span className="text-[12.5px] text-ink-muted">{card.body}</span>
                </span>
              </span>
              {card.id === 'schedule' && on ? (
                <ScheduleAtInput value={scheduledAt} onChange={onSchedule} />
              ) : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}

export function SummaryPills({
  items,
}: {
  items: { label: string; value: string; onEdit: () => void }[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onEdit}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-hairline bg-canvas py-1 pl-2.5 pr-2 text-left hover:border-accent/40 hover:bg-accent-soft/50"
        >
          <span className="shrink-0 text-[11px] font-medium text-ink-faint">{item.label}</span>
          <span className="min-w-0 truncate text-[12.5px] font-semibold text-ink">{item.value}</span>
          <Icon name="edit" className="size-3 shrink-0 text-accent" />
        </button>
      ))}
    </div>
  )
}
