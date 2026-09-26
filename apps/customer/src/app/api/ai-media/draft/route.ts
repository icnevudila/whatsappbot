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
  isBrick: boolean = false,
  isSprayer: boolean = false,
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
      `Sahnede insan figürü veya insan eli kesinlikle yer almaz; 35mm sinematik stüdyo/saha ışıklandırmasıyla ${product} ürününün geometrisine, dokusuna ve malzeme kalitesine odaklanan akıcı kamera çekimi; ${camera}.`,
      claim ? `Doğrulanmış tek ürün özelliğini gösteren net detay kadrajı: ${claim}.` : `Sahnede insan figürü yoktur; ürünün form detayları, yüzey işçiliği ve estetiği net biçimde sergilenir; ${product} referansına birebir sadık kalınır.`,
      commonClose,
    ],
    PRODUCT_USAGE: [
      isSprayer
        ? `Modern serada veya bahçede sırtında açık mavi ${product} taşıyan profesyonel bahçıvan doğal adımlarla ilerler; deponun üzerindeki "bofe" markası okunur; ${camera}.`
        : isBrick
          ? `Şantiye alanında baretli ve iş eldivenli bir inşaat ustası paletten ${product} bloğunu kavrar; tek eksenli dikey delik yapısı ve çizgili yan yüzeyi belirgindir; ${camera}.`
          : `${environment} içinde profesyonel bir kullanıcı ${product} ile doğal çalışma ortamında kadraja girer; ${camera}.`,
      isSprayer
        ? `Bahçıvan pirinç püskürtme borusunu tutarak bitkilerin üzerine homojen, ince su zerrecikleri püskürtür; gerçek insan elleri, anatomik beş parmak, akıcı ve doğal püskürtme hareketi.`
        : isBrick
          ? `Usta ${product} bloğunu düzgün örülmüş duvar sırasına titizlikle yerleştirir; sağlam klinker harç uyumu, gerçekçi insan elleri ve profesyonel işçilik hareketi.`
          : `Kullanıcı ürünü elinde tutarak tek doğal kullanım adımını gerçekleştirir; anatomik beş parmaklı gerçek eller, kusursuz geometri ve akıcı hareket.`,
      commonClose,
    ],
    PROBLEM_SOLUTION: [
      `Uydurma sonuç veya hasar göstermeden gerçek çalışma bağlamı kurulur: ${environment}.`,
      `Ürün, yalnız doğrulanmış özellikleriyle tek kullanım adımında gösterilir.`,
      commonClose,
    ],
    SOCIAL_UGC: [
      isSprayer
        ? `Doğal bahçe ortamında bir kullanıcı sırtındaki ${product} ile püskürtme yaparken memnuniyetle hafifçe kameraya döner; ${camera}.`
        : isBrick
          ? `Şantiyede usta veya mühendis ${product} bloğunu tutarak sağlamlığını ve hafifliğini gösterir; ${camera}.`
          : (hasPresenterReference ? 'Onaylı sunucu referansı doğal kadrajda ürünü tanıtır.' : 'Birinci şahıs bakışında doğal el kadrajı ürüne yaklaşır.'),
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
  // If the spoken line has 2 distinct sentences or clauses (separated by '.', ';', or ':')
  const parts = spokenLine
    .split(/[.;:]+/)
    .map((p) => p.trim())
    .filter(Boolean)

  if (parts.length >= 2) {
    return [
      {
        start_sec: 0.5,
        end_sec: 3.6,
        exact_text: `${parts[0]}.`,
        speaker: 'Spiker',
        delivery_style: 'Etkileyici ve dikkat çekici açılış kancası',
        corresponding_visual_beat: 'Açılış kancası ve ürün odaklanması',
      },
      {
        start_sec: 4.0,
        end_sec: 7.2,
        exact_text: `${parts.slice(1).join(' ')}.`,
        speaker: 'Spiker',
        delivery_style: 'Kararlı, kurumsal marka ve eylem kapanışı',
        corresponding_visual_beat: 'Marka imzası ve temiz ürün kapanışı',
      },
    ]
  }

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
    const isBrick = productName.toLowerCase().includes('tuğla') || productDescription.toLowerCase().includes('tuğla') || brandName.toLowerCase().includes('ayvazoğlu')
    const isSprayer = productName.toLowerCase().includes('pompa') || productName.toLowerCase().includes('bofe') || productDescription.toLowerCase().includes('ilaçlama')

    const beats = planBeats(
      adFormat,
      productName,
      verifiedClaims,
      body.environmentPreset === 'auto' ? affordance.naturalEnvironment : String(body.environmentPreset || affordance.naturalEnvironment),
      String(body.motionStyle || 'real_usage'),
      referenceAssets.some((asset: any) => asset?.role === 'presenter'),
      isBrick,
      isSprayer,
    )
    const revisionType = String(body.revisionType || 'refresh')
    const creativeNote = String(body.creativeNote || '').trim()

    let approvedSpokenLine = ''
    try {
      const toneMap: Record<string, string> = {
        sales: 'Doğrudan satış, fırsat ve kaçırılmayacak avantaj odaklı kanca (Hook)',
        short: '6-9 kelimelik akılda kalıcı, son derece vurucu slogan tarzı',
        corporate: 'Prestijli, seçkin, kurumsal güven ve mimari kalite hissettiren ton',
        refresh: 'Yenilikçi, dinamik ve dikkat çeken modern reklam tonu',
        usage: 'İşin ustasına hitap eden, sahada sağladığı kolaylığı ve sağlamlığı öne çıkaran ton',
      }
      const toneDesc = toneMap[revisionType] || 'Dinamik, profesyonel ve etkileyici'

      const systemPrompt = `Sen Türkiye'nin en seçkin reklam ajanslarında çalışan kreatif reklam yazarı ve yönetmenisin.
Görevin: Bir video reklam filmi (Instagram Reels / TikTok / Durum) için 8 ila 14 kelimelik (kesinlikle en fazla 15 kelime), akıcı, samimi veya karizmatik bir Türkçe seslendirme repliği yazmak.

ÇOK KATI KURALLAR:
1. "X kalitesiyle tanışın", "sağlam yapılar için yanınızda", "hemen sipariş verin" gibi sıkıcı, bayat, robotik kalıpları KESİNLİKLE KULLANMA.
2. "referansına sadık", "tasarıma sadık", "geometrisi", "veo", "yapay zeka", "prompt", "canary", "reklam filmi" gibi teknik veya meta ifadeleri ASLA KULLANMA.
3. Kullanıcının belirttiği Kampanya Notunu ve ürünün gerçek dünyadaki pratik faydasını merkeze al. Marka adını cümlenin başında veya sonunda doğal olarak zikret.
4. Metin en fazla 1 veya 2 kısa vurucu cümleden oluşsun (hedef: 8-13 kelime). Spiker 5 saniyede nefesi yeterek akıcı ve karizmatik okuyabilmelidir.
5. YALNIZCA konuşulacak Türkçe metni yaz. Tırnak, başlık, sahne açıklaması veya çeviri ASLA ekleme.`

      const userPrompt = `Marka: ${brandName}
Ürün: ${productName}
Ürün Açıklaması: ${productDescription || 'Belirtilmedi'}
Video Tarzı: ${adFormat}
Kreatif Yaklaşım: ${toneDesc}
Kullanıcının Kampanya Notu / Vurgulanacak Mesajı: ${creativeNote || 'Belirtilmedi; ürünün dayanıklılığı ve pratik faydası öne çıksın'}
Doğrulanmış Ürün Bilgisi: ${verifiedClaims.join(', ') || 'Yok'}
Varsa Kampanya / Fırsat: ${body.offerDetails || 'Yok'}
${revisionType === 'refresh' ? 'NOT: Önceki kalıplardan tamamen farklı, özgün, merak uyandıran veya doğrudan kazanca odaklanan yeni bir kanca kullan!' : ''}`

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

    let geometryLock = 'Preserve exact product geometry, materials, and colors from canonical reference without warping or deformation.'
    if (isBrick) {
      geometryLock = 'CRITICAL GEOMETRY LOCK FOR CLAY BRICK: The canonical terracotta brick has single-axis perforation ONLY. Hollow grid holes exist strictly and exclusively through the two opposite end faces along one single longitudinal axis. The top face, bottom face, and both long lateral side faces are 100% solid, ribbed terracotta clay with ZERO holes, ZERO cavities, and ZERO perforations. NEVER render holes on the top surface while front also has holes. When visible, canonical manufacturer brand mark from @BrandLogo is physically stamped into the clay body.'
    } else if (isSprayer) {
      geometryLock = 'CRITICAL GEOMETRY LOCK FOR BOFE SPRAYER: Preserve the authoritative light blue backpack sprayer tank geometry, solid tank body, black strap attachments, pressure gauge, brass lance wand, and the canonical "bofe" brand mark physically printed across the tank body. ZERO liquid leakage, ZERO warped plastic, and ZERO fabricated floating letters.'
    }

    const isHumanStyle = adFormat === 'PRODUCT_USAGE' || adFormat === 'SOCIAL_UGC'
    const formatNegatives = !isHumanStyle
      ? 'human, person, actor, model, hands, fingers, face, body'
      : 'extra fingers, missing fingers, deformed hands, fused fingers, distorted human anatomy, mutant limbs, duplicate head'

    const strictNegatives = [
      'floating text, text overlays, subtitles, captions, on-screen text, words on screen, burned-in typography, lower third graphics, synthetic titles, credits, floating interface, watermark, invented foreign brand names, gibberish lettering, duplicate product, warped geometry, melting, flicker, identity drift',
      formatNegatives,
      isBrick ? 'holes on side surfaces, perforations on multiple faces, side cavities, holes on top surface while front also has holes' : '',
      ...affordance.negativeEnvironmentConstraints,
    ].filter(Boolean).join(', ')

    const veoPrompt = [
      `[FORMAT]: 8.0-second vertical commercial video ad, 9:16 aspect ratio.`,
      `[SUBJECT]: Authentic photorealistic commercial for ${brandName} featuring ${productName}.`,
      `[CANONICAL HERO PRODUCT]: Preserve ${hasProduct ? '@HeroProduct' : 'approved service references only'} geometry, material texture, and colors exactly as shown in authoritative reference assets.`,
      `[CANONICAL BRAND IDENTITY ON PRODUCT]: When visible, maintain canonical brand identity from @BrandLogo in authentic colors and proportions physically printed, embossed, stamped, or labeled directly on the surface of @HeroProduct (in exact authentic proportions and colors, diegetic on product body). ZERO floating artificial graphics, ZERO fake foreign logos.`,
      `[ENVIRONMENT]: ${affordance.naturalEnvironment}.`,
      `[CINEMATIC TAKE & BEATS]: Single unbroken 35mm fluid camera take without jump cuts:`,
      ...beats.map((beat) => `${beat.start.toFixed(1)}-${beat.end.toFixed(1)}s (${beat.purpose}): ${beat.visual}`),
      `[PHYSICAL CONSISTENCY & GEOMETRY LOCK]: ${geometryLock} Product keeps identical physical identity across entire take.`,
      `[AUDIO]: Pure ambient environmental sound effects only (${isBrick ? 'construction foley, mortar clink, brick placement' : isSprayer ? 'subtle garden breeze, mist spray sound' : 'natural environmental foley'}). SILENT SCENE, ZERO ON-CAMERA SPEECH, ZERO ON-SCREEN SUBTITLES, ZERO ON-SCREEN CAPTIONS. (Official Turkish voiceover is applied in post-production).`,
      `[RAW DIFFUSION POLICY]: Clean commercial footage with zero floating text, zero synthetic overlays, zero burned-in titles. (Official brand logo and call to action are deterministically composited in post-production).`,
      `[NEGATIVE CONSTRAINTS]: ${strictNegatives}`,
    ].join('\n')

    const formatConceptTitles: Record<string, string> = {
      FAST_SALES: 'Sadece Ürün (Vitrin)',
      PRODUCT_USAGE: 'İnsanlı Tanıtım (Usta & Saha)',
      PROBLEM_SOLUTION: 'Çözüm ve Fayda Odaklı Tanıtım',
      PREMIUM: 'Kurumsal & Prestij',
      SOCIAL_UGC: 'Doğal Deneyim Tanıtımı',
      OFFER: 'Fırsat & Kampanya',
      OFFER_DRIVEN: 'Fırsat & Kampanya',
      AUTO: 'Sadece Ürün (Vitrin)',
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
