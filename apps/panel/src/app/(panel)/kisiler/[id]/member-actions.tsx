'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, EmptyState, Notice } from '@/components/ui'
import { WaMark } from '@/components/wa-mark'
import { blacklistPhone } from '../../kara-liste/actions'
import { removeMember } from '../actions'

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
}: {
  listId: string
  members: MemberRow[]
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const run = (key: string, action: () => Promise<{ error?: string }>) => {
    setError(null)
    setBusy(key)
    startTransition(async () => {
      const result = await action()
      if (result.error) setError(result.error)
      else router.refresh()
      setBusy(null)
    })
  }

  if (members.length === 0) {
    return (
      <EmptyState
        tone="people"
        title="Bu listede numara yok"
        description="Listeye numara ekleyin; ardından kampanyada kullanın."
      />
    )
  }

  return (
    <div>
      {error ? (
        <div className="border-b border-hairline p-3">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      <ul className="divide-y divide-hairline">
        {members.map((member) => (
          <li
            key={member.contact_id}
            className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <WaMark status={member.wa_status} showLabel />
                <span className="font-mono text-[12.5px] tabular">{member.phone_e164}</span>
              </div>
              {member.name ? (
                <p className="mt-0.5 text-[11.5px] text-ink-muted">{member.name}</p>
              ) : null}
            </div>

            <div className="flex gap-1.5">
              <Button
                disabled={busy === `bl-${member.contact_id}`}
                onClick={() =>
                  run(`bl-${member.contact_id}`, () =>
                    blacklistPhone(member.phone_e164, 'Liste detayından eklendi'),
                  )
                }
                title="Bu numaraya bir daha mesaj gönderilmez"
              >
                Kara liste
              </Button>
              <Button
                variant="danger"
                disabled={busy === `rm-${member.contact_id}`}
                onClick={() =>
                  run(`rm-${member.contact_id}`, () =>
                    removeMember(listId, member.contact_id),
                  )
                }
              >
                Listeden çıkar
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
