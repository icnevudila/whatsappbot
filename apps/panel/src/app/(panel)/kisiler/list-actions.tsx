'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Notice } from '@/components/ui'
import { waitForJob } from '@/lib/wait-for-job'
import { deleteList, verifyList } from './actions'

export function ListActions({ listId }: { listId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<'verify' | 'delete' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const runDelete = () => {
    setError(null)
    setOk(null)
    setBusy('delete')
    startTransition(async () => {
      const result = await deleteList(listId)
      if (result.error) setError(result.error)
      setBusy(null)
    })
  }

  const runVerify = () => {
    setError(null)
    setOk(null)
    setBusy('verify')
    startTransition(async () => {
      const result = await verifyList(listId)
      if (result.error) {
        setError(result.error)
        setBusy(null)
        return
      }

      setOk(result.ok ?? 'Doğrulama kuyruğa alındı…')

      if (result.jobId) {
        const outcome = await waitForJob(result.jobId)
        if (outcome.status === 'done') {
          setOk('Doğrulama bitti. Alttaki özet güncellendi.')
          router.refresh()
        } else if (outcome.status === 'timeout') {
          setOk(
            'Doğrulama hâlâ sürüyor olabilir. Biraz sonra sayfayı yenileyin; özet o zaman güncellenir.',
          )
          router.refresh()
        } else {
          setOk(null)
          setError(outcome.error)
        }
      } else {
        router.refresh()
      }

      setBusy(null)
    })
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          <Button
            onClick={runVerify}
            disabled={pending}
            title="Bağlı hat gerekir; kayıtlı olmayan numaralar işaretlenir"
          >
            {busy === 'verify' ? 'Doğrulanıyor…' : '✓ × Doğrula'}
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              if (!window.confirm('Bu listeyi silmek istiyor musunuz?')) return
              runDelete()
            }}
            disabled={pending}
          >
            {busy === 'delete' ? 'Siliniyor…' : 'Sil'}
          </Button>
        </div>
        <p className="max-w-[200px] text-right text-[10.5px] leading-snug text-ink-faint">
          Doğrulama bağlı hat ister; süre liste boyutuna göre değişir.
        </p>
      </div>

      {error ? (
        <div className="basis-full">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      {ok && !error ? (
        <div className="basis-full">
          <Notice tone="accent">{ok}</Notice>
        </div>
      ) : null}
    </>
  )
}
