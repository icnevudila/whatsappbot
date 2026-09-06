'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Notice } from '@/components/ui'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import {
  addContactsToList,
  deleteContacts,
  deleteContactsBySource,
} from './actions'

export type ContactRow = {
  id: string
  phone_e164: string
  name: string | null
  source: string | null
  wa_status: string | null
}

export type GroupOption = { id: string; name: string }

export function ContactsBoard({
  contacts,
  groups,
  whatsappCount,
}: {
  contacts: ContactRow[]
  groups: GroupOption[]
  whatsappCount: number
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [targetList, setTargetList] = useState(groups[0]?.id ?? '')
  const [message, setMessage] = useState<string | null>(null)
  useSyncBusy(pending, 'Kişiler güncelleniyor…')

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    if (!q) return contacts
    return contacts.filter((row) => {
      const hay = `${row.phone_e164} ${row.name ?? ''} ${row.source ?? ''}`.toLocaleLowerCase(
        'tr-TR',
      )
      return hay.includes(q)
    })
  }, [contacts, query])

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((row) => selected.has(row.id))

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        for (const row of filtered) next.delete(row.id)
      } else {
        for (const row of filtered) next.add(row.id)
      }
      return next
    })
  }

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const run = (action: () => Promise<{ error?: string; ok?: string }>) => {
    setMessage(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setMessage(result.error)
        toast(result.error, 'danger')
        return
      }
      if (result.ok) toast(result.ok, 'success')
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div className="space-y-3 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ara: ad veya numara"
          className="min-w-[180px] flex-1"
        />
        <span className="text-[11.5px] text-ink-faint tabular">
          {selected.size} seçili · {filtered.length} görünen
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={toggleAll} disabled={filtered.length === 0 || pending}>
          {allFilteredSelected ? 'Seçimi kaldır' : 'Sayfadakileri seç'}
        </Button>

        <select
          value={targetList}
          onChange={(e) => setTargetList(e.target.value)}
          className="h-9 rounded-md border border-hairline bg-surface px-2 text-[12.5px]"
          disabled={groups.length === 0 || pending}
        >
          {groups.length === 0 ? (
            <option value="">Önce grup oluştur</option>
          ) : (
            groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))
          )}
        </select>

        <Button
          type="button"
          variant="accent"
          disabled={selected.size === 0 || !targetList || pending}
          onClick={() => run(() => addContactsToList(targetList, [...selected]))}
        >
          Gruba ekle
        </Button>

        <Button
          type="button"
          variant="danger"
          disabled={selected.size === 0 || pending}
          onClick={() => {
            void (async () => {
              const ok = await confirm({
                title: `${selected.size} kişi silinsin mi?`,
                description: 'Defterden kalıcı silinir. Bu işlem geri alınamaz.',
                confirmLabel: 'Sil',
                cancelLabel: 'Vazgeç',
                tone: 'danger',
              })
              if (!ok) return
              run(() => deleteContacts([...selected]))
            })()
          }}
        >
          Seçilenleri sil
        </Button>

        {whatsappCount > 0 ? (
          <Button
            type="button"
            variant="danger"
            disabled={pending}
            onClick={() => {
              void (async () => {
                const ok = await confirm({
                  title: `WhatsApp rehberinden gelen ${whatsappCount} kişi silinsin mi?`,
                  description:
                    'Yalnızca WhatsApp içe aktarma kaynaklı kayıtlar silinir. Excel / manuel kalır.',
                  confirmLabel: 'WhatsApp kişilerini sil',
                  cancelLabel: 'Vazgeç',
                  tone: 'danger',
                })
                if (!ok) return
                run(() => deleteContactsBySource('whatsapp'))
              })()
            }}
          >
            WhatsApp import’u sil ({whatsappCount})
          </Button>
        ) : null}
      </div>

      {message ? <Notice tone="danger">{message}</Notice> : null}

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-ink-muted">
          {contacts.length === 0
            ? 'Henüz kişi yok. Gruplar sekmesinden Excel yükleyin.'
            : 'Aramayla eşleşen kişi yok.'}
        </p>
      ) : (
        <ul className="divide-y divide-hairline rounded-md border border-hairline">
          {filtered.map((row) => (
            <li key={row.id} className="flex items-center gap-2.5 px-3 py-2.5">
              <input
                type="checkbox"
                checked={selected.has(row.id)}
                onChange={() => toggleOne(row.id)}
                className="size-4 accent-[var(--color-accent)]"
                aria-label={row.phone_e164}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-ink">
                  {row.name?.trim() || row.phone_e164}
                </p>
                <p className="text-[11.5px] text-ink-muted tabular">
                  {row.phone_e164}
                  {row.source ? ` · ${sourceLabel(row.source)}` : ''}
                  {row.wa_status === 'valid'
                    ? ' · ✓'
                    : row.wa_status === 'invalid'
                      ? ' · ×'
                      : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function sourceLabel(source: string) {
  if (source === 'whatsapp') return 'WhatsApp'
  if (source === 'manual') return 'manuel'
  if (source === 'csv') return 'csv'
  if (source === 'scraper') return 'web'
  if (source === 'maps') return 'yerel'
  return source
}
