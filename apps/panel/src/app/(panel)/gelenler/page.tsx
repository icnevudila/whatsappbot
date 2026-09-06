import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, PageHeader } from '@/components/ui'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { InboxBoard, type InboxMessage, type ThreadPreview } from './inbox-board'

export const metadata: Metadata = { title: 'Gelenler' }
export const dynamic = 'force-dynamic'

type InboxTab = 'tum' | 'yanitlar' | 'yeni'
type ThreadMode = 'gelen' | 'tam'

function resolveTab(raw: string | undefined): InboxTab {
  // Eski URL'ler: ilgili→yanitlar, diger→yeni
  if (raw === 'yanitlar' || raw === 'ilgili') return 'yanitlar'
  if (raw === 'yeni' || raw === 'diger') return 'yeni'
  return 'tum'
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{
    tel?: string | string[]
    sekme?: string | string[]
    konusma?: string | string[]
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
  const konusmaRaw = Array.isArray(params.konusma) ? params.konusma[0] : params.konusma
  const threadMode: ThreadMode = konusmaRaw === 'gelen' ? 'gelen' : 'tam'

  const [
    { data: inbound },
    { data: outboundPhones },
    { data: accounts },
    { messages },
  ] = await Promise.all([
      supabase
        .from('message_log')
        .select(
          'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id',
        )
        .eq('org_id', org.id)
        .eq('direction', 'in')
        .order('id', { ascending: false })
        .limit(200),
      supabase
        .from('message_log')
        .select('phone_e164')
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .not('phone_e164', 'is', null)
        .limit(2000),
      supabase.from('accounts').select('id, label, phone_e164').eq('org_id', org.id),
    getDictionary(),
  ])

  const t = createT(messages)
  const relatedPhones = new Set(
    (outboundPhones ?? [])
      .map((row) => row.phone_e164)
      .filter((phone): phone is string => Boolean(phone)),
  )

  const accountLabels = Object.fromEntries(
    (accounts ?? []).map((account) => [account.id, account.label]),
  )

  const allPreviews = new Map<string, ThreadPreview>()
  for (const row of inbound ?? []) {
    const phone = row.phone_e164 ?? row.remote_jid ?? `id-${row.id}`
    if (allPreviews.has(phone)) continue
    const hasPhone = Boolean(row.phone_e164)
    const isReply = Boolean(row.phone_e164 && relatedPhones.has(row.phone_e164))
    allPreviews.set(phone, {
      phone,
      lastBody: row.body,
      lastAt: row.created_at,
      messageType: row.message_type,
      accountId: row.account_id,
      accountLabel: row.account_id ? accountLabels[row.account_id] ?? null : null,
      isReply,
      missingPhone: !hasPhone,
    })
  }

  const allList = [...allPreviews.values()]
  const replyList = allList.filter((p) => p.isReply)
  const newList = allList.filter((p) => !p.isReply)
  const previews =
    tab === 'yanitlar' ? replyList : tab === 'yeni' ? newList : allList

  let thread: InboxMessage[] = []
  if (selectedPhone) {
    let threadQuery = supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id',
      )
      .eq('org_id', org.id)
      .order('id', { ascending: false })
      .limit(200)

    if (threadMode === 'gelen') {
      threadQuery = threadQuery.eq('direction', 'in')
    }

    threadQuery = selectedPhone.startsWith('+')
      ? threadQuery.eq('phone_e164', selectedPhone)
      : threadQuery.eq('remote_jid', selectedPhone)

    const { data: threadRows } = await threadQuery
    thread = [...(threadRows ?? [])].reverse() as InboxMessage[]
  }

  return (
    <>
      <PageHeader
        title={t('pages.gelenlerTitle')}
        description="Konuşmaları okuyun, bağlı hattınızdan yanıtlayın ve çıkış taleplerini yönetin. Son 200 gelen mesajdan oluşan güncel sohbetler gösterilir."
        action={<AccentLink href="/kara-liste">{t('nav.karaListe')}</AccentLink>}
      />

      <InboxBoard
        orgId={org.id}
        tab={tab}
        threadMode={threadMode}
        allCount={allList.length}
        replyCount={replyList.length}
        newCount={newList.length}
        previews={previews}
        selectedPhone={selectedPhone ?? null}
        thread={thread}
        accountLabels={accountLabels}
      />
    </>
  )
}
