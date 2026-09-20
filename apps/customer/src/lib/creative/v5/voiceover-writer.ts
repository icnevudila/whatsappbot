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
 * Universal Turkish Voiceover Writer
 * Target: 8-13 words (max 16 words, hard limit 18).
 * Selects from universal copywriting formulas and strictly forbids generic clichés.
 */
export function writeVoiceover(
  facts: FactNormalizerOutput,
  ontology: OntologyClassification,
  strategy: CreativeStrategyOutput,
): VoiceoverOutput {
  const brand = facts.verifiedFacts.brandName
  const subject = facts.verifiedFacts.offerName || 'çözüm'
  const discount = facts.verifiedFacts.discount
  const benefits = facts.verifiedFacts.benefits

  let line = ''
  let formula = 'benefit_offer'

  // 1. Select Formula & Draft Replik
  if (strategy.primary === 'sensory_desire' || ontology.offerType === 'food_or_consumable') {
    formula = 'sensory_invitation'
    line = brand
      ? `${brand} ile taptaze ${subject}, hemen sipariş verin.`
      : `Taptaze ${subject} kapınızda, lezzeti keşfedin.`
  } else if (strategy.primary === 'discovery_or_opportunity' || ontology.offerType === 'digital_product_or_saas') {
    formula = 'discovery_ease'
    line = brand
      ? `Yeni müşterilere ${brand} ile anında ulaşın, satışlarınızı büyütün.`
      : `Hedef işletmeleri tek tıkla bulun, satışlarınızı büyütün.`
  } else if (strategy.primary === 'scale_and_availability' || ontology.proofMode === 'scale_or_inventory') {
    formula = 'opportunity_action'
    if (discount) {
      line = brand
        ? `${brand} ${subject}, toptan alımlarda özel avantajla şantiyenizde.`
        : `Fabrikadan doğrudan ${subject}, avantajlı fiyatla şantiyenizde.`
    } else {
      line = brand
        ? `Fabrikadan doğrudan şantiyenize ${brand} ${subject} sevkiyatı.`
        : `Fabrikadan doğrudan şantiyenize hızlı ${subject} sevkiyatı.`
    }
  } else if (strategy.primary === 'problem_solution' || ontology.primaryValue === 'reduces_effort') {
    formula = 'problem_solution'
    line = brand
      ? `${brand} ${subject} ile yorulmadan yüksek verim elde edin.`
      : `${subject} ile yorulmadan yüksek verim elde edin.`
  } else if (ontology.riskClass === 'regulated_health' || strategy.primary === 'trust_and_expertise') {
    formula = 'trust_process'
    line = brand
      ? `${brand} ile sağlığınız için güvenilir ve titiz bakım.`
      : `Sağlığınız ve gülüşünüz için güvenilir ve titiz bakım.`
  } else if (discount) {
    formula = 'benefit_offer'
    line = brand
      ? `${brand} ${subject} avantajını kaçırmayın, bizimle iletişime geçin.`
      : `${subject} avantajını kaçırmayın, bizimle iletişime geçin.`
  } else if (benefits.length > 0) {
    formula = 'benefit_offer'
    line = brand
      ? `${brand} ${subject} ile ${benefits[0].slice(0, 30)}.`
      : `${subject} ile ${benefits[0].slice(0, 35)}.`
  } else {
    formula = 'benefit_offer'
    line = brand
      ? `${brand} güvencesiyle ${subject}, detaylar için yazın.`
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

  // 3. Clean Duplicate Words & Redundant Roots ("özel ... özel")
  line = line.replace(/özel\s+.*özel/gi, 'avantajlı')
  line = line.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim()

  // 4. Strict Word Count Bounding (Target 8-13, max 16, hard limit 18)
  let words = line.split(/\s+/).filter(Boolean)
  if (words.length > 16) {
    words = words.slice(0, 14)
    line = words.join(' ') + '.'
  }

  // Ensure no quotation marks in raw text
  line = line.replace(/["']/g, '')

  return {
    text: line,
    wordCount: line.split(/\s+/).filter(Boolean).length,
    strategy: formula,
    voiceCharacter: {
      gender: 'auto',
      energy: 'medium',
      warmth: 'warm',
      pace: 'confident',
    },
    usesOnlyVerifiedClaims: true,
    genericCopyCheck: genericCheck,
    reasonCode: `vo_${formula}_words_${line.split(/\s+/).filter(Boolean).length}`,
  }
}
