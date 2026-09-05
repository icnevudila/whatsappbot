'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import { createOrgApiKey, revokeOrgApiKey, type ApiKeyState } from './api-key-actions'

type KeyRow = {
  id: string
  name: string
  key_prefix: string
  last_used_at: string | null
  created_at: string
}

export function ApiKeyForm({
  canEdit,
  keys,
}: {
  canEdit: boolean
  keys: KeyRow[]
}) {
  const [state, action, pending] = useActionState<ApiKeyState, FormData>(
    createOrgApiKey,
    null,
  )

  if (!canEdit) return null

  return (
    <div className="space-y-3 border-t border-hairline p-4">
      {keys.length > 0 ? (
        <ul className="space-y-2">
          {keys.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-hairline bg-canvas px-3 py-2 text-[12px]"
            >
              <div>
                <p className="font-medium text-ink">{row.name}</p>
                <p className="font-mono text-ink-faint">
                  {row.key_prefix}… ·{' '}
                  {row.last_used_at
                    ? `son kullanım ${new Date(row.last_used_at).toLocaleString('tr-TR')}`
                    : 'henüz kullanılmadı'}
                </p>
              </div>
              <form action={revokeOrgApiKey}>
                <input type="hidden" name="id" value={row.id} />
                <Button type="submit" variant="danger" className="!px-2 !py-1 text-[11px]">
                  İptal et
                </Button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}

      <form action={action} className="space-y-3">
        <Field
          label="API anahtarı adı"
          hint="POST /api/v1/jobs — Authorization: Bearer filo_…"
        >
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
    </div>
  )
}
