'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui'
import { cancelAllPendingJobs } from './cancel-job'

export function CancelPendingButton({ count }: { count: number }) {
  const [pending, start] = useTransition()
  if (count <= 0) return null

  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => start(() => void cancelAllPendingJobs())}
    >
      {pending ? 'İptal…' : `Bekleyen ${count} işi iptal et`}
    </Button>
  )
}
