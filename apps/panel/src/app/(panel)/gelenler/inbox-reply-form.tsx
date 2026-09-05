'use client'

import { useActionState } from 'react'
import { Button, Notice, Textarea } from '@/components/ui'
import { replyToInbox, type ReplyState } from './reply-actions'

export function InboxReplyForm({
  phone,
  accountId,
}: {
  phone: string
  accountId: string | null
}) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToInbox, null)

  if (!accountId || !phone.startsWith('+')) {
    return (
      <p className="text-[12px] text-ink-faint">
        Yanıt için bağlı hat ve E.164 numara gerekir.
      </p>
    )
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="phone_e164" value={phone} />
      <input type="hidden" name="account_id" value={accountId} />
      <Textarea
        name="body"
        rows={2}
        required
        placeholder="Yanıt yazın…"
        className="font-sans"
      />
      <div className="flex items-center justify-between gap-2">
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? 'Gönderiliyor…' : 'Yanıtla'}
        </Button>
      </div>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
    </form>
  )
}
