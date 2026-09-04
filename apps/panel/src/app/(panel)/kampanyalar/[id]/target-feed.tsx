'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Tables } from '@wa/shared'
import { Card, CardHeader, EmptyState, StatusPill } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type TargetView = Pick<
  Tables<'campaign_targets'>,
  'id' | 'phone_e164' | 'status' | 'error' | 'sent_at' | 'wa_message_id' | 'updated_at'
>

type Filter = 'all' | 'sent' | 'queued' | 'skipped' | 'failed' | 'sending'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'sent', label: 'Gönderildi' },
  { key: 'queued', label: 'Kuyruk' },
  { key: 'sending', label: 'Gönderiliyor' },
  { key: 'skipped', label: 'Atlandı' },
  { key: 'failed', label: 'Başarısız' },
]

/**
 * Kampanya hedefleri — giden numaralarin gercek kaynagi.
 *
 * message_log bazen yazilmadan kalabiliyor (timeout / restart); campaign_targets
 * her zaman guncelleniyor. Bu yuzden listeyi buradan okuyoruz.
 */
export function TargetFeed({
  campaignId,
  initial,
}: {
  campaignId: string
  initial: TargetView[]
}) {
  const [targets, setTargets] = useState(initial)
  const [filter, setFilter] = useState<Filter>('all')

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
    }
    for (const row of targets) {
      if (row.status in base) base[row.status as Filter] += 1
    }
    return base
  }, [targets])

  const visible = filter === 'all' ? targets : targets.filter((row) => row.status === filter)

  return (
    <Card>
      <CardHeader
        title="Numaralar"
        subtitle={`${counts.sent} gönderildi · ${counts.skipped} atlandı · ${counts.failed} başarısız · ${counts.queued + counts.sending} bekliyor`}
      />

      <div className="flex flex-wrap gap-1 border-b border-hairline px-4 py-2">
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
          title="Henüz hedef yok"
          description="Kampanya başladığında numaralar burada listelenir."
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {visible.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 px-4 py-2.5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[12.5px] tabular text-ink">
                    {row.phone_e164}
                  </span>
                  <StatusPill status={row.status} />
                </div>
                {row.error ? (
                  <p className="mt-0.5 truncate text-[11.5px] text-danger">{row.error}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-[11.5px] tabular text-ink-faint">
                {row.sent_at
                  ? new Date(row.sent_at).toLocaleTimeString('tr-TR')
                  : new Date(row.updated_at).toLocaleTimeString('tr-TR')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
