'use client'

import { useEffect, useState, useTransition } from 'react'
import type { Tables } from '@wa/shared'
import { Button, Card, CardHeader, Meter, Notice, Stat, StatusPill } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  pauseCampaign,
  resumeCampaign,
  startCampaign,
  stopCampaign,
} from '../actions'

export type CampaignView = Pick<
  Tables<'campaigns'>,
  | 'id'
  | 'name'
  | 'status'
  | 'body'
  | 'media_url'
  | 'total_targets'
  | 'sent_count'
  | 'failed_count'
  | 'skipped_count'
  | 'stop_reason'
  | 'min_delay_seconds'
  | 'max_delay_seconds'
  | 'daily_cap_per_account'
  | 'started_at'
  | 'completed_at'
>

export function CampaignLive({ initial }: { initial: CampaignView }) {
  const [campaign, setCampaign] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  /**
   * Ilerleme kampanya satirinin kendisinde tutuluyor (sent_count vb.),
   * bu yuzden tek satir aboneligi canli ilerleme icin yeterli:
   * her mesaj icin ayri olay dinlemek gerekmiyor.
   *
   * Realtime kopsa bile polling yedegi var: gonderildi 0'da takili kalmasin.
   */
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const channel = supabase
      .channel(`campaign-${initial.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'campaigns',
          filter: `id=eq.${initial.id}`,
        },
        (payload) => {
          setCampaign((current) => ({ ...current, ...(payload.new as CampaignView) }))
        },
      )
      .subscribe()

    const poll = async () => {
      if (document.visibilityState !== 'visible') return
      const { data } = await supabase
        .from('campaigns')
        .select(
          'id, name, status, body, media_url, total_targets, sent_count, failed_count, skipped_count, stop_reason, min_delay_seconds, max_delay_seconds, daily_cap_per_account, started_at, completed_at',
        )
        .eq('id', initial.id)
        .maybeSingle()
      if (data) setCampaign(data as CampaignView)
    }

    const timer = setInterval(() => {
      void poll()
    }, 3_000)
    void poll()

    return () => {
      clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [initial.id])

  const run = (action: () => Promise<{ error?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) setError(result.error)
    })
  }

  const processed = campaign.sent_count + campaign.failed_count + campaign.skipped_count
  const remaining = Math.max(0, campaign.total_targets - processed)

  // Ortalama bekleme suresinden kaba bir bitis tahmini.
  const averageDelay = (campaign.min_delay_seconds + campaign.max_delay_seconds) / 2
  const etaMinutes = Math.ceil((remaining * averageDelay) / 60)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title={campaign.name}
          subtitle={
            campaign.started_at
              ? `Baslama: ${new Date(campaign.started_at).toLocaleString('tr-TR')}`
              : 'Henuz baslatilmadi'
          }
          action={<StatusPill status={campaign.status} />}
        />

        <div className="space-y-4 p-4">
          <div>
            <div className="mb-2 flex items-baseline justify-between text-[12px]">
              <span className="text-ink-muted">Ilerleme</span>
              <span className="text-ink tabular">
                {processed} / {campaign.total_targets}
              </span>
            </div>
            <Meter
              value={processed}
              max={Math.max(1, campaign.total_targets)}
              tone={campaign.status === 'stopped' ? 'danger' : 'accent'}
            />
          </div>

          <dl className="grid grid-cols-2 gap-4 border-t border-hairline pt-4 sm:grid-cols-4">
            <Stat label="Gonderildi" value={campaign.sent_count} tone="accent" />
            <Stat label="Atlandi" value={campaign.skipped_count} tone="muted" />
            <Stat label="Basarisiz" value={campaign.failed_count} tone="danger" />
            <Stat label="Kalan" value={remaining} />
          </dl>

          {campaign.status === 'running' && remaining > 0 ? (
            <p className="text-[11.5px] text-ink-faint tabular">
              Mevcut hizla tahmini kalan sure: yaklasik {etaMinutes} dakika
            </p>
          ) : null}

          {campaign.stop_reason ? (
            <Notice tone="danger">
              <span className="font-medium">Durduruldu.</span> {campaign.stop_reason}
            </Notice>
          ) : null}

          {error ? <Notice tone="danger">{error}</Notice> : null}

          <div className="flex flex-wrap gap-1.5 border-t border-hairline pt-4">
            {campaign.status === 'draft' ? (
              <Button
                variant="accent"
                disabled={pending}
                onClick={() => run(() => startCampaign(campaign.id))}
              >
                {pending ? 'Baslatiliyor...' : 'Gonderimi baslat'}
              </Button>
            ) : null}

            {campaign.status === 'running' ? (
              <Button disabled={pending} onClick={() => run(() => pauseCampaign(campaign.id))}>
                {pending ? 'Duraklatiliyor...' : 'Duraklat'}
              </Button>
            ) : null}

            {campaign.status === 'paused' ? (
              <Button
                variant="accent"
                disabled={pending}
                onClick={() => run(() => resumeCampaign(campaign.id))}
              >
                {pending ? 'Devam ediliyor...' : 'Devam et'}
              </Button>
            ) : null}

            {['running', 'paused', 'scheduled'].includes(campaign.status) ? (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => run(() => stopCampaign(campaign.id))}
              >
                Durdur
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Mesaj"
          subtitle={`Bekleme ${campaign.min_delay_seconds}-${campaign.max_delay_seconds} sn · hesap basina gunluk ${campaign.daily_cap_per_account}`}
        />
        <div className="space-y-3 p-4">
          {campaign.media_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={campaign.media_url}
              alt="Kampanya gorseli"
              className="max-h-56 rounded-md border border-hairline object-contain"
            />
          ) : null}

          {campaign.body ? (
            <p className="text-[12.5px] whitespace-pre-wrap text-ink">{campaign.body}</p>
          ) : (
            <p className="text-[12.5px] text-ink-faint">Yalnizca gorsel gonderiliyor.</p>
          )}
        </div>
      </Card>
    </div>
  )
}
