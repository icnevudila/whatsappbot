import type {
  UserVideoInput,
  FactNormalizerOutput,
  VerifiedFacts,
  TrustAndRiskClass,
  CampaignObjective,
  AssetState,
} from './schemas'

const FORBIDDEN_MARKETING_HYPERBOLE = [
  'dünyanın en iyisi',
  'türkiyenin bir numarası',
  'rakipsiz',
  '%100 garanti',
  'kesin çözüm',
  'mucizevi',
  'kesin kazanç',
  'zengin olun',
  'şok sonuç',
]

/**
 * Fact Normalizer: Extracts verified facts and identifies unknowns.
 * Rule: Never invent missing facts. Missing information remains null or empty.
 */
export function normalizeFacts(input: UserVideoInput): FactNormalizerOutput {
  const briefText = (input.brief || '').trim()
  const customText = (input.customText || '').trim()
  const allText = `${input.brandName || ''} ${briefText} ${customText} ${input.about || ''} ${input.sectorHint || ''}`.toLowerCase()

  // 1. Offer Name & Products
  const mainProduct = input.products?.[0]
  const offerName = mainProduct?.name?.trim() || (briefText.length < 50 && !briefText.includes('\n') ? briefText : null)

  // 2. Features vs Benefits
  const features: string[] = []
  const benefits: string[] = []

  if (mainProduct?.features && Array.isArray(mainProduct.features)) {
    features.push(...mainProduct.features.filter(Boolean))
  }
  if (mainProduct?.description) {
    const desc = mainProduct.description.trim()
    if (desc.match(/(\d+\s*(l|kg|g|w|mah|cm|mm|metre)|ahşap|çelik|akülü|pamuk|deri|lityum|titanyum)/i)) {
      features.push(desc)
    } else {
      benefits.push(desc)
    }
  }

  // 3. Price & Discount (Strict: only if explicitly supplied in input)
  let price: string | null = null
  let currency: string | null = null
  let discount: string | null = null

  if (mainProduct?.price) {
    const p = mainProduct.price.trim()
    price = p
    if (p.includes('₺') || p.toLowerCase().includes('tl')) currency = 'TRY'
    else if (p.includes('$')) currency = 'USD'
    else if (p.includes('€')) currency = 'EUR'
  }

  if (mainProduct?.promo) {
    discount = mainProduct.promo.trim()
  } else if (customText.match(/(%?\d+\s*indirim|iskonto|fırsat|kampanya|hediye)/i)) {
    discount = customText
  }

  // 4. Risk Class Detection
  let riskClass: TrustAndRiskClass = 'standard'
  if (
    allText.match(/(diş|implant|klinik|hekim|doktor|sağlık|medikal|tedavi|ameliyat|\bilaç\b|hastane|reçete|botoks|estetik cerrahi)/) &&
    !allText.match(/(ilaçlama|pülverizatör|sırt pompası|bahçe|tarım|bağ)/)
  ) {
    riskClass = 'regulated_health'
  } else if (allText.match(/(kredi|faiz|yatırım|borsa|\bfon\b|kripto|sigorta|getiri|finans)/)) {
    riskClass = 'finance_or_investment'
  } else if (allText.match(/(çocuk|bebek|kreş|oyuncak|anaokulu)/)) {
    riskClass = 'children_or_sensitive'
  } else if (allText.match(/(avukat|hukuk|dava|arabuluculuk|ruhsat|patent)/)) {
    riskClass = 'legal_or_professional_claim'
  } else if (allText.match(/(villa|arsa|konut|daire|lüks araç|milyon|yatırım)/)) {
    riskClass = 'high_consideration'
  }

  // 5. Objective Detection
  let campaignObjective: CampaignObjective = 'awareness'
  if (allText.match(/(teklif|iskonto|toptan fiyat|fiyat teklif)/i)) {
    campaignObjective = 'quote_request'
  } else if (allText.match(/(sipariş ver|satın al|hemen al|kapında ödeme)/i)) {
    campaignObjective = 'direct_order'
  } else if (allText.match(/(randevu|muayene|rezervasyon|kayıt)/i)) {
    campaignObjective = 'appointment_booking'
  } else if (allText.match(/(mağaza|showroom|şube|ziyaret|yerinde)/i)) {
    campaignObjective = 'store_visit'
  } else if (allText.match(/(yeni açılan|istihbarat|müşteri bul|leads|iletişime geç)/i)) {
    campaignObjective = 'lead_generation'
  } else if (allText.match(/(nasıl kullanılır|çalışma|işlev|performans|test)/i)) {
    campaignObjective = 'product_demonstration'
  } else if (discount) {
    campaignObjective = 'promotion'
  }

  // 6. Assets State
  const assets: AssetState = {
    productReference: Boolean(mainProduct?.imageUrl),
    productReferenceUrl: mainProduct?.imageUrl || null,
    logoReference: Boolean(input.logoUrl),
    logoReferenceUrl: input.logoUrl || null,
    locationReference: false,
    personReference: false,
  }

  // 7. Unknowns Identification
  const unknowns: string[] = []
  if (!offerName && !briefText) unknowns.push('offer_subject_missing')
  if (!price && campaignObjective === 'direct_order') unknowns.push('price_unspecified_for_order')

  // 8. Forbidden Claims Check
  const forbiddenClaims: string[] = []
  for (const f of FORBIDDEN_MARKETING_HYPERBOLE) {
    if (allText.includes(f)) {
      forbiddenClaims.push(f)
    }
  }

  const phones = (input.phones || []).map((p) => p.phone).filter(Boolean)

  // 9. Campaign Deadline & Delivery Area (Preserve explicit or detect from brief)
  const campaignDeadline = input.campaignDeadline?.trim() || null
  const deliveryArea = input.deliveryArea?.trim() || null
  const ctaText = input.ctaText?.trim() || null

  const verifiedFacts: VerifiedFacts = {
    brandName: input.brandName?.trim() || null,
    offerName,
    offerType: 'unknown', // Will be classified by ontology analyzer
    features,
    benefits,
    price,
    currency,
    discount,
    campaignDeadline,
    deliveryArea,
    ctaText,
    ctaDestination: input.ctaDestination || (phones.length ? `WhatsApp: ${phones[0]}` : null),
    phones,
    rawBrief: briefText,
  }

  return {
    verifiedFacts,
    campaignObjective,
    audience: {
      description: null,
      awarenessLevel: 'problem_or_solution_aware',
    },
    assets,
    riskClass,
    unknowns,
    forbiddenClaims,
    sectorHint: input.sectorHint?.trim() || null,
  }
}
