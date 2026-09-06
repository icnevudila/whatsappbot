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
  Textarea,
} from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { appendOptOutFooter, OPT_OUT_FOOTER } from '@/lib/opt-out-footer'
import { createCampaign, type CampaignState } from './actions'

type Option = {
  id: string
  label: string
  detail?: string
  disabled?: boolean
  /** Tahmini numara sayısı (kampanya başında kuyruk satırı). */
  contactCount?: number
}
type MessageType = 'text' | 'image' | 'video'

const STEPS = [
  { id: 1, label: 'Ad' },
  { id: 2, label: 'Mesaj' },
  { id: 3, label: 'Kime' },
  { id: 4, label: 'Gönder' },
] as const

function typeFromMime(mime: string): 'image' | 'video' | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
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
  const [startMode, setStartMode] = useState<'draft' | 'now' | 'schedule'>('draft')
  const [scheduledAt, setScheduledAt] = useState('')
  const [stepHint, setStepHint] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const estimatedTargets = selectedLists.reduce((sum, id) => {
    const list = lists.find((item) => item.id === id)
    return sum + (list?.contactCount ?? 0)
  }, 0)

  useSyncBusy(pending, 'Kampanya kaydediliyor…')
  useEffect(() => {
    if (state?.error) {
      setFormError(state.error)
      toast(state.error, 'danger')
    }
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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  useSyncBusy(uploading, 'Medya yükleniyor…')

  const upload = async (file: File) => {
    setUploading(true)
    setUploadError(null)

    const detected = typeFromMime(file.type)
    if (!detected) {
      setUploading(false)
      setUploadError('Yalnızca görsel veya video yükleyin.')
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
    setMessageType('text')
    setUploadError(null)
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
        return { ok: false, hint: 'Mesaj yazın veya görsel ekleyin.' }
      }
      return { ok: true }
    }
    if (step === 3) {
      if (lists.length === 0) {
        return { ok: false, hint: 'Önce Kişiler’den bir grup oluşturun.' }
      }
      if (accounts.length === 0) {
        return { ok: false, hint: 'Önce Hesaplar’dan bir hat bağlayın.' }
      }
      if (selectedLists.length === 0) return { ok: false, hint: 'En az bir kişi grubu seçin.' }
      if (selectedAccounts.length === 0) return { ok: false, hint: 'En az bir hat seçin.' }
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
    setFormError(null)
    setStep((s) => Math.min(4, s + 1))
  }

  const goBack = () => {
    setStepHint(null)
    setFormError(null)
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
          subtitle="Dört adım: ad → mesaj → kime → gönder. Varsayılan taslak olarak kaydedilir."
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
                        setFormError(null)
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

        <form
          action={formAction}
          className="flex flex-col"
          onSubmit={(event) => {
            if (step < 4) {
              event.preventDefault()
              goNext()
            }
          }}
        >
          <input type="hidden" name="media_url" value={mediaUrl} />
          <input type="hidden" name="message_type" value={messageType} />
          <input type="hidden" name="min_delay" value="8" />
          <input type="hidden" name="max_delay" value="25" />
          <input type="hidden" name="daily_cap" value="100" />
          <input type="hidden" name="ab_percent" value="0" />
          <input type="hidden" name="body_b" value="" />
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
                  Bu kampanyayı listede tanımak için kısa bir ad yazın.
                </p>
                <Field label="Kampanya adı">
                  <Input
                    ref={nameInputRef}
                    name="name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value)
                      setFormError(null)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return
                      event.preventDefault()
                      goNext()
                    }}
                    placeholder="Örn. Ocak indirimi"
                    required
                    autoComplete="off"
                  />
                </Field>
              </div>
            ) : (
              <input type="hidden" name="name" value={name} />
            )}

            {step === 2 ? (
              <div className="space-y-4">
                <Field
                  label="Mesaj"
                  hint="{{ad}} kişi adıyla değişir. İstemiyorum / YAZMAYIN → gruptan çıkar."
                >
                  <Textarea
                    name="body"
                    rows={5}
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder={`Merhaba {{ad}}, bu ay %20 indirimimiz var.\n\n${OPT_OUT_FOOTER}`}
                  />
                </Field>

                <button
                  type="button"
                  onClick={() => setBody((current) => appendOptOutFooter(current))}
                  className="text-[12px] font-medium text-accent underline underline-offset-2"
                >
                  Çıkış satırı ekle
                </button>

                <AiWriter enabled={aiEnabled} brand={brandName} onApply={setBody} />

                <div className="space-y-3">
                  <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
                    Görsel veya video (isteğe bağlı)
                  </span>

                  <div className="flex flex-wrap items-center gap-3">
                    <FileUploadButton
                      accept="image/*,video/*"
                      uploading={uploading}
                      label="Dosya seç"
                      onFile={(file) => void upload(file)}
                    />

                    {mediaUrl ? (
                      <span className="flex items-center gap-2 text-[11.5px] text-accent">
                        {messageType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaUrl}
                            alt=""
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
                        Eklendi
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
                      setMediaUrl(url)
                      setMessageType('image')
                      setUploadError(null)
                    }}
                  />

                  {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}
                </div>

                {messageType === 'video' && mediaUrl ? (
                  <div className="rounded-md border border-hairline bg-canvas p-3">
                    <p className="mb-2 text-[11.5px] font-medium text-ink-faint">Önizleme</p>
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
                    ) : null}
                  </div>
                ) : (
                  <MessagePreview body={preview || undefined} mediaUrl={previewMediaForBubble} />
                )}
              </div>
            ) : (
              <input type="hidden" name="body" value={body} />
            )}

            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-[12.5px] leading-relaxed text-ink-muted">
                  Kimlere gidecek ve hangi WhatsApp hattından gidecek?
                </p>

                <CheckboxGroup
                  label="Kişi grupları"
                  options={lists}
                  selected={selectedLists}
                  onToggle={(id) => toggleId(id, selectedLists, setSelectedLists)}
                  empty={
                    <>
                      Önce{' '}
                      <Link href="/kisiler" className="font-medium underline underline-offset-2">
                        Kişiler
                      </Link>
                      ’den bir grup oluşturun (Excel veya numaraları yapıştırın).
                    </>
                  }
                />

                <CheckboxGroup
                  label="Gönderen hat"
                  options={accounts}
                  selected={selectedAccounts}
                  onToggle={(id) => toggleId(id, selectedAccounts, setSelectedAccounts)}
                  empty={
                    <>
                      Önce{' '}
                      <Link href="/hesaplar" className="font-medium underline underline-offset-2">
                        Hesaplar
                      </Link>
                      ’dan WhatsApp hattı bağlayın.
                    </>
                  }
                  hint="Birden fazla hat seçerseniz gönderim paylaşılır."
                />

                {selectedLists.length > 0 && estimatedTargets > 0 ? (
                  <Notice tone="warn">
                    Bu gruplar ~{estimatedTargets.toLocaleString('tr-TR')} numara. Kampanya
                    başlayınca aynı sayıda kuyruk satırı oluşur (önce hepsi hazırlanır, sonra
                    sırayla gönderilir). Aynı kişi deftere tekrar yazılmaz.
                  </Notice>
                ) : null}
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <div className="rounded-md border border-hairline bg-canvas px-3 py-2.5 text-[12.5px] text-ink-muted">
                  <p>
                    <span className="font-medium text-ink">{name || 'Adsız'}</span>
                    {' · '}
                    {selectedLists.length} grup · {selectedAccounts.length} hat
                    {estimatedTargets > 0
                      ? ` · ~${estimatedTargets.toLocaleString('tr-TR')} hedef`
                      : ''}
                    {mediaUrl ? ' · medya var' : ''}
                  </p>
                  {body ? (
                    <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-ink-faint">{body}</p>
                  ) : null}
                </div>

                {estimatedTargets > 0 ? (
                  <Notice tone="warn">
                    Başlatınca ~{estimatedTargets.toLocaleString('tr-TR')} satır kuyruk
                    materyalize edilir. Büyük listelerde ilk hazırlık birkaç saniye sürebilir.
                  </Notice>
                ) : null}

                <fieldset className="space-y-2 rounded-md border border-hairline px-3 py-3">
                  <legend className="px-1 text-[12px] font-medium text-ink-muted">Ne zaman?</legend>
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="radio"
                      name="start_mode"
                      value="draft"
                      checked={startMode === 'draft'}
                      onChange={() => setStartMode('draft')}
                      className="accent-accent"
                    />
                    Taslak kaydet — sonra başlatırım
                  </label>
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
                <input type="hidden" name="start_mode" value={startMode} />
                {scheduledAt ? (
                  <input type="hidden" name="scheduled_at" value={scheduledAt} />
                ) : null}
              </>
            )}
          </div>

          <div className="sticky bottom-0 z-[1] space-y-2.5 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur-sm">
            {formError ? <Notice tone="danger">{formError}</Notice> : null}
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
                  {pending
                    ? 'Kaydediliyor…'
                    : startMode === 'draft'
                      ? 'Taslak kaydet'
                      : startMode === 'schedule'
                        ? 'Zamanla kaydet'
                        : 'Oluştur ve gönder'}
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
