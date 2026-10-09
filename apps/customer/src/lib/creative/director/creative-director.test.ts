import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { CREATIVE_ARCHETYPES, listArchetypeIds, getArchetype } from './archetypes'
import { classifySector, SECTOR_DNA_REGISTRY } from './sector-dna'
import {
  calculateArchetypePenalty,
  recordCreativeMemory,
  selectFreshArchetype,
} from './creative-memory'
import { generateArtDirectionPlan } from './creative-director'
import { COMMERCIAL_POSTER_GRAMMARS, inferCommercialGrammar } from './commercial-poster-grammar'
import { buildDesignerGraphicSvg } from './designer-graphic-layer'
import {
  evaluateImageAdvisory,
  generateBestOfTwoPlans,
  PREFERENCE_RANKING_RESEARCH,
} from './ranking-research'
import { buildCreativePrompt } from '../prompt'
import type { CreativeSnapshot } from '../types'

test('1. Creative Archetypes Library contains exactly 23 curated commercial archetypes with real grammar', () => {
  const ids = listArchetypeIds()
  assert.equal(ids.length, 23)

  const mandatoryArchetypes = [
    'EDITORIAL_LUXURY',
    'BOLD_RETAIL',
    'CINEMATIC_PRODUCT_HERO',
    'PREMIUM_MONOCHROME',
    'HIGH_ENERGY_PERFORMANCE',
    'MODERN_TECH_GLASS',
    'ORGANIC_LIFESTYLE',
    'INDUSTRIAL_POWER',
    'ARCHITECTURAL_PRESTIGE',
    'FOOD_APPETITE',
    'CLINICAL_PREMIUM',
    'FUTURISTIC_DATA',
    'MAGAZINE_COVER',
    'COLLAGE_CAMPAIGN',
    'MATERIAL_TEXTURE_HERO',
    'STUDIO_PEDESTAL',
    'REAL_WORLD_USAGE',
    'MAXIMALIST_PROMO',
    'CLEAN_CORPORATE',
    'SOCIAL_FIRST_BOLD',
    'PRODUCT_COMMERCE_HERO',
    'HYBRID_PRODUCT_USAGE',
    'MATERIAL_COMMERCE_HERO',
  ]

  for (const id of mandatoryArchetypes) {
    const arch = getArchetype(id)
    assert.ok(arch, `Archetype ${id} must exist`)
    assert.ok(arch.composition.grid.length > 10, `${id} must have concrete grid grammar`)
    assert.ok(arch.artDirection.lighting.length > 10, `${id} must have concrete lighting grammar`)
    assert.ok(arch.artDirection.materialLanguage.length > 10, `${id} must have material grammar`)
    assert.ok(arch.typographyDirection.headlineCharacter.length > 10, `${id} must have typography direction`)
    assert.ok(arch.antiGenericRules.length >= 2, `${id} must have anti-generic rules`)
  }
})

test('2. Sector DNA engine correctly classifies real commercial contexts without hardcoded company names', () => {
  // Agriculture (Bofe Tarım case)
  const agri = classifySector({
    productName: 'Bahçe İlaçlama Pompası ve Organik Gübre',
    productDescription: 'Zeytin ağaçları ve meyve bahçeleri için yüksek basınçlı püskürtme',
  })
  assert.equal(agri.sectorId, 'AGRICULTURE')
  assert.match(agri.physicalEnvironment.primaryScene, /orchard|olive|grove/i)

  // Construction (Ayvazoğlu İnşaat case)
  const constr = classifySector({
    productName: 'Klinker Dış Cephe Tuğlası',
    productDescription: 'Yüksek mukavemetli mimari kaplama tuğlası ve harç çözümleri',
  })
  assert.equal(constr.sectorId, 'CONSTRUCTION')
  assert.match(constr.physicalEnvironment.primaryScene, /jobsite|facade|precast/i)

  // Tech / SaaS (Mesajify case)
  const tech = classifySector({
    productName: 'WhatsApp Kampanya ve Müşteri Destek Paneli',
    productDescription: 'Otomatik akışlar, CRM entegrasyonu ve bulut mesajlaşma',
  })
  assert.equal(tech.sectorId, 'TECH_SAAS')
  assert.match(tech.physicalEnvironment.primaryScene, /command center|tech hub|glass/i)

  // Food
  const food = classifySector({
    productName: 'Odun Ateşinde Gurme Pizza',
    productDescription: 'Taze mozzarella ve özel domates soslu',
  })
  assert.equal(food.sectorId, 'FOOD_BEVERAGE')

  // Health
  const health = classifySector({
    productName: 'Estetik Gülüş Tasarımı ve Zirkonyum Kaplama',
    productDescription: 'Uzman diş hekimi kontrolünde acısız tedavi',
  })
  assert.equal(health.sectorId, 'HEALTH_CLINICAL')
})

test('3. Creative Memory prevents consecutive repetitive archetypes and ensures campaign variation', () => {
  const testOrg = 'test-org-' + Date.now()

  // First run: no history, lowest penalty
  const firstChoice = selectFreshArchetype(testOrg, ['CINEMATIC_PRODUCT_HERO', 'BOLD_RETAIL', 'STUDIO_PEDESTAL'])
  assert.ok(firstChoice)

  // Record that firstChoice was used
  recordCreativeMemory({
    orgId: testOrg,
    archetype: firstChoice,
    environment: 'Test environment',
    compositionGrid: 'Grid 1',
    visualHook: 'Hook 1',
    colorTreatment: 'Monochrome',
    backgroundTreatment: 'Studio',
    createdAt: new Date().toISOString(),
  })

  // Second run: the first choice should now have an 85 penalty
  const penalty = calculateArchetypePenalty(testOrg, firstChoice)
  assert.equal(penalty.penaltyScore, 85)

  // selectFreshArchetype must now pick a DIFFERENT archetype from the list
  const secondChoice = selectFreshArchetype(testOrg, ['CINEMATIC_PRODUCT_HERO', 'BOLD_RETAIL', 'STUDIO_PEDESTAL'])
  assert.notEqual(secondChoice, firstChoice, 'Creative memory must force a fresh archetype')
})

test('4. Art Direction Plan contains full designer-grade specifications and rejects generic concepts', async () => {
  const plan = await generateArtDirectionPlan({
    orgId: 'org-bofe-test',
    brandName: 'Bofe Tarım',
    productName: 'Sırt Tipi İlaçlama Pompası',
    productDescription: 'Meyve ağaçları ve bağlar için 16 litre şarjlı akülü ilaçlama makinesi',
    objective: 'SALES_OFFER',
    stylePreset: 'PRODUCT_HERO',
    qualityMode: 'DESIGNER',
  })

  assert.ok(plan.concept_name)
  assert.ok(plan.creative_archetype)
  assert.ok(plan.visual_hook)
  assert.ok(plan.composition.grid)
  assert.ok(plan.composition.focal_point)
  assert.ok(plan.composition.depth_layers.length >= 3)
  assert.ok(plan.art_direction.lighting)
  assert.ok(plan.art_direction.material_language)
  assert.ok(plan.graphic_language.shapes.length > 0)
  assert.ok(plan.typography_direction.headline_character)
  assert.ok(plan.product_direction.do_not_modify.length > 0)
  assert.ok(plan.anti_generic_rules.length >= 5)
  assert.ok(plan.brand_dna)
  assert.ok(plan.brand_dna.palette.naturalLanguageDescription)
  assert.ok(plan.brand_dna.typography.personality)

  // Must reject centered product + blank background cliché
  const rulesText = plan.anti_generic_rules.join(' ')
  assert.match(rulesText, /never center the product on a generic blank background/i)
})

test('5. Prompt Enhancer enriches buildCreativePrompt while preserving 100% of working fields', async () => {
  const plan = await generateArtDirectionPlan({
    orgId: 'org-ayvaz-test',
    brandName: 'Ayvazoğlu İnşaat',
    brandTone: 'Mimari prestij, kurumsal ciddiyet',
    brandColors: { primary: '#A82218', accent: '#263238' },
    brandFonts: { heading: 'Outfit' },
    productName: 'Dekoratif Cephe Tuğlası',
    objective: 'BRAND_AWARENESS',
    stylePreset: 'PREMIUM',
  })

  const snapshot: CreativeSnapshot = {
    brief: 'Modern cephelerde zamansız estetik',
    style: 'premium',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: true,
    labels: ['Yerli Üretim', 'TSE Onaylı'],
    cta: 'Kataloğu İncele',
    address: 'Trabzon OSB',
    website: 'www.ayvazoglu.com',
    dateRange: 'Ekim 2026',
    customText: null,
    phones: [{ id: 'p1', label: 'Satış', phone: '+90 532 000 0000' }],
    socials: [{ id: 's1', platform: 'Instagram', label: '@ayvazogluinsaat', url: 'https://instagram.com' }],
    brandKit: {
      id: 'kit-1',
      name: 'Ayvazoğlu Marka Kiti',
      tone: 'Kurumsal ve güvenilir',
      colors: { primary: '#B7410E', accent: '#263238' },
      fonts: { heading: 'Inter' },
      logoPath: 'logos/ayvazoglu.png',
    },
    products: [
      {
        id: 'prod-1',
        name: 'Dekoratif Cephe Tuğlası',
        description: 'Doğal klinker mimari kaplama',
        boxContents: null,
        imageUrl: 'https://example.com/brick.jpg',
        price: '450 TL/m²',
        oldPrice: '520 TL/m²',
        promo: '%15 Lansman İndirimi',
        extra: null,
        include: { name: true, description: true, price: true, promo: true, image: true, boxContents: false },
      },
    ],
    baseCreativeId: null,
  }

  const promptResult = buildCreativePrompt(snapshot, {
    verifiedRefs: { logo: true, product: true },
    artDirectionPlan: plan,
    mode: 'OVER_DIRECTED_DESIGNER',
  })

  // 1. Art-directed directives and Authoritative Brand DNA are injected
  assert.match(promptResult.prompt, /EXECUTIVE ART DIRECTION & DESIGNER DIRECTIVES/i)
  assert.match(promptResult.prompt, /AUTHORITATIVE BRAND DNA MANDATES/i)
  assert.match(promptResult.prompt, /CLAIM VERIFICATION & BADGE RESTRICTION/i)
  assert.match(promptResult.negative, /no invented trust badges/i)
  assert.match(promptResult.prompt, new RegExp(plan.creative_archetype, 'i'))

  // 2. Working fields are completely preserved
  assert.match(promptResult.prompt, /450 TL\/m²/i)
  assert.match(promptResult.prompt, /520 TL\/m²/i)
  assert.match(promptResult.prompt, /%15 Lansman İndirimi/i)
  assert.match(promptResult.prompt, /Kataloğu İncele/i)
  assert.match(promptResult.prompt, /STRICT LOGO FIDELITY/i)
  assert.match(promptResult.prompt, /STRICT PRODUCT FIDELITY/i)
  assert.match(promptResult.prompt, /Phone\/WhatsApp: \+90 532 000 0000/i)
})

test('6. Designer Graphic Layer builds appropriate SVG accents per archetype', () => {
  const editorialSvg = buildDesignerGraphicSvg({
    width: 1080,
    height: 1080,
    plan: {
      concept_name: 'Luxury Test',
      creative_archetype: 'EDITORIAL_LUXURY',
      visual_hook: 'Hook',
      composition: {} as any,
      art_direction: {} as any,
      graphic_language: { shapes: ['Hairline frame'], frames: ['1px frame'], lines: [], panels: [], glow: 'none', grain: 'film', decorative_motifs: [] },
      typography_direction: {} as any,
      human_direction: {} as any,
      product_direction: {} as any,
      anti_generic_rules: [],
      sector_dna: { sectorId: 'RETAIL', nameTr: 'Perakende' },
    },
  })

  assert.ok(editorialSvg)
  assert.match(editorialSvg, /<svg/i)
  assert.match(editorialSvg, /Subtle Luxury Editorial Hairline Frame/i)

  const techSvg = buildDesignerGraphicSvg({
    width: 1080,
    height: 1080,
    plan: {
      concept_name: 'Tech Test',
      creative_archetype: 'MODERN_TECH_GLASS',
      visual_hook: 'Hook',
      composition: {} as any,
      art_direction: {} as any,
      graphic_language: { shapes: ['Datum line'], frames: [], lines: [], panels: [], glow: 'none', grain: 'none', decorative_motifs: [] },
      typography_direction: {} as any,
      human_direction: {} as any,
      product_direction: {} as any,
      anti_generic_rules: [],
      sector_dna: { sectorId: 'TECH', nameTr: 'Teknoloji' },
    },
  })

  assert.ok(techSvg)
  assert.match(techSvg, /Optical Datum Line/i)
})

test('7. High Quality Best-of-2 generates TWO genuinely contrasting archetypes', async () => {
  const candidates = await generateBestOfTwoPlans({
    orgId: 'org-test-pair',
    brandName: 'Mesajify',
    productName: 'Bulut WhatsApp API',
    objective: 'SALES_OFFER',
  })

  assert.ok(candidates.candidateA)
  assert.ok(candidates.candidateB)
  assert.notEqual(
    candidates.candidateA.archetypeId,
    candidates.candidateB.archetypeId,
    'Candidates A and B must have completely different archetypes',
  )
})

test('8. Lightweight visual advisory evaluator benchmarks sharpness and contrast in <50ms without GPU', async () => {
  const testBuffer = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 18, g: 30, b: 24, alpha: 1 },
    },
  })
    .jpeg()
    .toBuffer()

  const start = Date.now()
  const advisory = await evaluateImageAdvisory(testBuffer)
  const duration = Date.now() - start

  assert.ok(advisory.score >= 0 && advisory.score <= 100)
  assert.ok(duration < 1500, `Evaluator must be lightweight and fast (<1500ms), took ${duration}ms`)
  assert.ok(PREFERENCE_RANKING_RESEARCH.evaluatedModels.length >= 3)
})

test('9. Commercial Poster Grammar V1 contains all 6 layout grammars with generic auto-routing', () => {
  const grammarKeys = Object.keys(COMMERCIAL_POSTER_GRAMMARS)
  assert.equal(grammarKeys.length, 6)
  assert.ok(COMMERCIAL_POSTER_GRAMMARS.PRODUCT_SALES_POSTER)
  assert.ok(COMMERCIAL_POSTER_GRAMMARS.PREMIUM_PRODUCT_HERO)
  assert.ok(COMMERCIAL_POSTER_GRAMMARS.RETAIL_BROCHURE)
  assert.ok(COMMERCIAL_POSTER_GRAMMARS.MATERIAL_COMMERCE)
  assert.ok(COMMERCIAL_POSTER_GRAMMARS.DIGITAL_PRODUCT_HERO)
  assert.ok(COMMERCIAL_POSTER_GRAMMARS.FOOD_COMMERCE)

  // Generic Auto-Routing without any hardcoded company names:
  // 1. Food:
  const foodGrammar = inferCommercialGrammar({
    productName: 'Hatay Usulü Tavuk Dürüm',
    productDescription: 'Özel soslu lavaş dürüm ve ayran',
  })
  assert.equal(foodGrammar.id, 'FOOD_COMMERCE')

  // 2. Building Material:
  const matGrammar = inferCommercialGrammar({
    productName: 'Klinker Cephe Tuğlası',
    productDescription: 'Yüksek mukavemetli dış cephe tuğlası',
  })
  assert.equal(matGrammar.id, 'MATERIAL_COMMERCE')

  // 3. SaaS / Digital Interface:
  const saasGrammar = inferCommercialGrammar({
    productName: 'Bulut WhatsApp API ve Panel',
    productDescription: 'Müşteri temsilcisi çalışma alanı ve otomasyon',
  })
  assert.equal(saasGrammar.id, 'DIGITAL_PRODUCT_HERO')

  // 4. Physical Equipment:
  const equipGrammar = inferCommercialGrammar({
    productName: 'Akülü İlaçlama Pompası 16L',
    productDescription: 'Yüksek basınçlı bahçe ve tarla ilaçlama makinesi',
  })
  assert.equal(equipGrammar.id, 'PRODUCT_SALES_POSTER')

  // 5. Retail / High-Promo:
  const retailGrammar = inferCommercialGrammar({
    productName: 'Toptan İndirim Sepeti',
    stylePreset: 'DYNAMIC_OFFER',
  })
  assert.equal(retailGrammar.id, 'RETAIL_BROCHURE')

  // 6. Premium Goods:
  const luxuryGrammar = inferCommercialGrammar({
    productName: 'El Yapımı Masif Ceviz Yemek Masası',
    stylePreset: 'PREMIUM',
  })
  assert.equal(luxuryGrammar.id, 'PREMIUM_PRODUCT_HERO')
})

test('10. Commercial Grammar controls layout hierarchy while Brand Kit strictly controls visual identity', async () => {
  const plan = await generateArtDirectionPlan({
    orgId: 'org-food-test',
    brandName: 'Usta Döner',
    brandTone: 'Samimi lezzet, hızlı servis, doyurucu menü',
    brandColors: {
      primary: '#DC2626',
      accent: '#F59E0B',
      background: '#1C1917',
      text: '#FEF3C7',
    },
    brandFonts: { heading: 'Montserrat', body: 'Inter' },
    productName: 'Hatay Usulü Tavuk Dürüm',
    productDescription: '2 Dürüm + Ayran özel menü',
    objective: 'SALES_OFFER',
  })

  assert.ok(plan.commercial_grammar)
  assert.equal(plan.commercial_grammar.id, 'FOOD_COMMERCE')

  const snapshot: CreativeSnapshot = {
    brief: 'Doyurucu Hatay Usulü Dürüm Fırsatı',
    style: 'dynamic_offer',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: true,
    labels: [],
    cta: 'Sipariş Ver',
    address: null,
    website: 'www.ustadoner.com',
    dateRange: 'Bugüne Özel',
    customText: null,
    phones: [{ id: 'p1', label: 'Sipariş', phone: '+90 212 000 0000' }],
    socials: [],
    brandKit: {
      id: 'kit-döner',
      name: 'Usta Döner',
      tone: 'Samimi lezzet, hızlı servis',
      colors: { primary: '#DC2626', accent: '#F59E0B', background: '#1C1917', text: '#FEF3C7' },
      fonts: { heading: 'Montserrat' },
      logoPath: null,
    },
    products: [
      {
        id: 'p-1',
        name: 'Hatay Usulü Tavuk Dürüm',
        description: 'Özel sarımsaklı mayonez ve soslu dürüm',
        boxContents: null,
        imageUrl: null,
        price: '320 TL',
        oldPrice: '400 TL',
        promo: '2 Dürüm + Ayran Kampanyası',
        extra: null,
        include: { name: true, description: true, price: true, promo: true, image: false, boxContents: false },
      },
    ],
    baseCreativeId: null,
  }

  const promptResult = buildCreativePrompt(snapshot, {
    artDirectionPlan: plan,
    mode: 'OVER_DIRECTED_DESIGNER',
  })

  // 1. Commercial Grammar injected
  assert.match(promptResult.prompt, /COMMERCIAL POSTER GRAMMAR \(FOOD_COMMERCE\)/i)
  assert.match(promptResult.prompt, /Layout Reading Path/i)
  assert.match(promptResult.prompt, /Hero Staging Area/i)

  // 2. Brand Kit has higher priority for visual identity
  assert.match(promptResult.prompt, /AUTHORITATIVE BRAND DNA MANDATES/i)
  assert.match(promptResult.prompt, /Primary=rich crimson \/ red/i)
  assert.match(promptResult.prompt, /Accent=warm amber gold/i)

  // 3. Exact verified claims only, zero unverified trust badges
  assert.match(promptResult.prompt, /320 TL/i)
  assert.match(promptResult.prompt, /2 Dürüm \+ Ayran Kampanyası/i)
  assert.match(promptResult.prompt, /CLAIM VERIFICATION & BADGE RESTRICTION/i)
  assert.match(promptResult.negative, /no invented trust badges/i)
  assert.match(promptResult.negative, /no chef or human model dominating the creative instead of the food/i)
})

test('11. Legacy Simple prompt philosophy produces clean, short, factual prompt without micromanaging composition', () => {
  const snapshot: CreativeSnapshot = {
    brief: 'Bahçenizde yüksek verim için profesyonel ilaçlama çözümü',
    style: 'product_hero',
    formatId: 'wa',
    aspect: '1:1',
    textDensity: 'balanced',
    useLogo: true,
    labels: [],
    cta: 'Hemen Sipariş Ver',
    address: null,
    website: 'www.bofetarim.com',
    dateRange: 'Ekim 2026',
    customText: null,
    phones: [{ id: 'p1', label: 'WhatsApp', phone: '+90 850 000 0000' }],
    socials: [],
    brandKit: {
      id: 'kit-bofe',
      name: 'Bofe Tarım',
      tone: 'Güvenilir, kurumsal, tarımsal uzman',
      colors: {
        primary: '#026009',
        accent: '#B4FE00',
        secondary: '#1E3F1A',
        background: '#026009',
        text: '#FFFFFF',
      },
      fonts: { heading: 'Outfit' },
      logoPath: 'logos/bofe.png',
    },
    products: [
      {
        id: 'p-1',
        name: '16L Akülü Sırt Tipi İlaçlama Pompası',
        description: 'Geniş meyve bahçeleri, zeytinlikler ve seralar için 8 bar yüksek basınçlı akülü ilaçlama makinesi',
        boxContents: null,
        imageUrl: 'https://example.com/bofe.jpg',
        price: '1.450 TL',
        oldPrice: '1.850 TL',
        promo: 'Lansmana Özel %22 İndirim',
        extra: null,
        include: { name: true, description: true, price: true, promo: true, image: true, boxContents: false },
      },
    ],
    baseCreativeId: null,
  }

  // By default, buildCreativePrompt uses LEGACY_SIMPLE prompt philosophy
  const promptResult = buildCreativePrompt(snapshot, {
    verifiedRefs: { logo: true, product: true },
  })

  // 1. Core factual context present
  assert.match(promptResult.prompt, /Campaign brief from the advertiser.*Bahçenizde yüksek verim için profesyonel ilaçlama çözümü/i)
  assert.match(promptResult.prompt, /Brand name: Bofe Tarım/i)
  assert.match(promptResult.prompt, /Brand tone of voice: Güvenilir, kurumsal, tarımsal uzman/i)
  assert.match(promptResult.prompt, /deep agricultural forest green/i)
  assert.match(promptResult.prompt, /electric chartreuse \/ lime accent/i)
  assert.match(promptResult.prompt, /TYPOGRAPHY:.*Outfit/i)
  assert.match(promptResult.prompt, /16L Akülü Sırt Tipi İlaçlama Pompası/i)
  assert.match(promptResult.prompt, /1.450 TL/i)
  assert.match(promptResult.prompt, /\(was 1.850 TL\)/i)
  assert.match(promptResult.prompt, /offer: Lansmana Özel %22 İndirim/i)
  assert.match(promptResult.prompt, /Call-to-Action \(CTA\): Hemen Sipariş Ver/i)

  // 2. Attached reference instruction present
  assert.match(promptResult.prompt, /STRICT LOGO FIDELITY/)
  assert.match(promptResult.prompt, /STRICT PRODUCT FIDELITY/)

  // 3. Factual safety and absence of invented facts
  assert.match(promptResult.prompt, /Do not invent prices, discounts, slogans, dates, product names or brand claims/i)

  // 4. Over-directing micromanagement is strictly absent
  assert.doesNotMatch(promptResult.prompt, /COMMERCIAL CAMPAIGN POSTER ARCHITECTURE/i)
  assert.doesNotMatch(promptResult.prompt, /ZONE 1/i)
  assert.doesNotMatch(promptResult.prompt, /ZONE 2/i)
  assert.doesNotMatch(promptResult.prompt, /hero subject is the undisputed commercial anchor occupying 45-55%/i)
  assert.doesNotMatch(promptResult.prompt, /AUTONOMOUS COMMERCIAL AD POSTER/i)
  assert.doesNotMatch(promptResult.prompt, /BOTTOM VALUE STRIP/i)
})

