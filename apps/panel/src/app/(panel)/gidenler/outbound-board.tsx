'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AccentLink, CardHeader, EmptyState, QuietLink, SplitPane, StatusPill } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

function statusRail(status: string): string {
  switch (status) {
    case 'sent':
    case 'sending':
    case 'queued':
    case 'pending':
      return 'border-l-[3px] border-l-accent'
    case 'delivered':
    case 'read':
      return 'border-l-[3px] border-l-ok'
    case 'failed':
    case 'skipped':
      return 'border-l-[3px] border-l-danger'
    default:
      return 'border-l-[3px] border-l-hairline-strong'
  }
}

function statusRowTint(status: string, active: boolean): string {
  if (active) {
    return 'bg-accent-soft ring-1 ring-accent/20'
  }
  switch (status) {
    case 'sent':
    case 'sending':
      return 'bg-accent-soft/35'
    case 'delivered':
    case 'read':
      return 'bg-ok-soft/40'
    case 'failed':
      return 'bg-[#fff5f4]'
    default:
      return ''
  }
}

function detailShell(status: string): string {
  switch (status) {
    case 'delivered':
    case 'read':
      return 'border-ok/30 bg-ok-soft/40'
    case 'failed':
      return 'border-danger/30 bg-[#fff5f4]'
    case 'sent':
    case 'sending':
      return 'border-accent/25 bg-accent-soft/50'
    default:
      return 'border-hairline bg-surface-raised/50'
  }
}

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
    <SplitPane
      list={
        <div className={selected ? 'hidden lg:flex lg:min-h-0 lg:flex-col' : 'flex min-h-0 flex-col'}>
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
              tone="outbound"
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
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
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
                      className={`block w-full rounded-[var(--radius-sm)] border border-transparent px-3.5 py-2.5 text-left transition-colors hover:border-hairline ${statusRail(row.status)} ${statusRowTint(row.status, active)}`}
                    >
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-mono text-[13px] font-medium tabular">{phone}</p>
                        <span className="shrink-0 text-[11px] text-ink-faint">
                          {timeFormat.format(new Date(row.created_at))}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
                        {previewBody(row.body, row.message_type)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-faint">
                        {accountLabel ? <span>{accountLabel}</span> : null}
                        {campaignLabel ? (
                          <span className="rounded-sm border border-accent/30 bg-accent-soft px-1.5 py-px text-[10.5px] font-medium text-accent">
                            {campaignLabel}
                          </span>
                        ) : (
                          <span className="rounded-sm border border-hairline bg-surface-raised px-1.5 py-px text-[10.5px]">
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
        </div>
      }
      detail={
        <div className={`flex min-h-0 flex-col ${selected ? '' : 'hidden lg:flex'}`}>
          {selected ? (
            <>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="border-b border-hairline px-3.5 py-2.5 text-left text-[12.5px] font-medium text-accent lg:hidden"
              >
                ← Tüm kayıtlar
              </button>
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
              <div className="p-3.5">
                <div
                  className={`space-y-2.5 rounded-[var(--radius-card)] border p-3.5 shadow-[var(--shadow-card)] ${detailShell(selected.status)}`}
                >
                  <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">
                    {selected.body?.trim()
                      ? selected.body
                      : `(${messageTypeLabel(selected.message_type)})`}
                  </p>
                  <p className="text-[12px] text-ink-muted">
                    {timeFormat.format(new Date(selected.created_at))}
                    {selected.campaign_id ? (
                      <>
                        {' · '}
                        <Link
                          href={`/kampanyalar/${selected.campaign_id}`}
                          className="font-medium text-accent underline decoration-hairline-strong underline-offset-2"
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
              </div>
            </>
          ) : (
            <EmptyState
              tone="outbound"
              title="Bir kayıt seçin"
              description="Soldan bir giden mesaja tıklayın. Tam metin burada görünür."
              action={<AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>}
            />
          )}
        </div>
      }
    />
  )
}
