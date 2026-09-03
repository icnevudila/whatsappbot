'use client'

import { useState, useTransition } from 'react'
import { Button, Notice } from '@/components/ui'
import { deleteList, verifyList } from './actions'

export function ListActions({ listId }: { listId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (action: () => Promise<{ error?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) setError(result.error)
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Button onClick={() => run(() => verifyList(listId))} disabled={pending}>
        Dogrula
      </Button>
      <Button
        variant="danger"
        onClick={() => run(() => deleteList(listId))}
        disabled={pending}
      >
        Sil
      </Button>
    </div>
  )
}
