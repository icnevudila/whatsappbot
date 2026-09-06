'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import type { Tables } from '@wa/shared'
import { Button, Card, CardHeader, Meter, Notice, Stat, StatusPill } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  duplicateCampaign,
  pauseCampaign,
  resumeCampaign,
  startCampaign,
  stopCampaign,
} from '../actions'
import { EditCampaignForm } from './edit-campaign-form'

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
  | 'source_list_ids'
>

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
}) {
  const [campaign, setCampaign] = useState(initial)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
          'id, name, status, body, body_b, ab_percent, media_url, message_type, total_targets, sent_count, failed_count, skipped_count, stop_reason, min_delay_seconds, max_delay_seconds, daily_cap_per_account, started_at, completed_at, source_list_ids',
        )
        .eq('id', initial.id)
        .eq('org_id', orgId)
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
  }, [initial.id, orgId])

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

          <dl className="grid grid-cols-2 gap-2.5 border-t border-hairline pt-2.5 sm:grid-cols-4">
            <Stat label="Gönderildi" value={campaign.sent_count} tone="accent" />
            <Stat label="Atlandı" value={campaign.skipped_count} tone="muted" />
            <Stat label="Başarısız" value={campaign.failed_count} tone="danger" />
            <Stat label="Kalan" value={remaining} />
          </dl>

          <p className="text-[12px] text-ink-muted">
            Paylaşılan numaraların satır satır durumu aşağıda.{' '}
            <a
              href="#paylasilanlar"
              className="font-medium text-accent underline underline-offset-2"
            >
              Hedef numaralara git
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
                  <span className="text-ink-faint">Gönderen hatlar: </span>
                  {accounts.map((account, index) => (
                    <span key={account.id}>
                      {index > 0 ? ', ' : null}
                      <Link
                        href="/hesaplar"
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
              Mevcut hızla tahmini kalan süre: yaklaşık {etaMinutes} dakika
            </p>
          ) : null}

          {campaign.status === 'completed' && !campaign.stop_reason ? (
            <Notice tone="accent">
              Kampanya tamamlandı. Tüm hedefler işlendi; paylaşılan numaraları aşağıdan
              inceleyebilirsiniz.
            </Notice>
          ) : null}

          {campaign.stop_reason ? (
            <Notice tone={campaign.status === 'paused' ? 'warn' : 'danger'}>
              <span className="font-medium">{stopReasonLabel(campaign.status)}:</span>{' '}
              {campaign.stop_reason}
            </Notice>
          ) : campaign.status === 'stopped' ? (
            <Notice tone="danger">
              Kampanya durduruldu. Ayrıntılı neden kaydı yok; paylaşılan satırlardaki hatalara
              bakın.
            </Notice>
          ) : null}

          {error ? <Notice tone="danger">{error}</Notice> : null}

          {campaign.status === 'running' ? (
            <Notice tone="warn">
              Grup veya hat değiştirmek için önce <strong>Duraklat</strong>. Mesaj
              değişikliği kalan gönderimleri etkiler; gidenler değişmez.
            </Notice>
          ) : null}

          {campaign.status === 'paused' || campaign.status === 'stopped' ? (
            <Notice tone="accent">
              Aşağıdan mesaj, grup ve hatları düzenleyebilirsiniz. Yanlış gruptaysanız
              “Kalan gönderimleri iptal et”i işaretleyin.
            </Notice>
          ) : null}

          <div className="flex flex-wrap gap-1.5 border-t border-hairline pt-2.5">
            {campaign.status === 'draft' || campaign.status === 'stopped' ? (
              <>
                {queueHint > 0 ? (
                  <div className="mb-1 w-full basis-full">
                    <Notice tone="warn">
                      Başlatınca ~{queueHint.toLocaleString('tr-TR')} hedef satırı kuyruğa
                      yazılır; sonra sırayla gönderilir.
                    </Notice>
                  </div>
                ) : null}
                <Button
                  variant="accent"
                  disabled={pending}
                  onClick={() => run(() => startCampaign(campaign.id))}
                >
                  {pending
                    ? 'Başlatılıyor…'
                    : campaign.status === 'stopped'
                      ? 'Yeniden başlat'
                      : 'Gönderimi başlat'}
                </Button>
              </>
            ) : null}

            {campaign.status === 'running' ? (
              <Button disabled={pending} onClick={() => run(() => pauseCampaign(campaign.id))}>
                {pending ? 'Duraklatılıyor…' : 'Duraklat (düzenle)'}
              </Button>
            ) : null}

            {campaign.status === 'paused' ? (
              <Button
                variant="accent"
                disabled={pending}
                onClick={() => run(() => resumeCampaign(campaign.id))}
              >
                {pending ? 'Devam ediliyor…' : 'Devam et'}
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

            <Button
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const result = await duplicateCampaign(campaign.id)
                  if (result.error) return { error: result.error }
                  if (result.id) router.push(`/kampanyalar/${result.id}`)
                  return {}
                })
              }
            >
              {pending ? 'Kopyalanıyor…' : 'Kampanyayı kopyala'}
            </Button>
          </div>
        </div>
      </Card>

      <EditCampaignForm
        campaign={{
          id: campaign.id,
          name: campaign.name,
          status: campaign.status,
          body: campaign.body,
          body_b: campaign.body_b,
          ab_percent: campaign.ab_percent,
          media_url: campaign.media_url,
          message_type: campaign.message_type,
          min_delay_seconds: campaign.min_delay_seconds,
          max_delay_seconds: campaign.max_delay_seconds,
          daily_cap_per_account: campaign.daily_cap_per_account,
          source_list_ids: campaign.source_list_ids ?? [],
        }}
        lists={listOptions}
        accounts={accountOptions}
        selectedAccountIds={accounts.map((account) => account.id)}
      />
    </div>
  )
}
