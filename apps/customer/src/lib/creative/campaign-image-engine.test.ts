import test from 'node:test'
import assert from 'node:assert/strict'
import {
  deriveVerifiedCampaignData,
  buildLegacySimpleCreativePrompt,
  buildCreativePrompt,
} from './prompt'
import { generateCampaignWhatsAppMessage } from '../ai/campaign-message'
import type { CreativeSnapshot } from './types'

function makeMockSnapshot(overrides: Partial<CreativeSnapshot> = {}): CreativeSnapshot {
  return {
    brief: 'Yüksek kaliteli inşaat tuğlası toptan satış kampanyası',
    style: 'auto',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: true,
    labels: ['Şantiyeye Teslim', 'Toptan Fiyat'],
    cta: 'Hemen Teklif Alın',
    address: null,
    website: 'https://ornek-firma.com',
    dateRange: '1-30 Ekim',
    customText: 'Projelerinize Güvenli Temeller',
    phones: [{ id: 'p1', label: 'Satış Hattı', phone: '0532 000 00 00' }],
    socials: [{ id: 's1', platform: 'Instagram', label: '@ornekfirma', url: 'https://instagram.com/ornekfirma' }],
    brandKit: {
      id: 'kit-1',
      name: 'Örnek Yapı Brand Kit',
      tone: 'Güvenilir ve kurumsal',
      colors: { primary: '#212121', accent: '#d32f2f' },
      fonts: { heading: 'Montserrat' },
      logoPath: 'orgs/kit-1/logo.png',
    },
    products: [
      {
        id: 'prod-1',
        name: 'Klinker Tuğla',
        description: 'Yüksek mukavemetli cephe tuğlası',
        boxContents: 'Palette 480 adet',
        imageUrl: 'orgs/kit-1/tugla.png',
        price: '18.50 TL',
        oldPrice: '24.00 TL',
        promo: '%25 İndirim',
        extra: 'Minimum 5 palet sipariş',
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    baseCreativeId: null,
    templateFamily: 'CAMPAIGN_POSTER',
    sector: 'İnşaat Malzemeleri',
    deliveryInfo: '3 gün içinde şantiyeye teslim',
    stockInfo: 'Stoktan hemen teslim',
    urgencyInfo: 'Ay sonuna kadar geçerli',
    primaryBenefits: ['Fabrikadan Doğrudan Sevkiyat', 'Yüksek Isı Yalıtımı'],
    ...overrides,
  }
}

test('1. Template selection: default to CAMPAIGN_POSTER and map styles correctly', () => {
  // Default physical SME
  const snap1 = makeMockSnapshot({ templateFamily: 'CAMPAIGN_POSTER' })
  const v1 = deriveVerifiedCampaignData(snap1)
  assert.equal(v1.templateFamily, 'CAMPAIGN_POSTER')

  // Product Showcase
  const snap2 = makeMockSnapshot({ templateFamily: 'PRODUCT_SHOWCASE' })
  const v2 = deriveVerifiedCampaignData(snap2)
  assert.equal(v2.templateFamily, 'PRODUCT_SHOWCASE')

  // Food Offer
  const snap3 = makeMockSnapshot({ templateFamily: undefined, style: 'food' })
  const v3 = deriveVerifiedCampaignData(snap3)
  assert.equal(v3.templateFamily, 'FOOD_OFFER_POSTER')

  // Elegant Retail
  const snap4 = makeMockSnapshot({ templateFamily: undefined, style: 'luxury' })
  const v4 = deriveVerifiedCampaignData(snap4)
  assert.equal(v4.templateFamily, 'ELEGANT_RETAIL')

  // SaaS Promo Card
  const snap5 = makeMockSnapshot({ templateFamily: undefined, style: 'corporate', sector: 'SaaS & Yazılım' })
  const v5 = deriveVerifiedCampaignData(snap5)
  assert.equal(v5.templateFamily, 'SAAS_PROMO_CARD')
})

test('2. Campaign data shaping: strips Brand Kit meta labels and shapes verified facts', () => {
  const snap = makeMockSnapshot()
  const v = deriveVerifiedCampaignData(snap)

  assert.equal(v.brandName, 'Örnek Yapı')
  assert.equal(v.sector, 'İnşaat Malzemeleri')
  assert.equal(v.headline, 'Projelerinize Güvenli Temeller')
  assert.equal(v.price, '18.50 TL')
  assert.equal(v.oldPrice, '24.00 TL')
  assert.equal(v.discount, '%25')
  assert.equal(v.deliveryFact, '3 gün içinde şantiyeye teslim')
  assert.equal(v.stockFact, 'Stoktan hemen teslim')
  assert.equal(v.cta, 'Hemen Teklif Alın')
  assert.ok(v.primaryBenefits.includes('Fabrikadan Doğrudan Sevkiyat'))
  assert.ok(v.contactLines.some((c) => c.includes('0532 000 00 00')))
})

test('3. Price hierarchy and discount handling: verified numbers only, no fabrication', () => {
  const snapWithPrice = makeMockSnapshot({
    products: [
      {
        id: 'p1',
        name: 'Ürün',
        description: null,
        boxContents: null,
        imageUrl: 'http://img.jpg',
        price: '499 TL',
        oldPrice: '750 TL',
        promo: '%33 İndirim',
        extra: null,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
  })

  const { prompt } = buildCreativePrompt(snapWithPrice)
  assert.match(prompt, /Price hierarchy: 499 TL \(was 750 TL\)/)
  assert.match(prompt, /Discount: %33/)

  // Case with NO price given: prompt must NOT fabricate price or discount
  const snapWithoutPrice = makeMockSnapshot({
    products: [
      {
        id: 'p1',
        name: 'Hizmet Ürünü',
        description: null,
        boxContents: null,
        imageUrl: 'http://img.jpg',
        price: null,
        oldPrice: null,
        promo: null,
        extra: null,
        include: { name: true, image: true, description: false, boxContents: false, price: false, promo: false },
      },
    ],
  })

  const res2 = buildCreativePrompt(snapWithoutPrice)
  assert.doesNotMatch(res2.prompt, /Price hierarchy:/)
  assert.doesNotMatch(res2.prompt, /Discount:/)
  assert.match(res2.prompt, /Do not invent prices, discounts/)
})

test('4. Quantity tiers & packaging: preserves boxContents and tiers', () => {
  const snap = makeMockSnapshot({
    products: [
      {
        id: 'p1',
        name: 'Civata Seti',
        description: null,
        boxContents: '1000 Adet Kutu · 10 Kutu Koli',
        imageUrl: 'http://img.jpg',
        price: '1.200 TL',
        oldPrice: null,
        promo: null,
        extra: null,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
  })

  const { prompt } = buildCreativePrompt(snap)
  assert.match(prompt, /box contents: 1000 Adet Kutu · 10 Kutu Koli/)
})

test('5. No invented facts: strictly omits unprovided delivery, dates, or badges', () => {
  const cleanSnap = makeMockSnapshot({
    deliveryInfo: null,
    stockInfo: null,
    urgencyInfo: null,
    dateRange: null,
    labels: [],
    primaryBenefits: [],
    cta: null,
  })

  const { prompt } = buildCreativePrompt(cleanSnap)
  assert.doesNotMatch(prompt, /Delivery promise:/)
  assert.doesNotMatch(prompt, /Stock:/)
  assert.doesNotMatch(prompt, /Urgency:/)
  assert.doesNotMatch(prompt, /Campaign dates:/)
  assert.doesNotMatch(prompt, /Key verified selling point:/)
})

test('6. Reference Contract: historical d350985 phrasing for product and logo', () => {
  const snap = makeMockSnapshot()
  const { prompt, negative } = buildCreativePrompt(snap, {
    verifiedRefs: { logo: true, product: true },
  })

  // Historical golden phrasing from d350985
  assert.match(
    prompt,
    /A real brand logo image is attached\. Place it as a small clean logo\. Do NOT redraw, restyle or invent a new logo\. Do not distort it\./,
  )
  assert.match(
    prompt,
    /A product photo is attached as a reference\. Keep the real product identity\./,
  )

  // Strict negative constraints
  assert.match(negative, /no fake clickable web buttons/)
  assert.match(negative, /no cartoon stickers/)
  assert.match(negative, /no starburst badges/)
  assert.match(negative, /no supermarket flyer clipart/)
  assert.match(negative, /no tiny product in distant background/)
  assert.match(negative, /no generic minimalist empty poster/)
})

test('7. No brand-specific runtime hardcodes: works for unseen arbitrary business', () => {
  const unseenBrandSnap = makeMockSnapshot({
    brandKit: {
      id: 'unseen-1',
      name: 'Vortex Rulman A.Ş.',
      tone: 'Teknik ve güvenilir',
      colors: { primary: '#0a192f', accent: '#00f0ff' },
      fonts: { heading: 'Inter' },
      logoPath: 'orgs/unseen/logo.png',
    },
    sector: 'Endüstriyel Yedek Parça',
    products: [
      {
        id: 'u-1',
        name: 'Konik Makaralı Rulman 32210',
        description: 'Ağır yük dayanımlı çelik konik rulman',
        boxContents: '1 Adet Orijinal Kutulu',
        imageUrl: 'orgs/unseen/rulman.png',
        price: '850 TL',
        oldPrice: '1.050 TL',
        promo: 'Toptan alımlarda %20 indirim',
        extra: null,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    brief: 'Sanayi tipi konik makaralı rulmanlarda fabrika teslim kampanya',
    customText: 'Yüksek Devirde Kesintisiz Güç',
  })

  const { prompt } = buildCreativePrompt(unseenBrandSnap)
  assert.match(prompt, /Brand name: Vortex Rulman A\.Ş\./)
  assert.match(prompt, /Sector: Endüstriyel Yedek Parça\./)
  assert.match(prompt, /Campaign headline: "Yüksek Devirde Kesintisiz Güç"/)
  assert.match(prompt, /Price hierarchy: 850 TL \(was 1\.050 TL\) · Discount: %20/)
})

test('8. Separate AI WhatsApp Campaign Message: factual and conversational pairing', () => {
  const snap = makeMockSnapshot()
  const v = deriveVerifiedCampaignData(snap)
  const message = generateCampaignWhatsAppMessage(v)

  assert.match(message, /Örnek Yapı — Projelerinize Güvenli Temeller/)
  assert.match(message, /• \*Fırsat:\* %25 İndirim/)
  assert.match(message, /• \*Fiyat:\* 18\.50 TL/)
  assert.match(message, /• \*Teslimat:\* 3 gün içinde şantiyeye teslim/)
  assert.match(message, /👉 Hemen Teklif Alın/)
  assert.match(message, /📞 0532 000 00 00/)
})
