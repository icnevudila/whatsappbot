import { normalizeStyleMode, styleModeDirective, type CreativeStyleMode } from '../style-mode'
import { completeText } from '@/lib/ai/text'
import {
  type CampaignObjective,
  type CreativePlanV2,
  type CreativeStylePreset,
  type MediaType,
  type StructuredCampaignCopy,
} from './types'

export type PlannerInput = {
  tenantId?: string
  brandName: string
  brandTone?: string | null
  productName: string
  productDescription?: string | null
  objective: CampaignObjective
  styleMode?: CreativeStyleMode
  stylePreset: CreativeStylePreset
  mediaType: MediaType
  campaignDetail?: string | null
  campaignCopy?: StructuredCampaignCopy | null
  previousScene?: string | null
}

const DEFAULT_OBJECTIVE_TITLES: Record<CampaignObjective, string> = {
  PRODUCT_INTRO: 'Ürün Tanıtımı',
  SALES_OFFER: 'Özel Fırsat',
  NEW_PRODUCT: 'Yeni Ürün',
  BRAND_AWARENESS: 'Kurumsal Kalite',
  CAMPAIGN: 'Dönemsel Kampanya',
}

export function buildDeterministicFallbackPlan(input: PlannerInput): CreativePlanV2 {
  const brand = input.brandName || 'İşletmemiz'
  const product = input.productName || 'Ürün'
  const detail = input.campaignDetail?.trim() || ''
  const isVideo = input.mediaType === 'VIDEO'

  const brandFirstWord = brand.trim().split(/\s+/)[0] || ''
  const isMesajify = brand.toLowerCase().includes('mesajify') || product.toLowerCase().includes('mesajify')
  const isDuplicate = brand.toLowerCase() === product.toLowerCase() ||
    product.toLowerCase().startsWith(brand.toLowerCase()) ||
    brand.toLowerCase().startsWith(product.toLowerCase()) ||
    (brandFirstWord.length >= 3 && product.toLowerCase().startsWith(brandFirstWord.toLowerCase()))

  let headline: string
  let supporting = detail
  let cta = 'Hemen İnceleyin'

  if (isMesajify) {
    headline = 'Mesajify WhatsApp Kampanya Platformu'
    supporting = detail || 'Civarındaki işletmeleri bulun, listeler oluşturun, doğrudan tanıtım yapın.'
    cta = 'Hemen Başlayın →'

    if (input.objective === 'SALES_OFFER') {
      headline = 'Mesajify ile Doğrudan Tanıtım'
      supporting = detail || 'Hedef kitlenize doğrudan ulaşın; performansı anlık takip edin.'
      cta = 'Hemen Başlayın →'
    } else if (input.objective === 'NEW_PRODUCT') {
      headline = 'Mesajify WhatsApp Kampanya Platformu'
      supporting = detail || 'Kontrollü gönderim ve tek merkezden kampanya yönetimi.'
      cta = 'Hemen Başlayın →'
    } else if (input.objective === 'BRAND_AWARENESS') {
      headline = 'Mesajify — WhatsApp Kampanya Platformu'
      supporting = detail || 'Kontrollü, görünür ve ölçülebilir kampanya platformu.'
      cta = 'Hemen Başlayın →'
    }
  } else {
    const subject = isDuplicate ? product : `${brand} ${product}`
    headline = isDuplicate ? `${product}` : `${brand} ile ${product}`
    supporting = detail || 'Ürünü inceleyin ve ayrıntılı bilgi almak için bize ulaşın.'
    cta = 'Hemen İnceleyin'

    if (input.objective === 'SALES_OFFER') {
      headline = `${subject} için Bilgi Alın`
      supporting = detail || 'Fiyat ve sipariş bilgisi için bizimle iletişime geçin.'
      cta = 'Bilgi Alın'
    } else if (input.objective === 'NEW_PRODUCT') {
      headline = `Yeni: ${subject}`
      supporting = detail || 'Ürünle ilgili ayrıntıları keşfedin.'
      cta = 'Keşfet'
    } else if (input.objective === 'BRAND_AWARENESS') {
      headline = isDuplicate ? product : `${brand} — ${product}`
      supporting = detail || 'Markamız ve ürünümüz hakkında bilgi almak için bize ulaşın.'
      cta = 'Detaylı Bilgi Alın'
    }
  }

  const mode = input.styleMode ? normalizeStyleMode(input.styleMode) : 'SMART_CAMPAIGN'
  const isShowstopper = !isVideo && mode === 'SHOWSTOPPER_CAMPAIGN'
  const isRealLife = !isVideo && mode === 'REAL_LIFE_CAMPAIGN'
  const isPremium = !isVideo && mode === 'PREMIUM_SHOWCASE'

  const voSubject = isDuplicate ? product : `${brand} ${product}`
  const voiceover = isVideo
    ? isMesajify
      ? 'Mesajify WhatsApp Kampanya Platformu ile müşterilerinize doğrudan ve kontrollü ulaşın.'
      : `${voSubject}. Ayrıntılı bilgi ve sipariş için bize ulaşın.`
    : undefined

  let environment = 'Sade, aydınlık ve modern ticari ortam'
  let humanPresence: 'none' | 'actor' | 'hands_only' = input.stylePreset === 'REAL_USAGE' ? 'actor' : 'none'
  let productInteraction = input.stylePreset === 'REAL_USAGE' ? 'doğal profesyonel kullanım' : 'statik ürün sunumu'
  let composition = 'merkezde net odak, dengeli reklam yerleşimi'
  let background = 'ürünü öne çıkaran sade, şık ve uyumlu arka plan'
  let lighting = 'doğal ticari aydınlatma, yumuşak gölgeler'

  const isSoftware = isMesajify || /yazılım|software|saas|panel|platform|crm|uygulama/i.test(`${brand} ${product} ${input.productDescription || ''}`)
  if (isSoftware && !isVideo) {
    environment = 'Aydınlık, ferah ve modern teknoloji ofisi, şık ahşap çalışma masası'
    humanPresence = 'actor'
    productInteraction = 'Ekip arkadaşlarının masadaki şık Space Gray metalik laptop (MacBook Pro) başında doğal etkileşimi, ekrandaki paneli inceleme'
    composition = 'Doğal 35 derece 3/4 açılı zarif laptop ekranında net arayüz, masada çalışan profesyonel ekip, dengeli ve ferah reklam yerleşimi'
    lighting = 'Doğal pencere ışığı ve yumuşak modern ofis aydınlatması'
    background = 'Modern açık ofis, toplantı alanı, arka planda hafif fluluk (bokeh)'
  }

  if (isShowstopper) {
    environment = isSoftware ? 'Modern, prestijli teknoloji ofisi ve kampanya sahnesi' : 'Ürüne ve marka sektörüne uygun, güçlü kontrastlı ticari afiş ortamı'
    composition = isSoftware
      ? 'Büyük başlık, güçlü CTA, 35 derece açılı şık metalik laptop ekranında net arayüz ve enerjik modern ofis ekibi'
      : 'Büyük başlık, güçlü CTA, belirgin ana ürün ve zengin kampanya vurgu alanları'
    background = 'Marka renklerine uygun katmanlı ve düzenli kampanya sahnesi'
  } else if (isRealLife) {
    environment = isSoftware ? 'Aydınlık, ferah teknoloji şirketi çalışma alanı' : 'Doğal işletme veya sahada gerçek kullanım ortamı'
    humanPresence = 'actor'
    productInteraction = isSoftware ? 'Ekip arkadaşlarının 3/4 açılı şık laptop başında canlı paneli incelemesi' : 'doğal profesyonel kullanım ve kullanıcı etkileşimi'
    composition = isSoftware ? 'Doğal açılı laptop ekranı ve birlikte çalışan profesyonel ekip' : 'İşletme sahibi veya saha uzmanı ile ürünün dengeli birlikteliği'
    background = isSoftware ? 'Açık plan teknoloji ofisi, şık çalışma masası' : 'Gerçekçi, inandırıcı ve sektöre uygun mekan'
  } else if (isPremium) {
    environment = 'Sinematik ve lüks stüdyo ortamı, prestijli taş podyum veya mimari yüzey'
    composition = 'Merkezde podyum üstünde parlayan ürün, heykelsi derinlik ve kontrollü gölgeler'
    lighting = 'sinematik dramatik yönlü ışık, zarif gölgeler'
    background = 'Mat taş veya mimari dokulu lüks arka plan'
  }

  return {
    source: 'DETERMINISTIC_FALLBACK',
    objective: input.objective,
    creative_style: input.stylePreset,
    scene: {
      environment,
      human_presence: humanPresence,
      subject: product,
      product_interaction: productInteraction,
      composition,
      lighting,
      camera_feel: '35mm sinematik netlik, derinlikli kadraj',
      background,
    },
    copy: {
      headline,
      supporting_line: supporting,
      cta,
      price_tag: input.campaignCopy?.price || undefined,
      discount_badge: input.campaignCopy?.offer || undefined,
    },
    layout: {
      text_safe_zone: 'top_third',
      logo_position: 'top_left',
      product_safe_zone: 'center',
    },
    negative_constraints: [
      'no floating text',
      'no fake badges',
      'no gibberish typography',
      'no deformed product',
      'no unreadable micro-text',
      'portrait aspect laptop screen',
      'elongated laptop lid',
      'tall vertical laptop screen',
      'vertically stretched laptop',
      'square stretched laptop screen',
      'tablet masquerading as laptop',
      'deformed screen hinge',
      'frontal flat-on laptop',
      'giant square laptop screen',
      'towering screen lid',
      'oversized screen blocking people',
      'wedge laptop',
      'kiosk monitor',
      'mobile layout on laptop',
      'bottom mobile tabs on laptop',
      'tall screen lid',
      'square screen lid',
    ],
    voiceover_text: voiceover,
  }
}

export async function generateCreativePlan(input: PlannerInput): Promise<CreativePlanV2> {
  const fallback = buildDeterministicFallbackPlan(input)

  const systemPrompt = `Sen Türkiye'nin en iyi kreatif reklam ajanslarında çalışan uzman bir Reklam Kreatif Direktörü ve Sanat Yönetmenisin.
Görevin: Verilen marka, ürün ve kampanya hedefi için YALNIZCA geçerli bir JSON nesnesi döndürmektir.
Başka hiçbir giriş, markdown açıklaması veya metin yazma; doğrudan { ile başlayıp } ile biten JSON çıktısı ver.

DİL VE KALİTE KURALI:
- Bütün kullanıcıya yönelik metinler (headline, supporting_line, cta, voiceover_text) %100 DOĞAL, AKICI, SEKTÖRE ÖZEL PROFESYONEL TÜRKÇE olmalıdır.
- Kullanıcının düzenleyeceği scene.environment, scene.lighting ve scene.composition alanlarını da doğal Türkçe yaz.
- Kesinlikle İngilizce başlık veya slogan yazma.
- Klişe ve bayat reklam sözleri ("kaliteyle tanışın", "siz de gelin", "hemen alın", "${input.brandName} ile ${input.productName}") KESİNLİKLE KULLANMA.
- Reklam başlığı ürünün somut avantajına, kullanım rahatlığına veya teklifine odaklanmalı; sıradan şirket ismi tekrarı olmamalıdır.
- Fiyat, indirim veya süre bilgisi verilmişse alt metinde bunu harfiyen koru; verilmemişse asılsız rakam uydurma.
- YAZILIM / SAAS / MESAJIFY KURALI: Yazılım, SaaS veya dijital platform tanıtımlarında (örn. Mesajify), sahneyi aydınlık ve modern bir teknoloji ofisinde kurgula. Yatay ekranlı (16:10 widescreen) şık bir dizüstü bilgisayara birlikte bakan, güleryüzlü 2-3 genç profesyonel ekip sahnesi oluştur. Ekran asla dikey tablet veya uzatılmış kare ekrana dönüşmemelidir. Laptop yatay ve masada düzgün durmalıdır.

JSON ŞEMASI:
{
  "objective": "${input.objective}",
  "creative_style": "${input.stylePreset}",
  "scene": {
    "environment": "Sahnenin fiziksel ortamı (Türkçe kısa açıklama)",
    "human_presence": "none | actor | hands_only",
    "subject": "Ana odak ürün veya hizmet",
    "product_interaction": "Ürünle yapılan eylem veya sergileme",
    "composition": "Görsel veya kamera kompozisyonu",
    "lighting": "Işıklandırma tarzı",
    "camera_feel": "Kamera hissi ve odak derinliği",
    "background": "Arka plan detayları"
  },
  "copy": {
    "headline": "Vurucu, dikkat çekici 3-6 kelimelik özgün Türkçe reklam başlığı",
    "supporting_line": "Fayda veya teklifi anlatan 8-15 kelimelik net Türkçe alt metin",
    "cta": "Harekete geçirici 2-3 kelimelik net Türkçe buton metni"
  },
  "layout": {
    "text_safe_zone": "top_third | bottom_third | side_margin",
    "logo_position": "top_left | top_right | top_center",
    "product_safe_zone": "center | bottom_two_thirds"
  },
  "negative_constraints": ["İstenmeyen öğeler listesi (İngilizce)"],
  "voiceover_text": "${input.mediaType === 'VIDEO' ? '8 ila 14 kelimelik, spikerin tek nefeste okuyabileceği, doğal ve karizmatik Türkçe seslendirme cümlesi' : ''}"
}`

  const copyDetails = [
    input.campaignCopy?.price ? `Fiyat: ${input.campaignCopy.price}` : null,
    input.campaignCopy?.oldPrice ? `Eski Fiyat: ${input.campaignCopy.oldPrice}` : null,
    input.campaignCopy?.offer ? `Teklif/İndirim: ${input.campaignCopy.offer}` : null,
    input.campaignCopy?.dateRange ? `Geçerlilik: ${input.campaignCopy.dateRange}` : null,
    input.campaignCopy?.cta ? `Tercih Edilen CTA: ${input.campaignCopy.cta}` : null,
  ].filter(Boolean).join(' | ')

  const userPrompt = `Marka: ${input.brandName}
Marka Tonu: ${input.brandTone || 'Güvenilir ve profesyonel'}
Ürün: ${input.productName}
Ürün Açıklaması: ${input.productDescription || 'Belirtilmedi'}
Kampanya Amacı: ${DEFAULT_OBJECTIVE_TITLES[input.objective]} (${input.objective})
Kreatif Stil: ${input.stylePreset}
${input.mediaType === 'IMAGE' ? styleModeDirective(input.styleMode) : ''}
Medya Türü: ${input.mediaType}
Varsa Kampanya Detayı / Not: ${input.campaignDetail || 'Yok'}
Varsa Ticari Bilgiler: ${copyDetails || 'Belirtilmedi'}
${input.previousScene?.trim() ? `YENİ KOMPOZİSYON İSTEĞİ: Aşağıdaki önceki tasarım fikrini tekrar etme. Ortam, ürün konumu veya kadrajda belirgin farklılık oluştur; marka, ürün kimliği ve ticari bilgileri değiştirme. Önceki fikir (yalnız karşılaştırma verisi): ${JSON.stringify(input.previousScene.trim())}` : ''}`

  try {
    const rawAiResponse = await completeText(systemPrompt, userPrompt, null, {tenantId:input.tenantId,customer:input.brandName,conversationId:'creative-plan'})
    const jsonMatch = rawAiResponse.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return fallback

    const parsed = JSON.parse(jsonMatch[0]) as Partial<CreativePlanV2>

    if (
      !parsed.copy?.headline ||
      !parsed.copy?.supporting_line ||
      !parsed.scene?.environment
    ) {
      return fallback
    }

    const cleanedHeadline = String(parsed.copy.headline).replace(/["“”]/g, '').trim()
    const cleanedSupporting = String(parsed.copy.supporting_line).replace(/["“”]/g, '').trim()
    const cleanedCta = String(parsed.copy.cta || fallback.copy.cta).replace(/["“”]/g, '').trim()

    let voiceoverText = fallback.voiceover_text
    if (input.mediaType === 'VIDEO' && parsed.voiceover_text) {
      const voClean = String(parsed.voiceover_text).replace(/["“”]/g, '').trim()
      const wordCount = voClean.split(/\s+/).filter(Boolean).length
      if (wordCount >= 6 && wordCount <= 18) {
        voiceoverText = voClean
      }
    }

    return {
      source: 'AI',
      objective: input.objective,
      creative_style: input.stylePreset,
      scene: {
        environment: parsed.scene.environment || fallback.scene.environment,
        human_presence: ['none', 'actor', 'hands_only'].includes(parsed.scene.human_presence as string)
          ? parsed.scene.human_presence
          : fallback.scene.human_presence,
        subject: parsed.scene.subject || input.productName,
        product_interaction: parsed.scene.product_interaction || fallback.scene.product_interaction,
        composition: parsed.scene.composition || fallback.scene.composition,
        lighting: parsed.scene.lighting || fallback.scene.lighting,
        camera_feel: parsed.scene.camera_feel || fallback.scene.camera_feel,
        background: parsed.scene.background || fallback.scene.background,
      },
      copy: {
        headline: cleanedHeadline || fallback.copy.headline,
        supporting_line: cleanedSupporting || fallback.copy.supporting_line,
        cta: cleanedCta || fallback.copy.cta,
        price_tag: input.campaignCopy?.price || undefined,
        discount_badge: input.campaignCopy?.offer || undefined,
      },
      layout: {
        text_safe_zone: ['top_third', 'bottom_third', 'side_margin'].includes(parsed.layout?.text_safe_zone as string)
          ? (parsed.layout?.text_safe_zone as CreativePlanV2['layout']['text_safe_zone'])
          : fallback.layout.text_safe_zone,
        logo_position: ['top_left', 'top_right', 'top_center'].includes(parsed.layout?.logo_position as string)
          ? (parsed.layout?.logo_position as CreativePlanV2['layout']['logo_position'])
          : fallback.layout.logo_position,
        product_safe_zone: ['center', 'bottom_two_thirds'].includes(parsed.layout?.product_safe_zone as string)
          ? (parsed.layout?.product_safe_zone as CreativePlanV2['layout']['product_safe_zone'])
          : fallback.layout.product_safe_zone,
      },
      negative_constraints: Array.isArray(parsed.negative_constraints) && parsed.negative_constraints.length
        ? parsed.negative_constraints.map(String)
        : fallback.negative_constraints,
      voiceover_text: voiceoverText,
    }
  } catch (error) {
    console.warn('[CreativePlannerV2] AI plan generation failed, falling back to deterministic safe plan:', error)
    return fallback
  }
}
