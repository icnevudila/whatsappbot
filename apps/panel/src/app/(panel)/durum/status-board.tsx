'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Tables } from '@wa/shared'
import { Card, CardHeader, EmptyState, Meter, StatusPill } from '@/components/ui'
import { capToday, remainingToday } from '@/lib/capacity'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export type LineView = Pick<
  Tables<'accounts'>,
  | 'id'
  | 'label'
  | 'phone_e164'
  | 'status'
  | 'enabled'
  | 'is_locked'
  | 'lock_reason'
  | 'daily_send_limit'
  | 'sent_today'
  | 'sent_today_on'
  | 'warmup_started_at'
  | 'new_chat_quota_total'
  | 'new_chat_quota_used'
  | 'reachout_locked_until'
>

export type CampaignView = Pick<
  Tables<'campaigns'>,
  | 'id'
  | 'name'
  | 'status'
  | 'total_targets'
  | 'sent_count'
  | 'failed_count'
  | 'skipped_count'
>

const nf = new Intl.NumberFormat('tr-TR')

const ACTIVE = new Set(['running', 'paused', 'scheduled'])

export function StatusBoard({
  initialLines,
  initialCampaigns,
  userId,
}: {
  initialLines: LineView[]
  initialCampaigns: CampaignView[]
  userId: string
}) {
  const [lines, setLines] = useState(initialLines)
  const [campaigns, setCampaigns] = useState(initialCampaigns)

  useEffect(() => setLines(initialLines), [initialLines])
  useEffect(() => setCampaigns(initialCampaigns), [initialCampaigns])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel('durum-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts', filter: `owner_id=eq.${userId}` },
        (payload) => {
          setLines((current) => {
            if (payload.eventType === 'DELETE') {
              const removedId = (payload.old as { id?: string }).id
              return current.filter((line) => line.id !== removedId)
            }
            const next = payload.new as LineView
            return current.some((line) => line.id === next.id)
              ? current.map((line) => (line.id === next.id ? { ...line, ...next } : line))
              : [...current, next]
          })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns', filter: `owner_id=eq.${userId}` },
        (payload) => {
          setCampaigns((current) => {
            if (payload.eventType === 'DELETE') {
              const removedId = (payload.old as { id?: string }).id
              return current.filter((campaign) => campaign.id !== removedId)
            }
            const next = payload.new as CampaignView
            return current.some((campaign) => campaign.id === next.id)
              ? current.map((campaign) =>
                  campaign.id === next.id ? { ...campaign, ...next } : campaign,
                )
              : [next, ...current]
          })
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  const connected = lines.filter((line) => line.status === 'connected' && !line.is_locked)
  const usedToday = connected.reduce((total, line) => {
    const today = new Date().toISOString().slice(0, 10)
    return total + (line.sent_today_on === today ? line.sent_today : 0)
  }, 0)
  const capacityToday = connected.reduce((total, line) => total + capToday(line), 0)
  const activeCampaigns = campaigns.filter((campaign) => ACTIVE.has(campaign.status))

  return (
    <div className="flex flex-col gap-4">
      {/* Gunun ozeti */}
      <Card>
        <div className="grid divide-y divide-hairline sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Summary
            value={`${connected.length}`}
            label="Bagli hat"
            detail={
              lines.length > connected.length
                ? `${lines.length - connected.length} hat kapali veya kilitli`
                : 'Hepsi calisiyor'
            }
            tone={connected.length > 0 ? 'accent' : 'muted'}
          />
          <Summary
            value={`${nf.format(usedToday)} / ${nf.format(capacityToday)}`}
            label="Bugunku gonderim"
            detail={
              capacityToday > 0
                ? `${nf.format(Math.max(0, capacityToday - usedToday))} mesaj hakki kaldi`
                : 'Bagli hat yok'
            }
            meter={{ value: usedToday, max: capacityToday }}
          />
          <Summary
            value={`${activeCampaigns.length}`}
            label="Aktif kampanya"
            detail={
              activeCampaigns.length > 0
                ? activeCampaigns[0].name
                : 'Su an gonderim yok'
            }
            tone={activeCampaigns.length > 0 ? 'accent' : 'muted'}
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Hatlar */}
        <Card>
          <CardHeader
            title="Hatlar"
            action={
              <Link
                href="/hesaplar"
                className="text-[12px] text-ink-muted transition-colors hover:text-ink"
              >
                Yonet
              </Link>
            }
          />

          {lines.length === 0 ? (
            <EmptyState
              title="Hat yok"
              description="Hesaplar sekmesinden QR ile ilk hattinizi baglayin."
            />
          ) : (
            <div className="divide-y divide-hairline">
              {lines.map((line) => {
                const cap = capToday(line)
                const today = new Date().toISOString().slice(0, 10)
                const sent = line.sent_today_on === today ? line.sent_today : 0

                return (
                  <div key={line.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-medium">{line.label}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-ink-faint">
                          {line.phone_e164 ?? 'Numara bekleniyor'}
                        </p>
                      </div>
                      <StatusPill
                        status={line.is_locked ? 'banned' : line.status}
                      />
                    </div>

                    {line.status === 'connected' && !line.is_locked ? (
                      <div className="mt-2.5 flex items-center gap-2.5">
                        <Meter
                          value={sent}
                          max={cap}
                          tone={sent >= cap ? 'warn' : 'accent'}
                        />
                        <span className="tabular shrink-0 text-[11px] text-ink-faint">
                          {sent}/{cap}
                        </span>
                      </div>
                    ) : line.lock_reason ? (
                      <p className="mt-1.5 text-[11.5px] text-danger">{line.lock_reason}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Kampanyalar */}
        <Card>
          <CardHeader
            title="Kampanyalar"
            action={
              <Link
                href="/kampanyalar"
                className="text-[12px] text-ink-muted transition-colors hover:text-ink"
              >
                Tumu
              </Link>
            }
          />

          {campaigns.length === 0 ? (
            <EmptyState
              title="Kampanya yok"
              description="Hizli gonderim ekranindan numaralari yapistirip hemen baslayabilirsiniz."
            />
          ) : (
            <div className="divide-y divide-hairline">
              {campaigns.slice(0, 6).map((campaign) => {
                const done =
                  campaign.sent_count + campaign.failed_count + campaign.skipped_count

                return (
                  <Link
                    key={campaign.id}
                    href={`/kampanyalar/${campaign.id}`}
                    className="block px-4 py-3 transition-colors hover:bg-surface-raised"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="min-w-0 truncate text-[12.5px] font-medium">
                        {campaign.name}
                      </p>
                      <StatusPill status={campaign.status} />
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <Meter
                        value={done}
                        max={campaign.total_targets}
                        tone={campaign.failed_count > 0 ? 'warn' : 'accent'}
                      />
                      <span className="tabular shrink-0 text-[11px] text-ink-faint">
                        {nf.format(done)}/{nf.format(campaign.total_targets)}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Summary({
  value,
  label,
  detail,
  tone = 'default',
  meter,
}: {
  value: string
  label: string
  detail: string
  tone?: 'default' | 'accent' | 'muted'
  meter?: { value: number; max: number }
}) {
  const valueTone =
    tone === 'accent' ? 'text-accent' : tone === 'muted' ? 'text-ink-muted' : 'text-ink'

  return (
    <div className="px-4 py-3.5">
      <p className="text-[11.5px] text-ink-muted">{label}</p>
      <p className={`tabular mt-1 text-[20px] font-semibold leading-none ${valueTone}`}>
        {value}
      </p>
      {meter ? (
        <div className="mt-2.5">
          <Meter
            value={meter.value}
            max={meter.max}
            tone={meter.max > 0 && meter.value / meter.max > 0.85 ? 'warn' : 'accent'}
          />
        </div>
      ) : null}
      <p className="mt-1.5 truncate text-[11.5px] text-ink-faint">{detail}</p>
    </div>
  )
}
