'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Notice, QuietLink } from '@/components/ui'
import { waitForJob } from '@/lib/wait-for-job'
import { verifyAllContacts } from './actions'

export function VerifyAllButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [needsLine, setNeedsLine] = useState(false)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <div className="space-y-2">
      <Button
        variant="accent"
        disabled={pending}
        title="Bağlı hat gerekir; kontrol edilmemiş ve bayat numaralar ✓ / × ile işaretlenir"
        onClick={() => {
          setError(null)
          setNeedsLine(false)
          setOk(null)
          startTransition(async () => {
            const result = await verifyAllContacts()
            if (result.error) {
              setError(result.error)
              const lower = result.error.toLocaleLowerCase('tr-TR')
              setNeedsLine(lower.includes('bağlı') || lower.includes('bagli'))
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
                const lower = outcome.error.toLocaleLowerCase('tr-TR')
                setNeedsLine(lower.includes('bağlı') || lower.includes('bagli'))
              }
            } else {
              router.refresh()
            }
          })
        }}
      >
        {pending ? 'Doğrulanıyor…' : 'Tüm defteri doğrula'}
      </Button>

      {error ? (
        <div className="space-y-2">
          <Notice tone="danger">{error}</Notice>
          {needsLine ? <QuietLink href="/hesaplar">Hesaplara git</QuietLink> : null}
        </div>
      ) : null}

      {ok ? <Notice tone="accent">{ok}</Notice> : null}

      {!error && !ok ? (
        <p className="text-[11.5px] leading-snug text-ink-faint">
          Kontrol edilmemiş ve bayat numaralar kuyruğa alınır. Sonuçlar listelerde ✓ / × olarak
          görünür.
        </p>
      ) : null}
    </div>
  )
}
