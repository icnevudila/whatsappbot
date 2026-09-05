'use client'

import { useActionState, useMemo, useState } from 'react'
import Link from 'next/link'
import { parsePhoneList } from '@wa/shared'
import { AiWriter } from '@/components/ai-writer'
import {
  Button,
  Card,
  CardHeader,
  FileUploadButton,
  MessagePreview,
  Notice,
  Textarea,
} from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { quickSend, type QuickSendState } from './actions'

export type SenderOption = {
  id: string
  label: string
  phone: string | null
  remainingToday: number
}

type MessageType = 'text' | 'image' | 'video'

const MESSAGE_TYPE_LABELS: Record<Exclude<MessageType, 'text'>, string> = {
  image: 'Görsel',
  video: 'Video',
}

function typeFromMime(mime: string): 'image' | 'video' | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

function guessMediaType(url: string): 'image' | 'video' {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (/\.(mp4|webm|mov|m4v)$/.test(path)) return 'video'
  return 'image'
}

const nf = new Intl.NumberFormat('tr-TR')

export function QuickSendForm({
  senders,
  userId,
  aiEnabled,
  brandName,
  initialMediaUrl = '',
  initialNumbers = '',
}: {
  senders: SenderOption[]
  userId: string
  aiEnabled: boolean
  brandName?: string
  initialMediaUrl?: string
  initialNumbers?: string
}) {
  const [state, formAction, pending] = useActionState<QuickSendState, FormData>(
    quickSend,
    null,
  )

  const [numbers, setNumbers] = useState(initialNumbers)
  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState(initialMediaUrl)
  const [messageType, setMessageType] = useState<MessageType>(() =>
    initialMediaUrl ? guessMediaType(initialMediaUrl) : 'text',
  )
  const [selected, setSelected] = useState<string[]>(() => senders.map((s) => s.id))
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Yapıştırılan metni anlık ayrıştırıyoruz: kaç numaranın geçerli olduğunu
  // gönderime basmadan önce görmek, en sık yapılan format hatasını yakalıyor.
  const parsed = useMemo(() => (numbers.trim() ? parsePhoneList(numbers) : null), [numbers])

  const validCount = parsed?.valid.length ?? 0
  const capacityToday = senders
    .filter((sender) => selected.includes(sender.id))
    .reduce((total, sender) => total + sender.remainingToday, 0)

  const overflow = Math.max(0, validCount - capacityToday)

  const clearMedia = () => {
    setMediaUrl('')
    setMessageType('text')
    setUploadError(null)
  }

  const upload = async (file: File) => {
    setUploading(true)
    setUploadError(null)

    const detected = typeFromMime(file.type)
    if (!detected) {
      setUploading(false)
      setUploadError('Yalnızca görsel veya video yükleyebilirsiniz. PDF için Kampanyalar’daki belge URL’sini kullanın.')
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
      setMediaUrl(data.publicUrl)
      setMessageType(detected)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Dosya yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const preview = body.replaceAll('{{ad}}', 'Ahmet').replaceAll('{{name}}', 'Ahmet')
  const previewMediaForBubble = messageType === 'image' ? mediaUrl || null : null

  return (
    <Card>
      <CardHeader
        title="Tek seferlik gönderim"
        subtitle="Listeye kaydetmez. Gönderim Kampanyalar’da izlenir; Kişiler defterine numara eklenmez."
      />

      <form action={formAction} className="space-y-5 p-4">
        <input type="hidden" name="media_url" value={mediaUrl} />
        <input type="hidden" name="message_type" value={messageType} />

        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-medium text-ink-muted">Numaralar</span>
            {parsed ? (
              <span className="tabular text-[11.5px] text-ink-faint">
                <span className="text-accent">{nf.format(validCount)} geçerli</span>
                {parsed.duplicates > 0 ? ` · ${parsed.duplicates} tekrar` : ''}
                {parsed.invalid.length > 0 ? ` · ${parsed.invalid.length} hatalı` : ''}
              </span>
            ) : null}
          </div>

          <Textarea
            name="numbers"
            rows={6}
            value={numbers}
            onChange={(event) => setNumbers(event.target.value)}
            placeholder={'0532 123 45 67\n0533 234 56 78, Ayşe\n+90 534 345 67 89'}
          />
          <p className="mt-1 text-[11.5px] text-ink-faint">
            Her satıra bir numara. Virgülden sonra isim yazarsanız mesajda{' '}
            <code className="text-ink-muted">{'{{ad}}'}</code> yerine geçer. Boşluk,
            tire veya parantez kullanabilirsiniz.
          </p>

          {parsed && parsed.invalid.length > 0 ? (
            <p className="mt-1.5 text-[11.5px] text-warn">
              Okunamayan örnekler: {parsed.invalid.slice(0, 3).join(', ')}
            </p>
          ) : null}
        </div>

        <div className="space-y-2.5">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Mesaj</span>
          <Textarea
            name="body"
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={'Merhaba {{ad}}, bu ay geçerli %20 indirimimizden haberdar etmek istedik.'}
          />
          <AiWriter enabled={aiEnabled} brand={brandName} onApply={setBody} />
        </div>

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

            {mediaUrl ? (
              <span className="flex items-center gap-2 text-[11.5px] text-accent">
                {messageType === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaUrl}
                    alt="Gönderim görseli"
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
                {MESSAGE_TYPE_LABELS[messageType === 'text' ? 'image' : messageType]} hazır
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
              <p className="mt-2 max-w-xs whitespace-pre-wrap text-[12.5px] text-ink">{preview}</p>
            ) : (
              <p className="mt-2 text-[12.5px] text-ink-faint">(yalnızca video)</p>
            )}
          </div>
        ) : (
          <MessagePreview body={preview || undefined} mediaUrl={previewMediaForBubble} />
        )}

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Gönderen hatlar
          </span>

          {senders.length === 0 ? (
            <p className="rounded-md border border-hairline bg-canvas px-3 py-2 text-[12.5px] text-ink-faint">
              Bağlı hat yok. Önce{' '}
              <Link href="/hesaplar" className="font-medium text-ink underline underline-offset-2">
                Hesaplar
              </Link>{' '}
              üzerinden bir WhatsApp hattı bağlayın.
            </p>
          ) : (
            <div className="divide-y divide-hairline rounded-md border border-hairline">
              {senders.map((sender) => (
                <label
                  key={sender.id}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    name="accounts"
                    value={sender.id}
                    checked={selected.includes(sender.id)}
                    onChange={(event) =>
                      setSelected((previous) =>
                        event.target.checked
                          ? [...previous, sender.id]
                          : previous.filter((id) => id !== sender.id),
                      )
                    }
                    className="size-4 accent-[var(--color-accent)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px]">{sender.label}</span>
                    {sender.phone ? (
                      <span className="block font-mono text-[11px] text-ink-faint">
                        {sender.phone}
                      </span>
                    ) : null}
                  </span>
                  <span className="tabular shrink-0 text-[11.5px] text-ink-faint">
                    bugün {nf.format(sender.remainingToday)} hak
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {validCount > 0 && selected.length > 0 ? (
          overflow > 0 ? (
            <Notice tone="warn">
              Bugün {nf.format(capacityToday)} mesaj gönderilebilir. Kalan{' '}
              {nf.format(overflow)} kişi kuyrukta bekler; kota yenilendikçe otomatik
              devam eder. Daha hızlı bitirmek için{' '}
              <Link href="/hesaplar" className="font-medium underline underline-offset-2">
                ek hat bağlayın
              </Link>
              .
            </Notice>
          ) : (
            <Notice tone="accent">
              {nf.format(validCount)} kişinin tamamı bugünkü kapasiteye sığıyor.
            </Notice>
          )
        ) : null}

        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            variant="accent"
            disabled={pending || senders.length === 0 || validCount === 0}
          >
            {pending
              ? 'Başlatılıyor…'
              : validCount > 0
                ? `${nf.format(validCount)} kişiye gönder`
                : 'Gönder'}
          </Button>
          <p className="text-[11.5px] text-ink-faint">
            Gönderim sunucuda çalışır; bu sekmeyi kapatabilirsiniz. İlerlemeyi{' '}
            <Link href="/kampanyalar" className="underline underline-offset-2 hover:text-ink">
              Kampanyalar
            </Link>{' '}
            veya{' '}
            <Link href="/durum" className="underline underline-offset-2 hover:text-ink">
              Durum
            </Link>{' '}
            sayfasından izleyin.
          </p>
        </div>
      </form>
    </Card>
  )
}
