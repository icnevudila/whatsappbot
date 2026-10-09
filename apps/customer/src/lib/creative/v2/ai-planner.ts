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
  stylePreset: CreativeStylePreset
  mediaType: MediaType
  campaignDetail?: string | null
  campaignCopy?: StructuredCampaignCopy | null
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

  let headline = `${brand} ile ${product}`
  let supporting = detail || 'Ürünü inceleyin ve ayrıntılı bilgi almak için bize ulaşın.'
  let cta = 'Hemen İnceleyin'

  if (input.objective === 'SALES_OFFER') {
    headline = `${product} için Bilgi Alın`
    supporting = detail || 'Fiyat ve sipariş bilgisi için bizimle iletişime geçin.'
    cta = 'Bilgi Alın'
  } else if (input.objective === 'NEW_PRODUCT') {
    headline = `Yeni: ${product}`
    supporting = detail || 'Ürünle ilgili ayrıntıları keşfedin.'
    cta = 'Keşfet'
  } else if (input.objective === 'BRAND_AWARENESS') {
    headline = `${brand} — ${product}`
    supporting = detail || 'Markamız ve ürünümüz hakkında bilgi almak için bize ulaşın.'
    cta = 'Detaylı Bilgi Alın'
  }

  const voiceover = isVideo
    ? `${brand} ${product}. Ayrıntılı bilgi almak için bize ulaşın.`
    : undefined

  return {
    source: 'DETERMINISTIC_FALLBACK',
    objective: input.objective,
    creative_style: input.stylePreset,
    scene: {
      environment: 'Sade, aydınlık ve modern ticari ortam',
      human_presence: input.stylePreset === 'REAL_USAGE' ? 'actor' : 'none',
      subject: product,
      product_interaction: input.stylePreset === 'REAL_USAGE' ? 'doğal profesyonel kullanım' : 'statik ürün sunumu',
      composition: 'merkezde net odak, dengeli reklam yerleşimi',
      lighting: 'doğal ticari aydınlatma, yumuşak gölgeler',
      camera_feel: '35mm sinematik netlik, derinlikli kadraj',
      background: 'ürünü öne çıkaran sade, şık ve uyumlu arka plan',
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
    ],
    voiceover_text: voiceover,
  }
}

export async function generateCreativePlan(input: PlannerInput): Promise<CreativePlanV2> {
  const fallback = buildDeterministicFallbackPlan(input)

  const systemPrompt = `Sen Türkiye'nin en iyi kreatif reklam ajanslarında çalışan uzman bir Reklam Kreatif Direktörü ve Sanat Yönetmenisin.
Görevin: Verilen marka, ürün ve kampanya hedefi için YALNIZCA geçerli bir JSON nesnesi döndürmektir.
Başka hiçbir giriş, markdown açıklaması veya metin yazma; doğrudan { ile başlayıp } ile biten JSON çıktısı ver.

DİL KURALI:
- Bütün kullanıcıya yönelik metinler (headline, supporting_line, cta, voiceover_text) %100 DOĞAL, AKICI, PROFESYONEL TÜRKÇE olmalıdır.
- Kesinlikle İngilizce başlık veya slogan yazma.
- Klişe ve bayat reklam sözleri ("kaliteyle tanışın", "siz de gelin", "hemen alın") KULLANMA.

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
    "headline": "Vurucu, dikkat çekici 3-6 kelimelik Türkçe reklam başlığı",
    "supporting_line": "Fayda veya teklifi anlatan 8-15 kelimelik net Türkçe alt metin",
    "cta": "Harekete geçirici 2-3 kelimelik Türkçe buton metni"
  },
  "layout": {
    "text_safe_zone": "top_third | bottom_third | side_margin",
    "logo_position": "top_left | top_right | top_center",
    "product_safe_zone": "center | bottom_two_thirds"
  },
  "negative_constraints": ["İstenmeyen öğeler listesi (İngilizce)"],
  "voiceover_text": "${input.mediaType === 'VIDEO' ? '8 ila 14 kelimelik, spikerin tek nefeste okuyabileceği, doğal ve karizmatik Türkçe seslendirme cümlesi' : ''}"
}`

  const userPrompt = `Marka: ${input.brandName}
Marka Tonu: ${input.brandTone || 'Güvenilir ve profesyonel'}
Ürün: ${input.productName}
Ürün Açıklaması: ${input.productDescription || 'Belirtilmedi'}
Kampanya Amacı: ${DEFAULT_OBJECTIVE_TITLES[input.objective]} (${input.objective})
Kreatif Stil: ${input.stylePreset}
Medya Türü: ${input.mediaType}
Varsa Kampanya Detayı / Not: ${input.campaignDetail || 'Yok'}
Varsa Fiyat / İndirim: ${input.campaignCopy?.price || ''} ${input.campaignCopy?.offer || ''}`

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
