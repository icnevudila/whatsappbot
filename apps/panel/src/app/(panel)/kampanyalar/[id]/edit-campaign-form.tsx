'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import {
  Button,
  Card,
  CardHeader,
  Field,
  FileUploadButton,
  Input,
  Notice,
  Textarea,
} from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { updateCampaign, type CampaignState } from '../actions'

type Option = {
  id: string
  label: string
  detail?: string
  disabled?: boolean
  contactCount?: number
}

export type EditableCampaign = {
  id: string
  name: string
  status: string
  body: string | null
  body_b?: string | null
  ab_percent?: number | null
  media_url: string | null
  message_type: string
  min_delay_seconds: number
  max_delay_seconds: number
  daily_cap_per_account: number
  source_list_ids: string[]
}

function typeFromMime(mime: string): 'image' | 'video' | null {
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  return null
}

export function EditCampaignForm({
  campaign,
  lists,
  accounts,
  selectedAccountIds,
  orgId,
}: {
  campaign: EditableCampaign
  lists: Option[]
  accounts: Option[]
  selectedAccountIds: string[]
  orgId: string
}) {
  const editable = ['draft', 'paused', 'scheduled', 'running', 'stopped'].includes(
    campaign.status,
  )
  const structureLocked = campaign.status === 'running'
  const [state, formAction, pending] = useActionState<CampaignState, FormData>(
    updateCampaign,
    null,
  )
  const toast = useToast()
  const router = useRouter()
  const [mediaUrl, setMediaUrl] = useState(campaign.media_url ?? '')
  const [messageType, setMessageType] = useState(campaign.message_type || 'text')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  useSyncBusy(pending, 'Kampanya kaydediliyor…')
  useSyncBusy(uploading, 'Medya yükleniyor…')

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) {
      toast(state.ok, 'success')
      router.refresh()
    }
  }, [state?.error, state?.ok, toast, router])

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

  if (!editable) {
    return (
      <Card>
        <CardHeader title="Düzenle" subtitle="Tamamlanmış kampanya düzenlenemez — kopyalayın." />
        <div className="space-y-2.5 p-3.5">
          {campaign.media_url && campaign.message_type === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.media_url}
              alt=""
              className="max-h-40 rounded-md border border-hairline object-contain"
            />
          ) : null}
          <p className="whitespace-pre-wrap text-[12.5px] text-ink">
            {campaign.body || 'Metin yok.'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader
        title="Kampanyayı düzenle"
        subtitle={
          structureLocked
            ? 'Mesajı değiştirebilirsiniz. Grup/hat için önce Duraklat.'
            : 'Gönderilmiş numaralara dokunulmaz. Grup değişince yeni numaralar eklenir.'
        }
      />

      <form action={formAction} className="space-y-3.5 p-3.5">
        <input type="hidden" name="campaign_id" value={campaign.id} />
        <input type="hidden" name="media_url" value={mediaUrl} />
        <input type="hidden" name="message_type" value={messageType} />
        <input type="hidden" name="min_delay" value={campaign.min_delay_seconds} />
        <input type="hidden" name="max_delay" value={campaign.max_delay_seconds} />
        <input type="hidden" name="daily_cap" value={campaign.daily_cap_per_account} />
        <input type="hidden" name="ab_percent" value={campaign.ab_percent ?? 0} />
        <input type="hidden" name="body_b" value={campaign.body_b ?? ''} />

        <Field label="Kampanya adı">
          <Input name="name" defaultValue={campaign.name} required />
        </Field>

        <Field
          label="Mesaj"
          hint="Kalan hedeflere yeni metin gider. İstemiyorum / YAZMAYIN → gruptan çıkar."
        >
          <Textarea name="body" rows={5} defaultValue={campaign.body ?? ''} />
        </Field>

        <div className="space-y-2">
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
                Eklendi
                <button
                  type="button"
                  onClick={() => {
                    setMediaUrl('')
                    setMessageType('text')
                  }}
                  className="text-ink-muted underline underline-offset-2 hover:text-danger"
                >
                  kaldır
                </button>
              </span>
            ) : null}
          </div>
          {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}
        </div>

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Kişi grupları
            {structureLocked ? ' (duraklatınca değişir)' : ''}
          </span>
          {structureLocked
            ? campaign.source_list_ids.map((id) => (
                <input key={id} type="hidden" name="lists" value={id} />
              ))
            : null}
          <div className="divide-y divide-hairline rounded-md border border-hairline">
            {lists.map((option) => (
              <label
                key={option.id}
                className={`flex min-h-10 items-center gap-2.5 px-3 py-2 ${
                  structureLocked || option.disabled ? 'opacity-45' : 'cursor-pointer'
                }`}
              >
                {structureLocked ? (
                  <input
                    type="checkbox"
                    checked={campaign.source_list_ids.includes(option.id)}
                    disabled
                    readOnly
                    className="size-4 accent-[var(--color-accent)]"
                  />
                ) : (
                  <input
                    type="checkbox"
                    name="lists"
                    value={option.id}
                    defaultChecked={campaign.source_list_ids.includes(option.id)}
                    disabled={option.disabled}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                )}
                <span className="truncate text-[12.5px]">
                  {option.label}
                  {option.contactCount != null
                    ? ` · ${option.contactCount.toLocaleString('tr-TR')}`
                    : option.detail
                      ? ` · ${option.detail}`
                      : ''}
                </span>
              </label>
            ))}
          </div>
          {lists.some((l) => campaign.source_list_ids.includes(l.id) && (l.contactCount ?? 0) > 0) ? (
            <Notice tone="warn">
              Seçili gruplar ~{' '}
              {lists
                .filter((l) => campaign.source_list_ids.includes(l.id))
                .reduce((s, l) => s + (l.contactCount ?? 0), 0)
                .toLocaleString('tr-TR')}{' '}
              numara. Yeniden başlatınca bu kadar kuyruk satırı materyalize edilir.
            </Notice>
          ) : null}
        </div>

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Gönderen hat
            {structureLocked ? ' (duraklatınca değişir)' : ''}
          </span>
          {structureLocked
            ? selectedAccountIds.map((id) => (
                <input key={id} type="hidden" name="accounts" value={id} />
              ))
            : null}
          <div className="divide-y divide-hairline rounded-md border border-hairline">
            {accounts.map((option) => (
              <label
                key={option.id}
                className={`flex min-h-10 items-center gap-2.5 px-3 py-2 ${
                  structureLocked || option.disabled ? 'opacity-45' : 'cursor-pointer'
                }`}
              >
                {structureLocked ? (
                  <input
                    type="checkbox"
                    checked={selectedAccountIds.includes(option.id)}
                    disabled
                    readOnly
                    className="size-4 accent-[var(--color-accent)]"
                  />
                ) : (
                  <input
                    type="checkbox"
                    name="accounts"
                    value={option.id}
                    defaultChecked={selectedAccountIds.includes(option.id)}
                    disabled={option.disabled}
                    className="size-4 accent-[var(--color-accent)]"
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-[12.5px]">{option.label}</span>
                {option.detail ? (
                  <span className="text-[11.5px] text-ink-faint">{option.detail}</span>
                ) : null}
              </label>
            ))}
          </div>
        </div>

        {!structureLocked ? (
          <label className="flex items-start gap-2 text-[12.5px] text-ink-muted">
            <input type="checkbox" name="cancel_remaining" value="1" className="mt-0.5 size-4" />
            <span>
              Kalan gönderimleri iptal et ve seçili gruplardan yeniden doldur. Gönderilmişlere
              dokunulmaz.
            </span>
          </label>
        ) : null}

        {campaign.status === 'paused' || campaign.status === 'stopped' ? (
          <label className="flex items-start gap-2 text-[12.5px] text-ink-muted">
            <input type="checkbox" name="resume_after" value="1" className="mt-0.5 size-4" />
            <span>
              {campaign.status === 'stopped'
                ? 'Kaydettikten sonra yeniden başlat'
                : 'Kaydettikten sonra gönderime devam et'}
            </span>
          </label>
        ) : null}

        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
        {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </form>
    </Card>
  )
}
