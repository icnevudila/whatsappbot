'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Tables } from '@wa/shared'
import { CardHeader, EmptyState, QuietLink, StatusPill } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type TargetView = Pick<
  Tables<'campaign_targets'>,
  'id' | 'phone_e164' | 'status' | 'error' | 'sent_at' | 'wa_message_id' | 'updated_at'
>

type Filter = 'all' | 'sent' | 'queued' | 'skipped' | 'failed' | 'sending' | 'delivered' | 'read'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'sent', label: 'Gönderildi' },
  { key: 'delivered', label: 'Teslim' },
  { key: 'read', label: 'Okundu' },
  { key: 'queued', label: 'Kuyruk' },
  { key: 'sending', label: 'Gönderiliyor' },
  { key: 'skipped', label: 'Atlandı' },
  { key: 'failed', label: 'Başarısız' },
]

function statusRail(status: string): string {
  switch (status) {
    case 'sent':
    case 'sending':
      return 'border-l-[3px] border-l-accent'
    case 'delivered':
    case 'read':
      return 'border-l-[3px] border-l-ok'
    case 'failed':
      return 'border-l-[3px] border-l-danger'
    case 'skipped':
      return 'border-l-[3px] border-l-warn'
    default:
      return 'border-l-[3px] border-l-hairline-strong'
  }
}

/**
 * Kampanya hedefleri — giden numaralarin gercek kaynagi (paylasilanlar).
 */
export function TargetFeed({
  campaignId,
  initial,
  campaignStatus,
}: {
  campaignId: string
  initial: TargetView[]
  campaignStatus?: string
}) {
  const [targets, setTargets] = useState(initial)
  const [filter, setFilter] = useState<Filter>('all')
  const flashIds = useRef(new Set<number>())

  useEffect(() => {
    setTargets(initial)
  }, [initial])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`campaign-targets-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campaign_targets',
          filter: `campaign_id=eq.${campaignId}`,
        },
        (payload) => {
          setTargets((current) => {
            if (payload.eventType === 'DELETE') {
              const removedId = (payload.old as { id?: number }).id
              return current.filter((row) => row.id !== removedId)
            }

            const next = payload.new as TargetView
            flashIds.current.add(next.id)
            const exists = current.some((row) => row.id === next.id)
            const merged = exists
              ? current.map((row) => (row.id === next.id ? { ...row, ...next } : row))
              : [next, ...current]

            return merged.sort((a, b) => b.id - a.id)
          })
        },
      )
      .subscribe()

    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('campaign_targets')
        .select('id, phone_e164, status, error, sent_at, wa_message_id, updated_at')
        .eq('campaign_id', campaignId)
        .order('id', { ascending: false })
        .limit(200)

      if (data) setTargets(data as TargetView[])
    }

    const timer = setInterval(() => {
      void poll()
    }, 3_000)
    void poll()

    return () => {
      clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [campaignId])

  const counts = useMemo(() => {
    const base: Record<Filter, number> = {
      all: targets.length,
      sent: 0,
      queued: 0,
      sending: 0,
      skipped: 0,
      failed: 0,
      delivered: 0,
      read: 0,
    }
    for (const row of targets) {
      if (row.status in base) base[row.status as Filter] += 1
    }
    return base
  }, [targets])

  const visible = filter === 'all' ? targets : targets.filter((row) => row.status === filter)

  const emptyTitle =
    targets.length === 0
      ? campaignStatus === 'draft'
        ? 'Henüz numara yok'
        : 'Paylaşılan numara yok'
      : 'Bu filtrede satır yok'

  const emptyDescription =
    targets.length === 0
      ? campaignStatus === 'draft'
        ? 'Kampanya başlayınca numaralar burada listelenir.'
        : 'Bu kampanya için henüz numara satırı oluşmamış.'
      : 'Başka bir durum filtresi seçin veya Tümü’ne dönün.'

  return (
    <div className="flex max-h-[min(32rem,calc(100dvh-14rem))] min-h-[18rem] flex-col overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]">
      <CardHeader
        title="Paylaşılanlar"
        subtitle={`${counts.sent + counts.delivered + counts.read} iletildi · ${counts.skipped} atlandı · ${counts.failed} başarısız · ${counts.queued + counts.sending} bekliyor`}
      />

      <p className="shrink-0 border-b border-hairline px-3.5 py-2 text-[11.5px] leading-relaxed text-ink-faint">
        Numaraya tıklayınca Mesajlar’da konuşmayı açar.{' '}
        <span className="font-medium text-ink-muted">Atlandı:</span> WhatsApp’ta yok / kota.{' '}
        <span className="font-medium text-ink-muted">Başarısız:</span> iletilemedi.
      </p>

      <div className="flex shrink-0 flex-wrap gap-1 border-b border-hairline px-3.5 py-2">
        {FILTERS.map((item) => {
          const count = counts[item.key]
          if (item.key !== 'all' && count === 0) return null

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded-md px-2.5 py-1 text-[12px] transition-colors ${
                filter === item.key
                  ? 'bg-accent-soft font-medium text-accent'
                  : 'text-ink-muted hover:bg-surface-raised hover:text-ink'
              }`}
            >
              {item.label}
              <span className="ml-1 tabular text-ink-faint">{count}</span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <EmptyState
          tone="campaign"
          title={emptyTitle}
          description={emptyDescription}
          action={
            targets.length === 0 ? (
              <QuietLink href="/kisiler">Kişilere git</QuietLink>
            ) : (
              <button
                type="button"
                onClick={() => setFilter('all')}
                className="text-[12.5px] font-medium text-accent underline underline-offset-2"
              >
                Tümünü göster
              </button>
            )
          }
        />
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-hairline overflow-y-auto">
          {visible.map((row) => {
            const flash = flashIds.current.has(row.id)
            return (
              <li
                key={row.id}
                className={`wb-list-row flex items-start justify-between gap-2.5 px-3.5 py-2.5 ${statusRail(row.status)} ${
                  flash ? 'wb-row-flash' : ''
                }`}
                onAnimationEnd={() => {
                  if (flash) flashIds.current.delete(row.id)
                }}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/mesajlar?tel=${encodeURIComponent(row.phone_e164)}`}
                      className="font-mono text-[12.5px] tabular text-ink underline-offset-2 hover:text-accent hover:underline"
                      title="Mesajlar’da konuşmayı aç"
                    >
                      {row.phone_e164}
                    </Link>
                    <StatusPill status={row.status} />
                  </div>
                  {row.error ? (
                    <p className="mt-0.5 truncate text-[11.5px] text-danger" title={row.error}>
                      {row.error}
                    </p>
                  ) : null}
                </div>
                <span className="shrink-0 text-[11.5px] tabular text-ink-faint">
                  {row.sent_at
                    ? new Date(row.sent_at).toLocaleTimeString('tr-TR')
                    : new Date(row.updated_at).toLocaleTimeString('tr-TR')}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
