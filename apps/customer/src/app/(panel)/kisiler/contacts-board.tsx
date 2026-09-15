'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Input, Notice } from '@/components/ui'
import { WaMark } from '@/components/wa-mark'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { waAvatarColor, waAvatarLetters } from '@/lib/wa-avatar'
import {
  addContactsToList,
  deleteContacts,
} from './actions'
import { sanitizeContactSearch } from './contact-search'

export type ContactRow = {
  id: string
  phone_e164: string
  name: string | null
  source: string | null
  wa_status: string | null
}

export type GroupOption = { id: string; name: string }

function sourceLabel(source: string) {
  if (source === 'whatsapp') return 'WhatsApp'
  if (source === 'csv' || source === 'manual') return 'Excel / manuel'
  if (source === 'scraper' || source === 'maps') return 'Liste'
  return source
}

/** Defter: seç → gruba taşı / sil. Gruptan çıkar burada yok. */
export function ContactsBoard({
  contacts,
  groups,
  searchQuery,
}: {
  contacts: ContactRow[]
  groups: GroupOption[]
  searchQuery: string
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [searching, startSearch] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState(searchQuery)
  const [targetList, setTargetList] = useState(groups[0]?.id ?? '')
  const [message, setMessage] = useState<string | null>(null)
  useSyncBusy(pending, 'Kişiler güncelleniyor…')

  const applySearch = useCallback(
    (raw: string) => {
      const next = sanitizeContactSearch(raw)
      if (next === searchQuery) return
      const params = new URLSearchParams()
      params.set('gorunum', 'defter')
      if (next) params.set('ara', next)
      startSearch(() => {
        router.replace(`/kisiler?${params.toString()}`, { scroll: false })
      })
    },
    [router, searchQuery],
  )

  useEffect(() => {
    setQuery(searchQuery)
    setSelected(new Set())
  }, [searchQuery])

  useEffect(() => {
    if (sanitizeContactSearch(query) === searchQuery) return
    const timer = window.setTimeout(() => applySearch(query), 320)
    return () => window.clearTimeout(timer)
  }, [query, searchQuery, applySearch])

  const allVisibleSelected =
    contacts.length > 0 && contacts.every((row) => selected.has(row.id))

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        for (const row of contacts) next.delete(row.id)
      } else {
        for (const row of contacts) next.add(row.id)
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
    <div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              applySearch(query)
            }
          }}
          placeholder="Ad veya numara ara"
          className="wb-wa-search min-w-[140px] flex-1"
          type="search"
          autoComplete="off"
        />
        <button type="button" className="wb-wa-text-btn" onClick={toggleAll} disabled={contacts.length === 0 || pending}>
          {allVisibleSelected ? 'Seçimi kaldır' : 'Sayfayı seç'}
        </button>
      </div>

      {selected.size > 0 ? (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 bg-[#e7f8f2] px-3 py-2">
          <span className="text-[13px] font-semibold text-[#008069] tabular">{selected.size} seçili</span>
          <select
            value={targetList}
            onChange={(e) => setTargetList(e.target.value)}
            className="h-9 min-w-[120px] flex-1 rounded-full border-0 bg-white px-3 text-[13px] text-[#111b21]"
            disabled={groups.length === 0 || pending}
            aria-label="Hedef grup"
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
          <button
            type="button"
            className="wb-wa-text-btn"
            disabled={!targetList || pending}
            onClick={() => run(() => addContactsToList(targetList, [...selected]))}
          >
            Gruba taşı
          </button>
          <button
            type="button"
            className="wb-wa-text-btn is-danger"
            disabled={pending}
            onClick={() => {
              void (async () => {
                const ok = await confirm({
                  title: `${selected.size} kişi silinsin mi?`,
                  description: 'Defterden kalıcı silinir.',
                  confirmLabel: 'Sil',
                  cancelLabel: 'Vazgeç',
                  tone: 'danger',
                })
                if (!ok) return
                run(() => deleteContacts([...selected]))
              })()
            }}
          >
            Sil
          </button>
        </div>
      ) : null}

      {message ? <Notice tone="danger">{message}</Notice> : null}

      {contacts.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-[#667781]">
          {searchQuery ? 'Eşleşen kişi yok.' : 'Numara yok.'}
        </p>
      ) : (
        <ul className={`wb-inbox-list${searching ? ' opacity-60' : ''}`}>
          {contacts.map((row) => (
            <li key={row.id} className={selected.has(row.id) ? 'is-selected' : undefined}>
              <button
                type="button"
                onClick={() => toggleOne(row.id)}
                aria-pressed={selected.has(row.id)}
                aria-label={`${row.name || row.phone_e164} seç`}
                className="wb-wa-row w-full text-left"
              >
                <span
                  className="wb-wa-avatar"
                  style={{ background: waAvatarColor(row.phone_e164) }}
                  aria-hidden
                >
                  {waAvatarLetters(row.name, row.phone_e164)}
                </span>
                <span className="wb-wa-row-main">
                  <span className="wb-wa-row-top">
                    <span className="wb-wa-name">{row.name || row.phone_e164}</span>
                    <WaMark status={row.wa_status ?? 'unknown'} />
                  </span>
                  <span className="wb-wa-row-bottom">
                    <span className="wb-wa-preview">
                      {row.phone_e164}
                      {row.source ? ` · ${sourceLabel(row.source)}` : ''}
                    </span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
