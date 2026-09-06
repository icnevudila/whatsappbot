import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, PageHeader, QuietLink } from '@/components/ui'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { OutboundBoard, type OutboundMessage } from './outbound-board'

export const metadata: Metadata = { title: 'Gidenler' }
export const dynamic = 'force-dynamic'

export default async function OutboundPage() {
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

  const [{ data: outbound }, { data: accounts }, { messages: i18nMessages }] = await Promise.all([
    supabase
      .from('message_log')
      .select(
        'id, account_id, direction, phone_e164, remote_jid, message_type, body, status, created_at, campaign_id',
      )
      .eq('org_id', org.id)
      .eq('direction', 'out')
      .order('id', { ascending: false })
      .limit(200),
    supabase.from('accounts').select('id, label, phone_e164').eq('org_id', org.id),
    getDictionary(),
  ])

  const t = createT(i18nMessages)
  const accountLabels = Object.fromEntries(
    (accounts ?? []).map((account) => [account.id, account.label]),
  )

  const campaignIds = [
    ...new Set(
      (outbound ?? [])
        .map((row) => row.campaign_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ]

  let campaignNames: Record<string, string> = {}
  if (campaignIds.length > 0) {
    const { data: campaigns } = await supabase
      .from('campaigns')
      .select('id, name')
      .eq('org_id', org.id)
      .in('id', campaignIds)
    campaignNames = Object.fromEntries(
      (campaigns ?? []).map((campaign) => [campaign.id, campaign.name]),
    )
  }

  const messages = (outbound ?? []) as OutboundMessage[]

  return (
    <>
      <PageHeader
        title={t('pages.gidenlerTitle')}
        description="Kampanya ve hızlı gönderimden çıkan mesaj kayıtları (salt okuma). Yanıtlar Gelenler’de."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AccentLink href="/gelenler">{t('nav.gelenler')}</AccentLink>
            <QuietLink href="/hizli-gonderim">{t('nav.hizli')}</QuietLink>
          </div>
        }
      />

      <OutboundBoard
        orgId={org.id}
        messages={messages}
        accountLabels={accountLabels}
        campaignNames={campaignNames}
      />
    </>
  )
}
