import test from 'node:test'
import assert from 'node:assert/strict'
import { campaignBriefFromSnapshot } from './campaign-handoff'

test('campaign handoff keeps selected SKU facts, offer, dates, tone and every contact', () => {
  const brief = campaignBriefFromSnapshot({
    brief: 'Yeni sezon',
    brandKit: { id: 'kit', name: 'Parent company', tone: 'Samimi', colors: {}, fonts: {}, logoPath: null },
    products: [{ id: 'sku', name: 'DELTA', description: 'Doğrulanmış açıklama', price: '220 TL', oldPrice: '280 TL',
      promo: '%20 indirim', extra: 'Paket teklifi', boxContents: '12 adet', imageUrl: null,
      include: { name: true, description: true, price: true, promo: true, image: true, boxContents: true } }],
    primaryBenefits: ['Dayanıklı'], deliveryInfo: 'Şantiyeye teslim', cta: 'Teklif al', dateRange: '1–30 Ekim',
    phones: [{ id: 'phone', label: 'WhatsApp', phone: '05320000000' }, { id: 'other', label: 'Ofis', phone: '02120000000' }],
    socials: [{ id: 'social', platform: 'Instagram', label: null, url: 'https://instagram.com/example' }],
  })
  for (const fact of ['DELTA', 'Parent company', 'Samimi', '220 TL', '280 TL', '%20 indirim', '12 adet',
    'Doğrulanmış açıklama', 'Dayanıklı', 'Şantiyeye teslim', 'Teklif al', '1–30 Ekim', '05320000000', '02120000000', 'https://instagram.com/example']) {
    assert.ok(brief.includes(fact), `Missing persisted fact: ${fact}`)
  }
})

test('missing fields add no fabricated offer, price, date, delivery or contact', () => {
  assert.equal(campaignBriefFromSnapshot({ brief: 'Ürün tanıtımı' }), 'Ürün tanıtımı')
  assert.equal(campaignBriefFromSnapshot({}), '')
})
