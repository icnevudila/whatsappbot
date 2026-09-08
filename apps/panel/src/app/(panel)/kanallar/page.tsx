import type { Metadata } from 'next'
import { Card, PageHeader } from '@/components/ui'

export const metadata: Metadata = { title: 'Kanallar' }

const CATALOG: Array<{
  id: string
  title: string
  service: string
  kind: string
  lib: string
  status: 'ready' | 'mock'
}> = [
  { id: 'whatsapp', title: 'WhatsApp', service: 'wa-service', kind: 'Mesaj', lib: 'Baileys', status: 'ready' },
  { id: 'telegram', title: 'Telegram', service: 'tg-service', kind: 'Mesaj', lib: 'grammY', status: 'mock' },
  { id: 'instagram', title: 'Instagram', service: 'meta-service', kind: 'Mesaj', lib: 'Meta Graph', status: 'mock' },
  { id: 'facebook', title: 'Facebook', service: 'meta-service', kind: 'Mesaj', lib: 'Meta Graph', status: 'mock' },
  { id: 'rcs', title: 'RCS', service: 'rcs-service', kind: 'Mesaj', lib: 'Google RBM', status: 'mock' },
  { id: 'line', title: 'LINE', service: 'line-service', kind: 'Mesaj', lib: '@line/bot-sdk', status: 'mock' },
  { id: 'wechat', title: 'WeChat', service: 'wechat-service', kind: 'Mesaj', lib: 'iLink adapter', status: 'mock' },
  { id: 'webchat', title: 'Web chat', service: 'webchat-service', kind: 'Mesaj', lib: 'HTTP webhook', status: 'mock' },
  { id: 'shopify', title: 'Shopify', service: 'shopify-service', kind: 'E-ticaret', lib: 'Admin GraphQL', status: 'mock' },
  { id: 'ikas', title: 'iKAS', service: 'ikas-service', kind: 'E-ticaret', lib: 'GraphQL', status: 'mock' },
  { id: 'woocommerce', title: 'WooCommerce', service: 'woo-service', kind: 'E-ticaret', lib: 'REST', status: 'mock' },
  { id: 'magento', title: 'Magento', service: 'magento-service', kind: 'E-ticaret', lib: 'REST', status: 'mock' },
  { id: 'tsoft', title: 'T-Soft', service: 'tsoft-service', kind: 'E-ticaret', lib: 'REST', status: 'mock' },
  { id: 'ticimax', title: 'Ticimax', service: 'ticimax-service', kind: 'E-ticaret', lib: 'REST', status: 'mock' },
  { id: 'ideasoft', title: 'Ideasoft', service: 'ideasoft-service', kind: 'E-ticaret', lib: 'REST', status: 'mock' },
  { id: 'proje', title: 'Proj-e', service: 'proje-service', kind: 'E-ticaret', lib: 'REST', status: 'mock' },
  { id: 'trendyol', title: 'Trendyol', service: 'trendyol-service', kind: 'Pazaryeri', lib: 'Seller API', status: 'mock' },
  { id: 'hepsiburada', title: 'Hepsiburada', service: 'hepsiburada-service', kind: 'Pazaryeri', lib: 'Merchant API', status: 'mock' },
  { id: 'erp', title: 'ERP (SAP/Oracle/IFS/Nebim)', service: 'erp-service', kind: 'ERP', lib: 'Adapter', status: 'mock' },
  { id: 'crm', title: 'CRM (HubSpot/Zendesk/Takvim)', service: 'crm-service', kind: 'CRM', lib: 'Adapter', status: 'mock' },
]

export default function KanallarPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kanallar"
        description="Palmate tarzı entegrasyonlar. Her kanal ayrı worker; mock modda testler yeşil, canlı credential sonra açılır."
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CATALOG.map((item) => (
          <Card key={item.id} className="space-y-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-base font-semibold text-ink">{item.title}</h2>
              <span className="text-[11px] uppercase tracking-wide text-muted">
                {item.status === 'ready' ? 'Canlı' : 'Mock'}
              </span>
            </div>
            <p className="text-sm text-muted">{item.kind}</p>
            <p className="text-xs text-muted">
              <code>{item.service}</code> · {item.lib}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
