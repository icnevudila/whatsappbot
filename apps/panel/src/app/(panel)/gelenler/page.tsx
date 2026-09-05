import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, PageHeader, QuietLink } from '@/components/ui'
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
  } catch {
    redirect('/giris')
  }

  const params = await searchParams
  const telRaw = params.tel
  const selectedPhone = Array.isArray(telRaw) ? telRaw[0] : telRaw
  const sekmeRaw = Array.isArray(params.sekme) ? params.sekme[0] : params.sekme
  const tab = resolveTab(sekmeRaw)
  const konusmaRaw = Array.isArray(params.konusma) ? params.konusma[0] : params.konusma
  const threadMode: ThreadMode = konusmaRaw === 'tam' ? 'tam' : 'gelen'

  const [{ data: inbound }, { data: outboundPhones }, { data: accounts }, { count: inboundToday }] =
    await Promise.all([
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
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'in')
        .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    ])

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
      waStatus: null,
    })
  }

  const e164Phones = [...allPreviews.keys()].filter((phone) => phone.startsWith('+')).slice(0, 200)
  if (e164Phones.length > 0) {
    const { data: contactRows } = await supabase
      .from('contacts')
      .select('phone_e164, wa_status')
      .eq('org_id', org.id)
      .in('phone_e164', e164Phones)

    for (const contact of contactRows ?? []) {
      const preview = allPreviews.get(contact.phone_e164)
      if (preview) preview.waStatus = contact.wa_status ?? null
    }
  }

  const allList = [...allPreviews.values()]
  const replyList = allList.filter((p) => p.isReply)
  const newList = allList.filter((p) => !p.isReply)
  const previews =
    tab === 'yanitlar' ? replyList : tab === 'yeni' ? newList : allList
  const selectedPreview =
    (selectedPhone ? allPreviews.get(selectedPhone) : null) ?? null

  let thread: InboxMessage[] = []
  let selectedBlacklisted = false
  if (selectedPhone) {
    let threadQuery = supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id',
      )
      .eq('org_id', org.id)
      .order('id', { ascending: true })
      .limit(200)

    if (threadMode === 'gelen') {
      threadQuery = threadQuery.eq('direction', 'in')
    }

    threadQuery = selectedPhone.startsWith('+')
      ? threadQuery.eq('phone_e164', selectedPhone)
      : threadQuery.eq('remote_jid', selectedPhone)

    const [{ data: threadRows }, blacklistResult] = await Promise.all([
      threadQuery,
      selectedPhone.startsWith('+')
        ? supabase
            .from('blacklist')
            .select('id')
            .eq('org_id', org.id)
            .eq('phone_e164', selectedPhone)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ])
    thread = (threadRows ?? []) as InboxMessage[]
    selectedBlacklisted = Boolean(blacklistResult.data)
  }

  return (
    <>
      <PageHeader
        title="Gelenler"
        description="Salt okuma: bağlı hatlara gelen mesajlar. Gidenler “Tam konuşma”da görünür. “dur”, “yazma” veya “stop” yanıtları kara listeye alınır."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 tabular text-[12.5px] text-ink-muted">
              Bugün {inboundToday ?? 0} gelen
            </span>
            <AccentLink href="/durum">Durum</AccentLink>
            <QuietLink href="/kara-liste">Kara liste</QuietLink>
            <QuietLink href="/hizli-gonderim">Hızlı gönderim</QuietLink>
          </div>
        }
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
        selectedPreview={selectedPreview}
        selectedBlacklisted={selectedBlacklisted}
        thread={thread}
        accountLabels={accountLabels}
      />
    </>
  )
}
