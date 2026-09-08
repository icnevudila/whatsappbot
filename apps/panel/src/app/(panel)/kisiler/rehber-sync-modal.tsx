'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AccentLink, Button, Field, Notice, Select } from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import {
  listRehberPreview,
  readRehberSyncJob,
  syncAccountContactsAction,
  type RehberPreviewItem,
  type RehberSyncJobResult,
} from '@/app/(panel)/hesaplar/actions'

export type RehberAccountOption = {
  id: string
  label: string
  phone_e164: string | null
  status: string
}

type Phase = 'pick' | 'running' | 'done' | 'error'

export function RehberSyncButton({
  accounts,
  className,
}: {
  accounts: RehberAccountOption[]
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const connected = accounts.filter((a) => a.status === 'connected')

  return (
    <>
      <Button
        type="button"
        variant="accent"
        className={className}
        disabled={connected.length === 0}
        title={
          connected.length === 0
            ? 'Önce Hatlar’dan bağlı bir hat gerekir'
            : 'WhatsApp rehberini panele çeker — canlı izlersin'
        }
        onClick={() => setOpen(true)}
      >
        WhatsApp rehberinden çek
      </Button>
      {open ? (
        <RehberSyncModal accounts={connected} onClose={() => setOpen(false)} />
      ) : null}
    </>
  )
}

export function RehberSyncModal({
  accounts,
  initialAccountId,
  onClose,
}: {
  accounts: RehberAccountOption[]
  initialAccountId?: string
  onClose: () => void
}) {
  const router = useRouter()
  const toast = useToast()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const [pending, startTransition] = useTransition()
  const startedRef = useRef(false)

  const connected = accounts.filter((a) => a.status === 'connected')
  const defaultId =
    initialAccountId && connected.some((a) => a.id === initialAccountId)
      ? initialAccountId
      : connected[0]?.id ?? ''

  const [accountId, setAccountId] = useState(defaultId)
  const [phase, setPhase] = useState<Phase>('pick')
  const [statusLine, setStatusLine] = useState('WhatsApp’tan kişiler çekiliyor…')
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RehberPreviewItem[]>([])
  const [seen, setSeen] = useState(0)
  const [flashPhone, setFlashPhone] = useState<string | null>(null)
  const [result, setResult] = useState<RehberSyncJobResult | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)

  useSyncBusy(pending || phase === 'running', 'WhatsApp rehberi çekiliyor…')

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = panelRef.current?.querySelector<HTMLElement>('button,select')
    node?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phase !== 'running') {
        event.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previous?.focus?.()
    }
  }, [onClose, phase])

  const mergeItems = (next: RehberPreviewItem[]) => {
    setItems((prev) => {
      const map = new Map<string, RehberPreviewItem>()
      for (const row of [...next, ...prev]) {
        if (!map.has(row.phone)) map.set(row.phone, row)
      }
      const merged = [...map.values()]
      const newest = next[0]?.phone
      if (newest && newest !== prev[0]?.phone) {
        setFlashPhone(newest)
        window.setTimeout(() => setFlashPhone((cur) => (cur === newest ? null : cur)), 900)
      }
      return merged.slice(0, 120)
    })
  }

  const runPull = (targetAccountId: string) => {
    if (!targetAccountId || startedRef.current) return
    startedRef.current = true
    setError(null)
    setPhase('running')
    setStatusLine('WhatsApp’tan kişiler çekiliyor…')
    setItems([])
    setSeen(0)
    setResult(null)

    startTransition(async () => {
      const outcome = await syncAccountContactsAction(targetAccountId)
      if (outcome?.error || !outcome?.jobId) {
        setPhase('error')
        setError(outcome?.error ?? 'İş başlatılamadı.')
        toast(outcome?.error ?? 'İş başlatılamadı.', 'danger')
        startedRef.current = false
        return
      }

      setJobId(outcome.jobId)
      const deadline = Date.now() + 3 * 60_000

      while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 800))

        const [job, preview] = await Promise.all([
          readRehberSyncJob(outcome.jobId),
          listRehberPreview(targetAccountId),
        ])

        if (job.error && job.status !== 'done') {
          setPhase('error')
          setError(job.error)
          toast(job.error, 'danger')
          return
        }

        const samples = job.progress?.samples?.length
          ? job.progress.samples
          : preview.items ?? []
        const count = Math.max(job.progress?.seen ?? 0, preview.total ?? 0, samples.length)
        setSeen(count)
        if (samples.length) mergeItems(samples)

        const phaseLabel = job.progress?.phase
        if (phaseLabel === 'importing') {
          setStatusLine(`Gruba aktarılıyor… ${count} kişi`)
        } else if (count > 0) {
          setStatusLine(`WhatsApp’tan çekiliyor… ${count} kişi`)
        } else {
          setStatusLine(
            job.progress?.live === false
              ? 'Hat canlı değil — kayıtlı rehber aktarılıyor…'
              : 'WhatsApp’tan kişiler çekiliyor… (bekleniyor)',
          )
        }

        if (job.status === 'done' && job.result) {
          const finalSamples = job.result.samples?.length
            ? job.result.samples
            : preview.items ?? []
          if (finalSamples.length) mergeItems(finalSamples)
          setSeen(Math.max(count, job.result.imported, job.result.seen ?? 0))
          setResult(job.result)
          setPhase('done')
          setStatusLine(
            job.result.imported > 0
              ? `${job.result.imported} kişi gruba aktarıldı`
              : 'Bu turda numara gelmedi',
          )
          toast(
            job.result.imported > 0
              ? `${job.result.imported} kişi aktarıldı.`
              : 'Numara gelmedi — hat bağlı mı kontrol et.',
            job.result.imported > 0 ? 'success' : 'accent',
          )
          router.refresh()
          return
        }

        if (job.status === 'failed' || job.status === 'cancelled') {
          setPhase('error')
          setError(job.error ?? 'Rehber çekme başarısız.')
          toast(job.error ?? 'Rehber çekme başarısız.', 'danger')
          return
        }
      }

      setPhase('error')
      setError('Süre doldu. Biraz sonra Kişiler’i yenile — grup oluşmuş olabilir.')
      router.refresh()
    })
  }

  // Tek hat: modal açılınca tek tıkla çek (otomatik çift job riski yok)
  // Çok hat: seçip başlat

  useEffect(() => {
    if (phase !== 'running' || !feedRef.current) return
    feedRef.current.scrollTop = 0
  }, [items, phase])

  return (
    <div className="wb-modal-root" role="presentation">
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        disabled={phase === 'running'}
        onClick={() => {
          if (phase !== 'running') onClose()
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="wb-modal-panel max-w-[480px]"
      >
        <h2 id={titleId} className="wb-modal-title">
          WhatsApp rehberinden çek
        </h2>

        <div className="space-y-3">
          {phase === 'pick' ? (
            <>
              <p className="text-[12.5px] leading-snug text-ink-muted">
                Başlatınca numaralar burada anlık akar; bitince gruba yazılır. Telefon
                sistem rehberi değil — WhatsApp kişi / sohbet numaraları.
              </p>
              {connected.length === 0 ? (
                <Notice tone="accent">
                  Bağlı hat yok. <AccentLink href="/hesaplar">Hatlar’a git</AccentLink>
                </Notice>
              ) : connected.length === 1 ? (
                <p className="rounded-md border border-hairline bg-canvas px-3 py-2 text-[13px] font-medium text-ink">
                  {connected[0].label}
                  {connected[0].phone_e164 ? (
                    <span className="ml-1 font-normal text-ink-muted">
                      · {connected[0].phone_e164}
                    </span>
                  ) : null}
                </p>
              ) : (
                <Field label="Hat">
                  <Select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    disabled={pending}
                  >
                    {connected.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.label}
                        {account.phone_e164 ? ` · ${account.phone_e164}` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              {error ? <Notice tone="danger">{error}</Notice> : null}
            </>
          ) : null}

          {phase === 'running' || phase === 'done' ? (
            <>
              <div className="rounded-md border border-hairline bg-canvas px-4 py-4 text-center">
                <p
                  className={`text-[40px] font-bold tabular leading-none tracking-tight ${
                    phase === 'running' ? 'text-accent' : 'text-ink'
                  }`}
                >
                  {seen}
                </p>
                <p className="mt-1 text-[12.5px] font-medium text-ink-muted">
                  {phase === 'running' ? 'kişi çekiliyor' : 'kişi'}
                </p>
                <p
                  className={`mt-2 text-[12.5px] ${
                    phase === 'running' ? 'wb-live-dot text-accent' : 'text-ink'
                  }`}
                >
                  {statusLine}
                </p>
              </div>

              <div
                ref={feedRef}
                className="max-h-[260px] overflow-y-auto rounded-md border border-hairline bg-surface"
              >
                {items.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 px-3 py-10 text-center">
                    <span className="wb-live-dot inline-block size-2 rounded-full bg-accent" />
                    <p className="text-[12.5px] text-ink-muted">
                      İsimler buraya anlık düşecek…
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-hairline">
                    {items.map((item) => (
                      <li
                        key={item.phone}
                        className={`flex items-baseline justify-between gap-2 px-3 py-1.5 text-[12.5px] ${
                          flashPhone === item.phone ? 'bg-accent-soft/70' : ''
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium text-ink">
                          {item.label}
                        </span>
                        <span className="shrink-0 font-mono text-[10.5px] tabular text-ink-faint">
                          {item.phone.replace(/^\+90/, '')}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {phase === 'done' && result ? (
                <p className="text-[12px] text-ink-muted">
                  Grup: <span className="font-medium text-ink">{result.listName}</span>
                  {jobId ? (
                    <span className="text-ink-faint"> · iş #{jobId}</span>
                  ) : null}
                </p>
              ) : null}
            </>
          ) : null}

          {phase === 'error' ? (
            <div className="space-y-2">
              <Notice tone="danger">{error ?? 'Bir şey ters gitti.'}</Notice>
              <QuietHatLink />
            </div>
          ) : null}
        </div>

        <div className="wb-modal-actions">
          {phase === 'pick' ? (
            <>
              <Button type="button" onClick={onClose} disabled={pending}>
                Vazgeç
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={pending || !accountId}
                onClick={() => runPull(accountId)}
              >
                Şimdi çek
              </Button>
            </>
          ) : null}

          {phase === 'running' ? (
            <p className="w-full text-center text-[11.5px] text-ink-faint">
              Bitene kadar bekleyin — kapatılamaz
            </p>
          ) : null}

          {phase === 'done' ? (
            <>
              <Button type="button" onClick={onClose}>
                Kapat
              </Button>
              {result?.listId ? (
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => {
                    onClose()
                    router.push(`/kisiler/${result.listId}`)
                  }}
                >
                  Grubu aç
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => {
                    onClose()
                    router.push('/kisiler?gorunum=defter')
                  }}
                >
                  Deftere git
                </Button>
              )}
            </>
          ) : null}

          {phase === 'error' ? (
            <>
              <Button type="button" onClick={onClose}>
                Kapat
              </Button>
              <Button
                type="button"
                variant="accent"
                onClick={() => {
                  startedRef.current = false
                  setPhase('pick')
                  setError(null)
                }}
              >
                Tekrar dene
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function QuietHatLink() {
  return (
    <p className="text-[12px] text-ink-muted">
      Hat bağlı değilse önce <AccentLink href="/hesaplar">Hatlar</AccentLink>’dan bağla.
    </p>
  )
}
