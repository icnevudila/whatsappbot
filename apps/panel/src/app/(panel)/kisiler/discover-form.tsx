'use client'
// Dead: DiscoverForm is unused (no imports); scrape UI lives elsewhere.

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import type { ContactsDiscoverJobResult, DiscoveredPlace, ScrapedContact } from '@wa/shared'
import { Button, Card, CardHeader, Field, Input, Notice } from '@/components/ui'
import {
  getDiscoverJob,
  importScrapedContacts,
  startDiscover,
  type ScrapeImportState,
} from './discover-actions'

type Phase = 'idle' | 'queued' | 'running' | 'done' | 'failed'

export function DiscoverForm() {
  const [imported, importAction, importPending] = useActionState<ScrapeImportState, FormData>(
    importScrapedContacts,
    null,
  )

  const [query, setQuery] = useState('Bursa kuaför')
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ContactsDiscoverJobResult | null>(null)
  const [pending, startTransition] = useTransition()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const contacts = result?.contacts ?? []
  const places = result?.places ?? []
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
    setListName((prev) => (prev.trim() ? prev : `${result.query} · yerel`))
  }, [result])

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selected.has(c.phone_e164)),
    [contacts, selected],
  )

  const placeByPhone = useMemo(() => {
    const map = new Map<string, DiscoveredPlace>()
    for (const p of places) {
      if (p.phone_e164) map.set(p.phone_e164, p)
    }
    return map
  }, [places])

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const applyJob = (job: NonNullable<Awaited<ReturnType<typeof getDiscoverJob>>['job']>) => {
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
      const discover = job.result
      if (!discover || (discover.contacts.length === 0 && discover.places.length === 0)) {
        setPhase('failed')
        setError(
          discover?.errors?.[0] ??
            job.error ??
            'İşletme bulunamadı. Farklı bir arama deneyin (şehir + meslek).',
        )
        setResult(discover)
        return
      }
      setPhase('done')
      setError(null)
      setResult(discover)
      return
    }
    if (job.status === 'failed' || job.status === 'cancelled') {
      stopPolling()
      setPhase('failed')
      setError(job.error ?? 'Arama başarısız.')
    }
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setResult(null)
    setPhase('queued')
    stopPolling()

    startTransition(async () => {
      const started = await startDiscover(query)
      if (started.error || !started.jobId) {
        setPhase('failed')
        setError(started.error ?? 'Kuyruk hatası')
        return
      }

      const jobId = started.jobId
      pollRef.current = setInterval(() => {
        void (async () => {
          const snap = await getDiscoverJob(jobId)
          if (snap.error) {
            stopPolling()
            setPhase('failed')
            setError(snap.error)
            return
          }
          if (snap.job) applyJob(snap.job)
        })()
      }, 2000)
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

  const enrichedContacts: ScrapedContact[] = selectedContacts.map((c) => {
    const place = placeByPhone.get(c.phone_e164)
    return {
      ...c,
      name: c.name || place?.name || null,
      sourceUrl: place?.website || place?.mapsUrl || c.sourceUrl,
    }
  })

  const noPhone = places.filter((p) => !p.phone_e164)

  return (
    <Card>
      <CardHeader
        title="Yerel işletme ara"
        subtitle="Örn. Bursa kuaför, İstanbul diş kliniği — Google Places ile işletme adı, telefon, adres, site."
      />

      <div className="space-y-3.5 p-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <Field
            label="Ne arıyorsunuz?"
            hint="Şehir + meslek / kategori. Sonuçlar genelde birkaç saniyede gelir. Günlük en fazla 15 arama (kota koruması)."
          >
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Bursa kuaför"
              required
              minLength={3}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              variant="accent"
              disabled={pending || phase === 'queued' || phase === 'running'}
            >
              {phase === 'queued' || phase === 'running' || pending
                ? 'Aranıyor…'
                : 'İşletmeleri bul'}
            </Button>
            {phase === 'queued' ? (
              <span className="text-[11.5px] text-ink-faint">Kuyrukta — worker alacak</span>
            ) : null}
            {phase === 'running' ? (
              <span className="text-[11.5px] text-ink-faint">Places arıyor…</span>
            ) : null}
            {result ? (
              <span className="text-[11.5px] text-ink-faint tabular">
                {result.contacts.length} telefon · {result.places.length} işletme ·{' '}
                {Math.round(result.durationMs / 1000)}s
                {result.truncated ? ' · limit' : ''}
              </span>
            ) : null}
          </div>
        </form>

            {phase === 'queued' || phase === 'running' || pending ? (
              <div className="filo-pulse h-1 overflow-hidden rounded-full bg-hairline">
                <div className="h-full w-1/3 rounded-full bg-accent" />
              </div>
            ) : null}

            {error ? <Notice tone="danger">{error}</Notice> : null}

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

            <ul className="filo-fade-in max-h-72 space-y-1 overflow-y-auto rounded-md border border-hairline bg-canvas p-2">
              {contacts.map((contact) => {
                const place = placeByPhone.get(contact.phone_e164)
                return (
                  <li key={contact.phone_e164} className="filo-fade-in">
                    <label className="flex cursor-pointer items-start gap-2 rounded px-1.5 py-1.5 hover:bg-panel">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={selected.has(contact.phone_e164)}
                        onChange={() => toggle(contact.phone_e164)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium">
                          {contact.name || place?.name || 'İşletme'}
                        </span>
                        <span className="mt-0.5 block font-mono text-[12px] tabular">
                          {contact.phone_e164}
                        </span>
                        <span className="mt-0.5 block truncate text-[11px] text-ink-faint">
                          {[place?.address, place?.category, place?.website]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>

            {noPhone.length > 0 ? (
              <p className="text-[11.5px] text-ink-faint">
                Telefonsuz {noPhone.length} işletme atlandı (ör.{' '}
                {noPhone
                  .slice(0, 2)
                  .map((p) => p.name)
                  .join(', ')}
                ).
              </p>
            ) : null}

            <form action={importAction} className="space-y-3">
              <Field label="Liste adı">
                <Input
                  name="name"
                  required
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                />
              </Field>
              <input type="hidden" name="seedUrl" value={result?.query ?? ''} />
              <input type="hidden" name="source" value="maps" />
              <input
                type="hidden"
                name="contactsJson"
                value={JSON.stringify(enrichedContacts)}
              />
              <div className="flex flex-wrap items-center gap-2">
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
              {selectedContacts.length > 0 ? (
                <Link
                  href={`/hizli-gonderim?tel=${encodeURIComponent(
                    selectedContacts.map((c) => c.phone_e164).join(','),
                  )}`}
                  className="text-[12.5px] text-ink-muted underline decoration-hairline-strong underline-offset-2 hover:text-ink"
                >
                  Hızlı gönderime al
                </Link>
              ) : null}
            </div>
            </form>

            {imported?.error ? <Notice tone="danger">{imported.error}</Notice> : null}
            {imported?.ok ? <Notice tone="accent">{imported.ok}</Notice> : null}
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-ink-faint">
          Kamuya açık işletme iletişim bilgileri toplanır. Ticari kullanımda KVKK / izin ve
          platform kurallarına uyum sizin sorumluluğunuzdadır.
        </p>
      </div>
    </Card>
  )
}
