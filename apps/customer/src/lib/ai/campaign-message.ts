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
  attention_grabbing: 'Tüm mesajı koruyarak ilk cümleyi dikkat çekici, merak uyandıran veya doğrudan ana faydayı vurgulayan güçlü bir reklam kancasına dönüştür; fiyat ve kampanya şartlarını eksiksiz koru.',
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
  if (!text || !text.trim()) return ''
  let cleaned = text
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^(işte (mesajınız|metniniz)[:\s]*)/i, '')
    .replace(/^(?:[^\n]{1,60}(?:kampanya|reklam|mesaj|metin|öneri)[^\n]{0,40}:?\s*\r?\n+)/i, '')
    .trim()

  // Sızan AI komutları ve meta açıklamaları temizle (ör. "Kampanya tasarrufunu vurgula", "Not: ...")
  cleaned = cleaned
    .replace(/\r?\n+(?:(?:Kampanya\s+)?tasarrufunu\s+vurgula|Teklifi\s+daha\s+cazip\s+hale\s+getir|Not\s*:.*|Açıklama\s*:.*|Değişiklikler\s*:.*)$/gi, '')
    .trim()

  if (!cleaned && text.trim()) {
    cleaned = text.replace(/^["'`]+|["'`]+$/g, '').trim()
  }

  return cleaned
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
  strictContactCheck?: boolean
  requireBrandName?: boolean
  businessName?: string | null
  businessPhone?: string | null
  productName?: string | null
}): IntegrityCheckResult {
  const source = input.sourceText.toLocaleLowerCase('tr-TR')
  const output = input.outputText.toLocaleLowerCase('tr-TR')
  const drifts: string[] = []
  const missingPrices: string[] = []
  const preservedPrices: string[] = []
  const hallucinatedTerms: string[] = []

  // 1. Fiyat koruma ve tam sayısal karşılaştırma kontrolü (ör. "1.850 TL", "2.450 TL", "195 TL", "165 TL")
  // Regex: Rakamlardan önce veya sonra ek rakam olmamalı (boundary check: (?<!\d)...(?!\d))
  function extractNumericAmounts(text: string): { original: string; numericValue: number }[] {
    const results: { original: string; numericValue: number }[] = []
    const pricePattern = /(?:^|[^\d])(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+)\s*(?:tl|₺)(?=[^\d]|$)/gi
    let match: RegExpExecArray | null
    while ((match = pricePattern.exec(text)) !== null) {
      const full = match[0].trim()
      const rawNum = match[1]
      // Sayısal değeri ayrıştır (1.850 -> 1850, 18,50 -> 18.5)
      let normalized = rawNum.replace(/\s+/g, '')
      if (normalized.includes('.') && normalized.includes(',')) {
        // örn. 1.850,50
        normalized = normalized.replace(/\./g, '').replace(',', '.')
      } else if (normalized.includes('.') && normalized.split('.').pop()?.length === 3) {
        // Binlik ayracı: 1.850 -> 1850
        normalized = normalized.replace(/\./g, '')
      } else if (normalized.includes(',') && normalized.split(',').pop()?.length === 3) {
        // Binlik ayracı: 1,850 -> 1850
        normalized = normalized.replace(/,/g, '')
      } else if (normalized.includes(',')) {
        // Kuruş ayracı: 18,50 -> 18.50
        normalized = normalized.replace(',', '.')
      }
      const val = parseFloat(normalized)
      if (!isNaN(val)) {
        results.push({ original: full, numericValue: val })
      }
    }
    return results
  }

  const sourcePrices = extractNumericAmounts(input.sourceText)
  const outputPrices = extractNumericAmounts(input.outputText)

  for (const sp of sourcePrices) {
    const matched = outputPrices.some((op) => op.numericValue === sp.numericValue)
    if (matched) {
      preservedPrices.push(sp.original)
    } else {
      missingPrices.push(sp.original)
    }
  }

  // Çıktıda kaynakta hiç olmayan uydurma para değerleri var mı? (örn. 11.850 TL çıktığında)
  for (const op of outputPrices) {
    const fromSource = sourcePrices.some((sp) => sp.numericValue === op.numericValue)
    if (!fromSource) {
      hallucinatedTerms.push(`Uydurma/değiştirilmiş fiyat: "${op.original}"`)
      drifts.push(`Orijinal briefte yer almayan fiyat değeri üretildi: "${op.original}"`)
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
  const timeKeywords = ['bu hafta sonu', 'pazar gününe kadar', 'bu gece yarısı', 'son 24 saat', 'yalnızca bugün', 'yılbaşına kadar', '3 gün boyunca']
  for (const kw of timeKeywords) {
    if (output.includes(kw) && !source.includes(kw)) {
      hallucinatedTerms.push(`Uydurma zaman kısıtı: "${kw}"`)
      drifts.push(`Orijinalde olmayan zaman kısıtı eklendi: "${kw}"`)
    }
  }

  // 4. Uydurma garanti kontrolü (ör. "10 yıl garanti", "ömür boyu garanti", "para iade garantisi")
  const warrantyKeywords = ['ömür boyu garanti', '10 yıl garanti', '5 yıl garanti', 'koşulsuz para iade', 'değişim garantisi']
  for (const w of warrantyKeywords) {
    if (output.includes(w) && !source.includes(w)) {
      hallucinatedTerms.push(`Uydurma garanti vaadi: "${w}"`)
      drifts.push(`Orijinalde bulunmayan garanti vaadi eklendi: "${w}"`)
    }
  }

  // 6. Marka adı kontrolü:
  // - Generate modunda (requireBrandName=true) veya kaynakta marka adı varsa çıktıda korunması beklenir.
  // - Ancak rewrite/imla düzeltmede kaynakta marka adı hiç yoksa gereksiz 422 oluşmasını engeller.
  if (input.businessName) {
    const bName = input.businessName.trim().toLocaleLowerCase('tr-TR')
    const brandTokens = bName.split(/\s+/).filter((t) => t.length >= 3 && !['ticaret', 'ltd', 'şti', 'aş'].includes(t))
    const sourceHasBrand = source.includes(bName) || brandTokens.some((t) => source.includes(t))
    const shouldCheckBrand = input.requireBrandName ?? sourceHasBrand
    if (shouldCheckBrand) {
      const outputHasBrand = output.includes(bName) || brandTokens.some((t) => output.includes(t))
      if (!outputHasBrand) {
        drifts.push(`İşletme / marka adı metinde yer almıyor: "${input.businessName}"`)
      }
    }
  }

  // 7. Telefon numarası kontrolü (Sahte / uydurma telefon numarası engeli)
  // Kaynak metindeki telefonlar veya işletmenin kayıtlı resmi telefonu (businessPhone) geçerli kabul edilir.
  const phonePattern = /(?:\+?90\s*)?(?:0\s*)?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}/g
  const sourcePhones = (input.sourceText.match(phonePattern) || []).map((p) => p.replace(/[^\d]/g, ''))
  const outputPhones = (input.outputText.match(phonePattern) || []).map((p) => p.replace(/[^\d]/g, ''))
  const validPhones = [...sourcePhones]
  if (input.businessPhone) {
    const bp = input.businessPhone.replace(/[^\d]/g, '')
    if (bp.length >= 7) validPhones.push(bp)
  }

  for (const op of outputPhones) {
    const matched = validPhones.some((vp) => vp.endsWith(op.slice(-7)) || op.endsWith(vp.slice(-7)))
    if (!matched) {
      hallucinatedTerms.push(`Uydurma telefon numarası: ${op}`)
      drifts.push(`Orijinalde bulunmayan sahte iletişim numarası eklendi`)
    }
  }

  if (input.strictContactCheck && sourcePhones.length > 0) {
    for (const sp of sourcePhones) {
      const matched = outputPhones.some((op) => op.endsWith(sp.slice(-7)) || sp.endsWith(sp.slice(-7)))
      if (!matched) {
        drifts.push(`Orijinal iletişim / telefon numarası kayboldu`)
      }
    }
  }

  // 8. Uydurma teslimat ve sahte sevkiyat vaatleri (ör. "aynı gün teslimat", "ücretsiz jet kargo", "kapıda ödeme")
  const deliveryKeywords = ['aynı gün kapınızda', 'aynı gün teslimat', 'jet teslimat', 'ücretsiz kurye', 'anında kargoda']
  for (const dk of deliveryKeywords) {
    if (output.includes(dk) && !source.includes(dk)) {
      hallucinatedTerms.push(`Uydurma teslimat vaadi: "${dk}"`)
      drifts.push(`Orijinalde bulunmayan teslimat vaadi eklendi: "${dk}"`)
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

