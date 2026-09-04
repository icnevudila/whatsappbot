'use client'

import { useActionState, useState, type ReactNode } from 'react'
import { AiWriter } from '@/components/ai-writer'
import { Button, Card, CardHeader, Field, FileUploadButton, Input, MessagePreview, Notice, Textarea } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { createCampaign, type CampaignState } from './actions'

type Option = { id: string; label: string; detail?: string; disabled?: boolean }

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

  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  /**
   * Gorsel dogrudan tarayicidan Supabase Storage'a yukleniyor.
   * Yol kullanici kimligiyle basliyor: Storage politikasi ilk klasor adinin
   * auth.uid() olmasini sart kosuyor.
   */
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
      setUploadError(error instanceof Error ? error.message : 'Görsel yüklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const preview = body.replaceAll('{{ad}}', 'Ahmet').replaceAll('{{name}}', 'Ahmet')

  return (
    <Card>
      <CardHeader
        title="Yeni kampanya"
        subtitle="Oluşturunca gönderim hemen başlar. Sekmeyi kapatabilirsiniz."
      />

      <form action={formAction} className="space-y-4 p-4">
        <input type="hidden" name="media_url" value={mediaUrl} />

        <Field label="Kampanya adı">
          <Input name="name" placeholder="Ocak indirimi duyurusu" required />
        </Field>

        <Field
          label="Mesaj"
          hint="{{ad}} yazdığınız yere kişinin adı gelir. İsmi olmayan kişilerde boş kalır."
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

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Görsel (isteğe bağlı)
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <FileUploadButton
              uploading={uploading}
              label="Görsel seç"
              onFile={(file) => void upload(file)}
            />

            {mediaUrl ? (
              <span className="flex items-center gap-2 text-[11.5px] text-accent">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={mediaUrl}
                  alt="Kampanya görseli"
                  className="size-9 rounded border border-hairline object-cover"
                />
                Görsel hazır
                <button
                  type="button"
                  onClick={() => setMediaUrl('')}
                  className="text-ink-muted underline underline-offset-2 hover:text-danger"
                >
                  kaldır
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

        {/* Onizleme, degisken yazim hatalarini gonderimden once yakalatiyor. */}
        <MessagePreview body={preview || undefined} mediaUrl={mediaUrl || null} />

        <CheckboxGroup
          name="lists"
          label="Kişi listeleri"
          options={lists}
          empty={
            <>
              Önce{' '}
              <a href="/kisiler" className="font-medium underline underline-offset-2">
                Kişiler
              </a>{' '}
              sekmesinden bir liste oluşturun. Tek seferlik için{' '}
              <a href="/hizli-gonderim" className="font-medium underline underline-offset-2">
                Hızlı gönderim
              </a>{' '}
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
              <a href="/hesaplar" className="font-medium underline underline-offset-2">
                Hesaplar
              </a>{' '}
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
          {pending ? 'Başlatılıyor…' : 'Oluştur ve gönder'}
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
