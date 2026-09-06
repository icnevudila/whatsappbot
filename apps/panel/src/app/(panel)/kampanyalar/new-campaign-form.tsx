'use client'
import Link from 'next/link'

import { useActionState, useEffect, useRef, useState, type ReactNode } from 'react'
import { AiImage, type BrandKitOption } from '@/components/ai-image'
import { AiWriter } from '@/components/ai-writer'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import {
  Button,
  Card,
  CardHeader,
  Field,
  FileUploadButton,
  Input,
  MessagePreview,
  Notice,
  Select,
  Textarea,
} from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { createCampaign, type CampaignState } from './actions'

type Option = { id: string; label: string; detail?: string; disabled?: boolean }
type MessageType = 'text' | 'image' | 'video' | 'document'

const STEPS = [
  { id: 1, label: 'Ad' },
  { id: 2, label: 'Mesaj' },
  { id: 3, label: 'Hedef' },
  { id: 4, label: 'Gönder' },
] as const

const MESSAGE_TYPE_LABELS: Record<MessageType, string> = {
  text: 'Metin',
  image: 'Görsel',
  video: 'Video',
  document: 'Belge',
}

function typeFromMime(mime: string): 'image' | 'video' | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

function looksLikeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function NewCampaignForm({
  lists,
  accounts,
  orgId,
  aiEnabled,
  imageAiEnabled,
  brandName,
  brandKits = [],
}: {
  lists: Option[]
  accounts: Option[]
  orgId: string
  aiEnabled: boolean
  imageAiEnabled: boolean
  brandName?: string
  brandKits?: BrandKitOption[]
}) {
  const [state, formAction, pending] = useActionState<CampaignState, FormData>(
    createCampaign,
    null,
  )
  const toast = useToast()
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [selectedLists, setSelectedLists] = useState<string[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [startMode, setStartMode] = useState<'now' | 'schedule'>('now')
  const [scheduledAt, setScheduledAt] = useState('')
  const [stepHint, setStepHint] = useState<string | null>(null)

  useSyncBusy(pending, 'Kampanya kaydediliyor…', 'Liste ve hatlar bağlanıyor')
  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
  }, [state?.error, toast])

  useEffect(() => {
    const focusForm = () => {
      if (window.location.hash !== '#yeni-kampanya') return
      document.getElementById('yeni-kampanya')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setStep(1)
      nameInputRef.current?.focus()
    }
    focusForm()
    window.addEventListener('hashchange', focusForm)
    return () => window.removeEventListener('hashchange', focusForm)
  }, [])

  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [messageType, setMessageType] = useState<MessageType>('text')
  const [documentUrlDraft, setDocumentUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  useSyncBusy(uploading, 'Medya yükleniyor…')

  const upload = async (file: File) => {
    setUploading(true)
    setUploadError(null)

    const detected = typeFromMime(file.type)
    if (!detected) {
      setUploading(false)
      setUploadError(
        'Yükleme yalnızca görsel veya video kabul eder. PDF vb. için aşağıya belge URL’si yapıştırın.',
      )
      return
    }

    try {
      const supabase = getSupabaseBrowserClient()
      const extension = file.name.split('.').pop() ?? 'bin'
      const path = `${orgId}/${crypto.randomUUID()}.${extension}`

      const { error } = await supabase.storage.from('creatives').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })

      if (error) throw error

      const { data } = supabase.storage.from('creatives').getPublicUrl(path)
      setDocumentUrlDraft('')
      setMediaUrl(data.publicUrl)
      setMessageType(detected)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Dosya yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const clearMedia = () => {
    setMediaUrl('')
    setDocumentUrlDraft('')
    setMessageType('text')
    setUploadError(null)
  }

  const applyDocumentUrl = (raw: string) => {
    const next = raw.trim()
    setDocumentUrlDraft(raw)
    setUploadError(null)

    if (!next) {
      setMediaUrl('')
      setMessageType('text')
      return
    }

    if (!looksLikeUrl(next)) {
      setUploadError('Belge adresi http:// veya https:// ile başlamalı.')
      setMediaUrl('')
      setMessageType('text')
      return
    }

    setMediaUrl(next)
    setMessageType('document')
  }

  const preview = body.replaceAll('{{ad}}', 'Ahmet').replaceAll('{{name}}', 'Ahmet')
  const previewMediaForBubble = messageType === 'image' ? mediaUrl || null : null

  const canGoNext = (): { ok: boolean; hint?: string } => {
    if (step === 1) {
      if (!name.trim()) return { ok: false, hint: 'Kampanyaya bir ad verin.' }
      return { ok: true }
    }
    if (step === 2) {
      if (!body.trim() && !mediaUrl) {
        return { ok: false, hint: 'Mesaj metni veya bir medya ekleyin.' }
      }
      return { ok: true }
    }
    if (step === 3) {
      if (lists.length === 0) {
        return { ok: false, hint: 'Önce Kişiler’den bir liste oluşturun.' }
      }
      if (accounts.length === 0) {
        return { ok: false, hint: 'Önce Hesaplar’dan bir hat bağlayın.' }
      }
      if (selectedLists.length === 0) return { ok: false, hint: 'En az bir kişi listesi seçin.' }
      if (selectedAccounts.length === 0) return { ok: false, hint: 'En az bir gönderen hat seçin.' }
      return { ok: true }
    }
    if (step === 4 && startMode === 'schedule' && !scheduledAt) {
      return { ok: false, hint: 'Zamanlama için tarih seçin.' }
    }
    return { ok: true }
  }

  const goNext = () => {
    const check = canGoNext()
    if (!check.ok) {
      setStepHint(check.hint ?? null)
      return
    }
    setStepHint(null)
    setStep((s) => Math.min(4, s + 1))
  }

  const goBack = () => {
    setStepHint(null)
    setStep((s) => Math.max(1, s - 1))
  }

  const toggleId = (
    id: string,
    selected: string[],
    setSelected: (next: string[]) => void,
  ) => {
    setSelected(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id])
  }

  return (
    <div id="yeni-kampanya" className="scroll-mt-6">
      <Card className="overflow-visible rounded-none border-0 shadow-none">
        <CardHeader
          title="Yeni kampanya"
          subtitle="Adım adım: ad → mesaj → hedef → gönder."
        />

        <nav aria-label="Kampanya adımları" className="border-b border-hairline px-4 py-3">
          <ol className="flex flex-wrap gap-1.5">
            {STEPS.map((item) => {
              const active = step === item.id
              const done = step > item.id
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (item.id < step) {
                        setStepHint(null)
                        setStep(item.id)
                      }
                    }}
                    disabled={item.id > step}
                    className={`rounded-md px-2.5 py-1 text-[12px] font-medium tabular ${
                      active
                        ? 'bg-accent text-white'
                        : done
                          ? 'bg-accent-soft text-accent'
                          : 'bg-canvas text-ink-faint'
                    } ${item.id < step ? 'cursor-pointer' : ''}`}
                  >
                    {item.id}. {item.label}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <form action={formAction} className="flex flex-col">
          <input type="hidden" name="media_url" value={mediaUrl} />
          <input type="hidden" name="message_type" value={messageType} />
          {selectedLists.map((id) => (
            <input key={`list-${id}`} type="hidden" name="lists" value={id} />
          ))}
          {selectedAccounts.map((id) => (
            <input key={`acc-${id}`} type="hidden" name="accounts" value={id} />
          ))}

          <div className="space-y-4 p-4">
            {step === 1 ? (
              <div className="space-y-3">
                <p className="text-[12.5px] leading-relaxed text-ink-muted">
                  Kampanyayı listede tanımak için kısa bir ad verin.
                </p>
                <Field label="Kampanya adı">
                  <Input
                    ref={nameInputRef}
                    name="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ocak indirimi duyurusu"
                    required
                  />
                </Field>
              </div>
            ) : (
              <input type="hidden" name="name" value={name} />
            )}

            {step === 2 ? (
              <div className="space-y-4">
                <p className="text-[12.5px] leading-relaxed text-ink-muted">
                  Alıcıya gidecek metni ve isteğe bağlı medyayı hazırlayın.
                </p>

                <Field
                  label="Mesaj tipi"
                  hint={
                    mediaUrl
                      ? 'Yüklenen dosya veya belge URL’sine göre seçilir.'
                      : 'Görsel/video yükleyin veya belge URL’si ekleyin.'
                  }
                >
                  <Select
                    value={messageType}
                    onChange={(event) => {
                      const next = event.target.value as MessageType
                      if (!mediaUrl && next !== 'text') return
                      if (mediaUrl && next === 'text') return
                      setMessageType(next)
                    }}
                  >
                    <option value="text" disabled={Boolean(mediaUrl)}>
                      Metin
                    </option>
                    <option value="image" disabled={!mediaUrl}>
                      Görsel
                    </option>
                    <option value="video" disabled={!mediaUrl}>
                      Video
                    </option>
                    <option value="document" disabled={!mediaUrl}>
                      Belge
                    </option>
                  </Select>
                </Field>

                <Field
                  label="Mesaj"
                  hint="{{ad}} yazdığınız yere kişinin adı gelir. Medyada başlık (caption) olarak gider."
                >
                  <Textarea
                    name="body"
                    rows={5}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={
                      'Merhaba {{ad}}, bu ay geçerli %20 indirimimizden haberdar etmek istedik.'
                    }
                  />
                </Field>

                <AiWriter enabled={aiEnabled} brand={brandName} onApply={setBody} />

                <div className="space-y-3">
                  <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
                    Medya (isteğe bağlı)
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    <FileUploadButton
                      accept="image/*,video/*"
                      uploading={uploading}
                      label="Görsel / video seç"
                      onFile={(file) => void upload(file)}
                    />

                    {mediaUrl && messageType !== 'document' ? (
                      <span className="flex items-center gap-2 text-[11.5px] text-accent">
                        {messageType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl}
                            alt="Kampanya medyası"
                            className="size-9 rounded border border-hairline object-cover"
                          />
                        ) : null}
                        {messageType === 'video' ? (
                          <video
                            src={mediaUrl}
                            className="size-9 rounded border border-hairline object-cover"
                            muted
                            playsInline
                            preload="metadata"
                          />
                        ) : null}
                        {MESSAGE_TYPE_LABELS[messageType]} hazır
                        <button
                          type="button"
                          onClick={clearMedia}
                          className="text-ink-muted underline underline-offset-2 hover:text-danger"
                        >
                          kaldır
                        </button>
                      </span>
                    ) : null}
                  </div>

                  <AiImage
                    enabled={imageAiEnabled}
                    brand={brandName}
                    brandKits={brandKits}
                    onApply={(url) => {
                      setDocumentUrlDraft('')
                      setMediaUrl(url)
                      setMessageType('image')
                      setUploadError(null)
                    }}
                  />

                  <Field
                    label="Belge URL’si"
                    hint="PDF vb. için herkese açık bağlantı. Yükleme yalnızca görsel/video."
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        value={documentUrlDraft}
                        onChange={(event) => applyDocumentUrl(event.target.value)}
                        placeholder="https://…/katalog.pdf"
                        inputMode="url"
                        autoComplete="off"
                      />
                      {documentUrlDraft ? (
                        <button
                          type="button"
                          onClick={clearMedia}
                          className="shrink-0 text-[11.5px] text-ink-muted underline underline-offset-2 hover:text-danger"
                        >
                          kaldır
                        </button>
                      ) : null}
                    </div>
                  </Field>

                  {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}
                </div>

                {messageType === 'video' && mediaUrl ? (
                  <div className="rounded-md border border-hairline bg-canvas p-3">
                    <p className="mb-2 text-[11.5px] font-medium text-ink-faint">Alıcının göreceği</p>
                    <video
                      src={mediaUrl}
                      controls
                      className="max-h-48 w-full max-w-xs rounded-lg border border-hairline"
                      preload="metadata"
                    />
                    {preview ? (
                      <p className="mt-2 max-w-xs whitespace-pre-wrap text-[12.5px] text-ink">
                        {preview}
                      </p>
                    ) : (
                      <p className="mt-2 text-[12.5px] text-ink-faint">(yalnızca video)</p>
                    )}
                  </div>
                ) : null}

                {messageType === 'document' && mediaUrl ? (
                  <div className="rounded-md border border-hairline bg-canvas p-3">
                    <p className="mb-2 text-[11.5px] font-medium text-ink-faint">Alıcının göreceği</p>
                    <a
                      href={mediaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block max-w-xs truncate text-[12.5px] text-accent underline underline-offset-2"
                    >
                      Belge: {mediaUrl}
                    </a>
                    {preview ? (
                      <p className="mt-2 max-w-xs whitespace-pre-wrap text-[12.5px] text-ink">
                        {preview}
                      </p>
                    ) : (
                      <p className="mt-2 text-[12.5px] text-ink-faint">(yalnızca belge)</p>
                    )}
                  </div>
                ) : null}

                {messageType === 'text' || messageType === 'image' ? (
                  <MessagePreview body={preview || undefined} mediaUrl={previewMediaForBubble} />
                ) : null}
              </div>
            ) : (
              <input type="hidden" name="body" value={body} />
            )}

            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-[12.5px] leading-relaxed text-ink-muted">
                  Kimlere gideceğini ve hangi hatlardan gönderileceğini seçin.
                </p>

                <CheckboxGroup
                  label="Kişi listeleri"
                  options={lists}
                  selected={selectedLists}
                  onToggle={(id) => toggleId(id, selectedLists, setSelectedLists)}
                  empty={
                    <>
                      Önce{' '}
                      <Link href="/kisiler" className="font-medium underline underline-offset-2">
                        Kişiler
                      </Link>{' '}
                      sekmesinden bir liste oluşturun. Tek seferlik için{' '}
                      <Link
                        href="/hizli-gonderim"
                        className="font-medium underline underline-offset-2"
                      >
                        Hızlı gönderim
                      </Link>{' '}
                      daha uygun.
                    </>
                  }
                />

                <CheckboxGroup
                  label="Gönderen hatlar"
                  options={accounts}
                  selected={selectedAccounts}
                  onToggle={(id) => toggleId(id, selectedAccounts, setSelectedAccounts)}
                  empty={
                    <>
                      Önce{' '}
                      <Link href="/hesaplar" className="font-medium underline underline-offset-2">
                        Hesaplar
                      </Link>{' '}
                      üzerinden bir WhatsApp hattı bağlayın.
                    </>
                  }
                  hint="Birden fazla hat seçerseniz gönderim aralarında paylaşılır."
                />
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <div className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-[12.5px] text-ink-muted">
                  <p>
                    <span className="font-medium text-ink">{name || 'Adsız'}</span>
                    {' · '}
                    {selectedLists.length} liste · {selectedAccounts.length} hat
                    {mediaUrl ? ` · ${MESSAGE_TYPE_LABELS[messageType]}` : ''}
                  </p>
                  {body ? (
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-ink-faint">{body}</p>
                  ) : null}
                </div>

                <details className="rounded-md border border-hairline px-3 py-2">
                  <summary className="cursor-pointer text-[12px] font-medium text-ink-muted">
                    Gelişmiş: bekleme ve günlük tavan
                  </summary>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    <Field label="En kısa (sn)">
                      <Input name="min_delay" type="number" min={3} max={600} defaultValue={8} />
                    </Field>
                    <Field label="En uzun (sn)">
                      <Input name="max_delay" type="number" min={3} max={900} defaultValue={25} />
                    </Field>
                    <Field label="Hat / gün">
                      <Input name="daily_cap" type="number" min={1} max={1000} defaultValue={100} />
                    </Field>
                  </div>
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">
                    Mesajlar arasında bekleme bu iki değer arasında rastgele seçilir.
                  </p>
                </details>

                <Field
                  label="Mesaj B (A/B, isteğe bağlı)"
                  hint="A/B yüzdesi > 0 ise hedeflerin bir kısmı B alır."
                >
                  <Textarea
                    name="body_b"
                    rows={3}
                    placeholder="{Merhaba|Selam} {{ad}}, kampanyamız başladı…"
                  />
                </Field>
                <Field label="A/B — B yüzdesi (0–100)">
                  <Input name="ab_percent" type="number" min={0} max={100} defaultValue={0} />
                </Field>

                <fieldset className="space-y-2 rounded-md border border-hairline px-3 py-3">
                  <legend className="px-1 text-[12px] font-medium text-ink-muted">Başlangıç</legend>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      name="start_mode"
                      value="now"
                      checked={startMode === 'now'}
                      onChange={() => setStartMode('now')}
                      className="accent-accent"
                    />
                    Hemen gönder
                  </label>
                  <label className="flex flex-wrap items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      name="start_mode"
                      value="schedule"
                      checked={startMode === 'schedule'}
                      onChange={() => setStartMode('schedule')}
                      className="accent-accent"
                    />
                    Zamanla
                    <Input
                      name="scheduled_at"
                      type="datetime-local"
                      className="max-w-[220px]"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      disabled={startMode !== 'schedule'}
                    />
                  </label>
                </fieldset>
              </div>
            ) : (
              <>
                <input type="hidden" name="min_delay" value="8" />
                <input type="hidden" name="max_delay" value="25" />
                <input type="hidden" name="daily_cap" value="100" />
                <input type="hidden" name="ab_percent" value="0" />
                <input type="hidden" name="start_mode" value={startMode} />
                {scheduledAt ? (
                  <input type="hidden" name="scheduled_at" value={scheduledAt} />
                ) : null}
              </>
            )}
          </div>

          <div className="sticky bottom-0 z-[1] space-y-2.5 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur-sm">
            {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
            {stepHint ? <Notice tone="warn">{stepHint}</Notice> : null}

            <div className="flex flex-wrap gap-2">
              {step > 1 ? (
                <Button type="button" disabled={pending} onClick={goBack}>
                  Geri
                </Button>
              ) : null}

              {step < 4 ? (
                <Button type="button" variant="accent" disabled={pending} onClick={goNext}>
                  İleri
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="accent"
                  disabled={
                    pending ||
                    lists.length === 0 ||
                    accounts.length === 0 ||
                    selectedLists.length === 0 ||
                    selectedAccounts.length === 0 ||
                    (startMode === 'schedule' && !scheduledAt)
                  }
                >
                  {pending ? 'Kaydediliyor…' : 'Oluştur ve gönder'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Card>
    </div>
  )
}

function CheckboxGroup({
  label,
  options,
  selected,
  onToggle,
  empty,
  hint,
}: {
  label: string
  options: Option[]
  selected: string[]
  onToggle: (id: string) => void
  empty: ReactNode
  hint?: string
}) {
  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">{label}</span>

      {options.length === 0 ? (
        <p className="rounded-md border border-hairline bg-canvas px-3 py-2 text-[12.5px] text-ink-faint">
          {empty}
        </p>
      ) : (
        <div className="divide-y divide-hairline rounded-md border border-hairline">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex min-h-11 items-center gap-2.5 px-3 py-2 ${
                option.disabled ? 'opacity-45' : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={selected.includes(option.id)}
                disabled={option.disabled}
                onChange={() => onToggle(option.id)}
                className="size-4 accent-[var(--color-accent)]"
              />
              <span className="min-w-0 flex-1 truncate text-[12.5px]">{option.label}</span>
              {option.detail ? (
                <span className="shrink-0 text-[11.5px] text-ink-faint tabular">
                  {option.detail}
                </span>
              ) : null}
            </label>
          ))}
        </div>
      )}

      {hint ? <p className="mt-1 text-[11.5px] text-ink-faint">{hint}</p> : null}
    </div>
  )
}
