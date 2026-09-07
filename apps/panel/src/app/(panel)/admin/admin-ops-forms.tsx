'use client'

import { useActionState } from 'react'
import { Button, Field, Input } from '@/components/ui'
import {
  adminEnqueueAccountJob,
  cancelOrgPendingJobs,
  lockAccount,
  provisionCustomer,
  setAccountDailyLimit,
  setAccountEnabled,
  setOrgSuspended,
  unlockAccount,
  type AdminActionState,
} from './actions'

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

export function AccountLockForm({ accountId }: { accountId: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(lockAccount, null)
  return (
    <form action={action} className="inline-flex flex-wrap items-center gap-1">
      <input type="hidden" name="account_id" value={accountId} />
      <Input name="reason" placeholder="Kilit nedeni" className="w-[120px]" maxLength={120} />
      <Button type="submit" variant="danger" disabled={pending} className="text-[11.5px]">
        {pending ? '…' : 'Kilitle'}
      </Button>
      {state?.error ? <span className="text-[10px] text-danger">{state.error}</span> : null}
    </form>
  )
}

export function AccountDailyLimitForm({
  accountId,
  dailyLimit,
}: {
  accountId: string
  dailyLimit: number
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    setAccountDailyLimit,
    null,
  )
  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5 text-[12px]">
      <input type="hidden" name="account_id" value={accountId} />
      <span className="text-ink-faint">Günlük limit</span>
      <Input
        name="daily_send_limit"
        type="number"
        min={0}
        max={50000}
        defaultValue={dailyLimit}
        className="w-[88px]"
      />
      <Button type="submit" disabled={pending} className="text-[11.5px]">
        {pending ? '…' : 'Kaydet'}
      </Button>
      {state?.error ? <span className="text-[10px] text-danger">{state.error}</span> : null}
      {state?.ok ? <span className="text-[10px] text-ok-dim">{state.ok}</span> : null}
    </form>
  )
}

export function AccountEnableForm({
  accountId,
  enabled,
}: {
  accountId: string
  enabled: boolean
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    setAccountEnabled,
    null,
  )
  return (
    <form action={action} className="inline-flex items-center gap-1">
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="enabled" value={enabled ? '0' : '1'} />
      <Button type="submit" disabled={pending} className="text-[11.5px]">
        {pending ? '…' : enabled ? 'Devre dışı' : 'Etkinleştir'}
      </Button>
      {state?.error ? <span className="text-[10px] text-danger">{state.error}</span> : null}
    </form>
  )
}

export function AccountJobButton({
  accountId,
  type,
  label,
}: {
  accountId: string
  type: 'account.connect' | 'account.disconnect' | 'account.logout'
  label: string
}) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    adminEnqueueAccountJob,
    null,
  )
  return (
    <form action={action} className="inline-flex flex-col items-start gap-0.5">
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="type" value={type} />
      <Button type="submit" disabled={pending} className="text-[11.5px]">
        {pending ? '…' : label}
      </Button>
      {state?.error ? <span className="text-[10px] text-danger">{state.error}</span> : null}
      {state?.ok ? <span className="text-[10px] text-ok-dim">{state.ok}</span> : null}
    </form>
  )
}

export function CancelOrgJobsForm({ orgId }: { orgId: string }) {
  const [state, action, pending] = useActionState<AdminActionState, FormData>(
    cancelOrgPendingJobs,
    null,
  )
  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="org_id" value={orgId} />
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? '…' : 'Bekleyen işleri iptal'}
      </Button>
      {state?.error ? <span className="text-[11px] text-danger">{state.error}</span> : null}
      {state?.ok ? <span className="text-[11px] text-ok-dim">{state.ok}</span> : null}
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
          <option value="free">free</option>
          <option value="starter">starter</option>
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
