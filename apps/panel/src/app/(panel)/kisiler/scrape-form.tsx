'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react'
import type { ContactsScrapeJobResult, ScrapedContact } from '@wa/shared'
import { Button, Card, CardHeader, Field, Input, Notice } from '@/components/ui'
import {
  getScrapeJob,
  importScrapedContacts,
  startScrape,
  type ScrapeImportState,
} from './scrape-actions'

type Phase = 'idle' | 'queued' | 'running' | 'done' | 'failed'

const ENGINE_LABEL: Record<string, string> = {
  static: 'statik',
  browser: 'tarayıcı',
  hybrid: 'hibrit',
}

export function ScrapeForm() {
  const [imported, importAction, importPending] = useActionState<ScrapeImportState, FormData>(
    importScrapedContacts,
    null,
  )

  const [url, setUrl] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ContactsScrapeJobResult | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const contacts = result?.contacts ?? []
  const emailsOnly = result?.emailsOnly ?? []

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [listName, setListName] = useState('')

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  useEffect(() => {
    if (!result) return
    setSelected(new Set(result.contacts.map((c) => c.phone_e164)))
    try {
      const host = new URL(result.seedUrl).hostname.replace(/^www\./, '')
      setListName((prev) => (prev.trim() ? prev : `${host} · web`))
    } catch {
      setListName((prev) => (prev.trim() ? prev : 'Web taraması'))
    }
  }, [result])

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selected.has(c.phone_e164)),
    [contacts, selected],
  )

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const applyJobResult = (job: NonNullable<Awaited<ReturnType<typeof getScrapeJob>>['job']>) => {
    if (job.status === 'pending' || job.status === 'claimed') {
      setPhase('queued')
      return
    }
    if (job.status === 'running') {
      setPhase('running')
      return
    }
    if (job.status === 'done') {
      stopPolling()
      const scrape = job.result
      if (
        !scrape ||
        (scrape.contacts.length === 0 &&
          scrape.emailsOnly.length === 0 &&
          (scrape.errors?.length ?? 0) > 0)
      ) {
        setPhase('failed')
        setError(scrape?.errors?.[0] ?? job.error ?? 'Sayfa okunamadı.')
        setResult(scrape)
        return
      }
      if (scrape.contacts.length === 0 && scrape.emailsOnly.length === 0) {
        setPhase('failed')
        setError(
          'Telefon veya e-posta bulunamadı. İletişim sayfası URL’sini deneyin.',
        )
        setResult(scrape)
        return
      }
      setPhase('done')
      setError(null)
      setResult(scrape)
      return
    }
    if (job.status === 'failed' || job.status === 'cancelled') {
      stopPolling()
      setPhase('failed')
      setError(job.error ?? 'Tarama başarısız.')
    }
  }

  const beginPoll = (id: string) => {
    stopPolling()
    const tick = async () => {
      const { job, error: pollError } = await getScrapeJob(id)
      if (pollError) {
        stopPolling()
        setPhase('failed')
        setError(pollError)
        return
      }
      if (job) applyJobResult(job)
    }
    void tick()
    pollRef.current = setInterval(() => void tick(), 2_000)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    stopPolling()
    setError(null)
    setResult(null)
    setJobId(null)
    setPhase('queued')

    startTransition(async () => {
      const { jobId: id, error: startError } = await startScrape(url)
      if (startError || !id) {
        setPhase('failed')
        setError(startError ?? 'İş kuyruğa alınamadı.')
        return
      }
      setJobId(id)
      setPhase('queued')
      beginPoll(id)
    })
  }

  const toggle = (phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(phone)) next.delete(phone)
      else next.add(phone)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === contacts.length) setSelected(new Set())
    else setSelected(new Set(contacts.map((c) => c.phone_e164)))
  }

  const busy = pending || phase === 'queued' || phase === 'running'
  const progressText =
    phase === 'queued'
      ? 'Tarama kuyruğunda…'
      : phase === 'running'
        ? 'Worker tarıyor…'
        : null

  return (
    <Card>
      <CardHeader
        title="Web’den kişi topla"
        subtitle="Siteyi dolaşıp tel: / mailto: ve metindeki numaraları çıkarır. Önce önizleyin, sonra listeye alın."
      />

      <div className="space-y-2.5 p-3.5">
        <form onSubmit={onSubmit} className="space-y-3">
          <Field
            label="Web adresi"
            hint="İletişim veya hakkımızda sayfası en iyi sonucu verir. Aynı sitede en fazla 15 sayfa."
          >
            <Input
              name="url"
              type="text"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="ornekfirma.com/iletisim"
              autoComplete="url"
              disabled={busy}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="accent" disabled={busy}>
              {busy ? 'Taranıyor…' : 'Önizle'}
            </Button>
            {progressText ? (
              <span className="text-[11.5px] text-ink-muted">{progressText}</span>
            ) : null}
            {result ? (
              <span className="text-[11.5px] text-ink-faint tabular">
                {result.pagesCrawled} sayfa · {contacts.length} telefon
                {emailsOnly.length > 0 ? ` · ${emailsOnly.length} yalnız e-posta` : ''}
                {result.truncated ? ' · limit' : ''}
                {result.engine ? (
                  <>
                    {' · '}
                    <span className="rounded bg-panel px-1.5 py-0.5 text-[10.5px] uppercase tracking-wide text-ink-muted">
                      {ENGINE_LABEL[result.engine] ?? result.engine}
                    </span>
                  </>
                ) : null}
              </span>
            ) : null}
            {jobId && !result ? (
              <span className="text-[10.5px] text-ink-faint tabular">#{jobId}</span>
            ) : null}
          </div>
        </form>

        {error ? <Notice tone="danger">{error}</Notice> : null}

        {result?.errors && result.errors.length > 0 && contacts.length > 0 ? (
          <Notice tone="warn">
            Bazı sayfalar atlandı: {result.errors[0]}
            {result.errors.length > 1 ? ` (+${result.errors.length - 1})` : ''}
          </Notice>
        ) : null}

        {contacts.length > 0 ? (
          <div className="space-y-3 border-t border-hairline pt-3">
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={toggleAll}
                className="text-[12px] text-ink-muted underline decoration-hairline-strong underline-offset-2 hover:text-ink"
              >
                {selected.size === contacts.length ? 'Seçimi kaldır' : 'Tümünü seç'}
              </button>
              <span className="text-[11.5px] text-ink-faint tabular">
                {selected.size} / {contacts.length}
              </span>
            </div>

            <ul className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-hairline bg-canvas p-2">
              {contacts.map((contact) => (
                <ContactRow
                  key={contact.phone_e164}
                  contact={contact}
                  checked={selected.has(contact.phone_e164)}
                  onToggle={() => toggle(contact.phone_e164)}
                />
              ))}
            </ul>

            {emailsOnly.length > 0 ? (
              <p className="text-[11.5px] text-ink-faint">
                Telefonsuz e-posta ({emailsOnly.length}):{' '}
                {emailsOnly
                  .slice(0, 4)
                  .map((e) => e.email)
                  .join(', ')}
                {emailsOnly.length > 4 ? '…' : ''} — listeye yalnızca telefonlar alınır; eşleşen
                e-postalar kişi kaydına yazılır.
              </p>
            ) : null}

            <form action={importAction} className="space-y-3">
              <Field label="Liste adı">
                <Input
                  name="name"
                  required
                  value={listName}
                  onChange={(event) => setListName(event.target.value)}
                  placeholder="Firma iletişim"
                />
              </Field>
              <input type="hidden" name="seedUrl" value={result?.seedUrl ?? ''} />
              <input
                type="hidden"
                name="contactsJson"
                value={JSON.stringify(selectedContacts)}
              />

              <Button
                type="submit"
                variant="accent"
                disabled={importPending || selectedContacts.length === 0 || Boolean(imported?.ok)}
              >
                {importPending
                  ? 'Aktarılıyor…'
                  : imported?.ok
                    ? 'Aktarıldı'
                    : `${selectedContacts.length} numarayı listeye al`}
              </Button>
            </form>

            {imported?.error ? <Notice tone="danger">{imported.error}</Notice> : null}
            {imported?.ok ? <Notice tone="accent">{imported.ok}</Notice> : null}
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-ink-faint">
          Yalnızca kamuya açık sayfalardaki iletişim bilgileri toplanır. Ticari kullanımda
          KVKK / izin ve site kullanım şartlarına uyum sizin sorumluluğunuzdadır. JS siteleri
          worker üzerinden tarayıcı motoruyla taranır.
        </p>
      </div>
    </Card>
  )
}

function ContactRow({
  contact,
  checked,
  onToggle,
}: {
  contact: ScrapedContact
  checked: boolean
  onToggle: () => void
}) {
  return (
    <li>
      <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-panel">
        <input
          type="checkbox"
          className="mt-0.5"
          checked={checked}
          onChange={onToggle}
        />
        <span className="min-w-0 flex-1">
          <span className="block font-mono text-[12px] tabular">{contact.phone_e164}</span>
          <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
            {contact.name ? `${contact.name} · ` : ''}
            {contact.email ? `${contact.email} · ` : ''}
            {contact.confidence === 'high' ? 'tel:' : 'metin'}
          </span>
        </span>
      </label>
    </li>
  )
}
