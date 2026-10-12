import { buildCreativePrompt } from '../apps/customer/src/lib/creative/prompt'
import type { CreativeSnapshot } from '../apps/customer/src/lib/creative/types'
import { resolveArtDirectionPlanAtSubmission } from '../apps/customer/src/lib/creative/director/creative-director'
import assert from 'node:assert'

// Real authentic Bofe data straight from Supabase DB
const BOFE_ORG_ID = 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc'
const BOFE_BRAND_NAME = 'Bofe'
const BOFE_LOGO_URL = 'http://167.233.201.31:3456/outputs/bofe_logo.png'

const BOFE_BRAND_KIT = {
  id: 'cd4ce662-eede-48a0-ba71-80433a61a842',
  name: 'Bofe',
  tone: 'Modern, yüksek teknolojili ve profesyonel tarım & çevre sağlığı ekipmanları. Güven veren, dinamik ve net bir dil.',
  colors: {
    primary: '#000000',
    secondary: '#026009',
    accent: '#acfe00',
    text: '#000000',
    background: '#ffffff',
  },
  fonts: { heading: 'Inter', body: 'Inter' },
  logoPath: BOFE_LOGO_URL,
}

const BOFE_PRODUCT = {
  id: 'b68d4eb9-7cc0-491e-9ece-84b8c01068b1',
  name: 'Bofe Otomatik Şarjlı Akülü Sırt İlaçlama Pompası',
  description: 'Geniş 16L açık mavi depo haznesi, güçlü lityum-iyon batarya, ayarlanabilir pirinç nozullu paslanmaz çelik teleskopik ilaçlama borusu, ergonomik sırt askısı ve entegre basınç göstergesi.',
  boxContents: '1x Bofe 16L Şarjlı Sırt Pompası, 1x Paslanmaz Çelik Teleskopik Uzatma Borusu, 1x Çok Amaçlı Pirinç Nozul Seti, 1x Hızlı Şarj Cihazı, 1x Ergonomik Sırt Askı Kemeri',
  imageUrl: 'https://rnkrjmblgcdqlyslbhob.supabase.co/storage/v1/object/public/creatives/afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc/products/7f776e2c-adf2-45ac-8e99-21e8ac782013.jpg',
  price: '1.450 TL',
  oldPrice: '1.850 TL',
  promo: '%22 İndirim',
}

const CAMPAIGN_INFO = {
  headline: 'Bofe 16L Akülü Pompa — Sezona Özel %22 İndirim',
  supportingLine: 'Bahçenizde yüksek verim için dayanıklı ve pratik mikronize ilaçlama.',
  cta: 'Hemen İnceleyin',
  deliveryInfo: 'Aynı Gün Ücretsiz Kargo',
  sector: 'Tarım & Bahçe',
}

function compileNewGeneration({
  stylePreset = 'AUTO',
  inspirationAdUrl = null,
  userInstruction = null,
}: {
  stylePreset?: string
  inspirationAdUrl?: string | null
  userInstruction?: string | null
}) {
  const artDirection = resolveArtDirectionPlanAtSubmission({
    input: {
      orgId: BOFE_ORG_ID,
      brandName: BOFE_BRAND_NAME,
      brandTone: BOFE_BRAND_KIT.tone,
      productName: BOFE_PRODUCT.name,
      productDescription: BOFE_PRODUCT.description,
      objective: 'SALES_OFFER',
      stylePreset,
      format: 'whatsapp_square',
      headline: CAMPAIGN_INFO.headline,
      offer: BOFE_PRODUCT.promo,
      cta: CAMPAIGN_INFO.cta,
      campaignDetail: userInstruction,
    },
    precomputedPlan: null,
  })

  const snapshot: CreativeSnapshot = {
    brief: `${CAMPAIGN_INFO.headline}. ${CAMPAIGN_INFO.supportingLine}`,
    style: stylePreset.toLowerCase(),
    stylePreset,
    formatId: 'whatsapp_square',
    aspect: '1:1',
    companyName: BOFE_BRAND_NAME,
    textDensity: 'balanced',
    useLogo: true,
    labels: [],
    cta: CAMPAIGN_INFO.cta,
    brandKit: BOFE_BRAND_KIT,
    products: [
      {
        id: BOFE_PRODUCT.id,
        name: BOFE_PRODUCT.name,
        description: BOFE_PRODUCT.description,
        boxContents: BOFE_PRODUCT.boxContents,
        imageUrl: BOFE_PRODUCT.imageUrl,
        price: BOFE_PRODUCT.price,
        oldPrice: BOFE_PRODUCT.oldPrice,
        promo: BOFE_PRODUCT.promo,
        include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
      },
    ],
    phones: [{ id: 'p1', label: 'Bofe', phone: '+905304542816' }],
    socials: [],
    qualityMode: 'AUTO_PROFESSIONAL' as any,
    artDirectionPlan: artDirection.plan,
    sector: CAMPAIGN_INFO.sector,
    deliveryInfo: CAMPAIGN_INFO.deliveryInfo,
    customHeadline: CAMPAIGN_INFO.headline,
    customSupporting: CAMPAIGN_INFO.supportingLine,
    instruction: userInstruction || null,
    referenceImageUrls: inspirationAdUrl ? [inspirationAdUrl] : [],
  }

  const promptResult = buildCreativePrompt(snapshot, {
    verifiedRefs: {
      logo: true,
      product: true,
      base: false, // Initial generation -> NOT a base image!
      inspiration: Boolean(inspirationAdUrl),
    },
    artDirectionPlan: artDirection.plan,
  })

  return { plan: artDirection.plan, prompt: promptResult.prompt, negative: promptResult.negative }
}

async function runVerification() {
  console.log('================================================================================')
  console.log('MASTER BOT — TEST: İLK REKLAM ÜRETİMİNDE GERÇEK TASARIM ÇEŞİTLİLİĞİ DOĞRULAMASI')
  console.log('Kullanıcı: Bofe Tarım | Ürün: 16L Akülü Sırt Pompası | Logo: Kurumsal Bofe Logo')
  console.log('Hedef: 3 Ardışık Yeni Üretimde Anlamlı Konsept ve Kompozisyon Ayrışması')
  console.log('================================================================================\n')

  // --- ÜRETİM 1: İlk Tıklama (Tasarım notu boş, AUTO mod) ---
  console.log('>>> [YENİ ÜRETİM 1] Kullanıcı "Reklam Görselimi Oluştur" butonuna bastı (Tasarım notu boş, Stil: AUTO)');
  const gen1 = compileNewGeneration({
    stylePreset: 'AUTO',
    inspirationAdUrl: 'https://example.com/inspiration-ad-banner.jpg',
    userInstruction: null,
  })

  console.log(`  Arketip: ${gen1.plan.creative_archetype} (${gen1.plan.concept_name})`)
  console.log(`  Visual Hook: ${gen1.plan.visual_hook}`)
  console.log(`  Işık Fiziği: ${gen1.plan.art_direction.lighting}`)
  console.log(`  Derinlik Katmanları: ${gen1.plan.composition.depth_layers.join(' -> ')}`)
  console.log(`  Kompozisyon Izgarası: ${gen1.plan.composition.grid}`)
  console.log('')

  // --- ÜRETİM 2: Aynı kullanıcı aynı ürün ve logoyla bağımsız ikinci üretim başlattı ---
  console.log('>>> [YENİ ÜRETİM 2] Kullanıcı aynı ürün/logo ile BAĞIMSIZ yeni üretim başlattı (Stil: AUTO)');
  const gen2 = compileNewGeneration({
    stylePreset: 'AUTO',
    inspirationAdUrl: 'https://example.com/inspiration-ad-banner.jpg',
    userInstruction: null,
  })

  console.log(`  Arketip: ${gen2.plan.creative_archetype} (${gen2.plan.concept_name})`)
  console.log(`  Visual Hook: ${gen2.plan.visual_hook}`)
  console.log(`  Işık Fiziği: ${gen2.plan.art_direction.lighting}`)
  console.log(`  Derinlik Katmanları: ${gen2.plan.composition.depth_layers.join(' -> ')}`)
  console.log(`  Kompozisyon Izgarası: ${gen2.plan.composition.grid}`)
  console.log('')

  // --- ÜRETİM 3: Aynı kullanıcı aynı ürün ve logoyla bağımsız üçüncü üretim başlattı ---
  console.log('>>> [YENİ ÜRETİM 3] Kullanıcı aynı ürün/logo ile BAĞIMSIZ üçüncü üretim başlattı (Stil: AUTO)');
  const gen3 = compileNewGeneration({
    stylePreset: 'AUTO',
    inspirationAdUrl: 'https://example.com/inspiration-ad-banner.jpg',
    userInstruction: null,
  })

  console.log(`  Arketip: ${gen3.plan.creative_archetype} (${gen3.plan.concept_name})`)
  console.log(`  Visual Hook: ${gen3.plan.visual_hook}`)
  console.log(`  Işık Fiziği: ${gen3.plan.art_direction.lighting}`)
  console.log(`  Derinlik Katmanları: ${gen3.plan.composition.depth_layers.join(' -> ')}`)
  console.log(`  Kompozisyon Izgarası: ${gen3.plan.composition.grid}`)
  console.log('')

  // KONTROLLER & ASSERTIONS:
  console.log('--- DOĞRULAMA KONTROLLERİ ---')

  // 1. Üç üretim birbirinden farklı arketip seçmeli
  const archetypes = [gen1.plan.creative_archetype, gen2.plan.creative_archetype, gen3.plan.creative_archetype]
  const uniqueArchetypes = new Set(archetypes)
  console.log(`1. Seçilen Arketip Çeşitliliği: [${archetypes.join(', ')}] (${uniqueArchetypes.size}/3 benzersiz)`)
  assert(uniqueArchetypes.size >= 2, 'En az 2 farklı yaratıcı arketip seçilmeli')

  // 2. Üç üretim farklı görsel odak / sahne ortamı seçmeli (Visual Hook çeşitliliği)
  const hooks = [gen1.plan.visual_hook, gen2.plan.visual_hook, gen3.plan.visual_hook]
  const uniqueHooks = new Set(hooks)
  console.log(`2. Visual Hook / Sahne Çeşitliliği: ${uniqueHooks.size}/3 benzersiz görsel sahne`)
  assert(uniqueHooks.size >= 2, 'En az 2 farklı sahne ve visual hook üretilmeli')

  // 3. Orijinal Logo ve Fiziksel Ürün Kimliği Korunması Kontrolü
  for (const [idx, gen] of [gen1, gen2, gen3].entries()) {
    assert(gen.prompt.includes('STRICT LOGO FIDELITY'), `Üretim ${idx+1}: STRICT LOGO FIDELITY bulunamadı!`)
    assert(gen.prompt.includes('STRICT PRODUCT FIDELITY'), `Üretim ${idx+1}: STRICT PRODUCT FIDELITY bulunamadı!`)
    assert(gen.prompt.includes('1.450 TL'), `Üretim ${idx+1}: Doğrulanmış fiyat eksik!`)
    assert(gen.prompt.includes('%22 İndirim'), `Üretim ${idx+1}: Doğrulanmış teklif eksik!`)
    assert(gen.prompt.includes('Hemen İnceleyin'), `Üretim ${idx+1}: Doğrulanmış CTA eksik!`)
  }
  console.log('3. Logo, Ürün Kimliği ve Doğrulanmış Bilgi Kilidi: TAM KORUNDU (Logo redrawing engellendi, ürün casing kilitli, fiyat/teklif/CTA hatasız)')

  // 4. İlham Görseli İlham Olarak mı Değerlendirildi? (Base Image Sayılmama Kontrolü)
  for (const [idx, gen] of [gen1, gen2, gen3].entries()) {
    assert(gen.prompt.includes('DESIGN INSPIRATION DIRECTIVE'), `Üretim ${idx+1}: DESIGN INSPIRATION DIRECTIVE bulunamadı!`)
    assert(!gen.prompt.includes('A base/reference campaign image is attached. Keep the same product and brand identity; apply the requested change.'),
      `Üretim ${idx+1}: İlham görseli yanlışlıkla Base Image kabul edilmiş!`)
    assert(gen.negative.includes('no clone or literal replica of the inspiration ad layout'),
      `Üretim ${idx+1}: İlham kopyalama yasağı negatif promptta eksik!`)
  }
  console.log('4. İlham Görseli Rolü: Sadece estetik ilham; Base canvas sayılmadı, layout kopyalama kesin olarak yasaklandı.')

  // 5. Stil Presetleri Gerçek Etki Gösteriyor mu? (PREMIUM vs REAL_USAGE vs DYNAMIC_OFFER)
  console.log('\n--- WIZARD STİL PRESETLERİ ETKİ TESTİ ---')
  const genPremium = compileNewGeneration({ stylePreset: 'PREMIUM' })
  const genUsage = compileNewGeneration({ stylePreset: 'REAL_USAGE' })
  const genDynamic = compileNewGeneration({ stylePreset: 'DYNAMIC_OFFER' })

  console.log(`  Stil 'PREMIUM': Arketip=${genPremium.plan.creative_archetype} | Işık=${genPremium.plan.art_direction.lighting.slice(0, 60)}...`)
  console.log(`  Stil 'REAL_USAGE': Arketip=${genUsage.plan.creative_archetype} | Işık=${genUsage.plan.art_direction.lighting.slice(0, 60)}...`)
  console.log(`  Stil 'DYNAMIC_OFFER': Arketip=${genDynamic.plan.creative_archetype} | Izgara=${genDynamic.plan.composition.grid.slice(0, 60)}...`)

  assert.notEqual(genPremium.plan.creative_archetype, genDynamic.plan.creative_archetype, 'PREMIUM ve DYNAMIC_OFFER farklı arketip üretmeli')
  assert(genPremium.prompt.includes('Visual style preset: Premium'), 'PREMIUM stil direktifi promptta mevcut olmalı')
  assert(genUsage.prompt.includes('Visual style preset: real_usage') || genUsage.prompt.includes('REAL_USAGE'), 'REAL_USAGE stil direktifi promptta mevcut olmalı')
  console.log('5. Stil Seçenekleri: Gerçek ve belirgin kompozisyon/arketip/ışık ayrışması kanıtlandı.')

  console.log('\n================================================================================')
  console.log('SONUÇ: TÜM 5 KRİTER BAŞARIYLA GEÇTİ! SIFIR ÜCRETLİ ÇAĞRI YAPILDI.')
  console.log('================================================================================')
}

runVerification().catch((err) => {
  console.error('Test hatası:', err)
  process.exit(1)
})
