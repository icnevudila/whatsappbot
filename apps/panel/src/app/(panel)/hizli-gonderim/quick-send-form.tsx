'use client'

import { useActionState, useMemo, useState } from 'react'
import { parsePhoneList } from '@wa/shared'
import { AiWriter } from '@/components/ai-writer'
import { Button, Card, CardHeader, FileUploadButton, MessagePreview, Notice, Textarea } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { quickSend, type QuickSendState } from './actions'

export type SenderOption = {
  id: string
  label: string
  phone: string | null
  remainingToday: number
}

const nf = new Intl.NumberFormat('tr-TR')

export function QuickSendForm({
  senders,
  userId,
  aiEnabled,
  brandName,
  initialMediaUrl = '',
}: {
  senders: SenderOption[]
  userId: string
  aiEnabled: boolean
  brandName?: string
  initialMediaUrl?: string
}) {
  const [state, formAction, pending] = useActionState<QuickSendState, FormData>(
    quickSend,
    null,
  )

  const [numbers, setNumbers] = useState('')
  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState(initialMediaUrl)
  const [selected, setSelected] = useState<string[]>(() => senders.map((s) => s.id))
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Yapistirilan metni anlik ayristiriyoruz: kac numaranin gecerli oldugunu
  // gonderime basmadan once gormek, en sik yapilan format hatasini yakaliyor.
  const parsed = useMemo(() => (numbers.trim() ? parsePhoneList(numbers) : null), [numbers])

  const validCount = parsed?.valid.length ?? 0
  const capacityToday = senders
    .filter((sender) => selected.includes(sender.id))
    .reduce((total, sender) => total + sender.remainingToday, 0)

  const overflow = Math.max(0, validCount - capacityToday)

  const upload = async (file: File) => {
    setUploading(true)
    setUploadError(null)

    try {
      const supabase = getSupabaseBrowserClient()
      const extension = file.name.split('.').pop() ?? 'jpg'
      const path = `${userId}/${crypto.randomUUID()}.${extension}`

      const { error } = await supabase.storage.from('creatives').upload(path, file, {
        contentType: file.type,
        upsert: false,
      })
      if (error) throw error

      const { data } = supabase.storage.from('creatives').getPublicUrl(path)
      setMediaUrl(data.publicUrl)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Gorsel yuklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const preview = body.replaceAll('{{ad}}', 'Ahmet').replaceAll('{{name}}', 'Ahmet')

  return (
    <Card>
      <CardHeader
        title="Tek seferlik gonderim"
        subtitle="Listeye kaydetmez. Gonderim Kampanyalar'da izlenir; Kisiler sayfasina yeni liste eklenmez."
      />

      <form action={formAction} className="space-y-5 p-4">
        <input type="hidden" name="media_url" value={mediaUrl} />

        {/* 1 — Numaralar */}
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="text-[12px] font-medium text-ink-muted">Numaralar</span>
            {parsed ? (
              <span className="tabular text-[11.5px] text-ink-faint">
                <span className="text-accent">{nf.format(validCount)} gecerli</span>
                {parsed.duplicates > 0 ? ` · ${parsed.duplicates} tekrar` : ''}
                {parsed.invalid.length > 0 ? ` · ${parsed.invalid.length} hatali` : ''}
              </span>
            ) : null}
          </div>

          <Textarea
            name="numbers"
            rows={6}
            value={numbers}
            onChange={(event) => setNumbers(event.target.value)}
            placeholder={'0532 123 45 67\n0533 234 56 78, Ayse\n+90 534 345 67 89'}
          />
          <p className="mt-1 text-[11.5px] text-ink-faint">
            Her satira bir numara. Virgulden sonra isim yazarsaniz mesajda{' '}
            <code className="text-ink-muted">{'{{ad}}'}</code> yerine gecer. Bosluk,
            tire, parantez fark etmez.
          </p>

          {parsed && parsed.invalid.length > 0 ? (
            <p className="mt-1.5 text-[11.5px] text-warn">
              Okunamayan ornekler: {parsed.invalid.slice(0, 3).join(', ')}
            </p>
          ) : null}
        </div>

        {/* 2 — Mesaj */}
        <div className="space-y-2.5">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">Mesaj</span>
          <Textarea
            name="body"
            rows={4}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={'Merhaba {{ad}}, bu ay gecerli %20 indirimimizden haberdar etmek istedik.'}
          />
          <AiWriter enabled={aiEnabled} brand={brandName} onApply={setBody} />
        </div>

        {/* 3 — Gorsel */}
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Gorsel (istege bagli)
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <FileUploadButton
              uploading={uploading}
              label="Gorsel sec"
              onFile={(file) => void upload(file)}
            />

            {mediaUrl ? (
              <span className="flex items-center gap-2 text-[11.5px] text-accent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl}
                  alt="Kampanya gorseli"
                  className="size-9 rounded border border-hairline object-cover"
                />
                Gorsel hazir
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="text-ink-muted underline underline-offset-2 hover:text-danger"
                >
                  kaldir
                </button>
              </span>
            ) : null}
          </div>

          {uploadError ? (
            <div className="mt-2">
              <Notice tone="danger">{uploadError}</Notice>
            </div>
          ) : null}
        </div>

        {/* Onizleme */}
        <MessagePreview body={preview || undefined} mediaUrl={mediaUrl || null} />

        {/* 4 — Hatlar */}
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Gonderen hatlar
          </span>

          {senders.length === 0 ? (
            <p className="rounded-md border border-hairline bg-canvas px-3 py-2 text-[12.5px] text-ink-faint">
              Bagli hat yok. Once Hesaplar sekmesinden bir hat baglayin.
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
                    bugun {nf.format(sender.remainingToday)} hak
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Kapasite uyarisi — gonderimden once beklenti kuruyor */}
        {validCount > 0 && selected.length > 0 ? (
          overflow > 0 ? (
            <Notice tone="warn">
              Bugun {nf.format(capacityToday)} mesaj gonderilebilir. Kalan{' '}
              {nf.format(overflow)} kisi kuyrukta bekler ve kota yenilendikce
              yarin otomatik olarak devam eder. Daha hizli bitirmek icin hat
              eklemeniz gerekir.
            </Notice>
          ) : (
            <Notice tone="accent">
              {nf.format(validCount)} kisinin tamami bugunku kapasiteye siginiyor.
            </Notice>
          )
        ) : null}

        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            variant="accent"
            disabled={pending || senders.length === 0 || validCount === 0}
          >
            {pending
              ? 'Baslatiliyor...'
              : validCount > 0
                ? `${nf.format(validCount)} kisiye gonder`
                : 'Gonder'}
          </Button>
          <p className="text-[11.5px] text-ink-faint">
            Gonderim sunucuda calisir; bu sekmeyi kapatabilirsiniz.
          </p>
        </div>
      </form>
    </Card>
  )
}
