'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import type { Tables } from '@wa/shared'
import { AccentLink, Card, CardHeader, EmptyState, Meter, Stat, StatusPill } from '@/components/ui'
import { capToday } from '@/lib/capacity'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useServerSyncedState } from '@/lib/use-server-synced-state'

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
  const [lines, setLines] = useServerSyncedState(initialLines)
  const [campaigns, setCampaigns] = useServerSyncedState(initialCampaigns)

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
  }, [userId, setLines, setCampaigns])

  const connected = lines.filter((line) => line.status === 'connected' && !line.is_locked)
  const usedToday = connected.reduce((total, line) => {
    const today = new Date().toISOString().slice(0, 10)
    return total + (line.sent_today_on === today ? line.sent_today : 0)
  }, 0)
  const capacityToday = connected.reduce((total, line) => total + capToday(line), 0)
  const activeCampaigns = campaigns.filter((campaign) => ACTIVE.has(campaign.status))

  const now = Date.now()
  const lockedCount = lines.filter((line) => line.is_locked).length
  const reachoutCount = lines.filter((line) => {
    if (!line.reachout_locked_until) return false
    return new Date(line.reachout_locked_until).getTime() > now
  }).length
  const quotaTightCount = connected.filter((line) => {
    const total = line.new_chat_quota_total
    const used = line.new_chat_quota_used
    if (typeof total !== 'number' || typeof used !== 'number' || total <= 0) return false
    return used / total > 0.8
  }).length
  const atRisk = lockedCount + reachoutCount + quotaTightCount

  return (
    <div className="flex flex-col gap-4">
      {/* Gunun ozeti */}
      <Card>
        <div className="grid divide-y divide-hairline sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <Stat
            className="px-4 py-3.5"
            value={`${connected.length}`}
            label="Bağlı hat"
            detail={
              lines.length > connected.length
                ? `${lines.length - connected.length} hat kapalı veya kilitli`
                : 'Hepsi çalışıyor'
            }
            tone={connected.length > 0 ? 'accent' : 'muted'}
          />
          <Stat
            className="px-4 py-3.5"
            value={`${nf.format(usedToday)} / ${nf.format(capacityToday)}`}
            label="Bugünkü gönderim"
            detail={
              capacityToday > 0
                ? `${nf.format(Math.max(0, capacityToday - usedToday))} mesaj hakkı kaldı`
                : 'Bağlı hat yok'
            }
            meter={{ value: usedToday, max: capacityToday }}
          />
          <Stat
            className="px-4 py-3.5"
            value={`${activeCampaigns.length}`}
            label="Aktif kampanya"
            detail={
              activeCampaigns.length > 0
                ? activeCampaigns[0]?.name ?? 'Gönderim var'
                : 'Şu an gönderim yok'
            }
            tone={activeCampaigns.length > 0 ? 'accent' : 'muted'}
          />
          <Stat
            className="px-4 py-3.5"
            value={`${atRisk}`}
            label="Dikkat gereken"
            detail={
              atRisk === 0
                ? 'Kilitli veya yeni sohbet kotası dolu hat yok'
                : [
                    lockedCount > 0 ? `${lockedCount} kilitli` : null,
                    reachoutCount > 0 ? `${reachoutCount} yeni sohbet kilidi` : null,
                    quotaTightCount > 0 ? `${quotaTightCount} kota >%80` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')
            }
            tone={atRisk > 0 ? 'warn' : 'muted'}
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
                Yönet
              </Link>
            }
          />

          {lines.length === 0 ? (
            <EmptyState
              title="Hat yok"
              description="Hesaplar sekmesinden QR ile ilk hattınızı bağlayın."
            />
          ) : (
            <div className="divide-y divide-hairline">
              {lines.map((line) => {
                const cap = capToday(line)
                const today = new Date().toISOString().slice(0, 10)
                const sent = line.sent_today_on === today ? line.sent_today : 0
                const quotaTotal = line.new_chat_quota_total
                const quotaUsed = line.new_chat_quota_used
                const quotaKnown =
                  typeof quotaTotal === 'number' && typeof quotaUsed === 'number'
                const reachoutUntil = line.reachout_locked_until
                  ? new Date(line.reachout_locked_until)
                  : null
                const reachoutActive =
                  reachoutUntil !== null && reachoutUntil.getTime() > Date.now()

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
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center gap-2.5">
                          <Meter
                            value={sent}
                            max={cap}
                            tone={sent >= cap ? 'warn' : 'accent'}
                          />
                          <span className="tabular shrink-0 text-[11px] text-ink-faint">
                            {sent}/{cap}
                          </span>
                        </div>
                        {quotaKnown ? (
                          <p className="text-[11px] text-ink-faint tabular">
                            Yeni sohbet {quotaUsed}/{quotaTotal}
                            {quotaUsed / Math.max(1, quotaTotal) > 0.8
                              ? ' · kota dolmak üzere'
                              : ''}
                          </p>
                        ) : null}
                        {reachoutActive ? (
                          <p className="text-[11px] text-warn">
                            Yeni sohbet kilidi{' '}
                            {reachoutUntil!.toLocaleTimeString('tr-TR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            &apos;a kadar
                          </p>
                        ) : null}
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
                Tümü
              </Link>
            }
          />

          {campaigns.length === 0 ? (
            <EmptyState
              title="Kampanya yok"
              description="Kampanyalar sekmesinden liste seçerek veya Hızlı gönderim ile numaraları yapıştırarak başlayabilirsiniz."
              action={
                <AccentLink href="/kampanyalar">Kampanyalara git</AccentLink>
              }
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
