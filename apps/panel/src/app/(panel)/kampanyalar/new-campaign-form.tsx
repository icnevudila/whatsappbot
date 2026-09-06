'use client'
import Link from 'next/link'

import { useActionState, useEffect, useState, type ReactNode } from 'react'
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
  userId,
  aiEnabled,
  brandName,
}: {
  lists: Option[]
  accounts: Option[]
  userId: string
  aiEnabled: boolean
  brandName?: string
}) {
  const [state, formAction, pending] = useActionState<CampaignState, FormData>(
    createCampaign,
    null,
  )
  const toast = useToast()
  useSyncBusy(pending, 'Kampanya kaydediliyor…', 'Liste ve hatlar bağlanıyor')
  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
  }, [state?.error, toast])

  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [messageType, setMessageType] = useState<MessageType>('text')
  const [documentUrlDraft, setDocumentUrlDraft] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  useSyncBusy(uploading, 'Medya yükleniyor…')

  /**
   * Medya doğrudan tarayıcıdan Supabase Storage'a yükleniyor.
   * Yol kullanıcı kimliğiyle başlıyor: Storage politikası ilk klasör adının
   * auth.uid() olmasını şart koşuyor.
   */
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
      const path = `${userId}/${crypto.randomUUID()}.${extension}`

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

  return (
    <Card>
      <CardHeader
        title="Yeni kampanya"
        subtitle="Oluşturunca gönderim hemen başlar. Sekmeyi kapatabilirsiniz."
      />

      <form action={formAction} className="space-y-4 p-4">
        <input type="hidden" name="media_url" value={mediaUrl} />
        <input type="hidden" name="message_type" value={messageType} />

        <Field label="Kampanya adı">
          <Input name="name" placeholder="Ocak indirimi duyurusu" required />
        </Field>

        <Field
          label="Mesaj tipi"
          hint={
            mediaUrl
              ? 'Yüklenen dosya veya belge URL’sine göre seçilir; gerekirse değiştirebilirsiniz.'
              : 'Görsel/video yükleyin veya belge URL’si ekleyin; tip otomatik güncellenir.'
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
          hint="{{ad}} yazdığınız yere kişinin adı gelir. İsmi olmayan kişilerde boş kalır. Medyada başlık (caption) olarak gider."
        >
          <Textarea
            name="body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={'Merhaba {{ad}}, bu ay geçerli %20 indirimimizden haberdar etmek istedik.'}
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

          <Field
            label="Belge URL’si"
            hint="PDF veya başka bir dosya için herkese açık bir bağlantı yapıştırın. Yükleme yalnızca görsel/video içindir."
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

        {/* Önizleme: görsel balonda; video/belge ayrı satırda — MessagePreview yalnızca img destekliyor. */}
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
              <p className="mt-2 max-w-xs whitespace-pre-wrap text-[12.5px] text-ink">{preview}</p>
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
              <p className="mt-2 max-w-xs whitespace-pre-wrap text-[12.5px] text-ink">{preview}</p>
            ) : (
              <p className="mt-2 text-[12.5px] text-ink-faint">(yalnızca belge)</p>
            )}
          </div>
        ) : null}

        {messageType === 'text' || messageType === 'image' ? (
          <MessagePreview body={preview || undefined} mediaUrl={previewMediaForBubble} />
        ) : null}

        <CheckboxGroup
          name="lists"
          label="Kişi listeleri"
          options={lists}
          empty={
            <>
              Önce{' '}
              <Link href="/kisiler" className="font-medium underline underline-offset-2">
                Kişiler
              </Link>{' '}
              sekmesinden bir liste oluşturun. Tek seferlik için{' '}
              <Link href="/hizli-gonderim" className="font-medium underline underline-offset-2">
                Hızlı gönderim
              </Link>{' '}
              daha uygun.
            </>
          }
        />

        <CheckboxGroup
          name="accounts"
          label="Gönderen hatlar"
          options={accounts}
          empty={
            <>
              Önce{' '}
              <Link href="/hesaplar" className="font-medium underline underline-offset-2">
                Hesaplar
              </Link>{' '}
              üzerinden bir WhatsApp hattı bağlayın.
            </>
          }
          hint="Birden fazla hat seçerseniz gönderim aralarında paylaşılır; hat başına günlük kota ayrı işler."
        />

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
            Mesajlar arasında bekleme bu iki değer arasında rastgele seçilir. Çok kısa
            aralık hattı riske atar; yeni hatlarda günlük tavan otomatik düşük tutulur.
          </p>
        </details>

        <Field
          label="Mesaj B (A/B, isteğe bağlı)"
          hint="Spintax: {Merhaba|Selam} {{ad}}. A/B yüzdesi > 0 ise hedeflerin bir kısmı B alır."
        >
          <Textarea name="body_b" rows={3} placeholder="{Merhaba|Selam} {{ad}}, kampanyamız başladı…" />
        </Field>
        <Field label="A/B — B yüzdesi (0–100)">
          <Input name="ab_percent" type="number" min={0} max={100} defaultValue={0} />
        </Field>

        <fieldset className="space-y-2 rounded-md border border-hairline px-3 py-3">
          <legend className="px-1 text-[12px] font-medium text-ink-muted">Başlangıç</legend>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="radio" name="start_mode" value="now" defaultChecked className="accent-accent" />
            Hemen gönder
          </label>
          <label className="flex flex-wrap items-center gap-2 text-[13px]">
            <input type="radio" name="start_mode" value="schedule" className="accent-accent" />
            Zamanla
            <Input
              name="scheduled_at"
              type="datetime-local"
              className="max-w-[220px]"
            />
          </label>
          <p className="text-[11.5px] text-ink-faint">
            Zamanlanmış kampanya worker tarafından `scheduled_at` gelince otomatik başlar.
          </p>
        </fieldset>

        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}

        {lists.length === 0 || accounts.length === 0 ? (
          <p className="text-[11.5px] text-ink-faint">
            Gönderim için en az bir kişi listesi ve bir bağlı hat gerekir.
          </p>
        ) : null}

        <Button
          type="submit"
          variant="accent"
          disabled={pending || lists.length === 0 || accounts.length === 0}
        >
          {pending ? 'Kaydediliyor…' : 'Oluştur'}
        </Button>
      </form>
    </Card>
  )
}

function CheckboxGroup({
  name,
  label,
  options,
  empty,
  hint,
}: {
  name: string
  label: string
  options: Option[]
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
                name={name}
                value={option.id}
                disabled={option.disabled}
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
