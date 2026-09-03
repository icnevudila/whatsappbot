'use client'

import { useEffect } from 'react'
import { Card, CardHeader, EmptyState } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useServerSyncedState } from '@/lib/use-server-synced-state'

export type EventView = {
  id: number
  account_id: string | null
  level: string
  event: string
  detail: Record<string, unknown>
  created_at: string
}

/**
 * Servis olay adlarini makine formatinda yaziyor (account.reachout_timelock).
 * Panelde ham hali gostermek, en cok bakilacak ekranda en az okunur seyi
 * gostermek olurdu.
 */
const LABELS: Record<string, string> = {
  'account.connected': 'Hat baglandi',
  'account.logged_out': 'Telefondan cikis yapildi',
  'account.locked': 'Hat kilitlendi',
  'account.auth_cleared': 'Oturum sifirlandi',
  'account.version_mismatch': 'WhatsApp surumu uyumsuz',
  'account.bad_session': 'Oturum bozuldu, yeniden baglaniyor',
  'account.connection_replaced': 'Baglanti baska bir cihaza gecti',
  'account.qr_expired': 'QR kodunun suresi doldu',
  'account.reachout_timelock': 'Gonderim kisiti (463) uygulandi',
  'account.logout_requested': 'Cikis istendi',
  'account.new_chat_quota_exhausted': 'Yeni sohbet kotasi doldu',
}

const LEVEL_TONE: Record<string, string> = {
  info: 'bg-accent',
  warn: 'bg-warn',
  error: 'bg-danger',
  debug: 'bg-hairline-strong',
}

const timeFormat = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
})

const dayFormat = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })

export function EventFeed({
  initial,
  labels,
  userId,
}: {
  initial: EventView[]
  labels: Record<string, string>
  userId: string
}) {
  const [events, setEvents] = useServerSyncedState(initial)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('olaylar-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'account_events',
          filter: `owner_id=eq.${userId}`,
        },
        (payload) => {
          const next = payload.new as EventView
          // Liste basa ekleniyor ve kirpiliyor: bu ekran acik kalabilir,
          // sinirsiz buyumesi tarayiciyi yorar.
          setEvents((current) => [next, ...current].slice(0, 50))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId, setEvents])

  const today = new Date().toDateString()

  return (
    <Card>
      <CardHeader
        title="Canli olay akisi"
        subtitle="Servis ne yaptigini buraya yaziyor. Panel kapaliyken olanlar da burada."
      />

      {events.length === 0 ? (
        <EmptyState
          title="Henuz olay yok"
          description="Bir hat baglandiginda veya kampanya calistiginda olaylar burada anlik olarak gorunur."
        />
      ) : (
        <div className="max-h-[420px] divide-y divide-hairline overflow-y-auto">
          {events.map((event) => {
            const at = new Date(event.created_at)
            const isToday = at.toDateString() === today

            return (
              <div key={event.id} className="flex items-start gap-2.5 px-4 py-2.5">
                <span
                  className={`mt-[6px] size-1.5 shrink-0 rounded-full ${
                    LEVEL_TONE[event.level] ?? 'bg-hairline-strong'
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px]">
                    {LABELS[event.event] ?? event.event}
                  </p>
                  {typeof event.detail?.reason === 'string' ? (
                    <p className="mt-0.5 text-[11.5px] text-ink-faint">
                      {event.detail.reason}
                    </p>
                  ) : null}
                  {event.account_id && labels[event.account_id] ? (
                    <p className="mt-0.5 text-[11.5px] text-ink-faint">
                      {labels[event.account_id]}
                    </p>
                  ) : null}
                </div>

                <span className="tabular shrink-0 text-[11px] text-ink-faint">
                  {isToday ? timeFormat.format(at) : dayFormat.format(at)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
