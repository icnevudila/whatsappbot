'use client'

import { useActionState, useEffect } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import { useToast } from '@/components/toast'
import { updateOrgQuotas, type AdminActionState } from '../actions'

export function OrgQuotaForm({
  orgId,
  plan,
  accountsQuota,
  monthlyQuota,
}: {
  orgId: string
  plan: string
  accountsQuota: number
  monthlyQuota: number
}) {
  const toast = useToast()
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    updateOrgQuotas,
    null,
  )

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
    if (state?.ok) toast(state.ok, 'success')
  }, [state?.error, state?.ok, toast])

  return (
    <form action={action} className="space-y-2.5">
      <input type="hidden" name="org_id" value={orgId} />
      <Field label="Plan">
        <select
          name="plan"
          defaultValue={plan}
          className="h-10 w-full rounded-md border border-hairline bg-surface px-2 text-[13px]"
        >
          <option value="free">free</option>
          <option value="starter">starter</option>
          <option value="pro">pro</option>
          <option value="enterprise">enterprise</option>
        </select>
      </Field>
      <Field label="Hat kotası">
        <Input name="accounts_quota" type="number" min={0} defaultValue={accountsQuota} />
      </Field>
      <Field label="Aylık mesaj kotası">
        <Input name="monthly_message_quota" type="number" min={0} defaultValue={monthlyQuota} />
      </Field>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Kota güncelle'}
      </Button>
    </form>
  )
}
