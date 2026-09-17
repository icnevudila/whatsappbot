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
  brandTone,
  brandKits = [],
}: {
  lists: Option[]
  accounts: Option[]
  orgId: string
  aiEnabled: boolean
  imageAiEnabled: boolean
  brandName?: string
  brandTone?: string
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
  const [bodyB, setBodyB] = useState('')
  const [enableAb, setEnableAb] = useState(false)
  const [abPercent, setAbPercent] = useState(50)

  const [minDelay, setMinDelay] = useState(15)
  const [maxDelay, setMaxDelay] = useState(45)
  const [warmupProtection, setWarmupProtection] = useState(true)
  const [showAdvancedSecurity, setShowAdvancedSecurity] = useState(false)

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
      if (enableAb && !bodyB.trim()) {
        return { ok: false, hint: 'A/B testi aktifken Varyant B mesajını da yazmalısınız.' }
      }
      return { ok: true }
    }
    if (step === 3) {
      if (lists.length === 0) {
        return { ok: false, hint: 'Önce Kişiler’den bir grup oluşturun.' }
      }
      if (accounts.length === 0) {
        return { ok: false, hint: 'Önce Hatlar’dan bir hat bağlayın.' }
      }
      if (selectedLists.length === 0) return { ok: false, hint: 'En az bir kişi grubu seçin.' }
      if (selectedAccounts.length === 0) return { ok: false, hint: 'En az bir hat seçin.' }
      return { ok: true }
    }
    if (step === 4) {
      if (minDelay < 3) return { ok: false, hint: 'En kısa bekleme süresi en az 3 saniye olmalıdır.' }
      if (minDelay > maxDelay) return { ok: false, hint: 'En kısa bekleme süresi, en uzun süreden büyük olamaz.' }
      if (startMode === 'schedule' && !scheduledAt) {
        return { ok: false, hint: 'Zamanlama için tarih seçin.' }
      }
      return { ok: true }
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
          subtitle="Ad → mesaj → kime → gönder. Varsayılan: taslak."
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
          <input type="hidden" name="min_delay" value={minDelay} />
          <input type="hidden" name="max_delay" value={maxDelay} />
          <input type="hidden" name="daily_cap" value="100" />
          <input type="hidden" name="ab_percent" value={enableAb ? abPercent : 0} />
          <input type="hidden" name="body_b" value={enableAb ? bodyB : ''} />
          <input type="hidden" name="warmup_bypass" value={warmupProtection ? '0' : '1'} />
          {selectedLists.map((id) => (
            <input key={`list-${id}`} type="hidden" name="lists" value={id} />
          ))}
          {selectedAccounts.map((id) => (
            <input key={`acc-${id}`} type="hidden" name="accounts" value={id} />
          ))}

          <div className="space-y-4 p-4">
            {step === 1 ? (
              <div className="space-y-3">
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

                <AiWriter
                  enabled={aiEnabled}
                  brand={brandName}
                  defaultTone={brandTone}
                  onApply={setBody}
                />

                <div className="rounded-md border border-hairline bg-canvas px-3 py-2 text-[11.5px] text-ink-muted">
                  <span className="font-medium text-accent">Anti-Ban İpucu (Spintax):</span> Metninizde{' '}
                  <code className="rounded bg-surface px-1 py-0.5 font-mono text-ink text-[11px] border border-hairline">
                    {'{Merhaba|Selam|İyi günler}'}
                  </code>{' '}
                  yazarak her müşteriye otomatik olarak rastgele farklı kelimelerle mesaj gönderebilirsiniz.
                </div>

                <div className="rounded-lg border border-hairline bg-surface p-3.5 space-y-3">
                  <label className="flex items-center justify-between cursor-pointer select-none">
                    <div className="space-y-0.5">
                      <span className="text-[13px] font-medium text-ink">A/B Testi Uygula (Opsiyonel)</span>
                      <p className="text-[11.5px] text-ink-muted">
                        İkinci bir mesaj varyantı ekleyip kitlenizi ikiye bölerek hangi metnin daha etkili olduğunu ölçün.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={enableAb}
                      onChange={(e) => setEnableAb(e.target.checked)}
                      className="size-4 rounded accent-accent cursor-pointer ml-3"
                    />
                  </label>

                  {enableAb ? (
                    <div className="space-y-3 border-t border-hairline pt-3">
                      <Field
                        label="Varyant B Mesajı"
                        hint="Kitlenizin belirlenen yüzdesine bu mesaj varyantı iletilir."
                      >
                        <Textarea
                          name="body_b_input"
                          rows={4}
                          value={bodyB}
                          onChange={(event) => setBodyB(event.target.value)}
                          placeholder={`Alternatif mesaj metnini yazın...\n\n${OPT_OUT_FOOTER}`}
                        />
                      </Field>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[12px]">
                          <span className="text-ink-muted">Dağılım Oranı:</span>
                          <span className="font-semibold text-accent tabular">
                            Varyant A: %{100 - abPercent} · Varyant B: %{abPercent}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="90"
                          step="5"
                          value={abPercent}
                          onChange={(e) => setAbPercent(Number(e.target.value))}
                          className="w-full accent-accent cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>

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
                      ’den bir grup oluşturun.
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
                        Hatlar
                      </Link>
                      ’dan WhatsApp hattı bağlayın.
                    </>
                  }
                  hint="Birden fazla hat → gönderim paylaşılır."
                />

                {selectedLists.length > 0 && estimatedTargets > 0 ? (
                  <p className="text-[12px] text-ink-faint">
                    ~{estimatedTargets.toLocaleString('tr-TR')} hedef · başlayınca kuyruk
                    oluşur
                  </p>
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
                  <p className="text-[12px] text-ink-faint">
                    Başlatınca ~{estimatedTargets.toLocaleString('tr-TR')} satır kuyruk
                    hazırlanır.
                  </p>
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

                {/* Anti-Ban & Gönderim Güvenliği Ayarları */}
                <div className="rounded-md border border-hairline p-3 space-y-3 bg-surface">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-accent inline-block" />
                      <span className="text-[13px] font-medium text-ink">Anti-Ban ve Gönderim Güvenliği</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSecurity((prev) => !prev)}
                      className="text-[12px] font-medium text-accent hover:underline cursor-pointer"
                    >
                      {showAdvancedSecurity ? 'Kapat' : 'Özelleştir'}
                    </button>
                  </div>

                  <p className="text-[11.5px] text-ink-muted leading-relaxed">
                    Sistem her mesajdan önce doğal insan gibi <strong>&ldquo;yazıyor...&rdquo;</strong> simülasyonu yapar ve mesajları sabit aralıklarla değil, rastgele saniyelerle (Smart Drip) gönderir.
                  </p>

                  {showAdvancedSecurity ? (
                    <div className="space-y-3.5 border-t border-hairline pt-3">
                      {/* Smart Drip Delay Inputs */}
                      <div className="space-y-2">
                        <span className="text-[12px] font-medium text-ink block">
                          Smart Drip Gecikme Aralığı (Saniye)
                        </span>
                        <div className="grid grid-cols-2 gap-3">
                          <Field label="En Az (sn)">
                            <Input
                              type="number"
                              min={3}
                              max={120}
                              value={minDelay}
                              onChange={(e) => setMinDelay(Math.max(3, Number(e.target.value) || 3))}
                            />
                          </Field>
                          <Field label="En Çok (sn)">
                            <Input
                              type="number"
                              min={minDelay}
                              max={300}
                              value={maxDelay}
                              onChange={(e) => setMaxDelay(Math.max(minDelay, Number(e.target.value) || minDelay))}
                            />
                          </Field>
                        </div>
                        <p className="text-[11px] text-ink-faint">
                          Örn: 15–45 sn seçildiğinde her mesaj arasında 15 ile 45 saniye arasında rastgele beklenir.
                        </p>
                      </div>

                      {/* Warmup Protection Toggle */}
                      <div className="rounded border border-hairline bg-canvas p-2.5 space-y-1.5">
                        <label className="flex items-center justify-between cursor-pointer select-none">
                          <span className="text-[12.5px] font-medium text-ink">
                            Yeni Hat Isıtma (Warm-Up) Koruması
                          </span>
                          <input
                            type="checkbox"
                            checked={warmupProtection}
                            onChange={(e) => setWarmupProtection(e.target.checked)}
                            className="size-4 rounded accent-accent cursor-pointer ml-3"
                          />
                        </label>
                        <p className="text-[11px] text-ink-muted leading-relaxed">
                          {warmupProtection
                            ? 'Aktif: Yeni bağlanan hatların banlanmaması için günlük gönderim kotası kademeli (10 → 25 → 60 → 120) açılır.'
                            : 'Devre Dışı: Isıtma emniyeti kapatıldı. Günlük hesap sınırına kadar tam kapasite gönderim yapılır (eski/güvenli hatlar için uygundur).'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 text-[11px] text-ink-muted">
                      <span className="rounded bg-canvas px-2 py-0.5 border border-hairline">
                        Gecikme: {minDelay}–{maxDelay} sn rastgele
                      </span>
                      <span className="rounded bg-canvas px-2 py-0.5 border border-hairline">
                        Yazıyor... Simülasyonu: Aktif
                      </span>
                      <span className="rounded bg-canvas px-2 py-0.5 border border-hairline">
                        Isıtma Koruması: {warmupProtection ? 'Aktif' : 'Kapalı'}
                      </span>
                    </div>
                  )}
                </div>
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
