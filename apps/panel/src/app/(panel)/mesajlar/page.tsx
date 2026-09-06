import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, PageHeader } from '@/components/ui'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import {
  MessagesBoard,
  type ChatMessage,
  type MessagesTab,
  type ThreadPreview,
} from './messages-board'

export const metadata: Metadata = { title: 'Mesajlar' }
export const dynamic = 'force-dynamic'

function resolveTab(raw: string | undefined): MessagesTab {
  if (raw === 'gelen' || raw === 'yeni' || raw === 'diger') return 'gelen'
  if (raw === 'giden') return 'giden'
  if (raw === 'yanitlar' || raw === 'ilgili') return 'yanitlar'
  return 'tum'
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    tel?: string | string[]
    sekme?: string | string[]
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
  const tab = resolveTab(sekmeRaw)

  const [{ data: recent }, { data: accounts }, { messages }] = await Promise.all([
    supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id, push_name',
      )
      .eq('org_id', org.id)
      .in('direction', ['in', 'out'])
      .order('id', { ascending: false })
      .limit(400),
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

  const inboundList = allList.filter((p) => p.lastDirection === 'in')
  const outboundList = allList.filter((p) => p.lastDirection === 'out')
  const replyList = allList.filter((p) => p.isReply)
  const previews =
    tab === 'gelen'
      ? inboundList
      : tab === 'giden'
        ? outboundList
        : tab === 'yanitlar'
          ? replyList
          : allList

  let thread: ChatMessage[] = []
  if (selectedPhone) {
    let threadQuery = supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id',
      )
      .eq('org_id', org.id)
      .in('direction', ['in', 'out'])
      .order('id', { ascending: false })
      .limit(200)

    threadQuery = selectedPhone.startsWith('+')
      ? threadQuery.eq('phone_e164', selectedPhone)
      : threadQuery.eq('remote_jid', selectedPhone)

    const { data: threadRows } = await threadQuery
    thread = [...(threadRows ?? [])].reverse() as ChatMessage[]
  }

  return (
    <>
      <PageHeader
        title={t('pages.mesajlarTitle')}
        description="Gelen ve giden mesajlar aynı sohbetlerde. Yanıtlayın, kara listeye alın; son 400 kayıt üzerinden güncel konuşmalar."
        action={<AccentLink href="/kara-liste">{t('nav.karaListe')}</AccentLink>}
      />

      <MessagesBoard
        orgId={org.id}
        tab={tab}
        allCount={allList.length}
        inboundCount={inboundList.length}
        outboundCount={outboundList.length}
        replyCount={replyList.length}
        previews={previews}
        selectedPhone={selectedPhone ?? null}
        thread={thread}
        accountLabels={accountLabels}
      />
    </>
  )
}
