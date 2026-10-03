/**
 * MESAJIFY CREATIVE STUDIO — DESIGNER ACCEPTANCE COMPARISON RUN
 *
 * Runs side-by-side comparative generation of BASELINE vs DESIGNER MODE
 * across the 3 real tenants:
 * 1. Bofe Tarım (Agriculture)
 * 2. Ayvazoğlu İnşaat (Construction)
 * 3. Mesajify (Tech / SaaS)
 */

import { generateArtDirectionPlan, type ArtDirectionPlan } from './creative-director'
import { buildCreativePrompt } from '../prompt'
import type { CreativeSnapshot } from '../types'

interface BrandTestSpec {
  brandName: string
  orgId: string
  productName: string
  productDescription: string
  price?: string
  oldPrice?: string
  promo?: string
  cta: string
  objective: string
  stylePreset: string
  formatId: string
  aspect: '1:1' | '4:5' | '9:16'
  brandColors: { primary: string; accent: string }
  brief: string
  logoPath: string
  productImageUrl: string
}

const BRANDS: BrandTestSpec[] = [
  {
    brandName: 'Bofe Tarım',
    orgId: 'org-bofe-prod',
    productName: '16L Akülü Sırt Tipi İlaçlama Pompası',
    productDescription: 'Geniş meyve bahçeleri, zeytinlikler ve seralar için ayarlanabilir pirinç nozullu, 8 bar yüksek basınçlı akülü ilaçlama makinesi.',
    price: '1.450 TL',
    oldPrice: '1.850 TL',
    promo: 'Lansmana Özel %22 İndirim',
    cta: 'Hemen Sipariş Ver',
    objective: 'SALES_OFFER',
    stylePreset: 'PRODUCT_HERO',
    formatId: 'wa',
    aspect: '1:1',
    brandColors: { primary: '#2D5A27', accent: '#8FBC8F' },
    brief: 'Bahçenizde yüksek verim için profesyonel ilaçlama çözümü',
    logoPath: 'logos/bofe-tarim-logo.png',
    productImageUrl: 'https://storage.mesajify.com/products/bofe-pompa.jpg',
  },
  {
    brandName: 'Ayvazoğlu İnşaat',
    orgId: 'org-ayvaz-prod',
    productName: 'Klinker Dış Cephe Kaplama Tuğlası',
    productDescription: 'Yüksek fırınlanmış doğal klinker mimari cephe tuğlası. Dona, neme ve UV ışınlarına karşı 50 yıl garantili dayanıklılık.',
    price: '480 TL/m²',
    oldPrice: '560 TL/m²',
    promo: 'Proje Bazlı Toptan İndirim',
    cta: 'Kataloğu İndir',
    objective: 'BRAND_AWARENESS',
    stylePreset: 'PREMIUM',
    formatId: 'feed',
    aspect: '4:5',
    brandColors: { primary: '#B7410E', accent: '#263238' },
    brief: 'Modern mimaride sağlamlık ve zamansız klinker estetiği',
    logoPath: 'logos/ayvazoglu-logo.png',
    productImageUrl: 'https://storage.mesajify.com/products/ayvaz-tugla.jpg',
  },
  {
    brandName: 'Mesajify',
    orgId: 'org-mesajify-prod',
    productName: 'WhatsApp Cloud API & Otomasyon Paneli',
    productDescription: 'E-ticaret ve B2B işletmeler için tek tıkla toplu kampanya, AI otomatik yanıtlayıcı ve çoklu müşteri temsilcisi çalışma alanı.',
    price: '690 TL/ay',
    oldPrice: undefined,
    promo: '14 Gün Ücretsiz Deneyin',
    cta: 'Ücretsiz Başla',
    objective: 'NEW_PRODUCT',
    stylePreset: 'DYNAMIC_OFFER',
    formatId: 'story',
    aspect: '9:16',
    brandColors: { primary: '#008069', accent: '#00a884' },
    brief: 'Tüm müşteri iletişimini ve satışları tek ekrandan yönetin',
    logoPath: 'logos/mesajify-official-logo.png',
    productImageUrl: 'https://storage.mesajify.com/products/mesajify-dashboard.png',
  },
]

export async function runDesignerAcceptanceBenchmark() {
  const results = []

  for (const spec of BRANDS) {
    const baseSnapshot: CreativeSnapshot = {
      brief: spec.brief,
      style: spec.stylePreset.toLowerCase(),
      formatId: spec.formatId,
      aspect: spec.aspect,
      textDensity: 'balanced',
      useLogo: true,
      labels: ['Orijinal Ürün', 'Yetkili Satıcı'],
      cta: spec.cta,
      address: null,
      website: `www.${spec.brandName.toLowerCase().replace(/[^a-z]/g, '')}.com`,
      dateRange: 'Ekim 2026',
      customText: null,
      phones: [{ id: 'p1', label: 'WhatsApp', phone: '+90 850 000 0000' }],
      socials: [],
      brandKit: {
        id: `kit-${spec.orgId}`,
        name: `${spec.brandName} Brand Kit`,
        tone: 'Profesyonel kurumsal',
        colors: spec.brandColors,
        fonts: { heading: 'Inter' },
        logoPath: spec.logoPath,
      },
      products: [
        {
          id: `prod-${spec.orgId}`,
          name: spec.productName,
          description: spec.productDescription,
          boxContents: null,
          imageUrl: spec.productImageUrl,
          price: spec.price || null,
          oldPrice: spec.oldPrice || null,
          promo: spec.promo || null,
          extra: null,
          include: { name: true, description: true, price: true, promo: true, image: true, boxContents: false },
        },
      ],
      baseCreativeId: null,
    }

    // 1. BASELINE MODE (Current Proven Prompt Pipeline)
    const baselinePromptResult = buildCreativePrompt(baseSnapshot, {
      verifiedRefs: { logo: true, product: true },
      artDirectionPlan: null,
    })

    // 2. DESIGNER MODE (Creative Director Layer)
    const artDirectionPlan = await generateArtDirectionPlan({
      orgId: spec.orgId,
      brandName: spec.brandName,
      productName: spec.productName,
      productDescription: spec.productDescription,
      objective: spec.objective,
      stylePreset: spec.stylePreset,
      format: spec.formatId,
      headline: spec.brief,
      offer: spec.promo,
      cta: spec.cta,
      qualityMode: 'DESIGNER',
    })

    const designerPromptResult = buildCreativePrompt(baseSnapshot, {
      verifiedRefs: { logo: true, product: true },
      artDirectionPlan,
    })

    results.push({
      brandName: spec.brandName,
      sector: artDirectionPlan.sector_dna.nameTr,
      archetype: artDirectionPlan.creative_archetype,
      conceptName: artDirectionPlan.concept_name,
      visualHook: artDirectionPlan.visual_hook,
      compositionGrid: artDirectionPlan.composition.grid,
      lightingPhysics: artDirectionPlan.art_direction.lighting,
      materialLanguage: artDirectionPlan.art_direction.material_language,
      baselinePromptLength: baselinePromptResult.prompt.length,
      designerPromptLength: designerPromptResult.prompt.length,
      baselinePromptSnippet: baselinePromptResult.prompt.slice(0, 320) + '...',
      designerPromptSnippet: designerPromptResult.prompt.slice(0, 480) + '...',
      preservedFields: {
        price: designerPromptResult.prompt.includes(spec.price || 'NONE'),
        promo: designerPromptResult.prompt.includes(spec.promo || 'NONE'),
        cta: designerPromptResult.prompt.includes(spec.cta),
        logoFidelity: designerPromptResult.prompt.includes('STRICT LOGO FIDELITY'),
        productFidelity: designerPromptResult.prompt.includes('STRICT PRODUCT FIDELITY'),
      },
    })
  }

  return results
}

// Direct execution when invoked
if (process.argv[1]?.endsWith('run-designer-acceptance.ts')) {
  runDesignerAcceptanceBenchmark().then((res) => {
    console.log(JSON.stringify(res, null, 2))
  })
}
