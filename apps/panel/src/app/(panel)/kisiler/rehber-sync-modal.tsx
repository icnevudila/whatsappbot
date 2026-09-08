'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AccentLink, Button, Field, Input, Notice, Select } from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { waitForJob } from '@/lib/wait-for-job'
import {
  listRehberPreview,
  readRehberSyncJobResult,
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

type Phase = 'form' | 'running' | 'done' | 'error'

function displayName(item: RehberPreviewItem) {
  return item.label
}

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
            : 'WhatsApp rehberini ve sohbet kişilerini panele çeker'
        }
        onClick={() => setOpen(true)}
      >
        WhatsApp rehberinden çek
      </Button>
      {open ? (
        <RehberSyncModal
          accounts={connected}
          onClose={() => setOpen(false)}
        />
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
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const [pending, startTransition] = useTransition()

  const connected = accounts.filter((a) => a.status === 'connected')
  const defaultId =
    initialAccountId && connected.some((a) => a.id === initialAccountId)
      ? initialAccountId
      : connected[0]?.id ?? ''

  const [accountId, setAccountId] = useState(defaultId)
  const [password, setPassword] = useState('')
  const [listName, setListName] = useState('')
  const [phase, setPhase] = useState<Phase>('form')
  const [statusLine, setStatusLine] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<RehberPreviewItem[]>([])
  const [total, setTotal] = useState(0)
  const [result, setResult] = useState<RehberSyncJobResult | null>(null)

  useSyncBusy(pending || phase === 'running', 'WhatsApp rehberi çekiliyor…')

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = panelRef.current?.querySelector<HTMLElement>('input,button,select')
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

  useEffect(() => {
    if (phase !== 'running' || !accountId) return

    let cancelled = false
    const tick = async () => {
      const preview = await listRehberPreview(accountId)
      if (cancelled || preview.error) return
      setItems(preview.items ?? [])
      setTotal(preview.total ?? 0)
      setStatusLine(
        (preview.total ?? 0) > 0
          ? `WhatsApp’tan kişiler çekiliyor… ${preview.total} kayıt`
          : 'WhatsApp’tan kişiler çekiliyor… (henüz isim gelmedi)',
      )
    }

    void tick()
    const timer = setInterval(() => {
      void tick()
    }, 1500)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [phase, accountId])

  const selected = connected.find((a) => a.id === accountId)

  const start = () => {
    setError(null)
    if (!accountId) {
      setError('Bağlı hat seçin.')
      return
    }
    if (!password.trim()) {
      setError('Rehber şifresi gerekli.')
      return
    }

    startTransition(async () => {
      setPhase('running')
      setStatusLine('WhatsApp’tan kişiler çekiliyor…')
      setItems([])
      setTotal(0)
      setResult(null)

      const outcome = await syncAccountContactsAction(
        accountId,
        password,
        listName.trim() || undefined,
      )

      if (outcome?.error || !outcome?.jobId) {
        setPhase('error')
        setError(outcome?.error ?? 'İş başlatılamadı.')
        toast(outcome?.error ?? 'İş başlatılamadı.', 'danger')
        return
      }

      toast('Rehber çekme başladı.', 'accent')

      const wait = await waitForJob(outcome.jobId, {
        intervalMs: 2000,
        timeoutMs: 3 * 60_000,
      })

      if (wait.status === 'failed' || wait.status === 'cancelled') {
        setPhase('error')
        setError(wait.error)
        toast(wait.error, 'danger')
        return
      }

      if (wait.status === 'timeout') {
        setPhase('error')
        setError(
          'İş hâlâ sürebilir. Biraz sonra Kişiler’i yenileyin; grup oluşmuş olabilir.',
        )
        router.refresh()
        return
      }

      const finished = await readRehberSyncJobResult(outcome.jobId)
      if (finished.error || !finished.result) {
        setPhase('error')
        setError(finished.error ?? 'Sonuç okunamadı.')
        return
      }

      const preview = await listRehberPreview(accountId)
      if (!preview.error) {
        setItems(preview.items ?? [])
        setTotal(preview.total ?? finished.result.imported)
      }

      setResult(finished.result)
      setPhase('done')
      setStatusLine(
        finished.result.imported > 0
          ? `${finished.result.imported} kişi gruba aktarıldı.`
          : 'Çekilecek kayıt bulunamadı.',
      )
      toast(
        finished.result.imported > 0
          ? `${finished.result.imported} kişi aktarıldı.`
          : 'Rehber boş veya telefon çıkarılamadı.',
        finished.result.imported > 0 ? 'success' : 'accent',
      )
      router.refresh()
    })
  }

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
        aria-describedby={descId}
        className="wb-modal-panel max-w-[440px]"
      >
        <h2 id={titleId} className="wb-modal-title">
          WhatsApp rehberinden çek
        </h2>

        <div id={descId} className="space-y-3">
          {phase === 'form' || phase === 'error' ? (
            <>
              <Notice tone="danger">
                Telefonun sistem rehberi çekilmez. Bu hattın WhatsApp kişi ve sohbet
                numaraları panele kopyalanır — kişisel rehberi istemeden doldurmamak
                için şifre zorunlu.
              </Notice>

              {connected.length === 0 ? (
                <Notice tone="accent">
                  Bağlı hat yok.{' '}
                  <AccentLink href="/hesaplar">Hatlar’a git</AccentLink>
                </Notice>
              ) : (
                <>
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

                  <Field
                    label="Grup adı (opsiyonel)"
                    hint="Boşsa «WhatsApp Rehberi — hat adı» oluşturulur."
                  >
                    <Input
                      value={listName}
                      onChange={(e) => setListName(e.target.value)}
                      placeholder={
                        selected
                          ? `WhatsApp Rehberi — ${selected.label}`
                          : 'WhatsApp Rehberi'
                      }
                      maxLength={120}
                      disabled={pending}
                    />
                  </Field>

                  <Field label="Rehber şifresi" hint="Yanlışlıkla çekmeyi önler.">
                    <Input
                      type="password"
                      autoComplete="off"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      disabled={pending}
                    />
                  </Field>
                </>
              )}

              {error ? <Notice tone="danger">{error}</Notice> : null}
            </>
          ) : null}

          {phase === 'running' || phase === 'done' ? (
            <>
              <p
                className={`text-[13px] font-medium ${
                  phase === 'running' ? 'text-accent' : 'text-ink'
                }`}
              >
                {statusLine}
              </p>
              <p className="text-[11.5px] text-ink-faint">
                {phase === 'running'
                  ? 'Bağlı hat üzerinden anlık geliyor. Bitene kadar bekleyin.'
                  : result
                    ? `Grup: ${result.listName}`
                    : null}
              </p>

              <div className="max-h-[220px] overflow-y-auto rounded-md border border-hairline bg-canvas p-2">
                {items.length === 0 ? (
                  <p className="px-1 py-4 text-center text-[12px] text-ink-muted">
                    {phase === 'running' ? 'İsimler burada görünecek…' : 'Kayıt yok.'}
                  </p>
                ) : (
                  <ul className="flex flex-wrap gap-1">
                    {items.map((item) => (
                      <li
                        key={item.phone}
                        className="max-w-full truncate rounded border border-hairline bg-surface px-1.5 py-0.5 text-[11px] text-ink"
                        title={item.phone}
                      >
                        {displayName(item)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-[11px] tabular text-ink-faint">
                {total > 0 ? `${total} kayıt · son ${Math.min(items.length, 80)} gösteriliyor` : null}
              </p>
            </>
          ) : null}
        </div>

        <div className="wb-modal-actions">
          {phase === 'form' || phase === 'error' ? (
            <>
              <Button type="button" onClick={onClose} disabled={pending}>
                Vazgeç
              </Button>
              <Button
                type="button"
                variant="accent"
                data-confirm-primary
                disabled={pending || connected.length === 0}
                onClick={start}
              >
                {pending ? 'Başlatılıyor…' : 'Çekmeye başla'}
              </Button>
            </>
          ) : null}

          {phase === 'running' ? (
            <Button type="button" disabled>
              Çekiliyor…
            </Button>
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
        </div>
      </div>
    </div>
  )
}
