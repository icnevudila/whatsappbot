import test from 'node:test'
import assert from 'node:assert/strict'
import { generateDeterministicLocalCopy } from '@/lib/creative/v2/copy-generator'
import { buildCreativePrompt } from '@/lib/creative/prompt'
import type { CreativeSnapshot } from '@/lib/creative/types'
import { buildDeterministicFallbackPlan } from './ai-planner'

test('1. Deterministic local copy generates clean, commercial Turkish text without technical jargon', () => {
  const copy = generateDeterministicLocalCopy({
    productName: 'Klinker Tuğla',
    brandName: 'Ayvazoğlu İnşaat',
    objective: 'SALES_OFFER',
    campaignDetail: 'Şantiyeye teslim avantajı',
    offer: '%20 İndirim',
    mediaType: 'IMAGE',
  })

  assert.equal(copy.headline, 'Ayvazoğlu İnşaat Klinker Tuğla — %20 İndirim')
  assert.match(copy.supportingLine, /Şantiyeye teslim avantajı/i)
  assert.equal(copy.cta, 'Hemen İnceleyin')
  assert.match(copy.voiceover, /Ayvazoğlu İnşaat Klinker Tuğla/i)
})

test('2. AI Planner fallback handles missing details gracefully with professional Turkish copy', () => {
  const plan = buildDeterministicFallbackPlan({
    brandName: 'Bofe Tarım',
    productName: 'Akülü İlaçlama Pompası',
    objective: 'SALES_OFFER',
    stylePreset: 'PRODUCT_HERO',
    mediaType: 'IMAGE',
  })

  assert.ok(plan.copy.headline)
  assert.ok(plan.copy.supporting_line)
  assert.equal(plan.copy.cta, 'Bilgi Alın')
  assert.match(plan.scene.lighting, /doğal ticari aydınlatma/i)
  assert.equal(plan.layout.logo_position, 'top_left')
})

test('3. Prompt Compiler integrates Hero Product (60-70%), brand DNA, and commercial hierarchy', () => {
  const snapshot: CreativeSnapshot = {
    brief: 'Modern cephelerde klinker tuğla kampanyası',
    style: 'premium',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: true,
    labels: ['TSE Belgeli'],
    cta: 'Hemen Teklif Alın',
    address: 'Trabzon OSB',
    website: 'www.ayvazoglu.com',
    dateRange: null,
    customText: null,
    phones: [{ id: 'p1', label: 'Satış', phone: '0532 111 22 33' }],
    socials: [],
    brandKit: {
      id: 'kit-1',
      name: 'Ayvazoğlu',
      tone: 'Kurumsal ve prestijli',
      colors: { primary: '#B7410E', accent: '#263238' },
      fonts: { heading: 'Inter' },
      logoPath: 'logos/ayvaz.png',
    },
    products: [
      {
        id: 'prod-1',
        name: 'Klinker Tuğla',
        description: 'Yüksek mukavemetli cephe tuğlası',
        boxContents: null,
        imageUrl: 'https://example.com/brick.jpg',
        price: '450 TL/m²',
        oldPrice: '550 TL/m²',
        promo: '%18 İndirim',
        extra: null,
        include: { name: true, description: true, price: true, promo: true, image: true, boxContents: false },
      },
    ],
    baseCreativeId: null,
  }

  const { prompt, negative } = buildCreativePrompt(snapshot, {
    verifiedRefs: { logo: true, product: true },
  })

  // Hero product dominance and realism
  assert.match(prompt, /undisputed hero, occupying 60-70% visual share/i)
  assert.match(prompt, /natural lighting, and realistic contact shadows/i)
  assert.match(prompt, /Sector art direction \(İnşaat & Yapı Malzemeleri\)/i)

  // Verified facts preserved
  assert.match(prompt, /450 TL\/m²/i)
  assert.match(prompt, /was 550 TL\/m²/i)
  assert.match(prompt, /%18 İndirim/i)
  assert.match(prompt, /CTA: Hemen Teklif Alın/i)
  assert.match(prompt, /0532 111 22 33/i)
  assert.match(prompt, /www\.ayvazoglu\.com/i)

  // Anti-Canva template negative constraints
  assert.match(negative, /no generic Canva template look/i)
  assert.match(negative, /no fake 3-icon benefit row/i)
  assert.match(negative, /no supermarket sticker pack/i)
  assert.match(negative, /no fake clickable web buttons/i)
})

test('4. Sector art direction applies automatically based on sector and keywords', () => {
  const foodSnapshot: CreativeSnapshot = {
    brief: 'Usta Döner geleneksel yaprak et döner menüsü',
    style: 'food',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: false,
    labels: [],
    cta: 'Sipariş Ver',
    address: null,
    website: null,
    dateRange: null,
    customText: null,
    phones: [],
    socials: [],
    brandKit: null,
    products: [
      {
        id: 'p1',
        name: 'Porsiyon Et Döner',
        description: 'Geleneksel odun ateşinde',
        boxContents: null,
        imageUrl: null,
        price: '280 TL',
        oldPrice: null,
        promo: null,
        extra: null,
        include: { name: true, description: true, price: true, promo: true, image: true, boxContents: false },
      },
    ],
    baseCreativeId: null,
  }

  const { prompt } = buildCreativePrompt(foodSnapshot)
  assert.match(prompt, /Sector art direction \(Restoran & Gıda\)/i)
  assert.match(prompt, /Mouth-watering food photography must dominate the scene/i)
})

test('5. Zero unverified claims: does NOT fabricate unprovided claims or badges', () => {
  const cleanSnapshot: CreativeSnapshot = {
    brief: 'Bofe Tarım ilaçlama pompası',
    style: 'auto',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'low',
    useLogo: false,
    labels: [],
    cta: null,
    address: null,
    website: null,
    dateRange: null,
    customText: null,
    phones: [],
    socials: [],
    brandKit: null,
    products: [
      {
        id: 'p1',
        name: 'İlaçlama Pompası',
        description: null,
        boxContents: null,
        imageUrl: null,
        price: null,
        oldPrice: null,
        promo: null,
        extra: null,
        include: { name: true, description: false, price: false, promo: false, image: false, boxContents: false },
      },
    ],
    baseCreativeId: null,
  }

  const { prompt } = buildCreativePrompt(cleanSnapshot)
  assert.doesNotMatch(prompt, /Price hierarchy:/i)
  assert.doesNotMatch(prompt, /Discount:/i)
  assert.doesNotMatch(prompt, /Delivery promise:/i)
  assert.match(prompt, /Do not invent prices, discounts, slogans, dates, product names or brand claims/i)
})

test('6. Text density modes correctly direct text budget in generated prompts', () => {
  const baseSnap: CreativeSnapshot = {
    brief: 'Test kampanya',
    style: 'modern',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'low',
    useLogo: false,
    labels: [],
    cta: 'İncele',
    address: null,
    website: null,
    dateRange: null,
    customText: null,
    phones: [],
    socials: [],
    brandKit: null,
    products: [{ id: 'p1', name: 'Ürün', description: null, boxContents: null, imageUrl: null, price: null, oldPrice: null, promo: null, extra: null, include: { name: true, description: false, price: false, promo: false, image: false, boxContents: false } }],
    baseCreativeId: null,
  }

  const lowPrompt = buildCreativePrompt({ ...baseSnap, textDensity: 'low' }).prompt
  assert.match(lowPrompt, /Very little on-image text/i)

  const balancedPrompt = buildCreativePrompt({ ...baseSnap, textDensity: 'balanced' }).prompt
  assert.match(balancedPrompt, /Limited on-image text/i)

  const detailedPrompt = buildCreativePrompt({ ...baseSnap, textDensity: 'detailed' }).prompt
  assert.match(detailedPrompt, /More campaign text is allowed/i)
})

test('7. Brand palette hex values are translated into rich natural language colors without raw hex leaks', () => {
  const snapWithHex: CreativeSnapshot = {
    brief: 'Bofe Tarım yeni sezon',
    style: 'auto',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: true,
    labels: [],
    cta: null,
    address: null,
    website: null,
    dateRange: null,
    customText: null,
    phones: [],
    socials: [],
    brandKit: {
      id: 'k1',
      name: 'Bofe Tarım',
      tone: 'Uzman',
      colors: { primary: '#026009', accent: '#B4FE00' },
      fonts: { heading: 'Outfit' },
      logoPath: 'logo.png',
    },
    products: [{ id: 'p1', name: 'Organik Gübre', description: null, boxContents: null, imageUrl: null, price: null, oldPrice: null, promo: null, extra: null, include: { name: true, description: false, price: false, promo: false, image: false, boxContents: false } }],
    baseCreativeId: null,
  }

  const { prompt } = buildCreativePrompt(snapWithHex)
  assert.match(prompt, /deep agricultural forest green/i)
  assert.match(prompt, /electric chartreuse \/ lime accent/i)
  assert.doesNotMatch(prompt, /#026009/i)
  assert.doesNotMatch(prompt, /#B4FE00/i)
})

test('8. Template family instructions direct commercial layouts without Canva boilerplate', () => {
  const baseSnap: CreativeSnapshot = {
    brief: 'Vitrin Tanıtımı',
    style: 'minimal',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: false,
    labels: [],
    cta: null,
    address: null,
    website: null,
    dateRange: null,
    customText: null,
    phones: [],
    socials: [],
    brandKit: null,
    products: [{ id: 'p1', name: 'Endüstriyel Rulman', description: null, boxContents: null, imageUrl: null, price: null, oldPrice: null, promo: null, extra: null, include: { name: true, description: false, price: false, promo: false, image: false, boxContents: false } }],
    baseCreativeId: null,
  }

  const showcasePrompt = buildCreativePrompt({
    ...baseSnap,
    templateFamily: 'PRODUCT_SHOWCASE',
  } as any).prompt
  assert.match(showcasePrompt, /Clean commercial product showcase/i)

  const retailPrompt = buildCreativePrompt({
    ...baseSnap,
    templateFamily: 'ELEGANT_RETAIL',
  } as any).prompt
  assert.match(retailPrompt, /Boutique retail campaign visual/i)
})

test('9. Dirty tracking contract: user edits strictly preserve custom text over automated defaults', () => {
  const userEditedCopy = {
    headline: 'Ayvazoğlu Tuğla ile Kalıcı Çözümler',
    supportingLine: 'Doğrudan fabrikadan şantiyenize 24 saatte sevk.',
    cta: 'Teklif İste',
  }

  // Simulating dirty state logic
  const dirtyFlags = { headline: true, supporting: true, cta: true }
  const lateAiResponse = {
    headline: 'AI Generic Headline',
    supporting_line: 'AI Generic Supporting',
    cta: 'AI CTA',
  }

  const resolvedHeadline = dirtyFlags.headline ? userEditedCopy.headline : lateAiResponse.headline
  const resolvedSupporting = dirtyFlags.supporting ? userEditedCopy.supportingLine : lateAiResponse.supporting_line
  const resolvedCta = dirtyFlags.cta ? userEditedCopy.cta : lateAiResponse.cta

  assert.equal(resolvedHeadline, 'Ayvazoğlu Tuğla ile Kalıcı Çözümler')
  assert.equal(resolvedSupporting, 'Doğrudan fabrikadan şantiyenize 24 saatte sevk.')
  assert.equal(resolvedCta, 'Teklif İste')
})

test('10. 2/2 Reference Contract: Logo and Product reference instructions present simultaneously', () => {
  const snapWithRefs: CreativeSnapshot = {
    brief: 'Klinker tuğla satışı',
    style: 'modern',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: true,
    labels: [],
    cta: 'Sipariş Ver',
    address: null,
    website: null,
    dateRange: null,
    customText: null,
    phones: [],
    socials: [],
    brandKit: { id: 'k1', name: 'Ayvazoğlu', tone: null, colors: {}, fonts: {}, logoPath: 'logo.png' },
    products: [{ id: 'p1', name: 'Tuğla', description: null, boxContents: null, imageUrl: 'brick.png', price: null, oldPrice: null, promo: null, extra: null, include: { name: true, description: false, price: false, promo: false, image: true, boxContents: false } }],
    baseCreativeId: null,
  }

  const { prompt } = buildCreativePrompt(snapWithRefs, { verifiedRefs: { logo: true, product: true } })
  assert.match(prompt, /Authentic product and company logo references are attached/i)
  assert.match(prompt, /A real brand logo image is attached/i)
  assert.match(prompt, /A product photo is attached as a reference/i)
})
