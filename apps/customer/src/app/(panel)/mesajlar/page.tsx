import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import {
  MessagesBoard,
  type ChatMessage,
  type MessagesDateRange,
  type MessagesTab,
  type ThreadPreview,
} from './messages-board'

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

function inDateRange(iso: string, from: Date | null, to: Date | null): boolean {
  if (!from) return true
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return false
  if (time < from.getTime()) return false
  if (to && time >= to.getTime()) return false
  return true
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

  let recentQuery = supabase
    .from('message_log')
    .select(
      'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id, push_name',
    )
    .eq('org_id', org.id)
    .in('direction', ['in', 'out'])
    .order('id', { ascending: false })
    .limit(400)
  if (rangeFrom) recentQuery = recentQuery.gte('created_at', rangeFrom.toISOString())
  if (rangeTo) recentQuery = recentQuery.lt('created_at', rangeTo.toISOString())

  const [{ data: recent }, { data: accounts }, { messages }] = await Promise.all([
    recentQuery,
    supabase.from('accounts').select('id, label, phone_e164').eq('org_id', org.id),
    getDictionary(),
  ])

  const t = createT(messages)
  const accountLabels = Object.fromEntries(
    (accounts ?? []).map((account) => [account.id, account.label]),
  )

  const outboundPhones = new Set<string>()
  const inboundPhones = new Set<string>()
  for (const row of recent ?? []) {
    if (!row.phone_e164) continue
    if (row.direction === 'out') outboundPhones.add(row.phone_e164)
    if (row.direction === 'in') inboundPhones.add(row.phone_e164)
  }

  const allPreviews = new Map<string, ThreadPreview>()
  for (const row of recent ?? []) {
    const phone = row.phone_e164 ?? row.remote_jid ?? `id-${row.id}`
    const pushName =
      typeof row.push_name === 'string' && row.push_name.trim()
        ? row.push_name.trim()
        : null
    const direction = row.direction === 'out' ? 'out' : 'in'

    if (allPreviews.has(phone)) {
      const existing = allPreviews.get(phone)!
      if (!existing.pushName && pushName) existing.pushName = pushName
      continue
    }

    const hasPhone = Boolean(row.phone_e164)
    const isReply = Boolean(
      row.phone_e164 && outboundPhones.has(row.phone_e164) && inboundPhones.has(row.phone_e164),
    )
    const outboundOnly = Boolean(
      row.phone_e164 && outboundPhones.has(row.phone_e164) && !inboundPhones.has(row.phone_e164),
    )

    allPreviews.set(phone, {
      phone,
      pushName,
      lastBody: row.body,
      lastAt: row.created_at,
      lastDirection: direction,
      messageType: row.message_type,
      accountId: row.account_id,
      accountLabel: row.account_id ? accountLabels[row.account_id] ?? null : null,
      isReply,
      outboundOnly,
      missingPhone: !hasPhone,
    })
  }

  const allList = [...allPreviews.values()]
  const e164Phones = allList
    .map((preview) => preview.phone)
    .filter((phone) => phone.startsWith('+'))

  if (e164Phones.length > 0) {
    const { data: namedContacts } = await supabase
      .from('contacts')
      .select('phone_e164, name')
      .eq('org_id', org.id)
      .in('phone_e164', e164Phones)
      .not('name', 'is', null)

    const namesByPhone = new Map<string, string>()
    for (const row of namedContacts ?? []) {
      const name = row.name?.trim()
      if (!row.phone_e164 || !name) continue
      if (!namesByPhone.has(row.phone_e164)) namesByPhone.set(row.phone_e164, name)
    }

    for (const preview of allList) {
      preview.contactName = namesByPhone.get(preview.phone) ?? null
    }
  }

  const datedList = allList.filter((preview) => inDateRange(preview.lastAt, rangeFrom, rangeTo))
  // Giden sekmesi: kampanya/hızlı gönderim sonrası cevap beklenenler (gelen yok).
  const outboundList = datedList.filter((p) => p.outboundOnly)
  const previews = tab === 'giden' ? outboundList : datedList

  let thread: ChatMessage[] = []
  if (selectedPhone) {
    let threadQuery = supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id, wa_message_id',
      )
      .eq('org_id', org.id)
      .in('direction', ['in', 'out'])
      .order('id', { ascending: false })
      .limit(200)

    threadQuery = selectedPhone.startsWith('+')
      ? threadQuery.eq('phone_e164', selectedPhone)
      : threadQuery.eq('remote_jid', selectedPhone)
    if (rangeFrom) threadQuery = threadQuery.gte('created_at', rangeFrom.toISOString())
    if (rangeTo) threadQuery = threadQuery.lt('created_at', rangeTo.toISOString())

    const { data: threadRows } = await threadQuery
    thread = [...(threadRows ?? [])].reverse().map((row) => ({
      ...row,
      clientKey: `log-${row.id}`,
    })) as ChatMessage[]

    if (selectedPhone.startsWith('+')) {
      const { data: targets } = await supabase
        .from('campaign_targets')
        .select(
          'id, campaign_id, account_id, phone_e164, status, sent_at, updated_at, personalized_body, wa_message_id',
        )
        .eq('org_id', org.id)
        .eq('phone_e164', selectedPhone)
        .in('status', ['sent', 'delivered', 'read'])
        .order('id', { ascending: true })
        .limit(100)

      const datedTargets = (targets ?? []).filter((row) =>
        inDateRange(row.sent_at ?? row.updated_at, rangeFrom, rangeTo),
      )

      const campaignIds = [
        ...new Set(
          [
            ...thread.map((row) => row.campaign_id),
            ...datedTargets.map((row) => row.campaign_id),
          ].filter((id): id is string => Boolean(id)),
        ),
      ]

      const campaignMeta = new Map<
        string,
        { name: string; body: string | null; message_type: string; media_url: string | null }
      >()
      if (campaignIds.length > 0) {
        const { data: camps } = await supabase
          .from('campaigns')
          .select('id, name, body, message_type, media_url')
          .eq('org_id', org.id)
          .in('id', campaignIds)
        for (const camp of camps ?? []) {
          campaignMeta.set(camp.id, {
            name: camp.name,
            body: camp.body,
            message_type: camp.message_type,
            media_url: camp.media_url,
          })
        }
      }

      const seenCampaign = new Set(
        thread.map((row) => row.campaign_id).filter((id): id is string => Boolean(id)),
      )
      const seenWa = new Set(
        thread.map((row) => row.wa_message_id).filter((id): id is string => Boolean(id)),
      )

      for (const target of datedTargets) {
        if (seenCampaign.has(target.campaign_id)) continue
        if (target.wa_message_id && seenWa.has(target.wa_message_id)) continue
        const meta = campaignMeta.get(target.campaign_id)
        const body =
          target.personalized_body ||
          meta?.body ||
          (meta?.media_url ? '(görsel)' : null)
        thread.push({
          id: target.id,
          clientKey: `campaign-${target.id}`,
          account_id: target.account_id,
          direction: 'out',
          phone_e164: target.phone_e164,
          remote_jid: null,
          message_type: meta?.message_type || 'text',
          body,
          status: target.status,
          created_at: target.sent_at ?? target.updated_at,
          campaign_id: target.campaign_id,
          campaignName: meta?.name ?? null,
          wa_message_id: target.wa_message_id,
        })
      }

      thread.sort((a, b) => {
        const delta = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        if (delta !== 0) return delta
        return (a.clientKey ?? '').localeCompare(b.clientKey ?? '')
      })

      thread = thread.map((row) => {
        if (!row.campaign_id) return row
        const meta = campaignMeta.get(row.campaign_id)
        if (!meta) return row
        return {
          ...row,
          campaignName: row.campaignName ?? meta.name,
          body: row.body || meta.body || (meta.media_url ? '(görsel)' : row.body),
        }
      })
    }
  }

  return (
    <>
      <PageHeader
        title={t('pages.mesajlarTitle')}
        description="Tüm WhatsApp mesajlarınız tek panelde. Gelen, giden ve cevapsız sohbetler bir arada."
      />

      <MessagesBoard
        orgId={org.id}
        tab={tab}
        dateRange={dateRange}
        allCount={datedList.length}
        outboundCount={outboundList.length}
        previews={previews}
        selectedPhone={selectedPhone ?? null}
        thread={thread}
        accountLabels={accountLabels}
      />
    </>
  )
}
