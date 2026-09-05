'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui'
import { unlockAccount, type UnlockState } from './org-actions'

export function UnlockAccountButton({ accountId }: { accountId: string }) {
  const [state, action, pending] = useActionState<UnlockState, FormData>(unlockAccount, null)

  return (
    <form action={action} className="inline-flex flex-col items-start gap-0.5">
      <input type="hidden" name="account_id" value={accountId} />
      <Button type="submit" variant="quiet" disabled={pending}>
        {pending ? '…' : 'Kilidi aç'}
      </Button>
      {state?.error ? <span className="text-[10.5px] text-danger">{state.error}</span> : null}
      {state?.ok ? <span className="text-[10.5px] text-ok-dim">{state.ok}</span> : null}
    </form>
  )
}
