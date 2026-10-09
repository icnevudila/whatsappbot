import test from 'node:test'
import assert from 'node:assert/strict'
import { buildVideoCampaignSnapshot } from './video-campaign-snapshot'
import { campaignBriefFromSnapshot } from './campaign-handoff'

test('video snapshot retains canonical SKU, selected kit and supplied commercial fields for campaign reuse', () => {
  const snapshot = buildVideoCampaignSnapshot({
    context: { price: '220 TL', oldPrice: '280 TL', dateRange: '1–30 Ekim', deliveryInfo: 'Şantiyeye teslim', headline: 'Yeni ürün', supportingLine: 'Doğrulanmış özellik' },
    brief: 'Kampanya', cta: 'Teklif al', voiceover: 'Onaylı Türkçe metin', offer: '%20 indirim',
    canonical: { product: { id: 'owned-sku', name: 'DELTA', description: 'Katalog açıklaması', box_contents: '12 adet' },
      productUrl: 'https://assets.example/product.png', logoUrl: 'https://assets.example/logo.png',
      kit: { id: 'selected-kit', name: 'Parent Brand', tone: 'Samimi', colors: { primary: '#123456' }, fonts: {}, logo_path: 'logo' },
      organization: { address: 'Doğrulanmış adres' } },
    phones: [{ id: 'owned-phone', label: 'WhatsApp', phone: '05320000000' }], socials: [],
  })
  assert.equal(snapshot.products[0].id, 'owned-sku')
  assert.equal(snapshot.brandKit?.id, 'selected-kit')
  const campaignBrief = campaignBriefFromSnapshot(snapshot)
  for (const field of ['DELTA', 'Katalog açıklaması', '220 TL', '280 TL', '1–30 Ekim', 'Şantiyeye teslim', '%20 indirim', 'Samimi', '05320000000']) {
    assert.ok(campaignBrief.includes(field), `Missing: ${field}`)
  }
})
