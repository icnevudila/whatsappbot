import { NextRequest, NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import type { SpeechTimelineItem, AdFormatType } from '@/app/(panel)/icerik/wizard-types'
import { resolveProductAffordance } from '@/lib/ai/affordance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Beat = { start: number; end: number; purpose: string; visual: string }

const beatCountFor = (format: AdFormatType, hasProduct: boolean) => {
  if (format === 'SOCIAL_UGC' || format === 'UGC_TESTIMONIAL') return 4
  if (format === 'PREMIUM' || format === 'BRAND_CINEMATIC') return 3
  if (format === 'OFFER' || format === 'OFFER_DRIVEN') return hasProduct ? 5 : 3
  return hasProduct ? 4 : 3
}

function planBeats(format: AdFormatType, product: string, description: string, hasProduct: boolean, affordanceEnvironment?: string): Beat[] {
  const count = beatCountFor(format, hasProduct)
  const weights = count === 3 ? [2.2, 3.4, 2.4] : count === 4 ? [1.5, 2.3, 2.4, 1.8] : [1.0, 1.5, 2.2, 2.0, 1.3]
  const purposes = count === 3 ? ['HOOK', 'PRODUCT_REVEAL', 'BRAND_CLOSE']
    : count === 4 ? ['HOOK', 'REVEAL', 'PRODUCT_PROOF', 'BRAND_CLOSE']
    : ['HOOK', 'REVEAL', 'PRODUCT_PROOF', 'OFFER_CONTEXT', 'BRAND_CLOSE']
  const envDesc = affordanceEnvironment || 'doğal çalışma ortamında'
  const visualByPurpose: Record<string, string> = {
    HOOK: hasProduct ? `@HeroProduct üzerinde gerçek malzeme ve form detayına hızlı odak; ortam: ${envDesc}.` : `Markanın gerçek ortamında (${envDesc}) dikkat çekici doğal açılış.`,
    REVEAL: hasProduct ? `Kamera geri çekilir; @HeroProduct bütünüyle ve referans görseldeki oranlarıyla ${envDesc} içinde görünür.` : `Hizmetin gerçek çalışma bağlamı (${envDesc}) görünür.`,
    PRODUCT_REVEAL: hasProduct ? `@HeroProduct, ${envDesc} içinde referans görseldeki gerçek görünümü korunarak gösterilir.` : `Markanın gerçek hizmet bağlamı (${envDesc}) görünür.`,
    PRODUCT_PROOF: description ? `${envDesc} içinde ${product}: ${description}` : `${envDesc} içinde @HeroProduct; yalnız görülebilen doğal kullanım adımı gösterilir.`,
    OFFER_CONTEXT: 'Yalnız doğrulanmış kampanya bilgisi varsa deterministic post-production katmanında gösterilecek temiz ürün kadrajı.',
    BRAND_CLOSE: `Akışın doğal devamında temiz kadraj (${envDesc}); logo ve CTA yalnız deterministic finishing katmanında.`,
  }
  let cursor = 0
  return weights.map((weight, index) => {
    const end = index === weights.length - 1 ? 8 : Math.round((cursor + weight) * 10) / 10
    const beat = { start: cursor, end, purpose: purposes[index], visual: visualByPurpose[purposes[index]] }
    cursor = end
    return beat
  })
}

function speechFor(beats: Beat[], brand: string, product: string, description: string): SpeechTimelineItem[] {
  const shortProduct = product.split(/\s+/).slice(0, 4).join(' ')
  const shortDescription = description.split(/\s+/).slice(0, 8).join(' ')
  const lines = [
    `${shortProduct} yakından inceleyin.`,
    'Gerçek formu ve detayları görün.',
    shortDescription ? `${shortProduct}: ${shortDescription}` : `${shortProduct} gerçek kullanım bağlamında gösteriliyor.`,
    'Kampanya ayrıntılarını inceleyin.',
    `${brand} ile detayları inceleyin.`,
  ]
  return beats.map((beat, index) => ({
    start_sec: beat.start,
    end_sec: beat.end,
    exact_text: lines[Math.min(index, lines.length - 1)],
    speaker: 'Spiker',
    delivery: 'Doğal, açık ve sakin Türkçe anlatım',
    corresponding_visual_beat: beat.purpose,
  }))
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
    if (!brandName || !productName) return NextResponse.json({ error: 'Marka ve ürün/hizmet adı zorunludur.' }, { status: 400 })

    const affordance = await resolveProductAffordance(brandName, productName, productDescription)
    const beats = planBeats(adFormat, productName, productDescription, hasProduct, affordance.naturalEnvironment)
    const speechTimeline = speechFor(beats, brandName, productName, productDescription)
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
    const creativeIdea = `${productName} için ${beats.length} beat’li ${adFormat} kısa reklam planı (${affordance.detectedSector})`
    const { data: revision, error } = await (supabase as any).from('creative_revisions').insert({
      org_id: org.id, status: 'DRAFT', creative_idea: creativeIdea, selected_ad_format: adFormat,
      speech_timeline: speechTimeline, veo_prompt: veoPrompt,
      campaign_facts: {
        brand_name: brandName,
        product_name: productName,
        product_description: productDescription || null,
        offer: body.offerDetails || null,
        detected_sector: affordance.detectedSector,
        natural_environment: affordance.naturalEnvironment,
      },
      asset_sha_set: [
        ...(body.logoUrl ? [{ role: 'logo', url: body.logoUrl }] : []),
        ...(body.productImageUrl ? [{ role: 'product', url: body.productImageUrl }] : []),
        ...((body.referenceUrls || []).map((url: string) => ({ role: 'reference', url }))),
      ],
    }).select('id').single()
    if (error) throw error
    return NextResponse.json({ revision_id: revision?.id || null, creative_idea: creativeIdea, visual_beats: beats, speech_timeline: speechTimeline, veo_prompt: veoPrompt })
  } catch (error: any) {
    console.error('[ai-media-draft] Error:', error)
    return NextResponse.json({ error: error?.message || 'Taslak oluşturulamadı.' }, { status: 500 })
  }
}
