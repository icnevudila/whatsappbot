'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import type { Tables } from '@wa/shared'
import { Button, Meter, Notice } from '@/components/ui'
import { Icon } from '@/components/icon'
import { LiveStat } from '@/components/live-stat'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { ScheduleAtInput } from '../campaign-wizard-ui'
import { defaultScheduleLocal, toDatetimeLocal } from '../campaign-wizard-types'
import {
  duplicateCampaign,
  pauseCampaign,
  resumeCampaign,
  scheduleCampaign,
  startCampaign,
  stopCampaign,
} from '../actions'
import { CampaignPreviewButton } from '../campaign-preview'

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
  | 'wait_reason'
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
  void accountOptions
  const [campaign, setCampaign] = useState(initial)
  const [stats, setStats] = useState<CampaignTargetStats>(initialStats ?? { delivered: 0, read: 0 })
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const router = useRouter()
  const toast = useToast()
  const prevStatus = useRef(initial.status)

  const estimatedFromLists = campaign.source_list_ids.reduce((sum, id) => {
    const list = listOptions.find((item) => item.id === id)
    return sum + (list?.contactCount ?? 0)
  }, 0)
  const queueHint =
    campaign.total_targets > 0 ? campaign.total_targets : estimatedFromLists

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
          'id, name, status, body, body_b, ab_percent, media_url, message_type, total_targets, sent_count, failed_count, skipped_count, stop_reason, wait_reason, min_delay_seconds, max_delay_seconds, daily_cap_per_account, started_at, completed_at, scheduled_at, source_list_ids',
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

  const averageDelay = (campaign.min_delay_seconds + campaign.max_delay_seconds) / 2
  const etaMinutes = Math.ceil((remaining * averageDelay) / 60)

  const subtitleParts: string[] = []
  if (campaign.started_at) {
    subtitleParts.push(`Başlama: ${new Date(campaign.started_at).toLocaleString('tr-TR')}`)
  } else if (campaign.status === 'scheduled' && campaign.scheduled_at) {
    subtitleParts.push(`Plan: ${new Date(campaign.scheduled_at).toLocaleString('tr-TR')}`)
  } else {
    subtitleParts.push('Henüz başlatılmadı')
  }
  if (campaign.completed_at) {
    subtitleParts.push(`Bitiş: ${new Date(campaign.completed_at).toLocaleString('tr-TR')}`)
  }

  return (
    <div className="wb-camp-detail space-y-2.5">
      <section className="wb-camp-panel">
        <header className="wb-camp-panel-head">
          <h2 className="wb-camp-panel-title">İlerleme</h2>
          <p className="wb-camp-panel-sub">{subtitleParts.join(' · ')}</p>
        </header>

        <div className="space-y-3 p-3.5">
          <div>
            <div className="mb-2 flex items-baseline justify-between text-[12px]">
              <span className="text-[#667781]">İlerleme</span>
              <span className="tabular text-[#111b21]">
                {processed} / {campaign.total_targets}
                {campaign.total_targets > 0 ? (
                  <span className="text-[#8696a0]">
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

          <p className="text-[12.5px] tabular text-[#111b21]">
            {campaign.sent_count.toLocaleString('tr-TR')} / {campaign.total_targets.toLocaleString('tr-TR')} gönderildi
            {campaign.total_targets > 0
              ? ` · %${Math.min(100, Math.round((campaign.sent_count / campaign.total_targets) * 100))}`
              : ''}
          </p>

          <dl className="wb-camp-stats">
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

          <p className="text-[12px] text-[#667781]">
            Numara durumları aşağıda.{' '}
            <a href="#paylasilanlar" className="font-medium text-[#008069] underline underline-offset-2">
              Numaralara git
            </a>
          </p>

          {(sourceLists.length > 0 || accounts.length > 0) && (
            <div className="space-y-1.5 border-t border-[#e9edef] pt-2.5 text-[12px] text-[#667781]">
              {sourceLists.length > 0 ? (
                <p>
                  <span className="text-[#8696a0]">Gruplar: </span>
                  {sourceLists.map((list, index) => (
                    <span key={list.id}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href={`/kisiler/${list.id}`}
                        className="font-medium text-[#111b21] underline underline-offset-2 hover:text-[#008069]"
                      >
                        {list.name}
                      </Link>
                    </span>
                  ))}
                </p>
              ) : null}
              {accounts.length > 0 ? (
                <p>
                  <span className="text-[#8696a0]">Hatlar: </span>
                  {accounts.map((account, index) => (
                    <span key={account.id}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href="/ayarlar/hatlar"
                        className="font-medium text-[#111b21] underline underline-offset-2 hover:text-[#008069]"
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
            <p className="text-[11.5px] tabular text-[#8696a0]">Tahmini kalan: ~{etaMinutes} dk</p>
          ) : null}

          {campaign.status === 'running' && remaining > 0 && campaign.wait_reason ? (
            <Notice tone="warn">{campaign.wait_reason}</Notice>
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

          {campaign.status === 'running' && remaining > 0 && !campaign.wait_reason ? (
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

          <div className="space-y-2 border-t border-[#e9edef] pt-2.5">
            {queueHint > 0 &&
            (campaign.status === 'draft' || campaign.status === 'stopped') ? (
              <Notice tone="warn">
                Başlatınca ~{queueHint.toLocaleString('tr-TR')} hedef kuyruğa yazılır.
              </Notice>
            ) : null}

            <div className="wb-camp-detail-actions">
              {campaign.status === 'draft' || campaign.status === 'stopped' ? (
                <div className="wb-camp-detail-primary">
                  <button
                    type="button"
                    className="wb-wa-submit"
                    disabled={pending}
                    onClick={() => run(() => startCampaign(campaign.id))}
                  >
                    {pending
                      ? 'Başlatılıyor…'
                      : campaign.status === 'stopped'
                        ? 'Yeniden başlat'
                        : 'Başlat'}
                  </button>
                  {campaign.status === 'draft' ? (
                    <button
                      type="button"
                      className="wb-camp-schedule-icon"
                      disabled={pending}
                      aria-label="Planla"
                      title="Planla"
                      onClick={() => setScheduleOpen(true)}
                    >
                      <Icon name="clock" className="size-5" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              {campaign.status === 'running' ? (
                <button
                  type="button"
                  className="wb-wa-submit is-secondary"
                  disabled={pending}
                  onClick={() => run(() => pauseCampaign(campaign.id))}
                >
                  {pending ? 'Duraklatılıyor…' : 'Gönderimi Duraklat'}
                </button>
              ) : null}

              {campaign.status === 'paused' ? (
                <button
                  type="button"
                  className="wb-wa-submit"
                  disabled={pending}
                  onClick={() => run(() => resumeCampaign(campaign.id))}
                >
                  {pending ? 'Devam ediliyor…' : 'Gönderime Devam Et'}
                </button>
              ) : null}

              {['running', 'paused', 'scheduled'].includes(campaign.status) ? (
                <button
                  type="button"
                  className="wb-wa-submit is-danger"
                  disabled={pending}
                  onClick={() => run(() => stopCampaign(campaign.id))}
                >
                  Durdur
                </button>
              ) : null}

              <button
                type="button"
                className="wb-wa-submit is-secondary"
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
                {pending ? 'Kopyalanıyor…' : 'Kopyala'}
              </button>

              <CampaignPreviewButton
                name={campaign.name}
                body={campaign.body}
                mediaUrl={campaign.media_url}
                className="wb-wa-submit is-secondary"
                label="Önizle"
              />

              <Link
                href={`/kampanyalar/${campaign.id}/duzenle`}
                className="wb-wa-submit is-secondary"
              >
                {campaign.status !== 'completed' && campaign.status !== 'failed'
                  ? 'Düzenle'
                  : 'Kampanyayı gör'}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {scheduleOpen ? (
        <ScheduleCampaignModal
          initialAt={toDatetimeLocal(campaign.scheduled_at) || defaultScheduleLocal()}
          pending={pending}
          onClose={() => setScheduleOpen(false)}
          onSave={(at) => {
            setError(null)
            startTransition(async () => {
              const result = await scheduleCampaign(campaign.id, at)
              if (result.error) {
                setError(result.error)
                toast(result.error, 'danger')
                return
              }
              toast(result.ok ?? 'Kampanya planlandı.', 'success')
              setScheduleOpen(false)
              setCampaign((current) => ({
                ...current,
                status: 'scheduled',
                scheduled_at: new Date(at).toISOString(),
              }))
              router.refresh()
            })
          }}
        />
      ) : null}
    </div>
  )
}

function ScheduleCampaignModal({
  initialAt,
  pending,
  onClose,
  onSave,
}: {
  initialAt: string
  pending: boolean
  onClose: () => void
  onSave: (at: string) => void
}) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [scheduledAt, setScheduledAt] = useState(initialAt)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, pending])

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose()
        }}
      />
      <div
        className="wb-modal-panel wb-wa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              Kampanyayı planla
            </h2>
            <p className="wb-modal-desc">Seçtiğiniz tarih ve saatte gönderim başlar.</p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            disabled={pending}
            onClick={onClose}
            className="wb-wa-icon-btn"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <div className="wb-wa-publish is-on !cursor-default">
          <span className="flex items-start gap-2.5">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white">
              <Icon name="clock" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-ink">Planla</span>
              <span className="mt-0.5 block text-[12.5px] text-ink-muted">
                Seçtiğiniz tarih ve saatte gönderim başlar.
              </span>
            </span>
          </span>
          <ScheduleAtInput value={scheduledAt} onChange={setScheduledAt} />
        </div>

        <div className="wb-modal-actions mt-4 flex-col-reverse sm:flex-row [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
          <Button type="button" disabled={pending} onClick={onClose}>
            Vazgeç
          </Button>
          <Button
            type="button"
            variant="accent"
            className="wb-wa-submit"
            disabled={pending || !scheduledAt}
            onClick={() => onSave(scheduledAt)}
          >
            <Icon name="clock" className="size-4" />
            {pending ? 'Planlanıyor…' : 'Planla'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
