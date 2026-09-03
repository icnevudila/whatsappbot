'use client'

import { useActionState, useState } from 'react'
import { Button, Card, CardHeader, Field, Input, Notice, Textarea } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { createCampaign, type CampaignState } from './actions'

type Option = { id: string; label: string; detail?: string; disabled?: boolean }

export function NewCampaignForm({
  lists,
  accounts,
  userId,
}: {
  lists: Option[]
  accounts: Option[]
  userId: string
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
      setUploadError(error instanceof Error ? error.message : 'Gorsel yuklenemedi.')
    } finally {
      setUploading(false)
    }
  }

  const preview = body.replaceAll('{{ad}}', 'Ahmet').replaceAll('{{name}}', 'Ahmet')

  return (
    <Card>
      <CardHeader
        title="Yeni kampanya"
        subtitle="Gonderim sunucuda calisir; bu sekmeyi kapatabilirsiniz."
      />

      <form action={formAction} className="space-y-4 p-4">
        <input type="hidden" name="media_url" value={mediaUrl} />

        <Field label="Kampanya adi">
          <Input name="name" placeholder="Ocak indirimi duyurusu" required />
        </Field>

        <Field
          label="Mesaj"
          hint="{{ad}} yazdiginiz yere kisinin adi gelir. Ismi olmayan kisilerde bos kalir."
        >
          <Textarea
            name="body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder={'Merhaba {{ad}}, bu ay gecerli %20 indirimimizden haberdar etmek istedik.'}
          />
        </Field>

        {body ? (
          // Onizleme, degisken yazim hatalarini gonderimden once yakalatiyor.
          <div className="rounded-md border border-hairline bg-canvas p-3">
            <p className="mb-1.5 text-[11.5px] font-medium text-ink-faint">
              Alicinin gorecegi
            </p>
            <p className="text-[12.5px] whitespace-pre-wrap text-ink">{preview}</p>
          </div>
        ) : null}

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Gorsel (istege bagli)
          </span>

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-md border border-hairline-strong bg-surface-raised px-3 py-1.5 text-[12.5px] transition-colors hover:border-ink-faint">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void upload(file)
                }}
              />
              {uploading ? 'Yukleniyor...' : 'Gorsel sec'}
            </label>

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

        <CheckboxGroup
          name="lists"
          label="Kisi listeleri"
          options={lists}
          empty="Once Kisiler sekmesinden bir liste olusturun."
        />

        <CheckboxGroup
          name="accounts"
          label="Gonderen hesaplar"
          options={accounts}
          empty="Once bir WhatsApp hesabi baglayin."
          hint="Birden fazla hesap secerseniz gonderim aralarinda paylasilir, hesap basina gunluk kota ayri isler."
        />

        <div className="grid grid-cols-3 gap-3">
          <Field label="En kisa bekleme">
            <Input name="min_delay" type="number" min={3} max={600} defaultValue={8} />
          </Field>
          <Field label="En uzun bekleme">
            <Input name="max_delay" type="number" min={3} max={900} defaultValue={25} />
          </Field>
          <Field label="Hesap/gun">
            <Input name="daily_cap" type="number" min={1} max={1000} defaultValue={100} />
          </Field>
        </div>

        <p className="text-[11.5px] leading-relaxed text-ink-faint">
          Mesajlar arasindaki bekleme bu iki deger arasinda rastgele secilir. Sabit aralik
          toplu gonderimi belirgin hale getirdigi icin bu aralik onemli. Yeni baglanmis
          hesaplarda gunluk kota, hesap yaslanana kadar otomatik olarak daha dusuk tutulur.
        </p>

        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}

        <Button
          type="submit"
          variant="accent"
          disabled={pending || lists.length === 0 || accounts.length === 0}
        >
          {pending ? 'Olusturuluyor...' : 'Kampanyayi olustur'}
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
  empty: string
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
              className={`flex items-center gap-2.5 px-3 py-2 ${
                option.disabled ? 'opacity-45' : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                name={name}
                value={option.id}
                disabled={option.disabled}
                className="size-3.5 accent-[var(--color-accent)]"
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
