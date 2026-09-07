'use client'

import { useActionState } from 'react'
import { Button, Field, Input } from '@/components/ui'
import { provisionCustomer, setOrgSuspended, unlockAccount, type AdminActionState } from './actions'

export function OrgSuspendForm({
  orgId,
  suspendedAt,
}: {
  orgId: string
  suspendedAt: string | null
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    setOrgSuspended,
    null,
  )
  const suspended = Boolean(suspendedAt)

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="org_id" value={orgId} />
      <input type="hidden" name="suspend" value={suspended ? '0' : '1'} />
      {!suspended ? (
        <Input name="reason" placeholder="Askı nedeni" className="w-[140px]" maxLength={120} />
      ) : null}
      <Button type="submit" variant={suspended ? 'quiet' : 'danger'} disabled={pending}>
        {pending ? '…' : suspended ? 'Askıyı kaldır' : 'Askıya al'}
      </Button>
      {state?.error ? <span className="text-[11px] text-danger">{state.error}</span> : null}
      {state?.ok ? <span className="text-[11px] text-ok-dim">{state.ok}</span> : null}
    </form>
  )
}

export function UnlockAccountButton({ accountId }: { accountId: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(unlockAccount, null)

  return (
    <form action={action} className="inline-flex flex-col items-start gap-0.5">
      <input type="hidden" name="account_id" value={accountId} />
      <Button type="submit" disabled={pending}>
        {pending ? '…' : 'Kilidi aç'}
      </Button>
      {state?.error ? <span className="text-[10.5px] text-danger">{state.error}</span> : null}
      {state?.ok ? <span className="text-[10.5px] text-ok-dim">{state.ok}</span> : null}
    </form>
  )
}

export function ProvisionCustomerForm() {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    provisionCustomer,
    null,
  )

  return (
    <form action={action} className="space-y-2.5">
      <Field label="İşletme adı">
        <Input name="org_name" required maxLength={120} placeholder="Demo Dönerci" />
      </Field>
      <Field label="Sahip e-posta">
        <Input name="email" type="email" required placeholder="musteri@firma.com" />
      </Field>
      <Field label="Plan">
        <select
          name="plan"
          defaultValue="starter"
          className="h-9 w-full rounded-md border border-hairline bg-surface px-2 text-[13px]"
        >
          <option value="starter">starter</option>
          <option value="growth">growth</option>
          <option value="pro">pro</option>
          <option value="enterprise">enterprise</option>
        </select>
      </Field>
      {state?.error ? <p className="text-[12px] text-danger">{state.error}</p> : null}
      {state?.ok ? <p className="text-[12px] text-ok-dim">{state.ok}</p> : null}
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? 'Açılıyor…' : 'Müşteri aç + davet gönder'}
      </Button>
    </form>
  )
}
