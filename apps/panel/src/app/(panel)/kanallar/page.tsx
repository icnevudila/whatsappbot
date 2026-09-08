import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, PageHeader } from '@/components/ui'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'
import { ChannelAccountsList, type ChannelAccountRow } from './accounts-list'
import { ConnectChannelForm } from './connect-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Kanallar' }

const CATALOG: Array<{
  id: string
  title: string
  service: string
  kind: string
  lib: string
}> = [
  { id: 'whatsapp', title: 'WhatsApp', service: 'wa-service', kind: 'Mesaj', lib: 'Baileys' },
  { id: 'telegram', title: 'Telegram', service: 'tg-service', kind: 'Mesaj', lib: 'grammY' },
  { id: 'instagram', title: 'Instagram', service: 'meta-service', kind: 'Mesaj', lib: 'Meta Graph' },
  { id: 'facebook', title: 'Facebook', service: 'meta-service', kind: 'Mesaj', lib: 'Meta Graph' },
  { id: 'rcs', title: 'RCS', service: 'rcs-service', kind: 'Mesaj', lib: 'Google RBM' },
  { id: 'line', title: 'LINE', service: 'line-service', kind: 'Mesaj', lib: 'Messaging API' },
  { id: 'wechat', title: 'WeChat', service: 'wechat-service', kind: 'Mesaj', lib: 'iLink' },
  { id: 'webchat', title: 'Web chat', service: 'webchat-service', kind: 'Mesaj', lib: 'HTTP' },
  { id: 'shopify', title: 'Shopify', service: 'shopify-service', kind: 'E-ticaret', lib: 'GraphQL' },
  { id: 'ikas', title: 'iKAS', service: 'ikas-service', kind: 'E-ticaret', lib: 'GraphQL' },
  { id: 'woocommerce', title: 'WooCommerce', service: 'woo-service', kind: 'E-ticaret', lib: 'REST' },
  { id: 'magento', title: 'Magento', service: 'magento-service', kind: 'E-ticaret', lib: 'REST' },
  { id: 'tsoft', title: 'T-Soft', service: 'tsoft-service', kind: 'E-ticaret', lib: 'REST' },
  { id: 'ticimax', title: 'Ticimax', service: 'ticimax-service', kind: 'E-ticaret', lib: 'REST' },
  { id: 'ideasoft', title: 'Ideasoft', service: 'ideasoft-service', kind: 'E-ticaret', lib: 'REST' },
  { id: 'proje', title: 'Proj-e', service: 'proje-service', kind: 'E-ticaret', lib: 'REST' },
  { id: 'trendyol', title: 'Trendyol', service: 'trendyol-service', kind: 'Pazaryeri', lib: 'Seller API' },
  { id: 'hepsiburada', title: 'Hepsiburada', service: 'hepsiburada-service', kind: 'Pazaryeri', lib: 'Merchant' },
]

export default async function KanallarPage() {
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

  const canManage = isOrgAdminRole(org.role)

  const { data } = await supabase
    .from('channel_accounts' as 'accounts')
    .select('id, channel, label, status, external_account_id, updated_at')
    .eq('org_id', org.id)
    .order('updated_at', { ascending: false })

  const rows = (data ?? []) as unknown as ChannelAccountRow[]

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kanallar"
        description="WhatsApp dışı entegrasyonlar. Her kanal ayrı worker; bağladıktan sonra ilgili servis token ile çalışır."
      />

      <Card className="space-y-4 p-4 md:p-5">
        <h2 className="text-base font-semibold text-ink">Bağlı hesaplar</h2>
        <ChannelAccountsList rows={rows} canManage={canManage} />
      </Card>

      <Card className="space-y-4 p-4 md:p-5">
        <h2 className="text-base font-semibold text-ink">Yeni kanal bağla</h2>
        <ConnectChannelForm canManage={canManage} />
      </Card>

      <div>
        <h2 className="mb-3 text-base font-semibold text-ink">Servis kataloğu</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {CATALOG.map((item) => (
            <Card key={item.id} className="space-y-1 p-4">
              <h3 className="font-medium text-ink">{item.title}</h3>
              <p className="text-sm text-muted">{item.kind}</p>
              <p className="text-xs text-muted">
                <code>{item.service}</code> · {item.lib}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
