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

    // 1. Dynamic Creative Concept & Hook Synthesis based on format & revision
    let creativeIdea = `${brandName} ${productName} ticari tanıtım filmi`
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
        opening: 'Hızlı dolly-in ile çalışan mekanizmaya keskin odaklanma',
        demo: 'Gerçek operasyon hızında yüksek verim gösterimi',
        payoff: 'Zaman kazandıran sağlam ve dayanıklı yapı vurgusu',
        closing: 'Doğrudan sipariş ve iletişim çağrısı ile logo kilidi',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'İşinizde zaman kaybetmeye son!', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${productName} ile en zorlu koşullarda bile maksimum verim sizinle.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: offerDetails ? `${offerDetails} fırsatıyla hemen tanışın.` : 'Sağlam teknoloji, kesintisiz çalışma gücü.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `Detaylar için bize WhatsApp'tan ulaşın.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'PRODUCT_USAGE' || adFormat === 'PRODUCT_HERO') {
      creativeIdea = `${productName} tasarım detayları, malzeme kalitesi ve kullanım kolaylığı.`
      visualHooks = {
        opening: 'Düşük açılı sinematik kamera hareketi ve premium ışık süzülmesi',
        demo: 'Ergonomik kullanım ve fiziksel dayanıklılık testi',
        payoff: 'Sektör standardı kalite ve güven hissi',
        closing: 'Kurumsal logo ve web sitesi gösterimi',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Mükemmel işçilik, kusursuz detaylar.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${productName}, sahadaki en büyük yardımcınız olmak için üretildi.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: 'Yüksek kalite standartları ile projeleriniz güvende.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} güvencesiyle hemen keşfedin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'PROBLEM_SOLUTION') {
      creativeIdea = `Sahadaki zorlukları ortadan kaldıran pratik ve kesin çözüm: ${productName}.`
      visualHooks = {
        opening: 'Zorlu saha şartları ve yavaşlayan çalışma ritmi',
        demo: 'Ürünün devreye girmesiyle anında hızlanan akış',
        payoff: 'Kusursuz sonuç ve operatör memnuniyeti',
        closing: 'Çözüm ortağınız kurumsal marka kapanışı',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Zorlu iş temposu sizi yavaşlatmasın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${productName}, işinizi kolaylaştırır ve veriminizi katlar.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: 'Zamandan ve maliyetten tasarruf edin.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} ile kazancınızı artırın.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'PREMIUM' || adFormat === 'BRAND_CINEMATIC' || revisionType === 'corporate') {
      creativeIdea = `${brandName} kurumsal prestij, mühendislik gücü ve güven vizyonu.`
      visualHooks = {
        opening: 'Geniş açı altın saat gün ışığı ve prestijli mimari/endüstriyel doku',
        demo: 'Ürünün titizlikle monte edilişi ve kusursuz yüzey kalitesi',
        payoff: 'Geleceğe güvenle bakan sektör liderliği',
        closing: 'Net kurumsal amblem ve resmi web sitesi kilidi',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Geleceğin standartlarını inşa ediyoruz.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `Yüksek mühendislik ve uzman işçilik ${productName} ile hayat buluyor.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: 'Sektörde güven ve sürekliliğin simgesi.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName}, kurumsal çözüm ortağınız.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'SOCIAL_UGC' || adFormat === 'UGC_TESTIMONIAL') {
      creativeIdea = `${productName} kullanıcı deneyimi ve sahada samimi tavsiye.`
      visualHooks = {
        opening: 'Doğal açıda doğrudan kameraya seslenen kullanıcı deneyimi',
        demo: 'Ürünün bizzat denenmesi ve anlık rahatlama tepkisi',
        payoff: 'Gönül rahatlığıyla tavsiye edilen sağlam kullanım',
        closing: 'Resmi kanal üzerinden sipariş verme çağrısı',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Bunu denemeden karar vermeyin!', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${productName} aldığım günden beri işler çok daha hızlı ilerliyor.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: 'Hem pratik hem inanılmaz dayanıklı, kesinlikle tavsiye ediyorum.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} güvencesiyle siz de sipariş verin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (adFormat === 'OFFER' || adFormat === 'OFFER_DRIVEN') {
      creativeIdea = `${brandName} ${productName} sınırlı süreli özel fırsat duyurusu.`
      visualHooks = {
        opening: 'Dinamik kampanya açılışı ve doğrudan ürün odaklı giriş',
        demo: 'Fiyat/performans avantajını kanıtlayan aktif operasyon',
        payoff: 'Kaçırılmayacak kampanya ve sınırlı stok vurgusu',
        closing: 'Hemen sipariş ver butonu ve kurumsal iletişim',
      }
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Kaçırılmayacak kampanya başladı!', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `${productName} şimdi sezonun en avantajlı koşullarıyla.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: offerDetails ? `${offerDetails} avantajını hemen yakalayın.` : 'Sınırlı süre geçerli özel fiyat fırsatı.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} güvencesiyle hemen siparişinizi verin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else if (revisionType === 'short') {
      speechTimeline = [
        { start_sec: 0.0, end_sec: 2.0, exact_text: `${brandName} kalitesi sahada.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 2.0, end_sec: 5.0, exact_text: `${productName} güçlü ve dayanıklı.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 5.0, end_sec: 8.0, exact_text: 'Detaylar için bize yazın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
      ]
    } else {
      // AUTO / Default
      speechTimeline = [
        { start_sec: 0.0, end_sec: 1.8, exact_text: 'Zorlu koşullara meydan okuyan teknoloji.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.opening },
        { start_sec: 1.8, end_sec: 4.2, exact_text: `Yüksek verim ve kesintisiz güç ${productName} ile elinizin altında.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.demo },
        { start_sec: 4.2, end_sec: 6.5, exact_text: offerDetails ? `${offerDetails} avantajıyla tanışın.` : 'Zamandan kazanın, projelerinizi güvenle tamamlayın.', speaker: 'Spiker', corresponding_visual_beat: visualHooks.payoff },
        { start_sec: 6.5, end_sec: 8.0, exact_text: `${brandName} güvencesiyle hemen iletişime geçin.`, speaker: 'Spiker', corresponding_visual_beat: visualHooks.closing },
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
      `[Negative Constraints]: no distorted branding, no cartoon textures, no blurry typography, no CGI artifact.`,
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
