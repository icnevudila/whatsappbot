'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button, Notice } from '@/components/ui'
import { acceptInvite } from '../actions'

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="accent"
        disabled={pending}
        onClick={() => {
          setError(null)
          start(async () => {
            const result = await acceptInvite(token)
            if (result.error) {
              setError(result.error)
              return
            }
            router.push('/kurulum')
            router.refresh()
          })
        }}
      >
        {pending ? 'Kabul ediliyor…' : 'Daveti kabul et'}
      </Button>
      {error ? <Notice tone="danger">{error}</Notice> : null}
    </div>
  )
}
