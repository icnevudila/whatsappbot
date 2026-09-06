'use client'

import { useEffect } from 'react'
import { AccentLink, Card, CardHeader, EmptyState } from '@/components/ui'
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
 * Servis olay adlarını makine formatında yazıyor (account.reachout_timelock).
 * Panelde ham hali göstermek, en çok bakılacak ekranda en az okunur şeyi
 * göstermek olurdu.
 */
const LABELS: Record<string, string> = {
  'account.connected': 'Hat bağlandı',
  'account.logged_out': 'Telefondan çıkış yapıldı',
  'account.locked': 'Hat kilitlendi',
  'account.auth_cleared': 'Oturum sıfırlandı',
  'account.version_mismatch': 'WhatsApp sürümü uyumsuz',
  'account.bad_session': 'Oturum bozuldu, yeniden bağlanıyor',
  'account.connection_replaced': 'Bağlantı başka bir cihaza geçti',
  'account.qr_expired': 'QR kodunun süresi doldu',
  'account.reachout_timelock': 'Yeni sohbet kilidi uygulandı',
  'account.logout_requested': 'Çıkış istendi',
  'account.new_chat_quota_exhausted': 'Yeni sohbet kotası doldu',
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
  orgId,
}: {
  initial: EventView[]
  labels: Record<string, string>
  orgId: string
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
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const next = payload.new as EventView
          // Liste başa ekleniyor ve kırpılıyor: bu ekran açık kalabilir,
          // sınırsız büyümesi tarayıcıyı yorar.
          setEvents((current) => [next, ...current].slice(0, 50))
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, setEvents])

  const today = new Date().toDateString()

  return (
    <Card>
      <CardHeader
        title="Canlı olay akışı"
        subtitle="Bağlantı, kilit ve kota olayları burada listelenir. Panel kapalıyken olanlar da kayda geçer."
      />

      {events.length === 0 ? (
        <EmptyState
          tone="events"
          title="Henüz olay yok"
          description="Bir hat bağlandığında, oturum değiştiğinde veya kota dolduğunda olaylar burada anlık görünür."
          action={<AccentLink href="/hesaplar">Hesaplara git</AccentLink>}
        />
      ) : (
        <div className="max-h-[420px] divide-y divide-hairline overflow-y-auto">
          {events.map((event) => {
            const at = new Date(event.created_at)
            const isToday = at.toDateString() === today

            return (
              <div key={event.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
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
