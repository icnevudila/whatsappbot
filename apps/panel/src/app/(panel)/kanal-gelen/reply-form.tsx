'use client'

import { useActionState } from 'react'
import { Button, Input } from '@/components/ui'
import { replyChannelMessage, type ReplyState } from './actions'

export function ReplyForm({
  channelAccountId,
  threadId,
  channel,
}: {
  channelAccountId: string
  threadId: string
  channel: string
}) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyChannelMessage, null)

  return (
    <form action={action} className="mt-2 flex flex-wrap gap-2">
      <input type="hidden" name="channel_account_id" value={channelAccountId} />
      <input type="hidden" name="thread_id" value={threadId} />
      <input type="hidden" name="channel" value={channel} />
      <Input name="text" required placeholder="Yanıt yaz…" className="min-w-[200px] flex-1" />
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? '…' : 'Gönder'}
      </Button>
      {state?.error ? <span className="text-xs text-danger">{state.error}</span> : null}
      {state?.ok ? <span className="text-xs text-ok-dim">{state.ok}</span> : null}
    </form>
  )
}
