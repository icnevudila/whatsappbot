'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { Button, Notice, QuietLink } from '@/components/ui'
import { waitForJob } from '@/lib/wait-for-job'
import { verifyAllContacts } from './actions'

export function VerifyAllButton() {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [needsLine, setNeedsLine] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  useSyncBusy(pending, 'Defter doğrulanıyor…', 'WhatsApp kayıt kontrolü')

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
              toast(result.error, 'danger')
              const lower = result.error.toLocaleLowerCase('tr-TR')
              setNeedsLine(lower.includes('bağlı') || lower.includes('bagli'))
              return
            }

            setOk(result.ok ?? 'Doğrulama kuyruğa alındı…')
            toast('Doğrulama kuyruğa alındı…', 'accent')

            if (result.jobId) {
              const outcome = await waitForJob(result.jobId)
              if (outcome.status === 'done') {
                setOk('Doğrulama bitti. Alttaki özet güncellendi.')
                toast('Defter doğrulaması bitti.', 'success')
                router.refresh()
              } else if (outcome.status === 'timeout') {
                setOk(
                  'Doğrulama hâlâ sürüyor olabilir. Biraz sonra sayfayı yenileyin; özet o zaman güncellenir.',
                )
                router.refresh()
              } else {
                setOk(null)
                setError(outcome.error)
                toast(outcome.error, 'danger')
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
