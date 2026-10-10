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

export const CAMPAIGN_TONE_INSTRUCTIONS: Record<CampaignTone, string> = {
  samimi: 'Sıcak, içten, samimi ve dostane sohbet tonu. Resmiyetten uzak, yapmacıksız, güven veren bir yakınlık kur; müşteriye doğrudan "siz/biz" samimiyetiyle hitap et.',
  profesyonel: 'Kurumsal, ölçülü, net ve iş ciddiyeti taşıyan ton. Ürün avantajını, lojistik, kalite veya ticari şartları berrak ve saygın bir Türkçeyle aktar.',
  eglenceli: 'Tebessüm ettiren, sempatik, zekice hazırlanmış neşeli bir ton. Ciddiyetsizleşmeden, zeki bir WhatsApp sohbet ritmiyle markaya sempati kazandır.',
  enerjik: 'Tempolu, dinamik, ritmik ve harekete geçirici dil. Kısa ve güçlü fiillerle, canlı bir tempoda fırsatın heyecanını hissettir.',
  satis: 'Doğrudan fayda, somut teklif ve net eylem çağrısı (CTA) odaklı ikna edici satış dili. "Müşteri ne kazanır? Fiyat avantajı ne?" sorularını doğrudan yanıtla.',
}

export const CAMPAIGN_GENERATE_SYSTEM = `Sen Türkiye'nin en iyi kreatif reklam ajanslarında çalışan uzman bir WhatsApp Reklam Metni Yazarısın.

Görevin:
İşletmenin sunduğu ürünün gerçek değerini, kullanım faydasını ve kampanya teklifini anlayan; sektöre ve kitleye özel, yüksek yaratıcılıkta, ikna edici ve özgün Türkçe WhatsApp kampanya mesajları yazmaktır.

Yaratıcı Reklam İlkeleri:
1. Sektörel Dil:
   - Tarım/Makine: Pratik kullanım rahatlığı, dayanıklılık, iş gücü tasarrufu ve gerçek teknik ölçüler.
   - İnşaat/Malzeme: Yapı güvenliği, doğrudan fabrika/şantiye teslimi, tır bazlı avantaj, kurumsal tedarik.
   - B2B Yazılım/SaaS: Müşteri iletişimi, operasyonel hız, çoklu hat yönetimi, somut iş verimliliği.
   - Gıda/Restoran: İştah açıcı lezzet, taze malzeme, hızlı sipariş ve nefis sunum vurgusu.
2. Sıfır Klişe:
   - "Kaliteyle tanışın", "siz de gelin", "en doğru adres", "kaçırılmayacak fırsat" gibi içi boş kalıpları ve aynı cümlenin farklı marka adıyla tekrarını KESİNLİKLE kullanma.
   - Her mesajın açılışı doğrudan konuya, faydaya veya dikkat çekici bir kancaya (hook) dayanmalıdır.
3. Ticari Bilgi Koruma:
   - Kullanıcının girdiği fiyatları, eski fiyatları, indirim oranlarını, telefon ve adres bilgilerini harfiyen koru.
   - Kullanıcının vermediği fiyat, son gün/saat tarihi, sahte stok adedi, doğrulanmamış garanti veya sertifika UYDURMA.
4. WhatsApp Formatı:
   - Okuması kolay, nefes alan kısa paragraflar (1-3 satır) kullan.
   - Aşırı emoji kirliliği yapma; amaca uygun 1-3 kaliteli emoji yeterlidir.
   - Mesajın sonunda net, yönlendirici ve tek bir eylem çağrısı (CTA) yer almalıdır.
   - Yalnızca doğrudan gönderilecek mesaj metnini döndür. Giriş, başlık etiketi veya analiz yazma.`

const REWRITE_HINT: Record<RewriteAction, string> = {
  improve: 'Mesajın akıcılığını artır, anlatımı güçlendir, faydayı ve satış açısını netleştir. Ticari bilgileri harfiyen koru.',
  shorten: 'Gereksiz dolgu kelimeleri at, doğrudan öze gir; ana kampanya, ürün ve fiyat bilgisini eksiksiz tutarak mesajı belirgin şekilde kısalt.',
  expand: 'Mevcut bilgileri koruyarak ürünün pratik faydasını ve kullanım değerini biraz daha detaylandır. Asla yeni iddia, fiyat veya tarih uydurma.',
  attention_grabbing: 'İlk cümleyi durdurucu, merak uyandıran veya doğrudan ana faydayı vurgulayan güçlü bir reklam manşetine dönüştür.',
  sales_focused: 'Değer önerisini ve satın alma gerekçesini öne çıkar; doğrudan satışa ve siparişe yönlendir.',
  friendly: 'Resmiyeti kır, sıcak bir selamla başla, müşteriyle yüz yüze sohbet ediyormuş gibi samimi ve içten yaz.',
  professional: 'Dili kurumsallaştır, saygın, ölçülü ve resmi iş ciddiyeti taşıyan berrak bir tona kavuştur.',
  fix_grammar: 'YALNIZCA yazım hatalarını, imla ve noktalama işaretlerini düzelt. Anlamı, cümle kurgusunu, fiyatı, tarihi ve şartları KESİNLİKLE değiştirme.',
  original: 'Kalıplaşmış reklam ezberlerini kır; mesajı taze, yaratıcı ve alışılagelmişin dışında özgün bir anlatımla yeniden yaz.',
  fun: 'Mesajı tebessüm ettirecek sempatik, zekice ve neşeli bir üslupla yeniden kurgula; ciddiyetsizleşme.',
  energetic: 'Cümleleri dinamikleştir, tempolu ve ritmik bir dille harekete geçirici enerji kat.',
  simplify: 'Karmaşık ifadeleri temizle, mesajı herkesin bir bakışta anlayacağı duru ve sade bir anlatıma kavuştur.',
  urgency: 'Fırsatın değerini öne çıkararak adım atma hissi ver; kullanıcı belirtmediyse sahte son tarih veya saat uydurma.',
  fomo: 'Fırsatı kaçırma hissini nezaketle hissettir; asılsız stok veya kontenjan icat etme.',
  cta: 'Mesajın sonundaki eylem çağrısını son derece net, güçlü ve tek bir adıma odaklı hale getir.',
  first_line: 'Yalnızca ilk cümleyi güçlü bir açılış kancasına dönüştür; mesajın geri kalan gövdesini mümkün olduğunca koru.',
  more_emoji: 'Metnin ritmini ve görsel çekiciliğini destekleyen 3-4 uygun emoji ekle; abartma.',
  less_emoji: 'Emojileri en aza indir (en fazla 1 adet bırak); metnin doğrudan içeriğini öne çıkar.',
  remove_emoji: 'Metindeki TÜM emojileri tamamen kaldır; yalnızca temiz metin bırak.',
  whatsapp: 'WhatsApp sohbet balonuna tam oturacak şekilde paragrafları 1-2 satırlık bloklara böl, okunabilirliği artır.',
}

export function buildGeneratePrompt(input: {
  brief: string
  tone?: string
  business: BusinessContext
}): string {
  const toneInstruction = input.tone && input.tone in CAMPAIGN_TONE_INSTRUCTIONS
    ? CAMPAIGN_TONE_INSTRUCTIONS[input.tone as CampaignTone]
    : null

  return [
    `Kampanya Özeti (kullanıcının verdiği doğrulanmış bilgiler; uydurma ekleme):\n${input.brief.trim()}`,
    toneInstruction ? `İstenen Yazım Tonu ve Tarzı:\n${toneInstruction}` : null,
    formatBusiness(input.business),
    'Yalnızca kullanılacak nihai WhatsApp mesaj metnini yaz.',
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
  const isGrammarOrFormat = ['fix_grammar', 'remove_emoji', 'less_emoji', 'shorten'].includes(input.action)

  return [
    `İşlem Talimatı: ${REWRITE_HINT[input.action]}`,
    'ÖNEMLİ KURAL: Yalnızca mevcut mesajı temel alarak işlemi uygula. Mevcut mesajda bulunmayan zaman (ör. "bu hafta sonu"), ek ürün özelliği (ör. "organik") veya uydurma şartları mesaja KESİNLİKLE ekleme.',
    !isGrammarOrFormat && input.brief?.trim()
      ? `Referans kampanya konusu (yalnızca terim doğruluğu kontrolü içindir; metne buradan bağımsız yeni detay taşıma):\n${input.brief.trim()}`
      : null,
    formatBusiness(input.business),
    `Mevcut Mesaj:\n${input.currentMessage.trim()}`,
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
  return `İşletme Bilgileri (yalnızca kampanya için anlamlıysa kullan, zorlama yapma):\n${lines.join('\n')}`
}

export function cleanAiMessage(text: string): string {
  return text
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(işte (mesajınız|metniniz)[:\s]*)/i, '')
    .replace(/^(?:(?:Samimi|Profesyonel|Satış\s+Odaklı|Kısa|Detaylı)\s+)?(?:WhatsApp\s+)?Kampanya\s+(?:Mesajı|Metni)\s*:?\s*\r?\n+/i, '')
    .trim()
}

export function formatPriceText(raw: string | null | undefined): string {
  if (!raw) return ''
  const trimmed = String(raw).trim()
  if (!trimmed) return ''

  // If already contains currency symbol or code, return clean single-spaced
  if (/(tl|₺|\$|€|usd|eur)/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, ' ')
  }

  const numOnly = trimmed.replace(/\s+/g, '')
  // Decimal price (e.g. "18.50" or "18,50")
  if (/^\d+[.,]\d+$/.test(numOnly)) {
    return `${trimmed} TL`
  }

  // Integer price with thousands formatting (e.g. "1900" -> "1.900 TL", "500" -> "500 TL")
  if (/^\d+$/.test(numOnly)) {
    const num = Number(numOnly)
    if (!Number.isNaN(num) && num >= 1000) {
      return `${num.toLocaleString('tr-TR')} TL`
    }
    return `${numOnly} TL`
  }

  return `${trimmed} TL`
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
    const formattedPrice = formatPriceText(verified.price)
    const formattedOldPrice = verified.oldPrice ? formatPriceText(verified.oldPrice) : null
    const oldPricePart = formattedOldPrice ? ` _(Önceki: ${formattedOldPrice})_` : ''
    offerLines.push(`• *Fiyat:* ${formattedPrice}${oldPricePart}`)
  }
  if (verified.discount && !verified.offer?.includes(verified.discount)) {
    offerLines.push(`• *İndirim:* ${verified.discount}`)
  }
  if (verified.deliveryFact) {
    const fact = verified.deliveryFact.trim()
    const lower = fact.toLowerCase()
    let label = 'Teslimat'
    if (lower.includes('taksit') || lower.includes('kredi kart') || lower.includes('kart') || lower.includes('peşin') || lower.includes('havale') || lower.includes('ödeme')) {
      label = 'Ödeme/Taksit'
    } else if (lower.includes('teslim') || lower.includes('kargo') || lower.includes('sevkiyat') || lower.includes('nakliye') || lower.includes('şantiye') || lower.includes('adrese')) {
      label = 'Teslimat'
    } else {
      label = 'Avantaj'
    }
    offerLines.push(`• *${label}:* ${fact}`)
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

export type IntegrityCheckResult = {
  valid: boolean
  drifts: string[]
  preservedPrices: string[]
  missingPrices: string[]
  hallucinatedTerms: string[]
}

/**
 * Ticari bilgi koruma ve halüsinasyon kontrolü:
 * Orijinal brief/mesajda bulunan fiyat, indirim, telefon gibi ticari verilerin çıktıda korunup korunmadığını,
 * ve çıktıda orijinalde olmayan uydurma tarih/yüzde olup olmadığını denetler.
 */
export function verifyCommercialIntegrity(input: {
  sourceText: string
  outputText: string
  strictPriceCheck?: boolean
}): IntegrityCheckResult {
  const source = input.sourceText.toLocaleLowerCase('tr-TR')
  const output = input.outputText.toLocaleLowerCase('tr-TR')
  const drifts: string[] = []
  const missingPrices: string[] = []
  const preservedPrices: string[] = []
  const hallucinatedTerms: string[] = []

  // 1. Fiyat koruma kontrolü (ör. "1.850 TL", "2450 TL", "2.450")
  const priceRegex = /(\b\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?\s*(?:tl|₺)\b)/gi
  const sourcePrices = (input.sourceText.match(priceRegex) || []).map((p) => p.trim())

  for (const price of sourcePrices) {
    const cleanNum = price.replace(/[^\d]/g, '')
    if (output.includes(cleanNum) || output.includes(price.toLocaleLowerCase('tr-TR'))) {
      preservedPrices.push(price)
    } else {
      missingPrices.push(price)
    }
  }

  if (input.strictPriceCheck && missingPrices.length > 0) {
    drifts.push(`Orijinal fiyattan kayıp tespit edildi: ${missingPrices.join(', ')}`)
  }

  // 2. Yüzde indirim kontrolü (ör. "%25", "%50")
  const pctRegex = /(%\s*\d{1,2}|\b\d{1,2}\s*%\b)/g
  const sourcePcts = (source.match(pctRegex) || []).map((p) => p.replace(/\s+/g, ''))
  const outputPcts = (output.match(pctRegex) || []).map((p) => p.replace(/\s+/g, ''))

  for (const outPct of outputPcts) {
    if (!sourcePcts.includes(outPct)) {
      hallucinatedTerms.push(`Uydurma indirim oranı: ${outPct}`)
      drifts.push(`Orijinalde bulunmayan indirim oranı üretildi: ${outPct}`)
    }
  }

  // 3. Uydurma tarih ve gün kontrolü
  const timeKeywords = ['bu hafta sonu', 'pazar gününe kadar', 'bu gece yarısı', 'son 24 saat', 'yalnızca bugün']
  for (const kw of timeKeywords) {
    if (output.includes(kw) && !source.includes(kw)) {
      hallucinatedTerms.push(`Uydurma zaman kısıtı: "${kw}"`)
      drifts.push(`Orijinalde olmayan zaman kısıtı eklendi: "${kw}"`)
    }
  }

  return {
    valid: drifts.length === 0,
    drifts,
    preservedPrices,
    missingPrices,
    hallucinatedTerms,
  }
}

