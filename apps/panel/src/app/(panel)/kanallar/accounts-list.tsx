'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui'
import { disconnectChannelAccount } from './actions'

export type ChannelAccountRow = {
  id: string
  channel: string
  label: string
  status: string
  external_account_id: string | null
  updated_at: string
}

export function ChannelAccountsList({
  rows,
  canManage,
}: {
  rows: ChannelAccountRow[]
  canManage: boolean
}) {
  const [pending, start] = useTransition()

  if (rows.length === 0) {
    return <p className="text-sm text-muted">Henüz bağlı kanal yok.</p>
  }

  return (
    <ul className="divide-y divide-hairline rounded-md border border-hairline bg-surface">
      {rows.map((row) => (
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium text-ink">{row.label}</p>
            <p className="text-xs text-muted">
              {row.channel}
              {row.external_account_id ? ` · ${row.external_account_id}` : ''} · {row.status}
            </p>
          </div>
          {canManage ? (
            <Button
              type="button"
              variant="danger"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await disconnectChannelAccount(row.id)
                })
              }}
            >
              Kaldır
            </Button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
