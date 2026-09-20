import type {
  UserVideoInput,
  FactNormalizerOutput,
  VerifiedFacts,
  TrustAndRiskClass,
  CampaignObjective,
  AssetState,
  StructuredPercentageFact,
  StructuredProductFact,
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

const MATERIAL_KEYWORDS_REGEX =
  /\b(pamuk|killi|yün|alkol|nem|elyaf|keten|deri|ipek|polyester|viskon|akrilik|likra|elastan|çelik|ahşap|maden|asit|yağ|şeker|protein|saf|saflık|oran|içerik|materyal|kompozisyon)\b/i

const DISCOUNT_KEYWORDS_REGEX =
  /\b(indirim|iskonto|fırsat|kampanya|avantaj|ucuz|indirimli|hediye)\b/i

const NEGATION_KEYWORDS_REGEX =
  /\b(yok|değil|yapmıyoruz|yapılmaz|yapılmamaktadır|bulunmamaktadır|hariç|olmayan|mümkün değil)\b/i

/**
 * Fact Normalizer: Extracts verified facts and identifies unknowns.
 * Rule: Never invent missing facts. Missing information remains null or empty.
 */
export function normalizeFacts(input: UserVideoInput): FactNormalizerOutput {
  const briefText = (input.brief || '').trim()
  const customText = (input.customText || '').trim()
  const allText = `${input.brandName || ''} ${briefText} ${customText} ${input.about || ''} ${input.sectorHint || ''}`.toLowerCase()

  // 1. Offer Name & Products
  const rawProducts = input.products || []
  const mainProduct = rawProducts[0]
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

  // 3. Structured Percentage Facts & Product Dissection
  const productFacts: StructuredProductFact[] = []
  const materialSpecs: StructuredPercentageFact[] = []
  const discountOffers: StructuredPercentageFact[] = []

  for (const p of rawProducts) {
    const pDiscounts: StructuredPercentageFact[] = []
    const pMaterials: StructuredPercentageFact[] = []

    if (p.promo) {
      const pText = p.promo.trim()
      const isWholesale = /\btoptan\b/i.test(pText)
      const matches = pText.match(/(?:%\s*(\d+)|(\d+)\s*%)/g) || []
      for (const m of matches) {
        const rate = Number(m.replace(/\D/g, ''))
        const isMaterial = MATERIAL_KEYWORDS_REGEX.test(pText)
        if (isMaterial) {
          pMaterials.push({
            productName: p.name,
            claimType: 'material_composition',
            rate,
            rawText: m,
            property: pText.match(MATERIAL_KEYWORDS_REGEX)?.[0] || 'malzeme',
            isWholesale: false,
          })
        } else {
          pDiscounts.push({
            productName: p.name,
            claimType: 'discount',
            rate,
            rawText: m,
            property: 'indirim',
            condition: isWholesale ? 'toptan' : null,
            isWholesale,
          })
        }
      }
    }

    const pCorpus = [p.description || '', ...(p.features || [])].join('. ')
    if (pCorpus) {
      const sentences = pCorpus.split(/[.;\n]+/)
      for (const sent of sentences) {
        const isNeg = NEGATION_KEYWORDS_REGEX.test(sent)
        if (isNeg) continue
        const matches = sent.match(/(?:%\s*(\d+)|(\d+)\s*%)/g) || []
        for (const m of matches) {
          const rate = Number(m.replace(/\D/g, ''))
          if (MATERIAL_KEYWORDS_REGEX.test(sent)) {
            pMaterials.push({
              productName: p.name,
              claimType: 'material_composition',
              rate,
              rawText: m,
              property: sent.match(MATERIAL_KEYWORDS_REGEX)?.[0] || 'malzeme',
              isWholesale: false,
            })
          } else if (DISCOUNT_KEYWORDS_REGEX.test(sent)) {
            const isWholesale = /\btoptan\b/i.test(sent)
            pDiscounts.push({
              productName: p.name,
              claimType: 'discount',
              rate,
              rawText: m,
              property: 'indirim',
              condition: isWholesale ? 'toptan' : null,
              isWholesale,
            })
          }
        }
      }
    }

    productFacts.push({
      name: p.name,
      price: p.price || null,
      currency:
        p.price?.includes('₺') || p.price?.toLowerCase().includes('tl')
          ? 'TRY'
          : p.price?.includes('$')
          ? 'USD'
          : p.price?.includes('€')
          ? 'EUR'
          : null,
      discount: p.promo || null,
      discounts: pDiscounts,
      materials: pMaterials,
      features: p.features || [],
      benefits: p.description ? [p.description] : [],
    })

    materialSpecs.push(...pMaterials)
    discountOffers.push(...pDiscounts)
  }

  // Parse unstructured brief and custom text by discrete clauses
  const unstructuredText = `${briefText}. ${customText}`
  const clauses = unstructuredText.split(/(?<=[.!?\n;])|\bve\b/i)

  for (const clause of clauses) {
    const trimmedClause = clause.trim()
    if (!trimmedClause) continue

    const isNeg = NEGATION_KEYWORDS_REGEX.test(trimmedClause)
    if (isNeg) continue

    const matches = trimmedClause.match(/(?:%\s*(\d+)|(\d+)\s*%)/g) || []
    if (!matches.length) continue

    let boundProduct: string | null = null
    for (const p of rawProducts) {
      if (trimmedClause.toLowerCase().includes(p.name.toLowerCase())) {
        boundProduct = p.name
        break
      }
    }

    const isWholesale = /\btoptan\b/i.test(trimmedClause)
    const isMaterial = MATERIAL_KEYWORDS_REGEX.test(trimmedClause)
    const isDiscount = DISCOUNT_KEYWORDS_REGEX.test(trimmedClause)

    for (const m of matches) {
      const rate = Number(m.replace(/\D/g, ''))
      if (isMaterial) {
        const item: StructuredPercentageFact = {
          productName: boundProduct,
          claimType: 'material_composition',
          rate,
          rawText: m,
          property: trimmedClause.match(MATERIAL_KEYWORDS_REGEX)?.[0] || 'malzeme',
          isWholesale: false,
        }
        materialSpecs.push(item)
        if (boundProduct) {
          const pf = productFacts.find((p) => p.name === boundProduct)
          if (pf && !pf.materials.some((x) => x.rate === rate)) pf.materials.push(item)
        }
      } else if (isDiscount) {
        const item: StructuredPercentageFact = {
          productName: boundProduct,
          claimType: 'discount',
          rate,
          rawText: m,
          property: 'indirim',
          condition: isWholesale ? 'toptan' : null,
          isWholesale,
        }
        discountOffers.push(item)
        if (boundProduct) {
          const pf = productFacts.find((p) => p.name === boundProduct)
          if (pf && !pf.discounts.some((x) => x.rate === rate)) pf.discounts.push(item)
        }
      }
    }
  }

  const isWholesale = /\btoptan\b/i.test(
    `${briefText} ${customText} ${rawProducts.map((p) => `${p.name} ${p.promo || ''} ${p.description || ''}`).join(' ')}`
  )

  const percentageFacts: StructuredPercentageFact[] = [...materialSpecs, ...discountOffers]

  // 4. Price & Discount (Strict: only if explicitly supplied in input)
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
  } else if (discountOffers.length > 0) {
    const firstDisc = discountOffers[0]
    discount = `%${firstDisc.rate} ${firstDisc.isWholesale ? 'toptan iskonto' : 'indirim'}`
  }

  // 5. Risk Class Detection
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

  // 6. Objective Detection
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

  // 7. Assets State
  const assets: AssetState = {
    productReference: Boolean(mainProduct?.imageUrl),
    productReferenceUrl: mainProduct?.imageUrl || null,
    logoReference: Boolean(input.logoUrl),
    logoReferenceUrl: input.logoUrl || null,
    locationReference: false,
    personReference: false,
  }

  // 8. Unknowns Identification
  const unknowns: string[] = []
  if (!offerName && !briefText) unknowns.push('offer_subject_missing')
  if (!price && campaignObjective === 'direct_order') unknowns.push('price_unspecified_for_order')

  // 9. Forbidden Claims Check
  const forbiddenClaims: string[] = []
  for (const f of FORBIDDEN_MARKETING_HYPERBOLE) {
    if (allText.includes(f)) {
      forbiddenClaims.push(f)
    }
  }

  const phones = (input.phones || []).map((p) => p.phone).filter(Boolean)

  // 10. Campaign Deadline & Delivery Area (Preserve explicit or detect from brief)
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
    percentageFacts,
    materialSpecs,
    discountOffers,
    productFacts,
    isWholesale,
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

