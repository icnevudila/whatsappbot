'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import { createOrgApiKey, type ApiKeyState } from './api-key-actions'

export function ApiKeyForm({ canEdit }: { canEdit: boolean }) {
  const [state, action, pending] = useActionState<ApiKeyState, FormData>(
    createOrgApiKey,
    null,
  )

  if (!canEdit) return null

  return (
    <form action={action} className="space-y-3 border-t border-hairline p-4">
      <Field label="API anahtarı adı" hint="POST /api/v1/jobs — Authorization: Bearer filo_…">
        <Input name="name" defaultValue="crm" />
      </Field>
      <Button type="submit" variant="quiet" disabled={pending}>
        {pending ? '…' : 'Yeni API anahtarı'}
      </Button>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
      {state?.key ? (
        <p className="break-all rounded-md border border-hairline bg-canvas px-3 py-2 font-mono text-[12px]">
          {state.key}
        </p>
      ) : null}
    </form>
  )
}
