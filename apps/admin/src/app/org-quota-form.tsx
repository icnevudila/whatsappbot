'use client'

import { PLAN_IDS, PLAN_LABELS } from '@wa/shared'
import { useActionState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { updateOrganizationQuotas, type OrgEditState } from './org-actions'

export function OrgQuotaForm({
  orgId,
  plan,
  accountsQuota,
  messageQuota,
}: {
  orgId: string
  plan: string
  accountsQuota: number
  messageQuota?: number
}) {
  const [state, action, pending] = useActionState<OrgEditState, FormData>(
    updateOrganizationQuotas,
    null,
  )

  return (
    <form action={action} className="flex flex-wrap items-end gap-2 py-1">
      <input type="hidden" name="org_id" value={orgId} />
      <Select name="plan" defaultValue={plan} className="w-[130px]" title="Plan">
        {PLAN_IDS.map((id) => (
          <option key={id} value={id}>
            {PLAN_LABELS[id]}
          </option>
        ))}
      </Select>
      <Input
        name="accounts_quota"
        type="number"
        min={0}
        defaultValue={accountsQuota}
        className="w-[72px]"
        title="Hat kotası"
      />
      <Input
        name="monthly_message_quota"
        type="number"
        min={0}
        defaultValue={messageQuota ?? 1000}
        className="w-[96px]"
        title="Aylık mesaj kotası"
      />
      <Button type="submit" variant="quiet" disabled={pending}>
        {pending ? '…' : 'Kaydet'}
      </Button>
      {state?.error ? (
        <span className="text-[11px] text-danger">{state.error}</span>
      ) : null}
      {state?.ok ? (
        <span className="text-[11px] text-ok-dim">{state.ok}</span>
      ) : null}
    </form>
  )
}
