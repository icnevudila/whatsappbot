'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Notice } from '@/components/ui'
import { verifyAllContacts } from './actions'

export function VerifyAllButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <Button
        variant="accent"
        disabled={pending}
        onClick={() => {
          setError(null)
          setOk(null)
          startTransition(async () => {
            const result = await verifyAllContacts()
            if (result.error) setError(result.error)
            else {
              setOk(result.ok ?? 'Kuyruğa alındı.')
              router.refresh()
            }
          })
        }}
      >
        {pending ? 'Kuyruğa alınıyor…' : 'Tüm defteri doğrula'}
      </Button>
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {ok ? <Notice tone="accent">{ok}</Notice> : null}
    </div>
  )
}
