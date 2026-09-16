'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Input, Notice } from '@/components/ui'
import { Icon } from '@/components/icon'
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

function TargetGroupPicker({
  groups,
  value,
  onChange,
  disabled,
}: {
  groups: GroupOption[]
  value: string
  onChange: (id: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const selected = groups.find((g) => g.id === value)
  const label =
    groups.length === 0 ? 'Önce grup oluştur' : selected?.name || 'Grup seç'

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPos(null)
      return
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.max(rect.width, 200)
      const left = Math.min(rect.left, window.innerWidth - width - 8)
      setPos({
        top: rect.bottom + 4,
        left: Math.max(8, left),
        width,
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node)) return
      if (wrapRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <div className="wb-wa-group-picker" ref={wrapRef}>
        <button
          ref={buttonRef}
          type="button"
          className="wb-wa-group-picker-btn"
          aria-label="Hedef grup"
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={disabled || groups.length === 0}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="wb-wa-group-picker-label">{label}</span>
          <Icon name="outbound" className="wb-wa-group-picker-caret size-3.5" />
        </button>
      </div>
      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-label="Hedef grup"
              className="wb-wa-menu wb-wa-menu--fixed wb-wa-group-picker-menu"
              style={{ top: pos.top, left: pos.left, width: pos.width, right: 'auto' }}
            >
              {groups.map((g) => {
                const active = g.id === value
                return (
                  <button
                    key={g.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`wb-wa-menu-item${active ? ' is-active' : ''}`}
                    onClick={() => {
                      onChange(g.id)
                      setOpen(false)
                    }}
                  >
                    <span
                      className="wb-wa-avatar wb-wa-avatar--sm"
                      style={{ background: waAvatarColor(g.id) }}
                      aria-hidden
                    >
                      {waAvatarLetters(g.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{g.name}</span>
                    {active ? <Icon name="check" className="size-4 shrink-0 text-[#008069]" /> : null}
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
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
        <div className="wb-wa-bulk-bar sticky top-0 z-10">
          <span className="wb-wa-bulk-count">{selected.size} seçili</span>
          <TargetGroupPicker
            groups={groups}
            value={targetList}
            onChange={setTargetList}
            disabled={pending}
          />
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
