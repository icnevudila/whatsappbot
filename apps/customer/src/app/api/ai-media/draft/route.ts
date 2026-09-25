import { NextRequest, NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import type { SpeechTimelineItem, AdFormatType } from '@/app/(panel)/icerik/wizard-types'
import { resolveProductAffordance } from '@/lib/ai/affordance'
import { completeText } from '@/lib/ai/text'
import { buildSafeSpokenLine, type ProductFidelityContract } from '@/lib/video-wizard-contract'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Beat = { start: number; end: number; purpose: string; visual: string }

function planBeats(
  format: AdFormatType,
  product: string,
  verifiedClaims: string[],
  environment: string,
  motionStyle: string,
  hasPresenterReference: boolean,
): Beat[] {
  const claim = verifiedClaims[0]
  const camera = motionStyle === 'macro_detail'
    ? 'kontrollü makrodan ürünün tamamına açılan kamera'
    : motionStyle === 'studio_orbit'
      ? 'tam tur atmayan güvenli 3/4 vitrin hareketi'
      : 'gerçek kullanımı takip eden sabit ve yumuşak kamera'
  const commonClose = `${product} merkezde sabitlenir; logo ve CTA yalnız deterministic finishing katmanında eklenir.`
  const plans: Partial<Record<AdFormatType, [string, string, string]>> = {
    FAST_SALES: [
      `İlk saniyede ${product} üzerinde net form detayı; ${camera}.`,
      claim ? `Doğrulanmış tek faydayı görsel olarak destekleyen kullanım anı: ${claim}.` : 'Yalnız görünür ürün detaylarını gösteren hızlı gerçek kullanım anı.',
      commonClose,
    ],
    PRODUCT_USAGE: [
      `${environment} içinde ürün ve kullanım bağlamı birlikte kurulur.`,
      `Referansta izin verilen tek doğal kullanım adımı kesintisiz gösterilir; ${camera}.`,
      commonClose,
    ],
    PROBLEM_SOLUTION: [
      `Uydurma sonuç veya hasar göstermeden gerçek çalışma bağlamı kurulur: ${environment}.`,
      `Ürün, yalnız doğrulanmış özellikleriyle tek kullanım adımında gösterilir.`,
      commonClose,
    ],
    SOCIAL_UGC: [
      hasPresenterReference ? 'Onaylı sunucu referansı doğal kadrajda ürünü tanıtır.' : 'Birinci şahıs bakışında doğal el kadrajı ürüne yaklaşır.',
      `Samimi fakat iddiasız gerçek kullanım detayı; ürün geometrisi tamamen korunur.`,
      commonClose,
    ],
    PREMIUM: [
      `Sakin ışık geçişiyle malzeme ve silüet vurgulanır; ${camera}.`,
      'Az hareketli, temiz yüzeyli prestij kadrajında ürün referansına birebir sadık kalır.',
      commonClose,
    ],
    OFFER: [
      `Ürün ilk saniyede okunur kadrajda görünür; teklif metni sahne içine üretilmez.`,
      `${environment} içinde temiz ürün kanıtı; teklif yalnız finishing katmanında gösterilir.`,
      commonClose,
    ],
  }
  const selected = plans[format] || [
    `Referans ürüne hızlı ve net odak; ${camera}.`,
    `${environment} içinde tek gerçek kullanım anı; yeni ürün özelliği icat edilmez.`,
    commonClose,
  ]

  return [
    { start: 0, end: 2.2, purpose: 'HOOK', visual: selected[0] },
    { start: 2.2, end: 5.8, purpose: 'PRODUCT_PROOF', visual: selected[1] },
    { start: 5.8, end: 8, purpose: 'BRAND_CLOSE', visual: selected[2] },
  ]
}

function speechFor(spokenLine: string): SpeechTimelineItem[] {
  return [{
    start_sec: 0.5,
    end_sec: 5.5,
    exact_text: spokenLine,
    speaker: 'Spiker',
    delivery_style: 'Profesyonel, akıcı ve kurumsal Türkçe seslendirme',
    corresponding_visual_beat: 'Ana ürün ve fayda anlatımı',
  }]
}

/** Asset-grounded draft. Generation remains blocked until /jobs locks approval. */
export async function POST(req: NextRequest) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const body = await req.json()
    const brandName = String(body.brandName || org.name || '').trim()
    const productName = String(body.productName || '').trim()
    const productDescription = String(body.productDescription || '').trim()
    const adFormat = (body.adFormat || 'AUTO') as AdFormatType
    const hasProduct = Boolean(body.productImageUrl && productName)
    const verifiedClaims = Array.isArray(body.verifiedClaims)
      ? body.verifiedClaims.map((claim: unknown) => String(claim).trim()).filter(Boolean)
      : []
    const fidelityContract = body.productFidelityContract as ProductFidelityContract | undefined
    const referenceAssets = Array.isArray(body.referenceAssets) ? body.referenceAssets : []
    if (!brandName || !productName) return NextResponse.json({ error: 'Marka ve ürün/hizmet adı zorunludur.' }, { status: 400 })

    const affordance = await resolveProductAffordance(brandName, productName, productDescription)
    const beats = planBeats(
      adFormat,
      productName,
      verifiedClaims,
      body.environmentPreset === 'auto' ? affordance.naturalEnvironment : String(body.environmentPreset || affordance.naturalEnvironment),
      String(body.motionStyle || 'real_usage'),
      referenceAssets.some((asset: any) => asset?.role === 'presenter'),
    )
    const revisionType = String(body.revisionType || 'refresh')
    const creativeNote = String(body.creativeNote || '').trim()

    let approvedSpokenLine = ''
    try {
      const toneMap: Record<string, string> = {
        sales: 'Satış, dönüşüm ve harekete geçirici aciliyet odaklı (fırsatı kaçırma hissi)',
        short: 'Son derece kısa, öz, net ve vurucu',
        corporate: 'Prestijli, kurumsal, güven veren ve kaliteli',
        refresh: 'Dinamik, modern, enerjik ve dikkat çekici',
      }
      const toneDesc = toneMap[revisionType] || 'Dinamik ve profesyonel'

      const systemPrompt = `Sen Türkiye'nin en iyi kreatif reklam yazarı ve metin yazarısın.
Görevin: Bir video reklam filmi için 8 ila 14 kelimelik (asla 16 kelimeyi geçmeyen), akıcı, ticari ve etkileyici bir Türkçe seslendirme metni yazmak.

ÇOK KATI KURALLAR:
1. Kesinlikle doğal, karizmatik, Türkçe konuşma diline uygun bir reklam metni olsun.
2. "referansına sadık", "tasarıma sadık", "geometrisi", "veo", "yapay zeka", "prompt", "canary" gibi teknik veya geliştirici kelimelerini ASLA KULLANMA.
3. Ürünün kalitesini, faydasını veya güvenilirliğini vurgula; markanın adını cümlenin sonunda veya başında doğal şekilde geçir.
4. Metin en fazla 1 veya 2 kısa vurucu cümleden oluşsun (ideal: 8-13 kelime).
5. YALNIZCA konuşulacak Türkçe metni yaz. Tırnak işareti, başlık, açıklama veya çeviri ekleme.`

      const userPrompt = `Marka: ${brandName}
Ürün: ${productName}
Ürün Açıklaması: ${productDescription || 'Belirtilmedi'}
Reklam Formatı: ${adFormat}
İstenen Reklam Tonu: ${toneDesc}
Özel Vurgulanmak İstenen Not: ${creativeNote || 'Yok'}
Doğrulanmış Ürün Bilgisi: ${verifiedClaims.join(', ') || 'Yok'}
Varsa Kampanya / Fırsat: ${body.offerDetails || 'Yok'}`

      const aiText = await completeText(systemPrompt, userPrompt)
      const cleanText = aiText.replace(/["“”«»]/g, '').trim()
      const wordCount = cleanText.split(/\s+/).filter(Boolean).length
      if (wordCount >= 6 && wordCount <= 18) {
        approvedSpokenLine = cleanText
      }
    } catch (e) {
      console.warn('[draft] GPT copy generation fallback to template:', e)
    }

    if (!approvedSpokenLine) {
      approvedSpokenLine = buildSafeSpokenLine({
        brandName,
        productName,
        adFormat,
        verifiedClaims,
        offer: String(body.offerDetails || '').trim(),
        offerVerified: body.offerVerified === true,
      })
    }
    const speechTimeline = speechFor(approvedSpokenLine)
    const negativeConstraints = [
      'no generated subtitles, headline, price, CTA, phone, URL, random typography, watermark, invented logo, foreign brand, product morphing, fake UI, or unsupported factual claim.',
      ...affordance.negativeEnvironmentConstraints,
    ].join(', ')

    const veoPrompt = [
      `Photorealistic 9:16 eight-second commercial for ${brandName}.`,
      `Canonical visual reference: ${hasProduct ? '@HeroProduct' : 'approved service references only'}. Preserve geometry, color and packaging; never invent product details.`,
      `[ENVIRONMENT] ${affordance.naturalEnvironment}.`,
      '[VISUAL BEATS]',
      ...beats.map((beat) => `${beat.start.toFixed(1)}-${beat.end.toFixed(1)}s ${beat.purpose}: ${beat.visual}`),
      '[AUDIO TIMELINE]',
      'Native Turkish dialogue only; speak the approved lines exactly, with no translation, paraphrase, or extra dialogue.',
      ...speechTimeline.map((line) => `${line.start_sec.toFixed(1)}-${line.end_sec.toFixed(1)}s: "${line.exact_text}"`),
      `[NEGATIVE CONSTRAINTS] ${negativeConstraints}`,
    ].join('\n')

    const formatConceptTitles: Record<string, string> = {
      FAST_SALES: 'Dinamik ve Satış Odaklı Reklam',
      PRODUCT_USAGE: 'Kullanım ve Performans Tanıtımı',
      PROBLEM_SOLUTION: 'Çözüm ve Fayda Odaklı Tanıtım',
      PREMIUM: 'Prestijli ve Sinematik Tanıtım',
      SOCIAL_UGC: 'Doğal ve Samimi Deneyim Paylaşımı',
      OFFER: 'Özel Kampanya ve Fırsat Duyurusu',
      OFFER_DRIVEN: 'Özel Kampanya ve Fırsat Duyurusu',
      AUTO: 'Profesyonel Ürün Tanıtımı',
    }
    const conceptTitle = formatConceptTitles[adFormat] || 'Profesyonel Ürün Tanıtımı'
    const creativeIdea = `${productName} — ${conceptTitle}`
    const { data: revision, error } = await (supabase as any).from('creative_revisions').insert({
      org_id: org.id, status: 'DRAFT', creative_idea: creativeIdea, selected_ad_format: adFormat,
      speech_timeline: speechTimeline, veo_prompt: veoPrompt,
      campaign_facts: {
        brand_name: brandName,
        product_name: productName,
        product_description: productDescription || null,
        offer: body.offerDetails || null,
        offer_verified: body.offerVerified === true,
        product_id: body.productId || null,
        verified_claims: verifiedClaims,
        approved_spoken_line: approvedSpokenLine,
        product_fidelity_contract: fidelityContract || null,
        detected_sector: affordance.detectedSector,
        natural_environment: affordance.naturalEnvironment,
      },
      asset_sha_set: [
        ...(body.logoUrl ? [{ role: 'logo', url: body.logoUrl }] : []),
        ...(body.productImageUrl ? [{ role: 'product', url: body.productImageUrl }] : []),
        ...(referenceAssets.map((asset: any) => ({ role: asset.role || 'reference', url: asset.url }))),
      ],
    }).select('id').single()
    if (error) throw error
    return NextResponse.json({
      revision_id: revision?.id || null,
      creative_idea: creativeIdea,
      visual_beats: beats,
      speech_timeline: speechTimeline,
      approved_spoken_line: approvedSpokenLine,
      veo_prompt: veoPrompt,
    })
  } catch (error: any) {
    console.error('[ai-media-draft] Error:', error)
    return NextResponse.json({ error: error?.message || 'Taslak oluşturulamadı.' }, { status: 500 })
  }
}
