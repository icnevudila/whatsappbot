'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, EmptyState, Notice } from '@/components/ui'
import { Icon } from '@/components/icon'
import { WaMark } from '@/components/wa-mark'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { blacklistPhone } from '../../kara-liste/actions'
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
    <div className="space-y-3 p-3.5">
      <div className="flex gap-2">
        <Button type="button" className="flex-1 sm:flex-none" onClick={toggleAll} disabled={filtered.length === 0 || pending}>
          {allSelected ? 'Seçimi kaldır' : 'Sayfadakileri seç'}
        </Button>
        <Button
          type="button"
          variant="danger"
          className="flex-1 sm:flex-none"
          disabled={selected.size === 0 || pending}
          onClick={() =>
            run(() => removeContactsFromList(listId, [...selected]))
          }
        >
          Çıkar ({selected.size})
        </Button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {filtered.length === 0 ? (
        <p className="rounded-md border border-hairline px-3 py-3 text-[12.5px] text-ink-faint">
          Eşleşen üye yok.
        </p>
      ) : (
      <ul className="divide-y divide-hairline overflow-visible rounded-md border border-hairline">
        {filtered.map((member) => {
          const title = member.name?.trim() || member.phone_e164
          return (
            <li
              key={member.contact_id}
              className={`flex items-center gap-2 px-3 py-2.5 ${
                selected.has(member.contact_id) ? 'bg-accent-soft/50' : 'hover:bg-canvas'
              }`}
            >
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={selected.has(member.contact_id)}
                  onChange={() => toggleOne(member.contact_id)}
                  className="size-4 shrink-0 accent-[var(--color-accent)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold leading-snug text-ink">{title}</p>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                    <WaMark status={member.wa_status} />
                    {member.name ? (
                      <span className="truncate font-mono text-[12px] tabular text-ink-muted">
                        {member.phone_e164}
                      </span>
                    ) : (
                      <span className="truncate text-[12px] text-ink-muted">
                        {member.wa_status === 'valid'
                          ? 'WhatsApp’ta var'
                          : member.wa_status === 'invalid'
                            ? 'WhatsApp’ta yok'
                            : 'Kontrol edilmedi'}
                      </span>
                    )}
                  </div>
                </div>
              </label>
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
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false)
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

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Üye işlemleri"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-8 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas disabled:opacity-50"
      >
        <Icon name="ellipsis" className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[11.5rem] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
        >
          <Link
            href={`/mesajlar?tel=${encodeURIComponent(phone)}`}
            role="menuitem"
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
            onClick={() => setOpen(false)}
          >
            <Icon name="inbox" className="size-4 text-ink-muted" />
            Mesaj gönder
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas disabled:opacity-50"
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
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-danger hover:bg-canvas disabled:opacity-50"
            onClick={() => {
              setOpen(false)
              onRemove()
            }}
          >
            <Icon name="close" className="size-4" />
            Gruptan çıkar
          </button>
        </div>
      ) : null}
    </div>
  )
}
