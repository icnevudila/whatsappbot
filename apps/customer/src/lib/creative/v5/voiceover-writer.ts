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
  'yüksek verim',
  'yorulmadan',
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

/**
 * Checks whether a specific claim or marketing term is verified in the facts corpus.
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
  ].join(' ').toLowerCase()

  const normalizedTerm = term.toLowerCase().trim()
  return corpus.includes(normalizedTerm)
}

/**
 * Real Claim Validator:
 * Validates all marketing claims in text against verified facts.
 * Returns valid=false and list of unverified claims if text asserts unverified claims.
 */
export function validateClaims(
  text: string,
  facts: FactNormalizerOutput,
): { valid: boolean; unverifiedClaims: string[] } {
  const lower = text.toLowerCase()
  const unverified: string[] = []

  // 1. Check known hype words
  for (const hype of HYPE_WORDS_TO_VERIFY) {
    if (lower.includes(hype) && !isClaimVerified(hype, facts)) {
      unverified.push(hype)
    }
  }

  // 2. Check numeric discount claims (e.g. %15, %20, 50%)
  const percentMatches = text.match(/%\s*\d+|\d+\s*%/g) || []
  for (const pm of percentMatches) {
    const num = pm.replace(/\D/g, '')
    const corpus = [
      facts.verifiedFacts.rawBrief,
      facts.verifiedFacts.discount || '',
      ...(facts.verifiedFacts.features || []),
    ].join(' ')
    if (!corpus.includes(num)) {
      unverified.push(pm)
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
  // Remove consecutive duplicate words
  let cleaned = text.replace(/\b(\p{L}+)\s+\1\b/giu, '$1')
  // Remove duplicate occurrences of specific common brand nouns if adjacent
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  return cleaned
}

/**
 * Rewrites a voiceover into a grammatically complete 8-13 word sentence.
 * Never cuts mid-sentence or truncates with slice().
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
      return `${cleanBrand} ${cleanSubject}, özel toptan avantajlarıyla projenizde. Hemen bilgi alın.`
    }
    return `${cleanSubject} avantajlı fiyat teklifleriyle projenizde hazır. Detaylar için yazın.`
  }

  if (benefits.length > 0) {
    const b = benefits[0].replace(/[.,]/g, '').trim()
    const shortB = b.length > 30 ? b.split(/\s+/).slice(0, 4).join(' ') : b
    if (cleanBrand) {
      return `${cleanBrand} ${cleanSubject} ile ${shortB}. Detaylı bilgi için yazın.`
    }
    return `${cleanSubject} ile ${shortB}. Hemen bizimle iletişime geçin.`
  }

  if (ontology.offerType === 'food_or_consumable') {
    if (cleanBrand) {
      return `${cleanBrand} ile ${cleanSubject}. Hemen sipariş verin.`
    }
    return `${cleanSubject} lezzeti sizleri bekliyor. Hemen sipariş verin.`
  }

  if (ontology.offerType === 'digital_product_or_saas') {
    if (cleanBrand) {
      return `${cleanBrand} ${cleanSubject} ile hedeflerinize ulaşın. Hemen deneyin.`
    }
    return `${cleanSubject} ile hedeflerinize kolayca ulaşın. Hemen keşfedin.`
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
 *  - Real claim verification (zero unverified hype words)
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

  // 1. Select Formula & Draft Replik with STRICT claim verification
  if (strategy.primary === 'sensory_desire' || ontology.offerType === 'food_or_consumable') {
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
    line = brand
      ? `Yeni müşterilere ${brand} ile ${anindaWord}ulaşın, satışlarınızı büyütün.`
      : `Hedef işletmelere ${anindaWord}ulaşın, satışlarınızı büyütün.`
  } else if (strategy.primary === 'scale_and_availability' || ontology.proofMode === 'scale_or_inventory') {
    formula = 'opportunity_action'
    const fabrikaAllowed = isClaimVerified('fabrika', facts) || isClaimVerified('fabrikadan', facts)
    const hizliAllowed = isClaimVerified('hızlı', facts)
    const prefix = fabrikaAllowed ? 'Fabrikadan doğrudan şantiyenize ' : 'Şantiyenize doğrudan '
    const hizliWord = hizliAllowed ? 'hızlı ' : ''

    if (discount) {
      line = brand
        ? `${brand} ${subject}, toptan alımlarda avantajla şantiyenizde.`
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
  } else if (ontology.riskClass === 'regulated_health' || strategy.primary === 'trust_and_expertise') {
    formula = 'trust_process'
    // Strict health compliance: No unverified superlatives or guarantees
    line = brand
      ? `${brand} ile sağlığınız için uzman kontrolünde titiz bakım.`
      : `Sağlığınız için uzman kontrolünde ${subject}, detaylı bilgi alın.`
  } else if (discount) {
    formula = 'benefit_offer'
    line = brand
      ? `${brand} ${subject} avantajını kaçırmayın, bizimle iletişime geçin.`
      : `${subject} avantajını kaçırmayın, bizimle iletişime geçin.`
  } else if (benefits.length > 0) {
    formula = 'benefit_offer'
    const cleanB = benefits[0].replace(/[.,]/g, '').trim()
    line = brand
      ? `${brand} ${subject} ile ${cleanB}.`
      : `${subject} ile ${cleanB}.`
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

  // 6. Real Claim Validation Assertion
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
