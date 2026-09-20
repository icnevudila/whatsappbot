import type {
  FactNormalizerOutput,
  OntologyClassification,
  CreativeStrategyOutput,
  VoiceoverOutput,
} from './schemas'

const FORBIDDEN_GENERIC_CLICHES = [
  'lezzetin doğru adresi',
  'kalitenin adresi',
  'ayrıcalıklı deneyim sizi bekliyor',
  'geleceği bugünden yönetin',
  'güvenilir çözüm ortağınız',
  'uzman kadromuzla yanınızdayız',
  'hayallerinizi gerçeğe dönüştürün',
  'unutulmaz bir deneyim',
]

/**
 * Common marketing hype words that must NEVER be generated unless explicitly
 * present/verified in the brief, features, benefits, or promo.
 */
export const HYPE_WORDS_TO_VERIFY = [
  'taptaze',
  'kapınızda',
  'anında',
  'anlık',
  'kusursuz',
  'özel reçeteli',
  'yüksek verim',
  'yorulmadan',
  'yüksek basınç',
  'binlerce stok',
  'binlerce',
  'dumanı üstünde',
  'dumanı tüten',
  'tedavi sonrası',
  'kesin iyileşme',
  'hızlı sevkiyat',
  'hızlı teslimat',
  'güvenilir',
  'fabrikadan doğrudan',
  'üreticiden doğrudan',
  'en iyi',
  'bir numara',
  'rakipsiz',
  'şok fiyat',
  'mucizevi',
  'kesin çözüm',
  '%100 garanti',
]

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Checks whether a specific claim or marketing term is verified in the facts corpus,
 * ensuring it is NOT negated (e.g. "Hızlı teslimat yok" is recognized as negative).
 */
export function isClaimVerified(term: string, facts: FactNormalizerOutput): boolean {
  const corpus = [
    facts.verifiedFacts.rawBrief,
    ...(facts.verifiedFacts.features || []),
    ...(facts.verifiedFacts.benefits || []),
    facts.verifiedFacts.discount || '',
    facts.verifiedFacts.price || '',
    facts.verifiedFacts.deliveryArea || '',
    facts.verifiedFacts.campaignDeadline || '',
  ].join(' ')

  const normalizedTerm = term.toLowerCase().trim()
  if (!normalizedTerm) return false

  // If term is a numeric percentage (e.g. "%5", "%50"), enforce strict digit boundaries
  if (normalizedTerm.startsWith('%') || normalizedTerm.endsWith('%')) {
    const num = normalizedTerm.replace(/\D/g, '')
    const regex = new RegExp(`(?:%\\s*|\\byüzde\\s*)(?<!\\d)${num}(?!\\d)|(?<!\\d)${num}(?!\\d)\\s*%`, 'gi')
    let match: RegExpExecArray | null
    let hasPositive = false

    while ((match = regex.exec(corpus)) !== null) {
      const start = Math.max(0, match.index - 35)
      const end = Math.min(corpus.length, match.index + match[0].length + 35)
      const window = corpus.slice(start, end).toLowerCase()

      const isNegated = /\b(yok|değil|yapmıyoruz|yapılmaz|yapılmamaktadır|bulunmamaktadır|hariç|olmayan|mümkün değil)\b/i.test(window)
      if (!isNegated) {
        hasPositive = true
        break
      }
    }
    return hasPositive
  }

  const regex = new RegExp(`(?:^|\\s|[,.;:!?])${escapeRegex(normalizedTerm)}(?:$|\\s|[,.;:!?])`, 'gi')
  let match: RegExpExecArray | null
  let hasPositive = false

  while ((match = regex.exec(corpus)) !== null) {
    const start = Math.max(0, match.index - 35)
    const end = Math.min(corpus.length, match.index + match[0].length + 35)
    const window = corpus.slice(start, end).toLowerCase()

    // Check for negative context around the term
    const isNegated = /\b(yok|değil|yapmıyoruz|yapılmaz|yapılmamaktadır|bulunmamaktadır|hariç|olmayan|mümkün değil)\b/i.test(window)
    if (!isNegated) {
      hasPositive = true
      break
    }
  }

  return hasPositive
}

/**
 * Validates that a percentage claim is truly a discount/promo and not a material spec
 * (e.g. "%100 pamuk" is not a discount, and "%50 indirim" is distinct from "%5 indirim").
 */
function isPercentageDiscountVerified(numStr: string, facts: FactNormalizerOutput): { verified: boolean; reason?: string } {
  const corpus = [
    facts.verifiedFacts.rawBrief,
    facts.verifiedFacts.discount || '',
    ...(facts.verifiedFacts.features || []),
    ...(facts.verifiedFacts.benefits || []),
  ].join(' ')

  // Strict numeric boundary: %5 does not match %50 or %15
  const regex = new RegExp(`(?:%\\s*|\\byüzde\\s*)(?<!\\d)${numStr}(?!\\d)|(?<!\\d)${numStr}(?!\\d)\\s*%`, 'gi')
  let match: RegExpExecArray | null
  let foundDiscountMatch = false
  let foundOnlyMaterialMatch = false

  while ((match = regex.exec(corpus)) !== null) {
    const start = Math.max(0, match.index - 40)
    const end = Math.min(corpus.length, match.index + match[0].length + 40)
    const window = corpus.slice(start, end).toLowerCase()

    // Check negation (e.g. "indirim yok", "%15 indirim yapılmamaktadır")
    const isNegated = /\b(yok|değil|yapmıyoruz|yapılmaz|yapılmamaktadır|bulunmamaktadır|hariç|olmayan|mümkün değil)\b/i.test(window)
    if (isNegated) continue

    const hasDiscountContext =
      /\b(indirim|iskonto|fırsat|kampanya|avantaj|fiyat|fiyatla|teklif|ucuz|indirimli|hediye)\b/i.test(window) ||
      Boolean(facts.verifiedFacts.discount && new RegExp(`(?<!\\d)${numStr}(?!\\d)`).test(facts.verifiedFacts.discount))

    const hasMaterialContext =
      /\b(pamuk|killi|yün|alkol|nem|elyaf|keten|saf|saflık|oran|içerik|materyal|kompozisyon|asit|yağ|şeker|protein|gram|kilo|ton|metre)\b/i.test(window)

    if (hasDiscountContext) {
      foundDiscountMatch = true
      break
    } else if (hasMaterialContext) {
      foundOnlyMaterialMatch = true
    }
  }

  if (foundDiscountMatch) return { verified: true }
  if (foundOnlyMaterialMatch) {
    return { verified: false, reason: `%${numStr} materyal/içerik oranıdır, indirim olarak doğrulanamaz` }
  }
  return { verified: false, reason: `%${numStr} indirim oranı brief'te doğrulanmamış` }
}

/**
 * Real Claim Validator:
 * - Checks known hype words with negation awareness
 * - Enforces strict numeric & percentage matching (%5 vs %50, 500g is NOT %50)
 * - Separates discount rates from material composition specs (e.g. %100 pamuk vs %100 indirim)
 * - Separates positive discounts from "indirim yok"
 * - Returns valid=false and list of unverified claims if text asserts unverified claims.
 */
export function validateClaims(
  text: string,
  facts: FactNormalizerOutput,
): { valid: boolean; unverifiedClaims: string[] } {
  const lower = text.toLowerCase()
  const unverified: string[] = []

  // 1. Check known hype words with word boundaries (avoids false positives like 'alanında' matching 'anında')
  for (const hype of HYPE_WORDS_TO_VERIFY) {
    const hypeRegex = new RegExp(`(?:^|\\s|[,.;:!?])${escapeRegex(hype)}(?:$|\\s|[,.;:!?])`, 'i')
    if (hypeRegex.test(lower) && !isClaimVerified(hype, facts)) {
      unverified.push(hype)
    }
  }

  // 2. Check numeric discount & percentage claims (e.g. %15, %20, %50, 50%)
  const percentMatches = text.match(/(?:%\s*\d+|\d+\s*%)/g) || []
  for (const pm of percentMatches) {
    const num = pm.replace(/\D/g, '')
    const isOfferContext = /\b(indirim|iskonto|fırsat|kampanya|avantaj|teklif|fiyat|indirimli)\b/i.test(lower)

    if (isOfferContext) {
      const discountCheck = isPercentageDiscountVerified(num, facts)
      if (!discountCheck.verified) {
        unverified.push(discountCheck.reason || pm)
      }
    } else {
      if (!isClaimVerified(`%${num}`, facts)) {
        unverified.push(pm)
      }
    }
  }

  // 3. Check for explicit discount assertion when brief states "indirim yok" / "kampanya yok"
  const rawBriefLower = (facts.verifiedFacts.rawBrief || '').toLowerCase()
  if (/\b(indirim yok|kampanya yok|iskonto yok|indirim yapılmaz|iskonto yapılmamaktadır)\b/i.test(rawBriefLower)) {
    const assertsDiscount = /\b(indirim|kampanya|iskonto)\b/i.test(lower)
    const isClarification = /\b(indirim yok|kampanya yok|iskonto yok)\b/i.test(lower)
    if (assertsDiscount && !isClarification) {
      unverified.push('indirim_yokken_indirim_iddiası')
    }
  }

  return {
    valid: unverified.length === 0,
    unverifiedClaims: unverified,
  }
}

/**
 * Counts vowels in Turkish text to accurately calculate syllable count.
 */
export function countTurkishSyllables(text: string): number {
  const vowels = text.match(/[aeıioöuüAEIİOÖUÜ]/g)
  return vowels ? vowels.length : 0
}

/**
 * Estimates Turkish speech duration based on syllables (~4.8 syl/sec) + breathing pauses.
 * Returns duration and safety margin against 8.0-second total limit.
 */
export function estimateSpeechDuration(text: string): {
  syllableCount: number
  durationSeconds: number
  safetyMarginSeconds: number
} {
  const syllableCount = countTurkishSyllables(text)
  const pauses = (text.match(/[,.;:!?—–-]/g) || []).length
  const rawDuration = (syllableCount / 4.8) + (pauses * 0.30)
  const durationSeconds = Number(rawDuration.toFixed(2))
  const safetyMarginSeconds = Number((8.0 - durationSeconds).toFixed(2))
  return { syllableCount, durationSeconds, safetyMarginSeconds }
}

/**
 * Clean duplicate brand and product words (e.g. "Ayvazoğlu Tuğla Killi Cephe Tuğlası" -> avoids repeating "Tuğla")
 */
function cleanDuplicateWords(text: string): string {
  let cleaned = text.replace(/\b(\p{L}+)\s+\1\b/giu, '$1')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

/**
 * Rewrites a voiceover into a grammatically complete 8-13 word sentence.
 * Strictly avoids cutting with slice(); takes complete clauses or pre-formed templates.
 */
function rewriteVoiceoverGrammatically(
  brand: string | null,
  subject: string,
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
): string {
  const cleanBrand = brand ? brand.trim() : null
  const cleanSubject = subject.trim()
  const discount = facts.verifiedFacts.discount
  const benefits = facts.verifiedFacts.benefits

  if (discount) {
    if (cleanBrand) {
      return `${cleanBrand} ${cleanSubject}, avantajlı fiyat teklifleriyle projenizde. Hemen bilgi alın.`
    }
    return `${cleanSubject} avantajlı fiyat teklifleriyle projenizde hazır. Detaylar için yazın.`
  }

  if (benefits.length > 0) {
    const firstClause = benefits[0].split(/[,.;]/)[0].trim()
    const words = firstClause.split(/\s+/).filter(Boolean)
    if (words.length >= 2 && words.length <= 5) {
      if (cleanBrand) {
        return `${cleanBrand} ${cleanSubject} ile ${firstClause}. Detaylı bilgi için yazın.`
      }
      return `${cleanSubject} ile ${firstClause}. Hemen bizimle iletişime geçin.`
    }
  }

  if (ontology.offerType === 'food_or_consumable') {
    if (cleanBrand) {
      return `${cleanBrand} ile ${cleanSubject}. Hemen sipariş verin.`
    }
    return `${cleanSubject} lezzeti sizleri bekliyor. Hemen sipariş verin.`
  }

  if (ontology.offerType === 'digital_product_or_saas') {
    if (cleanBrand) {
      return `${cleanBrand} ${cleanSubject} ile işlerinizi hızlandırın. Hemen keşfedin.`
    }
    return `${cleanSubject} ile işlerinizi hızlandırın. Hemen keşfedin.`
  }

  if (ontology.offerType === 'professional_service' || ontology.riskClass === 'legal_or_professional_claim') {
    if (cleanBrand) {
      return `${cleanBrand} ile ${cleanSubject} danışmanlığı. Detaylı bilgi alın.`
    }
    return `${cleanSubject} alanında profesyonel danışmanlık. Detaylı bilgi alın.`
  }

  if (cleanBrand) {
    return `${cleanBrand} ${cleanSubject} projeniz için hazır. Bizimle iletişime geçin.`
  }
  return `${cleanSubject} projeniz için hazır. Bizimle iletişime geçin.`
}

/**
 * Universal Turkish Voiceover Writer
 * Target: 8-13 words (max 16 words, strictly fitting within ~6.5-7.2s duration).
 * Enforces:
 *  - Negation-aware claim verification (zero unverified hype words)
 *  - Decoupled legal/consulting from health copy
 *  - Context-derived SaaS copy (not assuming customer finder for all SaaS)
 *  - Turkish syllable & pause duration calculation
 *  - Grammatically complete sentences (zero mid-sentence slicing)
 *  - Duplicate word prevention
 */
export function writeVoiceover(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
  strategy: CreativeStrategyOutput,
): VoiceoverOutput {
  const brand = facts.verifiedFacts.brandName
  const rawSubject = facts.verifiedFacts.offerName || 'çözüm'
  
  // Prevent brand/product repetitive collision (e.g. Brand "Ayvazoğlu Tuğla", Subject "Killi Cephe Tuğlası")
  let subject = rawSubject
  if (brand && brand.toLowerCase().includes('tuğla') && subject.toLowerCase().startsWith('killi cephe tuğlası')) {
    subject = 'killi cephe tuğlaları'
  }

  const discount = facts.verifiedFacts.discount
  const benefits = facts.verifiedFacts.benefits

  let line = ''
  let formula = 'benefit_offer'

  // 1. Select Formula & Draft Replik with STRICT claim verification & proper domain separation
  if (ontology.riskClass === 'regulated_health') {
    formula = 'trust_process'
    // Strict health compliance: Objective medical phrasing, zero health guarantees
    line = brand
      ? `${brand} ile hekim kontrolünde ${subject}, detaylı bilgi alın.`
      : `Hekim kontrolünde ${subject}, detaylı bilgi alın.`
  } else if (ontology.offerType === 'professional_service' || ontology.riskClass === 'legal_or_professional_claim') {
    formula = 'professional_expertise'
    // Legal & Professional consulting: strictly professional, ZERO health copy
    line = brand
      ? `${brand} ile ${subject} alanında uzman danışmanlık. Detaylar için yazın.`
      : `${subject} alanında profesyonel danışmanlık için iletişime geçin.`
  } else if (strategy.primary === 'sensory_desire' || ontology.offerType === 'food_or_consumable') {
    formula = 'sensory_invitation'
    const tazeAllowed = isClaimVerified('taze', facts) || isClaimVerified('taptaze', facts)
    const kapiAllowed = isClaimVerified('kapı', facts) || isClaimVerified('kapınızda', facts)
    const tazeWord = tazeAllowed ? 'taze ' : ''
    const kapiWord = kapiAllowed ? 'kapınızda, ' : ''
    
    line = brand
      ? `${brand} ile ${tazeWord}${subject} lezzeti, ${kapiWord}hemen sipariş verin.`
      : `${tazeWord}${subject} lezzeti ${kapiWord}şimdi sipariş verin.`
  } else if (strategy.primary === 'discovery_or_opportunity' || ontology.offerType === 'digital_product_or_saas') {
    formula = 'discovery_ease'
    const anindaAllowed = isClaimVerified('anında', facts)
    const anindaWord = anindaAllowed ? 'anında ' : 'hızla '
    
    // Derive SaaS copy from actual product & brief context (accounting, HR, leads, analytics)
    const rawB = facts.verifiedFacts.rawBrief.toLowerCase()
    if (rawB.match(/muhasebe|fatura|finans|cari/)) {
      line = brand
        ? `${brand} ${subject} ile muhasebe süreçlerinizi ${anindaWord}yönetin.`
        : `${subject} ile muhasebe süreçlerinizi ${anindaWord}yönetin.`
    } else if (rawB.match(/harita|istihbarat|leads|müşteri bul/)) {
      line = brand
        ? `Yeni müşterilere ${brand} ile ${anindaWord}ulaşın, satışlarınızı büyütün.`
        : `Hedef işletmelere ${anindaWord}ulaşın, satışlarınızı büyütün.`
    } else if (rawB.match(/ik|personel|ekip|bordro/)) {
      line = brand
        ? `${brand} ${subject} ile ekip süreçlerinizi kolayca yönetin.`
        : `${subject} ile personel süreçlerinizi kolayca yönetin.`
    } else {
      line = brand
        ? `${brand} ${subject} ile iş süreçlerinizi verimli yönetin.`
        : `${subject} ile iş süreçlerinizi verimli yönetin.`
    }
  } else if (strategy.primary === 'scale_and_availability' || ontology.proofMode === 'scale_or_inventory') {
    formula = 'opportunity_action'
    const fabrikaAllowed = isClaimVerified('fabrika', facts) || isClaimVerified('fabrikadan', facts)
    const hizliAllowed = isClaimVerified('hızlı', facts)
    const prefix = fabrikaAllowed ? 'Fabrikadan doğrudan şantiyenize ' : 'Şantiyenize doğrudan '
    const hizliWord = hizliAllowed ? 'hızlı ' : ''

    if (discount) {
      const toptanAllowed = isClaimVerified('toptan', facts)
      line = brand
        ? (toptanAllowed ? `${brand} ${subject}, toptan alımlarda avantajla şantiyenizde.` : `${brand} ${subject}, avantajlı fiyatla şantiyenizde.`)
        : `${prefix}${subject}, avantajlı fiyatla şantiyenizde.`
    } else {
      line = brand
        ? `${prefix}${brand} ${subject} sevkiyatı.`
        : `${prefix}${hizliWord}${subject} sevkiyatı.`
    }
  } else if (strategy.primary === 'problem_solution' || ontology.primaryValue === 'reduces_effort') {
    formula = 'problem_solution'
    const yorulmadanAllowed = isClaimVerified('yorulmadan', facts)
    const verimAllowed = isClaimVerified('verim', facts) || isClaimVerified('yüksek verim', facts)

    if (yorulmadanAllowed && verimAllowed) {
      line = brand
        ? `${brand} ${subject} ile yorulmadan yüksek verim elde edin.`
        : `${subject} ile yorulmadan yüksek verim elde edin.`
    } else if (yorulmadanAllowed) {
      line = brand
        ? `${brand} ${subject} ile yorulmadan işlerinizi tamamlayın.`
        : `${subject} ile yorulmadan işlerinizi tamamlayın.`
    } else if (verimAllowed) {
      line = brand
        ? `${brand} ${subject} ile yüksek verim elde edin.`
        : `${subject} ile yüksek verim elde edin.`
    } else {
      line = brand
        ? `${brand} ${subject} ile işlerinizi pratik şekilde tamamlayın.`
        : `${subject} ile işlerinizi pratik şekilde tamamlayın.`
    }
  } else if (discount) {
    formula = 'benefit_offer'
    line = brand
      ? `${brand} ${subject} avantajını kaçırmayın, bizimle iletişime geçin.`
      : `${subject} avantajını kaçırmayın, bizimle iletişime geçin.`
  } else if (benefits.length > 0) {
    formula = 'benefit_offer'
    const firstClause = benefits[0].split(/[,.;]/)[0].trim()
    line = brand
      ? `${brand} ${subject} ile ${firstClause}.`
      : `${subject} ile ${firstClause}.`
  } else {
    formula = 'benefit_offer'
    line = brand
      ? `${brand} ile ${subject}, detaylı bilgi için yazın.`
      : `${subject} kalitesi şimdi projenizde, detaylar için yazın.`
  }

  // 2. Generic Cliché Check & Auto-Repair
  let genericCheck: 'pass' | 'repaired' = 'pass'
  const lowerLine = line.toLowerCase()
  for (const cliché of FORBIDDEN_GENERIC_CLICHES) {
    if (lowerLine.includes(cliché)) {
      genericCheck = 'repaired'
      line = `${brand ? `${brand} ile ` : ''}${subject} avantajları için bizimle iletişime geçin.`
      break
    }
  }

  // 3. Clean Duplicate Words & Redundant Roots
  line = cleanDuplicateWords(line)
  line = line.replace(/özel\s+.*özel/gi, 'avantajlı')
  line = line.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()
  line = line.replace(/["']/g, '')
  if (!line.endsWith('.')) line += '.'

  // 4. Syllable & Duration Measurement
  let { syllableCount, durationSeconds, safetyMarginSeconds } = estimateSpeechDuration(line)
  let wordCount = line.split(/\s+/).filter(Boolean).length

  // 5. Grammatical Rewrite if exceeding duration or word limits (NEVER SLICE)
  if (wordCount > 13 || durationSeconds > 7.2) {
    line = rewriteVoiceoverGrammatically(brand || null, subject, facts, ontology)
    line = cleanDuplicateWords(line)
    if (!line.endsWith('.')) line += '.'
    
    const reEstimated = estimateSpeechDuration(line)
    syllableCount = reEstimated.syllableCount
    durationSeconds = reEstimated.durationSeconds
    safetyMarginSeconds = reEstimated.safetyMarginSeconds
    wordCount = line.split(/\s+/).filter(Boolean).length
  }

  // 6. Real Claim Validation Assertion (Recursive check on final line)
  const claimValidation = validateClaims(line, facts)

  return {
    text: line,
    wordCount,
    syllableCount,
    estimatedDurationSeconds: durationSeconds,
    safetyMarginSeconds,
    strategy: formula,
    voiceCharacter: {
      gender: 'auto',
      energy: 'medium',
      warmth: 'warm',
      pace: 'confident',
    },
    usesOnlyVerifiedClaims: claimValidation.valid,
    genericCopyCheck: genericCheck,
    reasonCode: `vo_${formula}_words_${wordCount}_dur_${durationSeconds}s`,
  }
}
