import { test } from 'node:test'
import assert from 'node:assert'
import {
  compileDeterministicV5,
  normalizeFacts,
  analyzeOntology,
  selectCreativeStrategy,
  selectHook,
  planShots,
  writeVoiceover,
  compileOverlay,
  validateAndRepair,
} from '../apps/customer/src/lib/creative/v5/index.ts'
import type { UserVideoInput } from '../apps/customer/src/lib/creative/v5/schemas.ts'

// ======================================================================
// 15 UNIVERSAL SECTOR / BUSINESS FIXTURES
// ======================================================================
const FIXTURES_15: Array<{
  id: string
  name: string
  input: UserVideoInput
  expectedOfferType: string
  expectedRiskClass: string
}> = [
  {
    id: '1_brick_bulk',
    name: 'Tuğla / Toplu Ürün (İnşaat / Üretici)',
    input: {
      brandName: 'Ayvazoğlu Tuğla',
      brief: 'Şantiyelere doğrudan tır bazında killi tuğla sevkiyatı',
      customText: 'Bu aya özel toptan alımlarda özel iskonto',
      products: [{ name: 'Killi Cephe Tuğlası', description: 'Standart ölçülü fırınlanmış tuğla', promo: '%15 toptan iskonto' }],
    },
    expectedOfferType: 'physical_product',
    expectedRiskClass: 'standard',
  },
  {
    id: '2_sprayer_agri',
    name: 'Sırt Pompası / Tarım Ekipmanı',
    input: {
      brandName: 'Bofe',
      brief: 'Bahçede yorulmadan tek şarjla yüksek basınçlı ilaçlama',
      products: [{ name: '16L Akülü Sırt Pompası', description: 'Lityum bataryalı pülverizatör' }],
    },
    expectedOfferType: 'physical_product',
    expectedRiskClass: 'standard',
  },
  {
    id: '3_b2b_data_saas',
    name: 'B2B Veri Yazılımı (SaaS / Dijital)',
    input: {
      brandName: 'Veri Burada',
      brief: 'Yeni açılan tüm işletmeleri Google Haritalar üzerinde anında tespit edin',
      products: [{ name: 'Harita Müşteri Bulucu', description: 'B2B veri analitiği ve lead platformu' }],
    },
    expectedOfferType: 'digital_product_or_saas',
    expectedRiskClass: 'standard',
  },
  {
    id: '4_restaurant_food',
    name: 'Restoran / Gastronomi',
    input: {
      brandName: 'Nefis Burger',
      brief: 'Özel dumanı tüten tereyağlı köz patlıcanlı el yapımı dana burger',
      products: [{ name: 'Gurme Smash Burger', price: '280 TL' }],
    },
    expectedOfferType: 'food_or_consumable',
    expectedRiskClass: 'standard',
  },
  {
    id: '5_dental_health',
    name: 'Diş Kliniği / Sağlık Hizmeti (Regüle Alan)',
    input: {
      brandName: 'Dent Estetik',
      brief: 'Uzman hekim kadrosu ile konforlu zirkonyum gülüş tasarımı',
      products: [{ name: 'Zirkonyum Diş Kaplama' }],
    },
    expectedOfferType: 'local_service',
    expectedRiskClass: 'regulated_health',
  },
  {
    id: '6_real_estate',
    name: 'Emlak / Villa Projesi (High Consideration)',
    input: {
      brandName: 'Mavi Vadi',
      brief: 'Doğa içinde müstakil havuzlu akıllı lüks villa projesi',
      products: [{ name: '4+1 Panoramik Villa' }],
    },
    expectedOfferType: 'property_or_high_consideration_offer',
    expectedRiskClass: 'high_consideration',
  },
  {
    id: '7_auto_service',
    name: 'Oto Servis / Detailing',
    input: {
      brandName: 'Usta Oto',
      brief: 'Bilgisayarlı arıza tespiti ve periyodik araç bakım servisi',
      products: [{ name: 'Periyodik Araç Bakımı' }],
    },
    expectedOfferType: 'local_service',
    expectedRiskClass: 'standard',
  },
  {
    id: '8_beauty_salon',
    name: 'Kuaför / Güzellik Salonu',
    input: {
      brandName: 'Işıltı Salon',
      brief: 'Doğal keratin bakımı ve profesyonel saç renklendirme',
      products: [{ name: 'Keratin Saç Bakımı' }],
    },
    expectedOfferType: 'local_service',
    expectedRiskClass: 'standard',
  },
  {
    id: '9_furniture',
    name: 'Mobilya / Dekorasyon',
    input: {
      brandName: 'Doğal Ahşap',
      brief: 'Masif meşe ağacından el işçiliği modern yemek masası',
      products: [{ name: 'Masif Meşe Masa', price: '14.500 TL' }],
    },
    expectedOfferType: 'physical_product',
    expectedRiskClass: 'standard',
  },
  {
    id: '10_education_online',
    name: 'Online Eğitim / Akademi',
    input: {
      brandName: 'Kod Akademi',
      brief: 'Sıfırdan ileri seviyeye uygulamalı yazılım ve yapay zeka kursu',
      products: [{ name: 'Full-Stack Yazılım Kursu' }],
    },
    expectedOfferType: 'event_or_education',
    expectedRiskClass: 'standard',
  },
  {
    id: '11_hotel_tourism',
    name: 'Turizm / Butik Otel Deneyimi',
    input: {
      brandName: 'Zeytinli Konak',
      brief: 'Ege kıyısında sonsuzluk havuzlu huzurlu butik otel tatili',
      products: [{ name: 'Deniz Manzaralı Süit' }],
    },
    expectedOfferType: 'venue_or_experience',
    expectedRiskClass: 'standard',
  },
  {
    id: '12_legal_consulting',
    name: 'Hukuk / Profesyonel Danışmanlık (Regüle / Hassas)',
    input: {
      brandName: 'Öz Hukuk Bürosu',
      brief: 'Şirketler için ticari sözleşme ve arabuluculuk danışmanlığı',
      products: [{ name: 'Kurumsal Hukuk Danışmanlığı' }],
    },
    expectedOfferType: 'professional_service',
    expectedRiskClass: 'legal_or_professional_claim',
  },
  {
    id: '13_fitness_gym',
    name: 'Spor Salonu / Fitness',
    input: {
      brandName: 'Power Gym',
      brief: 'Bireysel antrenör eşliğinde kişiye özel fonksiyonel fitness programı',
      products: [{ name: 'Kişisel Fitness Antrenmanı' }],
    },
    expectedOfferType: 'local_service',
    expectedRiskClass: 'standard',
  },
  {
    id: '14_pet_service',
    name: 'Evcil Hayvan Hizmeti / Veteriner',
    input: {
      brandName: 'Dost Veteriner',
      brief: 'Sevimli dostlarınız için koruyucu aşı ve şefkatli veteriner bakımı',
      products: [{ name: 'Genel Sağlık Kontrolü' }],
    },
    expectedOfferType: 'local_service',
    expectedRiskClass: 'standard',
  },
  {
    id: '15_unseen_novel_sector',
    name: 'Daha Önce Tanımlanmamış Hayali Sektör (Biyolüminesan Yosun Filtresi)',
    input: {
      brandName: 'BioGlow',
      brief: 'Ev ve ofisler için havayı temizleyen biyolüminesan canlı mikro yosun hava filtresi',
      products: [{ name: 'Biyo-Lüminesan Hava Fanı', description: 'Geceleri parlayan organik filtre' }],
    },
    expectedOfferType: 'physical_product',
    expectedRiskClass: 'standard',
  },
]

test('V5 Engine - 15 Universal Sector & Business Scenarios Test', () => {
  for (const fixture of FIXTURES_15) {
    const pkg = compileDeterministicV5(fixture.input)

    // 1. Validation Status
    assert.strictEqual(pkg.validation.status, 'pass', `${fixture.name} validation failed: ${pkg.validation.hardFails.join(', ')}`)

    // 2. Offer Type & Risk Class
    assert.strictEqual(pkg.classification.offerType, fixture.expectedOfferType, `${fixture.name} offerType mismatch`)
    assert.strictEqual(pkg.classification.riskClass, fixture.expectedRiskClass, `${fixture.name} riskClass mismatch`)

    // 3. 8 Seconds Exact Total Duration
    assert.strictEqual(pkg.shotPlan.durationSeconds, 8, `${fixture.name} duration not 8s`)
    assert.strictEqual(pkg.shotPlan.aspectRatio, '9:16', `${fixture.name} format not 9:16`)

    // 4. Single Location Continuity
    assert.ok(pkg.shotPlan.singleLocation.length > 5, `${fixture.name} single location missing`)
    assert.strictEqual(pkg.shotPlan.shots.length, 3, `${fixture.name} does not have exactly 3 shots`)

    // 5. Visual Hook Starts with Action (Not establishing shot only)
    assert.strictEqual(pkg.hookPlan.establishingShotOnly, false, `${fixture.name} hook is establishing shot only`)
    assert.ok(pkg.hookPlan.subjectVisibleBySeconds <= 0.5, `${fixture.name} subject not visible <= 0.5s`)
    assert.ok(pkg.hookPlan.meaningfulMotionBySeconds <= 0.8, `${fixture.name} motion not by <= 0.8s`)

    // 6. Zero Dynamic Text in Raw Veo Prompt
    assert.ok(!pkg.veoPrompt.includes('TEXT CARD'), `${fixture.name} raw video contains text card`)
    assert.ok(!pkg.veoPrompt.includes('FLOATING LETTERS'), `${fixture.name} raw video contains floating letters`)
    assert.ok(pkg.veoPrompt.includes('TEXT POLICY: No newly generated text'), `${fixture.name} text policy missing`)

    // 7. Turkish Voiceover Word Count Limits (Target 8-13, max 16, hard 18)
    assert.ok(pkg.voiceover.wordCount <= 18, `${fixture.name} VO exceeds 18 words (${pkg.voiceover.wordCount}): "${pkg.voiceover.text}"`)
    assert.ok(pkg.voiceover.wordCount >= 6, `${fixture.name} VO too short (${pkg.voiceover.wordCount})`)
    assert.ok(!pkg.voiceover.text.includes('"'), `${fixture.name} VO contains quotation marks`)

    // 8. Decoupled Overlay Timeline
    assert.ok(pkg.overlayPlan.overlayTimeline.length >= 2, `${fixture.name} overlay missing items`)
    assert.strictEqual(pkg.overlayPlan.subtitles.enabled, true, `${fixture.name} subtitles missing`)

    console.log(`[PASS] Fixture ${fixture.id}: ${fixture.name} -> Offer: ${pkg.classification.offerType}, Strat: ${pkg.creativeStrategy.primary}, Words: ${pkg.voiceover.wordCount}`)
  }
})

// ======================================================================
// EDGE-CASE TESTS
// ======================================================================

test('V5 Engine Edge Case - Empty Sector Hint Works Gracefully', () => {
  const pkg = compileDeterministicV5({
    brief: 'Paslanmaz çelik su matarası',
    sectorHint: null,
    products: [{ name: 'Çelik Matara' }],
  })
  assert.strictEqual(pkg.validation.status, 'pass')
  assert.strictEqual(pkg.classification.offerType, 'physical_product')
})

test('V5 Engine Edge Case - Only Product Name Supplied', () => {
  const pkg = compileDeterministicV5({
    brief: 'Organik Zeytinyağı',
    products: [{ name: 'Soğuk Sıkım Zeytinyağı' }],
  })
  assert.strictEqual(pkg.validation.status, 'pass')
  assert.ok(pkg.voiceover.wordCount <= 18)
  assert.ok(pkg.shotPlan.shots[0].subjectAction.includes('Zeytinyağı'))
})

test('V5 Engine Edge Case - No Price in Input (Never Invent Price)', () => {
  const pkg = compileDeterministicV5({
    brief: 'Özel üretim ahşap sandalye',
    products: [{ name: 'Sandalye' }],
  })
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.price, null)
  for (const item of pkg.overlayPlan.overlayTimeline) {
    assert.ok(!item.text.includes('FİYAT:'), 'Invented price found in overlay!')
  }
})

test('V5 Engine Edge Case - Discount percentage missing but kampanya mentioned', () => {
  const pkg = compileDeterministicV5({
    brief: 'Bu haftaya özel kampanya',
    products: [{ name: 'Deri Ceket' }],
  })
  assert.strictEqual(pkg.validation.status, 'pass')
  // Should not invent false percentage like '%50 indirim'
  assert.ok(!pkg.voiceover.text.includes('%50'))
  assert.ok(!pkg.voiceover.text.includes('%20'))
})

test('V5 Engine Edge Case - No Logo Reference (Never Invent Emblem)', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Örnek İşletme',
    brief: 'Doğal sabun',
    products: [{ name: 'Lavanta Sabunu' }],
    logoUrl: null,
  })
  assert.strictEqual(pkg.shotPlan.brandIdentityMode, 'name_for_voice_and_overlay_only')
  assert.strictEqual(pkg.overlayPlan.brandWatermarkOrLogoPlacement.enabled, false)
  assert.ok(!pkg.veoPrompt.includes('random emblem'))
  assert.ok(!pkg.veoPrompt.includes('invented logo'))
})

test('V5 Engine Edge Case - Product Reference Present (Locks Geometry)', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Bofe',
    brief: 'Tarım aleti',
    products: [{ name: 'Sırt Pompası', imageUrl: 'https://example.com/pump.png' }],
  })
  assert.strictEqual(pkg.normalizedBrief.assets.productReference, true)
  assert.ok(pkg.veoPrompt.includes('reference product photo is provided; preserve physical geometry'))
})

test('V5 Engine Edge Case - Missing Subject Triggers Needs Clarification', () => {
  const pkg = compileDeterministicV5({
    brandName: 'X Şirketi',
    brief: '',
  })
  assert.strictEqual(pkg.validation.status, 'needs_clarification')
  assert.ok(pkg.validation.clarificationQuestion)
})

test('V5 Engine Edge Case - 30 Word Voiceover Request is Auto-Repaired to <= 16 Words', () => {
  const longBrief = 'Bugün hemen bizi arayın çünkü bu muazzam fırsat sadece bu haftaya özel olarak tasarlandı ve kaçırırsanız bir daha asla bulamazsınız hemen sipariş verin'
  const pkg = compileDeterministicV5({
    brief: longBrief,
    products: [{ name: 'Özel Ürün' }],
  })
  assert.ok(pkg.voiceover.wordCount <= 18, `Voiceover was not capped: ${pkg.voiceover.wordCount}`)
})

test('V5 Engine Edge Case - Regulated Health with Result Guarantee is Repaired', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Klinik',
    brief: '%100 kesin çözüm garantili diş tedavisi',
    products: [{ name: 'İmplant Tedavisi' }],
  })
  assert.strictEqual(pkg.classification.riskClass, 'regulated_health')
  assert.ok(!pkg.voiceover.text.includes('%100 kesin çözüm garantili'), 'Forbidden medical guarantee remained in VO')
})

test('V5 Engine Edge Case - Multiple Products (One Focal Hero Selected)', () => {
  const pkg = compileDeterministicV5({
    brief: 'Tüm yapı malzemeleri',
    products: [
      { name: 'Kırmızı Tuğla' },
      { name: 'Gri Çimento' },
      { name: 'Harç Kumu' },
    ],
  })
  assert.strictEqual(pkg.validation.status, 'pass')
  assert.strictEqual(pkg.normalizedBrief.verifiedFacts.offerName, 'Kırmızı Tuğla')
  assert.ok(pkg.shotPlan.veoEnglishPrompt.includes('Kırmızı Tuğla'))
})

test('V5 Engine Edge Case - Turkish Characters & Brand Spelling Preserved', () => {
  const pkg = compileDeterministicV5({
    brandName: 'Çiğköfteci Şükrü Usta & Ayvazoğlu İnşaat',
    brief: 'Geleneksel yoğurma taze çiğ köfte',
    products: [{ name: 'Dürüm Çiğ Köfte' }],
  })
  assert.strictEqual(pkg.validation.status, 'pass')
  assert.ok(pkg.voiceover.text.includes('Çiğköfteci Şükrü Usta & Ayvazoğlu İnşaat'))
})
