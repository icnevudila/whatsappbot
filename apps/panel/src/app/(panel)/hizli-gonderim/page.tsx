import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  CardHeader,
  EmptyState,
  PageHeader,
  QuietLink,
  SplitPane,
  StatusPill,
} from '@/components/ui'
import { hasImageProvider } from '@/lib/ai/image'
import { hasTextProvider } from '@/lib/ai/text'
import { loadOrgAiKeys, rowToBag } from '@/lib/ai/org-keys'
import { remainingToday } from '@/lib/capacity'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { QuickSendForm, type SenderOption } from './quick-send-form'

export const metadata: Metadata = { title: 'Hızlı gönderim' }

function recentShell(status: string): string {
  switch (status) {
    case 'running':
    case 'sending':
      return 'border-l-[3px] border-l-accent bg-accent-soft/40'
    case 'completed':
    case 'sent':
    case 'delivered':
    case 'read':
      return 'border-l-[3px] border-l-ok bg-ok-soft/35'
    case 'failed':
    case 'stopped':
      return 'border-l-[3px] border-l-danger bg-[#fff5f4]'
    case 'paused':
    case 'scheduled':
      return 'border-l-[3px] border-l-warn bg-[#fff8e8]'
    default:
      return 'border-l-[3px] border-l-hairline-strong bg-surface-raised/50'
  }
}

export default async function QuickSendPage({
  searchParams,
}: {
  searchParams: Promise<{ media?: string | string[]; tel?: string | string[] }>
}) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const params = await searchParams
  const mediaParam = params.media
  const initialMediaUrl = Array.isArray(mediaParam) ? mediaParam[0] ?? '' : mediaParam ?? ''
  const telParam = params.tel
  const initialNumbers = Array.isArray(telParam)
    ? telParam.filter(Boolean).join('\n')
    : telParam
      ? telParam.split(',').map((p) => p.trim()).filter(Boolean).join('\n')
      : ''

  const [{ data: accounts }, brandResult, recentResult, aiKeyRow, { messages }] =
    await Promise.all([
    supabase
      .from('accounts')
      .select(
        'id, label, phone_e164, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used',
      )
      .eq('org_id', org.id)
      .eq('status', 'connected')
      .eq('enabled', true)
      .eq('is_locked', false)
      .order('created_at'),
    supabase
      .from('brand_kits')
      .select('id, name, is_default')
      .eq('org_id', org.id)
      .order('is_default', { ascending: false })
      .order('created_at'),
    supabase
      .from('campaigns')
      .select('id, name, status, total_targets, sent_count, created_at')
      .eq('org_id', org.id)
      .or('name.like.Hızlı gönderim%,name.like.Hizli gonderim%')
      .order('created_at', { ascending: false })
      .limit(8),
    loadOrgAiKeys(supabase, org.id),
    getDictionary(),
  ])

  const t = createT(messages)
  const aiBag = rowToBag(aiKeyRow)
  const senders: SenderOption[] = (accounts ?? []).map((account) => ({
    id: account.id,
    label: account.label,
    phone: account.phone_e164,
    remainingToday: remainingToday(account),
  }))

  const brandKits = (brandResult.data ?? []).map((kit) => ({
    id: kit.id,
    name: kit.name,
    isDefault: kit.is_default,
  }))
  const brandName =
    brandKits.find((kit) => kit.isDefault)?.name ?? brandKits[0]?.name ?? undefined

  const recent = recentResult.data ?? []
  const remainingTotal = senders.reduce((sum, s) => sum + Math.max(0, s.remainingToday), 0)

  return (
    <>
      <PageHeader
        title={t('pages.hizliTitle')}
        description="Numaraları yapıştırıp hemen gönderin. Liste oluşturmaz; takip Kampanyalar’da."
        action={
          <div className="flex flex-wrap gap-2">
            <AccentLink href="/kampanyalar">{t('nav.kampanyalar')}</AccentLink>
            <QuietLink href="/kisiler">{t('nav.kisiler')}</QuietLink>
          </div>
        }
      />

      {senders.length === 0 ? (
        <EmptyState
          tone="phone"
          title="Önce bir hat bağlayın"
          description="En az bir bağlı WhatsApp hattı gerekir. Hesaplar’dan QR okutun veya eşleştirme kodu alın."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <AccentLink href="/hesaplar">Hesaplara git</AccentLink>
              <QuietLink href="/durum">Durumu kontrol et</QuietLink>
            </div>
          }
        />
      ) : (
        <SplitPane
          variant="form"
          list={
            <div className="flex min-h-0 flex-col">
              <CardHeader
                title="Son hızlı gönderimler"
                subtitle="Detay için kampanya sayfasını açın"
              />
              {recent.length === 0 ? (
                <EmptyState
                  tone="outbound"
                  title="Henüz gönderim yok"
                  description="İlk hızlı gönderiminiz burada listelenir."
                  action={<QuietLink href="/kampanyalar">Kampanyalara bak</QuietLink>}
                />
              ) : (
                <ul className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
                  {recent.map((item, index) => (
                    <li
                      key={item.id}
                      className="wb-row-enter"
                      style={{ animationDelay: `${Math.min(index, 8) * 28}ms` }}
                    >
                      <Link
                        href={`/kampanyalar/${item.id}`}
                        className={`wb-list-row flex flex-col gap-1 rounded-[var(--radius-sm)] border border-transparent px-3 py-2.5 transition-colors hover:border-hairline ${recentShell(item.status)}`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-semibold text-ink">
                            {item.name}
                          </span>
                          <StatusPill status={item.status} />
                        </span>
                        <span className="tabular text-[11.5px] text-ink-muted">
                          {item.sent_count}/{item.total_targets} ·{' '}
                          {new Date(item.created_at).toLocaleString('tr-TR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          }
          detail={
            <QuickSendForm
              senders={senders}
              orgId={org.id}
              aiEnabled={hasTextProvider(aiBag)}
              imageAiEnabled={hasImageProvider(aiBag)}
              brandName={brandName}
              brandKits={brandKits}
              initialMediaUrl={initialMediaUrl}
              initialNumbers={initialNumbers}
              statusSlot={
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent-soft px-2 py-1 text-[11.5px] font-medium text-accent-dim">
                    <span className="tabular text-[13px] font-bold text-accent">
                      {senders.length}
                    </span>
                    hazır hat
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium ${
                      remainingTotal > 0
                        ? 'border-ok/35 bg-ok-soft text-ok-dim'
                        : 'border-warn/35 bg-[#fff8e8] text-warn'
                    }`}
                  >
                    <span className="tabular text-[13px] font-bold">{remainingTotal}</span>
                    kalan kota
                  </span>
                </>
              }
            />
          }
        />
      )}
    </>
  )
}
