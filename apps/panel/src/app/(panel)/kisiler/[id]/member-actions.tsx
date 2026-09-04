'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, EmptyState, Notice } from '@/components/ui'
import { blacklistPhone } from '../../kara-liste/actions'
import { removeMember } from '../actions'

export type MemberRow = {
  contact_id: string
  phone_e164: string
  name: string | null
  wa_status: string
  wa_checked_at: string | null
}

const WA_TONE: Record<string, string> = {
  valid: 'border-ok/35 bg-ok-soft text-ok',
  invalid: 'border-danger/35 bg-danger/10 text-danger',
  unknown: 'border-hairline bg-canvas text-ink-muted',
  pending: 'border-hairline bg-canvas text-ink-muted',
}

const WA_LABEL: Record<string, string> = {
  valid: 'WhatsApp’ta var',
  invalid: 'WhatsApp’ta yok',
  unknown: 'Bekliyor',
  pending: 'Bekliyor',
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
        title="Bu listede numara yok"
        description="İçe aktarma veya yerel keşiften numara ekleyin; ardından kampanyada kullanın."
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
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[12.5px] tabular">{member.phone_e164}</span>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${
                    WA_TONE[member.wa_status] ?? WA_TONE.unknown
                  }`}
                >
                  {WA_LABEL[member.wa_status] ?? member.wa_status}
                </span>
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
