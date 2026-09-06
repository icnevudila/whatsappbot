'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, EmptyState, Input, Notice } from '@/components/ui'
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
}: {
  listId: string
  members: MemberRow[]
  totalCount?: number
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
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
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ara"
          className="min-w-[140px] flex-1"
        />
        <Button type="button" onClick={toggleAll} disabled={filtered.length === 0 || pending}>
          {allSelected ? 'Seçimi kaldır' : 'Sayfadakileri seç'}
        </Button>
        <Button
          type="button"
          variant="danger"
          disabled={selected.size === 0 || pending}
          onClick={() =>
            run(() => removeContactsFromList(listId, [...selected]))
          }
        >
          Gruptan çıkar ({selected.size})
        </Button>
      </div>

      {error ? <Notice tone="danger">{error}</Notice> : null}

      <ul className="divide-y divide-hairline rounded-md border border-hairline">
        {filtered.map((member) => (
          <li
            key={member.contact_id}
            className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2.5"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <input
                type="checkbox"
                checked={selected.has(member.contact_id)}
                onChange={() => toggleOne(member.contact_id)}
                className="size-4 accent-[var(--color-accent)]"
                aria-label={member.phone_e164}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <WaMark status={member.wa_status} showLabel />
                  <span className="font-mono text-[12.5px] tabular">{member.phone_e164}</span>
                </div>
                {member.name ? (
                  <p className="mt-0.5 text-[11.5px] text-ink-muted">{member.name}</p>
                ) : null}
              </div>
            </div>

            <div className="flex gap-1.5">
              <Button
                disabled={pending}
                onClick={() => {
                  void (async () => {
                    const ok = await confirm({
                      title: 'Kara listeye eklensin mi?',
                      description: 'Bu numaraya bir daha kampanya gitmez.',
                      confirmLabel: 'Ekle',
                      cancelLabel: 'Vazgeç',
                      tone: 'danger',
                    })
                    if (!ok) return
                    run(() =>
                      blacklistPhone(member.phone_e164, 'Liste detayından eklendi'),
                    )
                  })()
                }}
              >
                Kara liste
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  run(() => removeContactsFromList(listId, [member.contact_id]))
                }
              >
                Çıkar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
