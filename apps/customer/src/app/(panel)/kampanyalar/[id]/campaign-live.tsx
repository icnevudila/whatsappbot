'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import type { Tables } from '@wa/shared'
import { Button, Card, CardHeader, Meter, Notice, StatusPill } from '@/components/ui'
import { LiveStat } from '@/components/live-stat'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  duplicateCampaign,
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
  | 'body_b'
  | 'ab_percent'
  | 'media_url'
  | 'message_type'
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
  | 'scheduled_at'
  | 'source_list_ids'
>

export type CampaignTargetStats = {
  delivered: number
  read: number
}

function meterTone(
  status: string,
  failedCount: number,
): 'accent' | 'warn' | 'danger' {
  if (status === 'stopped' || status === 'failed') return 'danger'
  if (failedCount > 0) return 'warn'
  return 'accent'
}

function stopReasonLabel(status: string): string {
  if (status === 'failed') return 'Hata nedeni'
  if (status === 'paused') return 'Duraklatma notu'
  return 'Durdurma nedeni'
}

export function CampaignLive({
  initial,
  sourceLists = [],
  accounts = [],
  listOptions = [],
  accountOptions = [],
  orgId,
  initialStats,
}: {
  initial: CampaignView
  sourceLists?: { id: string; name: string }[]
  accounts?: { id: string; label: string }[]
  listOptions?: {
    id: string
    label: string
    detail?: string
    disabled?: boolean
    contactCount?: number
  }[]
  accountOptions?: { id: string; label: string; detail?: string; disabled?: boolean }[]
  orgId: string
  initialStats?: CampaignTargetStats
}) {
  const [campaign, setCampaign] = useState(initial)
  const [stats, setStats] = useState<CampaignTargetStats>(initialStats ?? { delivered: 0, read: 0 })
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const toast = useToast()
  const prevStatus = useRef(initial.status)

  const estimatedFromLists = campaign.source_list_ids.reduce((sum, id) => {
    const list = listOptions.find((item) => item.id === id)
    return sum + (list?.contactCount ?? 0)
  }, 0)
  const queueHint =
    campaign.total_targets > 0 ? campaign.total_targets : estimatedFromLists

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
          'id, name, status, body, body_b, ab_percent, media_url, message_type, total_targets, sent_count, failed_count, skipped_count, stop_reason, min_delay_seconds, max_delay_seconds, daily_cap_per_account, started_at, completed_at, scheduled_at, source_list_ids',
        )
        .eq('id', initial.id)
        .eq('org_id', orgId)
        .maybeSingle()
      if (data) setCampaign(data as CampaignView)

      const [delivered, read] = await Promise.all([
        supabase
          .from('campaign_targets')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', initial.id)
          .eq('org_id', orgId)
          .in('status', ['delivered', 'read']),
        supabase
          .from('campaign_targets')
          .select('id', { count: 'exact', head: true })
          .eq('campaign_id', initial.id)
          .eq('org_id', orgId)
          .eq('status', 'read'),
      ])
      setStats({ delivered: delivered.count ?? 0, read: read.count ?? 0 })
    }

    const timer = setInterval(() => {
      void poll()
    }, 3_000)
    void poll()

    return () => {
      clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [initial.id, orgId])

  useEffect(() => {
    const prev = prevStatus.current
    const next = campaign.status
    if (prev === next) return
    prevStatus.current = next
    if (next === 'completed') toast('Kampanya tamamlandı.', 'success')
    else if (next === 'failed') toast('Kampanya hata ile bitti.', 'danger')
    else if (next === 'paused' && prev === 'running') toast('Kampanya duraklatıldı.', 'warn')
    else if (next === 'running' && (prev === 'paused' || prev === 'draft')) {
      toast('Kampanya çalışıyor.', 'accent')
    }
  }, [campaign.status, toast])

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

  const subtitleParts: string[] = []
  if (campaign.started_at) {
    subtitleParts.push(`Başlama: ${new Date(campaign.started_at).toLocaleString('tr-TR')}`)
  } else {
    subtitleParts.push('Henüz başlatılmadı')
  }
  if (campaign.completed_at) {
    subtitleParts.push(`Bitiş: ${new Date(campaign.completed_at).toLocaleString('tr-TR')}`)
  }

  return (
    <div className="space-y-2.5">
      <Card>
        <CardHeader
          title="İlerleme"
          subtitle={subtitleParts.join(' · ')}
          action={<StatusPill status={campaign.status} />}
        />

        <div className="space-y-2.5 p-3.5">
          <div>
            <div className="mb-2 flex items-baseline justify-between text-[12px]">
              <span className="text-ink-muted">İlerleme</span>
              <span className="text-ink tabular">
                {processed} / {campaign.total_targets}
                {campaign.total_targets > 0 ? (
                  <span className="text-ink-faint">
                    {' '}
                    · %{Math.min(100, Math.round((processed / campaign.total_targets) * 100))}
                  </span>
                ) : null}
              </span>
            </div>
            <Meter
              value={processed}
              max={Math.max(1, campaign.total_targets)}
              tone={meterTone(campaign.status, campaign.failed_count)}
            />
          </div>

          <p className="mb-2 text-[12.5px] tabular text-ink">
            {campaign.sent_count.toLocaleString('tr-TR')} / {campaign.total_targets.toLocaleString('tr-TR')} gönderildi
            {campaign.total_targets > 0
              ? ` · %${Math.min(100, Math.round((campaign.sent_count / campaign.total_targets) * 100))}`
              : ''}
          </p>
          <dl className="grid grid-cols-2 gap-2.5 border-t border-hairline pt-2.5 sm:grid-cols-4">
            <LiveStat
              label="Gönderim"
              value={
                campaign.total_targets > 0
                  ? `${campaign.sent_count}/${campaign.total_targets}`
                  : campaign.sent_count
              }
              tone="accent"
              detail={
                campaign.total_targets > 0
                  ? `%${Math.min(100, Math.round((campaign.sent_count / campaign.total_targets) * 100))}`
                  : undefined
              }
            />
            <LiveStat
              label="Teslim edildi"
              value={stats.delivered}
              detail={
                campaign.total_targets > 0
                  ? `%${Math.min(100, Math.round((stats.delivered / campaign.total_targets) * 100))}`
                  : undefined
              }
            />
            <LiveStat
              label="Okundu"
              value={stats.read}
              tone="accent"
              detail={
                campaign.total_targets > 0
                  ? `%${Math.min(100, Math.round((stats.read / campaign.total_targets) * 100))}`
                  : undefined
              }
            />
            <LiveStat
              label="Başarısız"
              value={campaign.failed_count}
              tone="danger"
              detail={
                campaign.total_targets > 0
                  ? `%${Math.min(100, Math.round((campaign.failed_count / campaign.total_targets) * 100))}`
                  : undefined
              }
            />
          </dl>

          <p className="text-[12px] text-ink-muted">
            Numara durumları aşağıda.{' '}
            <a
              href="#paylasilanlar"
              className="font-medium text-accent underline underline-offset-2"
            >
              Numaralara git
            </a>
          </p>

          {(sourceLists.length > 0 || accounts.length > 0) && (
            <div className="space-y-1.5 border-t border-hairline pt-2.5 text-[12px] text-ink-muted">
              {sourceLists.length > 0 ? (
                <p>
                  <span className="text-ink-faint">Gruplar: </span>
                  {sourceLists.map((list, index) => (
                    <span key={list.id}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href={`/kisiler/${list.id}`}
                        className="font-medium text-ink underline underline-offset-2 hover:text-accent"
                      >
                        {list.name}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
              {accounts.length > 0 ? (
                <p>
                  <span className="text-ink-faint">Hatlar: </span>
                  {accounts.map((account, index) => (
                    <span key={account.id}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href="/ayarlar/hatlar"
                        className="font-medium text-ink underline underline-offset-2 hover:text-accent"
                      >
                        {account.label}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          )}

          {campaign.status === 'running' && remaining > 0 ? (
            <p className="text-[11.5px] text-ink-faint tabular">
              Tahmini kalan: ~{etaMinutes} dk
            </p>
          ) : null}

          {campaign.status === 'completed' && !campaign.stop_reason ? (
            <Notice tone="accent">Kampanya tamamlandı. Numaralar aşağıda.</Notice>
          ) : null}

          {campaign.stop_reason ? (
            <Notice tone={campaign.status === 'paused' ? 'warn' : 'danger'}>
              <span className="font-medium">{stopReasonLabel(campaign.status)}:</span>{' '}
              {campaign.stop_reason}
            </Notice>
          ) : campaign.status === 'stopped' ? (
            <Notice tone="danger">Kampanya durduruldu. Satır hatalarına bakın.</Notice>
          ) : null}

          {error ? <Notice tone="danger">{error}</Notice> : null}

          {campaign.status === 'running' ? (
            <Notice tone="warn">
              Bu kampanya şu anda gönderiliyor. Mesajı düzenlerseniz değişiklik yalnızca henüz
              mesaj gönderilmemiş müşterilere uygulanır.
            </Notice>
          ) : null}

          {campaign.status === 'paused' || campaign.status === 'stopped' ? (
            <Notice tone="accent">
              Mesajı düzenleyebilir, ardından gönderime devam edebilirsiniz.
            </Notice>
          ) : null}

          <div className="space-y-2 border-t border-hairline pt-2.5">
            <div className="flex items-center justify-between gap-2 sm:hidden">
              <span className="text-[12px] font-medium text-ink-muted">Durum</span>
              <StatusPill status={campaign.status} />
            </div>

            {queueHint > 0 &&
            (campaign.status === 'draft' || campaign.status === 'stopped') ? (
              <Notice tone="warn">
                Başlatınca ~{queueHint.toLocaleString('tr-TR')} hedef kuyruğa yazılır.
              </Notice>
            ) : null}

            <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
              {campaign.status === 'draft' || campaign.status === 'stopped' ? (
                <Button
                  variant="accent"
                  className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                  disabled={pending}
                  onClick={() => run(() => startCampaign(campaign.id))}
                >
                  {pending
                    ? 'Başlatılıyor…'
                    : campaign.status === 'stopped'
                      ? 'Yeniden başlat'
                      : 'Başlat'}
                </Button>
              ) : null}

              {campaign.status === 'running' ? (
                <Button
                  className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                  disabled={pending}
                  onClick={() => run(() => pauseCampaign(campaign.id))}
                >
                  {pending ? 'Duraklatılıyor…' : 'Gönderimi Duraklat'}
                </Button>
              ) : null}

              {campaign.status === 'paused' ? (
                <Button
                  variant="accent"
                  className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                  disabled={pending}
                  onClick={() => run(() => resumeCampaign(campaign.id))}
                >
                  {pending ? 'Devam ediliyor…' : 'Gönderime Devam Et'}
                </Button>
              ) : null}

              {['running', 'paused', 'scheduled'].includes(campaign.status) ? (
                <Button
                  variant="danger"
                  className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                  disabled={pending}
                  onClick={() => run(() => stopCampaign(campaign.id))}
                >
                  Durdur
                </Button>
              ) : null}

              <Button
                className="min-h-11 w-full touch-manipulation sm:min-h-9 sm:w-auto"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    const result = await duplicateCampaign(campaign.id)
                    if (result.error) return { error: result.error }
                    if (result.id) router.push(`/kampanyalar/${result.id}/duzenle`)
                    return {}
                  })
                }
              >
                {pending ? 'Kopyalanıyor…' : 'Kopyala ve Yeni Kampanya Oluştur'}
              </Button>

              {campaign.status !== 'completed' && campaign.status !== 'failed' ? (
                <Link
                  href={`/kampanyalar/${campaign.id}/duzenle`}
                  className="inline-flex h-9 min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] border border-hairline-strong bg-surface px-3.5 text-[14px] font-semibold text-ink touch-manipulation sm:min-h-9 sm:w-auto"
                >
                  Düzenle
                </Link>
              ) : (
                <Link
                  href={`/kampanyalar/${campaign.id}/duzenle`}
                  className="inline-flex h-9 min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] border border-hairline-strong bg-surface px-3.5 text-[14px] font-semibold text-ink touch-manipulation sm:min-h-9 sm:w-auto"
                >
                  Kampanyayı gör
                </Link>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
