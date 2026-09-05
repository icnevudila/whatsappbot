'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AccentLink, Card, CardHeader, EmptyState, QuietLink, StatusPill } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type OutboundMessage = {
  id: number
  account_id: string | null
  direction: string
  phone_e164: string | null
  remote_jid: string | null
  message_type: string
  body: string | null
  status: string
  created_at: string
  campaign_id: string | null
}

const timeFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function messageTypeLabel(type: string): string {
  switch (type) {
    case 'text':
      return 'metin'
    case 'image':
      return 'görsel'
    case 'video':
      return 'video'
    case 'document':
      return 'belge'
    case 'audio':
      return 'ses'
    case 'sticker':
      return 'çıkartma'
    default:
      return type || 'mesaj'
  }
}

function previewBody(body: string | null, messageType: string): string {
  const trimmed = body?.trim()
  if (trimmed) return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed
  return `(${messageTypeLabel(messageType)})`
}

function displayPhone(row: OutboundMessage): string {
  if (row.phone_e164) return row.phone_e164
  if (row.remote_jid) return row.remote_jid.replace(/@lid$/, '')
  return '—'
}

export function OutboundBoard({
  orgId,
  messages,
  accountLabels,
  campaignNames,
}: {
  orgId: string
  messages: OutboundMessage[]
  accountLabels: Record<string, string>
  campaignNames: Record<string, string>
}) {
  const router = useRouter()
  const [rows, setRows] = useState(messages)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  useEffect(() => {
    setRows(messages)
  }, [messages])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel('gidenler-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_log',
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as OutboundMessage
          if (row.direction === 'out') router.refresh()
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, router])

  const selected = rows.find((row) => row.id === selectedId) ?? null

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <Card>
        <CardHeader
          title="Giden mesajlar"
          subtitle={
            rows.length === 0
              ? 'Son 200 kayıt'
              : `${rows.length} kayıt · en yeni üstte`
          }
        />

        {rows.length === 0 ? (
          <EmptyState
            title="Henüz giden yok"
            description="Kampanya veya hızlı gönderimle mesaj atınca kayıtlar burada listelenir."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>
                <QuietLink href="/kampanyalar">Kampanyalar</QuietLink>
              </div>
            }
          />
        ) : (
          <ul className="max-h-[70vh] divide-y divide-hairline overflow-y-auto">
            {rows.map((row) => {
              const active = row.id === selectedId
              const phone = displayPhone(row)
              const accountLabel = row.account_id
                ? accountLabels[row.account_id] ?? null
                : null
              const campaignLabel = row.campaign_id
                ? campaignNames[row.campaign_id] ?? 'Kampanya'
                : null

              return (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(active ? null : row.id)}
                    className={`block w-full px-4 py-3 text-left transition-colors hover:bg-surface-raised ${
                      active ? 'bg-accent-soft' : ''
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-mono text-[12.5px] tabular">{phone}</p>
                      <span className="shrink-0 text-[10.5px] text-ink-faint">
                        {timeFormat.format(new Date(row.created_at))}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                      {previewBody(row.body, row.message_type)}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                      {accountLabel ? <span>{accountLabel}</span> : null}
                      {campaignLabel ? (
                        <span className="rounded-sm border border-accent/30 bg-accent/8 px-1 py-px text-[10px] text-accent">
                          {campaignLabel}
                        </span>
                      ) : (
                        <span className="rounded-sm border border-hairline px-1 py-px text-[10px]">
                          Hızlı gönderim
                        </span>
                      )}
                      {row.status ? <StatusPill status={row.status} /> : null}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        {selected ? (
          <>
            <CardHeader
              title={displayPhone(selected)}
              subtitle={[
                selected.account_id && accountLabels[selected.account_id]
                  ? `Hat: ${accountLabels[selected.account_id]}`
                  : null,
                'salt okuma',
              ]
                .filter(Boolean)
                .join(' · ')}
              action={selected.status ? <StatusPill status={selected.status} /> : undefined}
            />
            <div className="space-y-3 p-4">
              <p className="whitespace-pre-wrap text-[13px] text-ink">
                {selected.body?.trim()
                  ? selected.body
                  : `(${messageTypeLabel(selected.message_type)})`}
              </p>
              <p className="text-[11.5px] text-ink-faint">
                {timeFormat.format(new Date(selected.created_at))}
                {selected.campaign_id ? (
                  <>
                    {' · '}
                    <Link
                      href={`/kampanyalar/${selected.campaign_id}`}
                      className="text-accent underline decoration-hairline-strong underline-offset-2"
                    >
                      {campaignNames[selected.campaign_id] ?? 'Kampanya'}
                    </Link>
                  </>
                ) : (
                  ' · hızlı gönderim'
                )}
              </p>
              {selected.phone_e164 ? (
                <AccentLink href={`/gelenler?tel=${encodeURIComponent(selected.phone_e164)}`}>
                  Gelenlerde aç
                </AccentLink>
              ) : null}
            </div>
          </>
        ) : (
          <EmptyState
            title="Bir kayıt seçin"
            description="Soldan bir giden mesaja tıklayın. Tam metin burada görünür."
            action={<AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>}
          />
        )}
      </Card>
    </div>
  )
}
