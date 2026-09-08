'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Select } from '@/components/ui'
import {
  connectChannelAccount,
  type ChannelActionState,
} from './actions'

const OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'telegram', label: 'Telegram' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'webchat', label: 'Web chat' },
  { value: 'line', label: 'LINE' },
  { value: 'rcs', label: 'RCS' },
  { value: 'wechat', label: 'WeChat' },
  { value: 'shopify', label: 'Shopify' },
  { value: 'ikas', label: 'iKAS' },
  { value: 'woocommerce', label: 'WooCommerce' },
  { value: 'magento', label: 'Magento' },
  { value: 'tsoft', label: 'T-Soft' },
  { value: 'ticimax', label: 'Ticimax' },
  { value: 'ideasoft', label: 'Ideasoft' },
  { value: 'proje', label: 'Proj-e' },
  { value: 'trendyol', label: 'Trendyol' },
  { value: 'hepsiburada', label: 'Hepsiburada' },
  { value: 'erp', label: 'ERP' },
  { value: 'crm', label: 'CRM' },
]

export function ConnectChannelForm({ canManage }: { canManage: boolean }) {
  const [state, action, pending] = useActionState<ChannelActionState, FormData>(
    connectChannelAccount,
    null,
  )

  if (!canManage) {
    return (
      <p className="text-sm text-muted">Kanal bağlamak için yönetici yetkisi gerekir.</p>
    )
  }

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Kanal">
        <Select name="channel" required defaultValue="telegram">
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Etiket">
        <Input name="label" required placeholder="Örn. Satış Telegram" />
      </Field>
      <Field label="Harici hesap ID (opsiyonel)">
        <Input name="external_account_id" placeholder="bot id / shop / seller id" />
      </Field>
      <Field label="API base (opsiyonel)">
        <Input name="api_base" placeholder="https://..." />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Token / API key">
          <Input name="token" type="password" placeholder="Bot token veya access token" autoComplete="off" />
        </Field>
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? 'Bağlanıyor…' : 'Kanalı bağla'}
        </Button>
        {state?.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state?.ok ? <p className="text-sm text-ok-dim">{state.ok}</p> : null}
      </div>
    </form>
  )
}
