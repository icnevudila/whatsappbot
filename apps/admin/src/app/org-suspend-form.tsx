'use client'

import { useActionState } from 'react'
import { Button, Input } from '@/components/ui'
import { setOrgSuspended, type SuspendState } from './org-actions'

export function OrgSuspendForm({
  orgId,
  suspendedAt,
}: {
  orgId: string
  suspendedAt: string | null
}) {
  const [state, action, pending] = useActionState<SuspendState, FormData>(
    setOrgSuspended,
    null,
  )
  const suspended = Boolean(suspendedAt)

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="org_id" value={orgId} />
      <input type="hidden" name="suspend" value={suspended ? '0' : '1'} />
      {!suspended ? (
        <Input
          name="reason"
          placeholder="Askı nedeni"
          className="w-[140px]"
          maxLength={120}
        />
      ) : null}
      <Button type="submit" variant={suspended ? 'quiet' : 'danger'} disabled={pending}>
        {pending ? '…' : suspended ? 'Askıyı kaldır' : 'Askıya al'}
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
