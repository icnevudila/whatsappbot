'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import { Button, Card, CardHeader, Field, Input, Notice } from '@/components/ui'
import {
  importScrapedContacts,
  previewScrape,
  type ScrapeImportState,
  type ScrapePreviewState,
} from './scrape-actions'
import type { ScrapedContact } from '@/lib/scraper/contacts'

export function ScrapeForm() {
  const [preview, previewAction, previewPending] = useActionState<ScrapePreviewState, FormData>(
    previewScrape,
    null,
  )
  const [imported, importAction, importPending] = useActionState<ScrapeImportState, FormData>(
    importScrapedContacts,
    null,
  )

  const contacts = preview?.result?.contacts ?? []
  const emailsOnly = preview?.result?.emailsOnly ?? []

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [listName, setListName] = useState('')

  useEffect(() => {
    if (!preview?.result) return
    setSelected(new Set(preview.result.contacts.map((c) => c.phone_e164)))
    try {
      const host = new URL(preview.result.seedUrl).hostname.replace(/^www\./, '')
      setListName((prev) => (prev.trim() ? prev : `${host} · web`))
    } catch {
      setListName((prev) => (prev.trim() ? prev : 'Web taraması'))
    }
  }, [preview?.result])

  const selectedContacts = useMemo(
    () => contacts.filter((c) => selected.has(c.phone_e164)),
    [contacts, selected],
  )

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

  return (
    <Card>
      <CardHeader
        title="Web’den kişi topla"
        subtitle="Siteyi dolaşıp tel: / mailto: ve metindeki numaraları çıkarır. Önce önizleyin, sonra listeye alın."
      />

      <div className="space-y-3.5 p-4">
        <form action={previewAction} className="space-y-3">
          <Field
            label="Web adresi"
            hint="İletişim veya hakkımızda sayfası en iyi sonucu verir. Aynı sitede en fazla 10 sayfa."
          >
            <Input
              name="url"
              type="text"
              required
              placeholder="ornekfirma.com/iletisim"
              autoComplete="url"
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="accent" disabled={previewPending}>
              {previewPending ? 'Taranıyor…' : 'Önizle'}
            </Button>
            {preview?.result ? (
              <span className="text-[11.5px] text-ink-faint tabular">
                {preview.result.pagesCrawled} sayfa · {contacts.length} telefon
                {emailsOnly.length > 0 ? ` · ${emailsOnly.length} yalnız e-posta` : ''}
                {preview.result.truncated ? ' · limit' : ''}
              </span>
            ) : null}
          </div>
        </form>

        {preview?.error ? <Notice tone="danger">{preview.error}</Notice> : null}

        {preview?.result?.errors && preview.result.errors.length > 0 && contacts.length > 0 ? (
          <Notice tone="warn">
            Bazı sayfalar atlandı: {preview.result.errors[0]}
            {preview.result.errors.length > 1
              ? ` (+${preview.result.errors.length - 1})`
              : ''}
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
              <input type="hidden" name="seedUrl" value={preview?.result?.seedUrl ?? ''} />
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
          KVKK / izin ve site kullanım şartlarına uyum sizin sorumluluğunuzdadır. JS ile
          yüklenen sitelerde sonuç sınırlı olabilir.
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
