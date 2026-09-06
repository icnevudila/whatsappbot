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
  Input,
  Notice,
  Textarea,
} from '@/components/ui'
import { updateCampaign, type CampaignState } from '../actions'

type Option = { id: string; label: string; detail?: string; disabled?: boolean }

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

export function EditCampaignForm({
  campaign,
  lists,
  accounts,
  selectedAccountIds,
}: {
  campaign: EditableCampaign
  lists: Option[]
  accounts: Option[]
  selectedAccountIds: string[]
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
  useSyncBusy(pending, 'Kampanya kaydediliyor…')

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) {
      toast(state.ok, 'success')
      router.refresh()
    }
  }, [state?.error, state?.ok, toast, router])

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
            ? 'Mesaj ve hız kalan kuyruğu etkiler. Liste/hat için önce Duraklat.'
            : 'Gönderilmiş numaralara dokunulmaz. Liste değişince yeni numaralar eklenir; çıkan queued’lar atlanır.'
        }
      />

      <form action={formAction} className="space-y-3.5 p-3.5">
        <input type="hidden" name="campaign_id" value={campaign.id} />
        <input type="hidden" name="media_url" value={mediaUrl} />

        <Field label="Kampanya adı">
          <Input name="name" defaultValue={campaign.name} required />
        </Field>

        <Field
          label="Mesaj"
          hint="Kalan hedeflere yeni metin gider. Alıcı YAZMAYIN / istemiyorum yazarsa otomatik kara listeye alınır."
        >
          <Textarea name="body" rows={5} defaultValue={campaign.body ?? ''} />
        </Field>

        <Field label="Medya URL (isteğe bağlı)">
          <Input
            value={mediaUrl}
            onChange={(event) => setMediaUrl(event.target.value)}
            placeholder="https://…"
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Min bekleme (sn)">
            <Input
              name="min_delay"
              type="number"
              min={3}
              defaultValue={campaign.min_delay_seconds}
            />
          </Field>
          <Field label="Max bekleme (sn)">
            <Input
              name="max_delay"
              type="number"
              min={3}
              defaultValue={campaign.max_delay_seconds}
            />
          </Field>
          <Field label="Günlük hat limiti">
            <Input
              name="daily_cap"
              type="number"
              min={1}
              defaultValue={campaign.daily_cap_per_account}
            />
          </Field>
        </div>

        <Field label="A/B % (0 = kapalı)">
          <Input
            name="ab_percent"
            type="number"
            min={0}
            max={100}
            defaultValue={campaign.ab_percent ?? 0}
          />
        </Field>
        <Field label="Mesaj B (A/B)">
          <Textarea name="body_b" rows={3} defaultValue={campaign.body_b ?? ''} />
        </Field>

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Kişi listeleri
            {structureLocked ? ' (kilitli — önce duraklat)' : ''}
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
                <span className="truncate text-[12.5px]">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-ink-muted">
            Gönderen hatlar
            {structureLocked ? ' (kilitli — önce duraklat)' : ''}
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
              Kalan kuyruğu iptal et (queued → atlandı), sonra seçili listelerden yeniden doldur.
              Gönderilmiş numaralara dokunulmaz. Yanlış listedeysen bunu işaretle.
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
          {pending ? 'Kaydediliyor…' : 'Değişiklikleri kaydet'}
        </Button>
      </form>
    </Card>
  )
}
