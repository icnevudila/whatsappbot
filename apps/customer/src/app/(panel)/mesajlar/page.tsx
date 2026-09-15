import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { filterInbox, filterThread, loadInboxBundle, loadThreadBundle } from '@/lib/chat-store'
import { MessagesBoard, type MessagesDateRange, type MessagesTab } from './messages-board'

export const metadata: Metadata = { title: 'Mesajlar' }
export const dynamic = 'force-dynamic'

const ISTANBUL = 'Europe/Istanbul'

function resolveTab(raw: string | undefined): MessagesTab {
  if (raw === 'giden') return 'giden'
  return 'tum'
}

function resolveDateRange(raw: string | undefined): MessagesDateRange {
  if (raw === 'bugun' || raw === 'dun' || raw === '7gun') return raw
  return 'tum'
}

function ymdIstanbul(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ISTANBUL,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function startOfIstanbulDay(ymd: string): Date {
  return new Date(`${ymd}T00:00:00+03:00`)
}

function shiftYmd(ymd: string, days: number): string {
  return ymdIstanbul(new Date(startOfIstanbulDay(ymd).getTime() + days * 86_400_000))
}

function rangeBounds(range: MessagesDateRange): { from: Date | null; to: Date | null } {
  if (range === 'tum') return { from: null, to: null }
  const today = ymdIstanbul(new Date())
  if (range === 'bugun') {
    const from = startOfIstanbulDay(today)
    return { from, to: new Date(from.getTime() + 86_400_000) }
  }
  if (range === 'dun') {
    const yesterday = shiftYmd(today, -1)
    return { from: startOfIstanbulDay(yesterday), to: startOfIstanbulDay(today) }
  }
  return { from: startOfIstanbulDay(shiftYmd(today, -6)), to: new Date(startOfIstanbulDay(today).getTime() + 86_400_000) }
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tel?: string | string[]
    sekme?: string | string[]
    tarih?: string | string[]
  }>
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
  const telRaw = params.tel
  const selectedPhone = Array.isArray(telRaw) ? telRaw[0] : telRaw
  const sekmeRaw = Array.isArray(params.sekme) ? params.sekme[0] : params.sekme
  const tarihRaw = Array.isArray(params.tarih) ? params.tarih[0] : params.tarih
  const tab = resolveTab(sekmeRaw)
  const dateRange = resolveDateRange(tarihRaw)
  const { from: rangeFrom, to: rangeTo } = rangeBounds(dateRange)

  const [{ messages }, inbox] = await Promise.all([
    getDictionary(),
    loadInboxBundle(supabase, org.id),
  ])
  const t = createT(messages)
  const filtered = filterInbox(inbox.items, rangeFrom, rangeTo, tab)
  const thread = selectedPhone
    ? filterThread((await loadThreadBundle(supabase, org.id, selectedPhone)).msgs, rangeFrom, rangeTo)
    : []

  return (
    <div className="wb-inbox">
      <PageHeader
        title={t('pages.mesajlarTitle')}
        description="Tüm WhatsApp mesajlarınız tek panelde. Gelen, giden ve cevapsız sohbetler bir arada."
      />

      <MessagesBoard
        orgId={org.id}
        tab={tab}
        dateRange={dateRange}
        allCount={filtered.allCount}
        outboundCount={filtered.outboundCount}
        previews={filtered.previews}
        selectedPhone={selectedPhone ?? null}
        thread={thread}
        accountLabels={inbox.accountLabels}
      />
    </div>
  )
}
