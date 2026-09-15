'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmptyState, Notice } from '@/components/ui'
import { Icon } from '@/components/icon'
import { WaMark } from '@/components/wa-mark'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { blacklistPhone } from '../../kara-liste/actions'
import { waAvatarColor, waAvatarLetters } from '@/lib/wa-avatar'
import { removeContactsFromList } from '../actions'

export type MemberRow = {
  contact_id: string
  phone_e164: string
  name: string | null
  wa_status: string
  wa_checked_at: string | null
}

export function MemberActions({
  listId,
  members,
  totalCount = 0,
  query = '',
}: {
  listId: string
  members: MemberRow[]
  totalCount?: number
  query?: string
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  useSyncBusy(pending, 'Grup güncelleniyor…')

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    if (!q) return members
    return members.filter((row) => {
      const hay = `${row.phone_e164} ${row.name ?? ''}`.toLocaleLowerCase('tr-TR')
      return hay.includes(q)
    })
  }, [members, query])

  const allSelected =
    filtered.length > 0 && filtered.every((row) => selected.has(row.contact_id))

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        for (const row of filtered) next.delete(row.contact_id)
      } else {
        for (const row of filtered) next.add(row.contact_id)
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
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
        return
      }
      if (result.ok) toast(result.ok, 'success')
      setSelected(new Set())
      router.refresh()
    })
  }

  if (members.length === 0) {
    if (totalCount > 0) {
      return (
        <p className="px-3.5 py-4 text-[12.5px] text-ink-faint">Bu sayfada numara yok.</p>
      )
    }
    return (
      <EmptyState
        tone="people"
        title="Bu grupta numara yok"
        description="Kişiler sayfasından seçip “Gruba ekle” de — veya Excel ile yeniden doldur."
        action={
          <a href="/kisiler" className="text-[13px] font-semibold text-accent underline-offset-2 hover:underline">
            Deftere git →
          </a>
        }
      />
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" className="wb-wa-text-btn" onClick={toggleAll} disabled={filtered.length === 0 || pending}>
          {allSelected ? 'Seçimi kaldır' : 'Sayfadakileri seç'}
        </button>
        <button
          type="button"
          className="wb-wa-text-btn is-danger"
          disabled={selected.size === 0 || pending}
          onClick={() =>
            run(() => removeContactsFromList(listId, [...selected]))
          }
        >
          Çıkar ({selected.size})
        </button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {filtered.length === 0 ? (
        <p className="px-4 py-6 text-center text-[13px] text-[#667781]">
          Eşleşen üye yok.
        </p>
      ) : (
      <ul className="wb-inbox-list wb-inbox-list--plain">
        {filtered.map((member) => {
          const title = member.name?.trim() || member.phone_e164
          return (
            <li
              key={member.contact_id}
              className={`wb-wa-group-item${selected.has(member.contact_id) ? ' is-selected' : ''}`}
            >
              <label className="wb-wa-row min-w-0 flex-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.has(member.contact_id)}
                  onChange={() => toggleOne(member.contact_id)}
                  className="sr-only"
                />
                <span
                  className="wb-wa-avatar"
                  style={{ background: waAvatarColor(member.phone_e164) }}
                  aria-hidden
                >
                  {waAvatarLetters(member.name, member.phone_e164)}
                </span>
                <span className="wb-wa-row-main">
                  <span className="wb-wa-row-top">
                    <span className="wb-wa-name">{title}</span>
                    <WaMark status={member.wa_status} />
                  </span>
                  <span className="wb-wa-row-bottom">
                    <span className="wb-wa-preview">
                      {member.name ? member.phone_e164 : member.wa_status === 'valid' ? 'WhatsApp’ta var' : member.wa_status === 'invalid' ? 'WhatsApp’ta yok' : 'Kontrol edilmedi'}
                    </span>
                  </span>
                </span>
              </label>
              <div className="wb-wa-group-actions">
                <MemberMenu
                  phone={member.phone_e164}
                  pending={pending}
                  onBlacklist={() => {
                    void (async () => {
                      const ok = await confirm({
                        title: 'Kara listeye eklensin mi?',
                        description: 'Bu numaraya bir daha kampanya gitmez.',
                        confirmLabel: 'Ekle',
                        cancelLabel: 'Vazgeç',
                        tone: 'danger',
                      })
                      if (!ok) return
                      run(() => blacklistPhone(member.phone_e164, 'Liste detayından eklendi'))
                    })()
                  }}
                  onRemove={() => run(() => removeContactsFromList(listId, [member.contact_id]))}
                />
              </div>
            </li>
          )
        })}
      </ul>
      )}
    </div>
  )
}

function MemberMenu({
  phone,
  pending,
  onBlacklist,
  onRemove,
}: {
  phone: string
  pending: boolean
  onBlacklist: () => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPos(null)
      return
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPos({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
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
    const onDoc = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return
      if (menuRef.current?.contains(event.target)) return
      if (menuPanelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const menu =
    open && menuPos
      ? createPortal(
          <div
            ref={menuPanelRef}
            role="menu"
            className="wb-wa-menu wb-wa-menu--fixed"
            style={{ top: menuPos.top, right: menuPos.right }}
          >
            <Link
              href={`/mesajlar?tel=${encodeURIComponent(phone)}`}
              role="menuitem"
              className="wb-wa-menu-item"
              onClick={() => setOpen(false)}
            >
              <Icon name="inbox" className="size-4 text-ink-muted" />
              Mesaj gönder
            </Link>
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="wb-wa-menu-item"
              onClick={() => {
                setOpen(false)
                onBlacklist()
              }}
            >
              <Icon name="shield" className="size-4 text-ink-muted" />
              Kara liste
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="wb-wa-menu-item is-danger"
              onClick={() => {
                setOpen(false)
                onRemove()
              }}
            >
              <Icon name="close" className="size-4" />
              Gruptan çıkar
            </button>
          </div>,
          document.body,
        )
      : null

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Üye işlemleri"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="wb-wa-icon-btn"
      >
        <Icon name="ellipsis" className="size-5" />
      </button>
      {menu}
    </div>
  )
}
