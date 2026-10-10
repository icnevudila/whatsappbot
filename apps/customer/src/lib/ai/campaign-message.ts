export const CAMPAIGN_TONES = [
  { value: 'samimi', label: 'Samimi' },
  { value: 'profesyonel', label: 'Profesyonel' },
  { value: 'eglenceli', label: 'Eğlenceli' },
  { value: 'enerjik', label: 'Enerjik' },
  { value: 'satis', label: 'Satış Odaklı' },
] as const

export const REWRITE_PRIMARY = [
  { value: 'improve', label: 'Daha iyi yaz', mark: '' },
  { value: 'shorten', label: 'Daha kısa yaz', mark: '' },
  { value: 'expand', label: 'Daha uzun / detaylı yaz', mark: '' },
  { value: 'attention_grabbing', label: 'Daha dikkat çekici yap', mark: '' },
  { value: 'sales_focused', label: 'Daha satış odaklı yap', mark: '' },
  { value: 'friendly', label: 'Daha samimi yap', mark: '' },
  { value: 'professional', label: 'Daha profesyonel yap', mark: '' },
  { value: 'fix_grammar', label: 'Yazım ve imlayı düzelt', mark: '' },
] as const

export const REWRITE_MORE = [
  { value: 'original', label: 'Daha özgün yap' },
  { value: 'fun', label: 'Eğlenceli yap' },
  { value: 'energetic', label: 'Daha enerjik yap' },
  { value: 'simplify', label: 'Daha sade yaz' },
  { value: 'urgency', label: 'Aciliyet hissi ekle' },
  { value: 'fomo', label: 'FOMO etkisi ekle' },
  { value: 'cta', label: 'Güçlü CTA ekle' },
  { value: 'first_line', label: 'İlk cümleyi güçlendir' },
  { value: 'more_emoji', label: 'Emojileri artır' },
  { value: 'less_emoji', label: 'Emojileri azalt' },
  { value: 'remove_emoji', label: 'Emojileri kaldır' },
  { value: 'whatsapp', label: 'WhatsApp’a uygun hale getir' },
] as const

export const REWRITE_ACTIONS = [...REWRITE_PRIMARY, ...REWRITE_MORE] as const

export type CampaignTone = (typeof CAMPAIGN_TONES)[number]['value']
export type RewriteAction = (typeof REWRITE_ACTIONS)[number]['value']

const REWRITE_SET = new Set<string>(REWRITE_ACTIONS.map((item) => item.value))

export function isRewriteAction(value: string): value is RewriteAction {
  return REWRITE_SET.has(value)
}

export type BusinessContext = {
  name?: string | null
  about?: string | null
  address?: string | null
  phone?: string | null
  tone?: string | null
}

export const CAMPAIGN_GENERATE_SYSTEM = `Sen Türkiye'de WhatsApp üzerinden müşterilere mesaj gönderen işletmeler için kampanya metni yazarsın.

Kurallar:
- Türkçe, doğal ve WhatsApp'a uygun yaz.
- Gereksiz uzun yazma. Kısa, okunabilir paragraflar kullan.
- İlk cümlede mesajın amacını belli et.
- Gereksiz emoji kullanma; en fazla birkaç tane.
- Kullanıcının vermediği fiyat, tarih, indirim, stok, ürün veya kampanya şartı uydurma.
- İşletmenin marka tonunu koru; verdiği önemli bilgileri kaybetme.
- Spam gibi görünen aşırı satış dilinden kaçın.
- Gerektiğinde güçlü fakat rahatsız edici olmayan bir çağrı ekle.
- Yalnızca kullanılacak mesaj metnini döndür.
- Açıklama, analiz veya "İşte mesajınız" gibi girişler yazma.`

const REWRITE_HINT: Record<RewriteAction, string> = {
  improve: 'Daha akıcı ve net yaz; anlamı koru.',
  shorten: 'Ana kampanya bilgisini kaybetmeden kısalt.',
  expand: 'Aynı bilgileri koruyarak biraz daha detaylı yaz. Yeni iddia uydurma.',
  attention_grabbing: 'İlk cümleyi daha dikkat çekici yap; abartma ve yalan ekleme.',
  sales_focused: 'Satışa yönlendir ama rahatsız edici olma.',
  friendly: 'Daha samimi ve sıcak bir ton kullan.',
  professional: 'Daha profesyonel ve sade bir ton kullan.',
  fix_grammar: 'Yalnızca yazım, imla ve noktalama düzelt. Anlamı, fiyatı, tarihi ve şartları değiştirme.',
  original: 'Daha özgün bir anlatım kullan; aynı bilgileri koru.',
  fun: 'Biraz daha eğlenceli yaz; ciddiyetsizleşme.',
  energetic: 'Daha enerjik yaz; bağırma veya aşırı ünlem kullanma.',
  simplify: 'Daha sade ve anlaşılır yaz.',
  urgency: 'Aciliyet hissi ekle; kullanıcı vermediyse son tarih uydurma.',
  fomo: 'Kaçırma hissi ekle; stok veya kontenjan uydurma.',
  cta: 'Net bir çağrı ekle (yazın, gelin, bakın gibi).',
  first_line: 'Yalnızca ilk cümleyi güçlendir; geri kalanı mümkün olduğunca koru.',
  more_emoji: 'Birkaç uygun emoji ekle; abartma.',
  less_emoji: 'Emojileri azalt; anlamı koru.',
  remove_emoji: 'Tüm emojileri kaldır; metni koru.',
  whatsapp: 'WhatsApp sohbetine uygun kısa satırlara böl.',
}

export function buildGeneratePrompt(input: {
  brief: string
  tone?: string
  business: BusinessContext
}): string {
  return [
    `Kampanya özeti (kullanıcının verdiği bilgiler; uydurma):`,
    input.brief.trim(),
    input.tone ? `İstenen ton: ${input.tone}` : null,
    formatBusiness(input.business),
    'Yalnızca mesaj metnini yaz.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function buildRewritePrompt(input: {
  currentMessage: string
  action: RewriteAction
  brief?: string
  business: BusinessContext
}): string {
  return [
    `İşlem: ${REWRITE_HINT[input.action]}`,
    input.brief?.trim() ? `Kampanya bağlamı: ${input.brief.trim()}` : null,
    formatBusiness(input.business),
    `Mevcut mesaj:\n${input.currentMessage.trim()}`,
    'Yalnızca yeni mesaj metnini döndür. Açıklama yazma.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function formatBusiness(business: BusinessContext): string | null {
  const lines = [
    business.name ? `İşletme adı: ${business.name}` : null,
    business.tone ? `Marka tonu: ${business.tone}` : null,
    business.about ? `İşletme hakkında: ${business.about}` : null,
    business.address ? `Adres: ${business.address}` : null,
    business.phone ? `Telefon: ${business.phone}` : null,
  ].filter(Boolean)
  if (lines.length === 0) return null
  return `İşletme bilgileri (yalnızca kampanya için anlamlıysa kullan, zorla sıkıştırma):\n${lines.join('\n')}`
}

export function cleanAiMessage(text: string): string {
  return text
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(işte (mesajınız|metniniz)[:\s]*)/i, '')
    .replace(/^(?:(?:Samimi|Profesyonel|Satış\s+Odaklı|Kısa|Detaylı)\s+)?(?:WhatsApp\s+)?Kampanya\s+(?:Mesajı|Metni)\s*:?\s*\r?\n+/i, '')
    .trim()
}

export function generateCampaignWhatsAppMessage(verified: import('../creative/prompt').VerifiedCampaignData): string {
  const parts: string[] = []

  // 1. Header with brand and campaign headline
  const brandTitle = verified.brandName && verified.brandName !== 'İşletmemiz' ? verified.brandName : ''
  if (brandTitle && verified.headline) {
    parts.push(`*${brandTitle} — ${verified.headline}*`)
  } else if (verified.headline) {
    parts.push(`*${verified.headline}*`)
  } else if (brandTitle) {
    parts.push(`*${brandTitle} Kampanyası*`)
  }

  // 2. Offer & Price highlight
  const offerLines: string[] = []
  if (verified.offer) {
    offerLines.push(`• *Fırsat:* ${verified.offer}`)
  }
  if (verified.price) {
    offerLines.push(`• *Fiyat:* ${verified.price}${verified.oldPrice ? ` _(Önceki: ${verified.oldPrice})_` : ''}`)
  }
  if (verified.discount && !verified.offer?.includes(verified.discount)) {
    offerLines.push(`• *İndirim:* ${verified.discount}`)
  }
  if (verified.deliveryFact) {
    offerLines.push(`• *Teslimat:* ${verified.deliveryFact}`)
  }
  if (verified.stockFact) {
    offerLines.push(`• *Stok:* ${verified.stockFact}`)
  }
  if (verified.urgencyFact) {
    offerLines.push(`• *Geçerlilik:* ${verified.urgencyFact}`)
  }
  if (verified.primaryBenefits.length) {
    for (const b of verified.primaryBenefits) {
      if (!offerLines.some((l) => l.includes(b))) {
        offerLines.push(`• ${b}`)
      }
    }
  }

  if (offerLines.length) {
    parts.push(`*Kampanya Detayları:*\n${offerLines.join('\n')}`)
  }

  // 3. CTA & Contact
  const ctaLine = verified.cta ? `${verified.cta}` : 'Detaylı bilgi ve sipariş için bize hemen yazabilirsiniz.'
  parts.push(ctaLine)

  const contactList: string[] = []
  if (verified.contactLines.length) {
    contactList.push(`${verified.contactLines[0]}`)
  }
  if (verified.website) {
    contactList.push(`${verified.website}`)
  }
  if (contactList.length) {
    parts.push(contactList.join(' · '))
  }

  return parts.join('\n\n')
}

