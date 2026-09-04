import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, PageHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { InboxBoard, type InboxMessage, type ThreadPreview } from './inbox-board'

export const metadata: Metadata = { title: 'Gelenler' }
export const dynamic = 'force-dynamic'

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tel?: string | string[] }>
}) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const params = await searchParams
  const telRaw = params.tel
  const selectedPhone = Array.isArray(telRaw) ? telRaw[0] : telRaw

  const [{ data: inbound }, { data: accounts }, { count: inboundToday }] = await Promise.all([
    supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id',
      )
      .eq('direction', 'in')
      .order('id', { ascending: false })
      .limit(200),
    supabase.from('accounts').select('id, label, phone_e164'),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('direction', 'in')
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
  ])

  const accountLabels = Object.fromEntries(
    (accounts ?? []).map((account) => [account.id, account.label]),
  )

  // Telefon bazinda son gelen mesaj = sohbet onizlemesi
  const previews = new Map<string, ThreadPreview>()
  for (const row of inbound ?? []) {
    const phone = row.phone_e164 ?? row.remote_jid ?? `id-${row.id}`
    if (previews.has(phone)) continue
    previews.set(phone, {
      phone,
      lastBody: row.body,
      lastAt: row.created_at,
      messageType: row.message_type,
      accountId: row.account_id,
      accountLabel: row.account_id ? accountLabels[row.account_id] ?? null : null,
    })
  }

  let thread: InboxMessage[] = []
  if (selectedPhone) {
    let threadQuery = supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id',
      )
      .order('id', { ascending: true })
      .limit(200)

    threadQuery = selectedPhone.startsWith('+')
      ? threadQuery.eq('phone_e164', selectedPhone)
      : threadQuery.eq('remote_jid', selectedPhone)

    const { data: threadRows } = await threadQuery
    thread = (threadRows ?? []) as InboxMessage[]
  }

  return (
    <>
      <PageHeader
        title="Gelenler"
        description="Bağlı hatlara gelen yanıtlar. “dur / yazma / stop” içeren cevaplar otomatik kara listeye alınır."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <span className="tabular text-[12.5px] text-ink-muted">
              Bugün {inboundToday ?? 0} gelen
            </span>
            <AccentLink href="/kara-liste">Kara liste</AccentLink>
          </div>
        }
      />

      <InboxBoard
        userId={user.id}
        previews={[...previews.values()]}
        selectedPhone={selectedPhone ?? null}
        thread={thread}
        accountLabels={accountLabels}
        initialInbound={(inbound ?? []) as InboxMessage[]}
      />
    </>
  )
}
