import { NextRequest, NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import type { SpeechTimelineItem, AdFormatType } from '@/app/(panel)/icerik/wizard-types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/ai-media/draft
 * Creative Director AI Draft Generator:
 * Generates structured 0-8s continuous Turkish audio/speech timeline and cinematic Veo prompt
 * based on selected product, brand, format router, and revision style.
 * Persists the draft revision in creative_revisions (status: DRAFT).
 */
export async function POST(req: NextRequest) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const body = await req.json()

    const {
      brandName = org.name || 'İşletmemiz',
      productName = 'Ürünümüz',
      productDescription = '',
      adFormat = 'AUTO' as AdFormatType,
      revisionType = 'refresh',
      offerDetails = '',
      creativeNote = '',
      logoUrl = '',
      productImageUrl = '',
      referenceUrls = [],
    } = body

    // Helper for fluent, non-cluttered voiceover product naming
    const spokenName = (() => {
      if (!productName) return 'Ürünümüz'
      const words = productName.trim().split(/\s+/)
      return words.length > 4 ? words.slice(0, 4).join(' ') : productName.trim()
    })()

    // 1. Dynamic Creative Concept & Hook Synthesis based on format & revision
    let creativeIdea = `${brandName} ${spokenName} ticari tanıtım filmi`
    let visualHooks = {
      opening: 'Ürünün belirgin detaylarıyla dinamik makro açılışı',
      demo: 'Çalışma ortamında yüksek performans ve işlev gösterimi',
      payoff: 'Kullanım kolaylığı, sağlamlık ve verimlilik vurgusu',
      closing: 'Kurumsal logo kilidi ve harekete geçirici çağrı (CTA)',
    }

    let speechTimeline: SpeechTimelineItem[] = []

    if (adFormat === 'FAST_SALES' || adFormat === 'PERFORMANCE_DEMO' || revisionType === 'sales') {
      creativeIdea = `${brandName} ile yüksek tempolu, fayda ve verim odaklı hızlı tanıtım.`
      visualHooks = {
        opening: 'Hızlı kamera hareketi ile ürüne keskin odaklanma',
        demo: 'Gerçek kullanım ortamında yüksek verim gösterimi',
        payoff: 'Zaman kazandıran sağlam ve dayanıklı yapı vurgusu',
        closing: 'Doğrudan sipariş ve iletişim çağrısı ile logo kapanışı',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'İşlerinizde zaman kaybetmeye son!', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${spokenName} ile sahada maksimum güç ve kesintisiz performans sizinle.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: offerDetails ? `${offerDetails} avantajını hemen yakalayın.` : 'Üstün dayanıklılık ve yüksek çalışma verimi bir arada.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} ile hemen iletişime geçin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'PRODUCT_USAGE' || adFormat === 'PRODUCT_HERO') {
      creativeIdea = `${spokenName} tasarım detayları, malzeme kalitesi ve kullanım kolaylığı.`
      visualHooks = {
        opening: 'Sinematik kamera hareketi ve detay aydınlatması',
        demo: 'Ergonomik kullanım ve fiziksel dayanıklılık',
        payoff: 'Kalite ve güven hissi',
        closing: 'Kurumsal logo ve iletişim bilgisi',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Kaliteyi ve ergonomiyi bir arada yaşayın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `Tüm detaylarıyla ${spokenName}, işinizdeki en büyük yardımcınız.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: 'Kolay kullanım ve sağlam yapısıyla uzun yıllar yanınızda.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} güvencesiyle hemen keşfedin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'PROBLEM_SOLUTION') {
      creativeIdea = `Sahadaki zorlukları ortadan kaldıran pratik çözüm: ${spokenName}.`
      visualHooks = {
        opening: 'Zorlu çalışma şartları ve yavaşlayan tempo',
        demo: 'Ürünün devreye girmesiyle hızlanan çalışma akışı',
        payoff: 'Kolaylık ve yüksek verim',
        closing: 'Kurumsal logo ve marka kapanışı',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Zorlu iş temposu sizi yavaşlatmasın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${spokenName} ile işinizi hızlandırın, zamandan tasarruf edin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: 'Yüksek verim ve dayanıklı gövdesiyle her an hazır.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} ile her zaman bir adım önde olun.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'PREMIUM' || adFormat === 'BRAND_CINEMATIC' || revisionType === 'corporate') {
      creativeIdea = `${brandName} kurumsal prestij, mühendislik gücü ve güven vizyonu.`
      visualHooks = {
        opening: 'Geniş açı altın saat ışığı ve prestijli kurumsal doku',
        demo: 'Ürünün kusursuz yüzey kalitesi ve detayları',
        payoff: 'Sektör standardı güvenilirlik',
        closing: 'Kurumsal marka amblemi ve kapanış',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Geleceğin teknolojisini bugünden yakalayın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `Yüksek mühendislik ve kusursuz işçilik, ${spokenName} ile buluştu.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: 'Sektörde güvenin ve kalitenin simgesi.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName}, kurumsal çözüm ortağınız.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'SOCIAL_UGC' || adFormat === 'UGC_TESTIMONIAL') {
      creativeIdea = `${spokenName} kullanıcı deneyimi ve sahada samimi tavsiye.`
      visualHooks = {
        opening: 'Doğal açıda doğrudan ürünü gösteren kullanıcı girişi',
        demo: 'Ürünün bizzat denenmesi ve memnuniyet tepkisi',
        payoff: 'Gönül rahatlığıyla tavsiye edilen sağlam kullanım',
        closing: 'Sipariş ve bilgi için iletişim çağrısı',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Bu ürünü denemeden karar vermeyin!', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${spokenName} aldığımızdan beri işlerimiz çok daha hızlı ilerliyor.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: 'Hem kullanımı çok kolay hem de inanılmaz dayanıklı.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} kalitesiyle siz de hemen deneyin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'OFFER' || adFormat === 'OFFER_DRIVEN') {
      creativeIdea = `${brandName} ${spokenName} sınırlı süreli özel fırsat duyurusu.`
      visualHooks = {
        opening: 'Dinamik kampanya açılışı ve doğrudan ürün girişi',
        demo: 'Fiyat ve performans avantajını kanıtlayan operasyon',
        payoff: 'Kaçırılmayacak kampanya ve sınırlı fırsat vurgusu',
        closing: 'Hemen sipariş ver butonu ve kurumsal iletişim',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Büyük kampanya fırsatı başladı!', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${spokenName}, şimdi çok özel fiyatıyla sizleri bekliyor.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: offerDetails ? `${offerDetails} avantajını hemen yakalayın.` : 'Sınırlı süre geçerli bu özel teklifi kaçırmayın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} güvencesiyle hemen sipariş verin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (revisionType === 'short') {
      speechTimeline = [
        { start_sec: 0.0, end_sec: 2.0, exact_text: `${brandName} kalitesi sahada.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 2.0, end_sec: 5.0, exact_text: `${spokenName} ile güçlü ve kesintisiz performans.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 5.0, end_sec: 8.0, exact_text: 'Detaylar ve sipariş için bize ulaşın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else {
      // AUTO / Default
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Zorlu işlerde yüksek performans zamanı.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${spokenName} ile sahada maksimum verim ve güvenilirlik.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: offerDetails ? `${offerDetails} fırsatıyla.` : 'Zamandan kazanın, projelerinizi güvenle tamamlayın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} kalitesiyle hemen iletişime geçin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    }

    // 2. Veo Deterministic Prompt Generation
    const promptLines = [
      `Photorealistic 9:16 vertical commercial television ad for ${brandName}.`,
      `[Subject Focus]: @HeroProduct in an authentic operational commercial setting.`,
      `[Cinematography]: 35mm lens, smooth forward dolly, commercial rim lighting, shallow depth of field.`,
      creativeNote ? `[Director Note]: ${creativeNote}` : '',
      `[Visual Beats]:`,
      `0.0-1.8s: ${speechTimeline[0]?.corresponding_visual_beat || visualHooks.opening}`,
      `1.8-4.2s: ${speechTimeline[1]?.corresponding_visual_beat || visualHooks.demo}`,
      `4.2-6.5s: ${speechTimeline[2]?.corresponding_visual_beat || visualHooks.payoff}`,
      `6.5-8.0s: Hero lock framing with @BrandLogo placement.`,
      ``,
      `[AUDIO TIMELINE]`,
      `Spoken language: Turkish (tr-TR).`,
      ...speechTimeline.map((s) => `${s.start_sec.toFixed(1)}-${s.end_sec.toFixed(1)}s: "${s.exact_text}"`),
      ``,
      `Speak the approved Turkish lines in the exact order. Do not translate. Do not paraphrase. Do not add dialogue.`,
      `[Negative Constraints]: strictly no on-screen text, no typography, no words, no letters, no subtitles, no captions, no watermark, no lower thirds, no distorted branding, no cartoon textures, no blurry typography, no CGI artifact.`,
    ].filter(Boolean)

    const veoPrompt = promptLines.join('\n')

    // 3. Persist Draft in creative_revisions
    const { data: revRow, error: revError } = await (supabase as any)
      .from('creative_revisions')
      .insert({
        org_id: org.id,
        status: 'DRAFT',
        creative_idea: creativeIdea,
        selected_ad_format: adFormat,
        speech_timeline: speechTimeline,
        veo_prompt: veoPrompt,
        campaign_facts: {
          brand_name: brandName,
          product_name: productName,
          product_description: productDescription,
          offer: offerDetails || null,
          note: creativeNote || null,
        },
        asset_sha_set: [
          ...(logoUrl ? [{ role: 'logo', url: logoUrl }] : []),
          ...(productImageUrl ? [{ role: 'product', url: productImageUrl }] : []),
          ...referenceUrls.map((u: string) => ({ role: 'reference', url: u })),
        ],
      })
      .select('id')
      .single()

    return NextResponse.json({
      revision_id: revRow?.id || null,
      creative_idea: creativeIdea,
      speech_timeline: speechTimeline,
      veo_prompt: veoPrompt,
    })
  } catch (err: any) {
    console.error('[ai-media-draft] Error:', err)
    return NextResponse.json({ error: err?.message || 'Taslak oluşturulamadı.' }, { status: 500 })
  }
}
