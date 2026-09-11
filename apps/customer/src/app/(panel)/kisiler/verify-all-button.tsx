'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { Button, Notice, QuietLink } from '@/components/ui'
import { waitForJob } from '@/lib/wait-for-job'
import { verifyAllContacts } from './actions'

export function VerifyAllButton({
  total = 0,
  validCount = 0,
  invalidCount = 0,
  unknownCount = 0,
  currentStatus = 'tum',
  searchQuery = '',
}: {
  total?: number
  validCount?: number
  invalidCount?: number
  unknownCount?: number
  currentStatus?: string
  searchQuery?: string
}) {
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [needsLine, setNeedsLine] = useState(false)
  const [ok, setOk] = useState<string | null>(null)
  useSyncBusy(pending, 'Defter doğrulanıyor…', 'WhatsApp kayıt kontrolü')

  const filterHref = (status: string) => {
    const params = new URLSearchParams()
    params.set('gorunum', 'defter')
    if (status !== 'tum') params.set('durum', status)
    if (searchQuery) params.set('ara', searchQuery)
    const qs = params.toString()
    return qs ? `/kisiler?${qs}` : '/kisiler'
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[12.5px] font-semibold text-ink">WhatsApp Doğrulama Durumu</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={filterHref('tum')}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                currentStatus === 'tum'
                  ? 'bg-ink text-canvas'
                  : 'border border-hairline bg-surface text-ink-muted hover:text-ink'
              }`}
            >
              Tümü ({total})
            </Link>
            <Link
              href={filterHref('var')}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                currentStatus === 'var'
                  ? 'border border-ok bg-ok text-white font-bold'
                  : 'border border-ok/35 bg-ok-soft text-ok hover:bg-ok/15'
              }`}
              title="WhatsApp hesabı olan numaralar"
            >
              <span aria-hidden>✓</span>
              <span>WhatsApp'ta Var ({validCount})</span>
            </Link>
            <Link
              href={filterHref('yok')}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                currentStatus === 'yok'
                  ? 'border border-danger bg-danger text-white font-bold'
                  : 'border border-danger/35 bg-danger/10 text-danger hover:bg-danger/20'
              }`}
              title="WhatsApp hesabı olmayan numaralar"
            >
              <span aria-hidden>×</span>
              <span>WhatsApp'ta Yok ({invalidCount})</span>
            </Link>
            {unknownCount > 0 ? (
              <Link
                href={filterHref('bekleyen')}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  currentStatus === 'bekleyen'
                    ? 'bg-ink-muted text-canvas font-bold'
                    : 'border border-hairline bg-surface text-ink-muted hover:text-ink'
                }`}
                title="Henüz kontrol edilmemiş numaralar"
              >
                <span aria-hidden>?</span>
                <span>Doğrulanmamış ({unknownCount})</span>
              </Link>
            ) : null}
          </div>
        </div>

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
                  setOk('Doğrulama bitti. Sayılar ve liste güncellendi.')
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
      </div>

      {error ? (
        <div className="space-y-2">
          <Notice tone="danger">{error}</Notice>
          {needsLine ? <QuietLink href="/ayarlar/hatlar">Hatlar’a git</QuietLink> : null}
        </div>
      ) : null}

      {ok ? <Notice tone="accent">{ok}</Notice> : null}

      {!error && !ok ? (
        <p className="text-[11px] leading-snug text-ink-faint">
          Doğrulama bağlı hat üzerinden yapılır. Sonuçlar listelerde ✓ (var) ve × (yok) olarak işaretlenir.
        </p>
      ) : null}
    </div>
  )
}
