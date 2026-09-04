'use client'

import { useState, useTransition } from 'react'
import { Button, Notice } from '@/components/ui'
import { deleteList, verifyList } from './actions'

export function ListActions({ listId }: { listId: string }) {
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<'verify' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = (kind: 'verify' | 'delete', action: () => Promise<{ error?: string }>) => {
    setError(null)
    setBusy(kind)
    startTransition(async () => {
      const result = await action()
      if (result.error) setError(result.error)
      setBusy(null)
    })
  }

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Button
          onClick={() => run('verify', () => verifyList(listId))}
          disabled={pending}
        >
          {busy === 'verify' ? 'Dogrulaniyor...' : 'Dogrula'}
        </Button>
        <Button
          variant="danger"
          onClick={() => {
            if (!window.confirm('Bu listeyi silmek istiyor musunuz?')) return
            run('delete', () => deleteList(listId))
          }}
          disabled={pending}
        >
          {busy === 'delete' ? 'Siliniyor...' : 'Sil'}
        </Button>
      </div>

      {/* basis-full: ust flex-wrap satirinda Notice tam genislik alta duser */}
      {error ? (
        <div className="basis-full">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}
    </>
  )
}
