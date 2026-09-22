import type {
  OntologyClassification,
  FactNormalizerOutput,
  HookPlanOutput,
  HookCandidate,
  HookFamily,
} from './schemas'

/**
 * Dynamic Universal Hook Selector
 * - Eliminates stereotypes (palette, map pin, sauce drizzle, expert hand).
 * - Generates 3 distinct candidates per campaign:
 *     1. action_focused
 *     2. result_reveal_focused
 *     3. curiosity_or_scale_focused
 * - Scores each candidate on 5 objective criteria (1-10 each, total out of 50):
 *     1. actionSpeed (motion <= 0.5s)
 *     2. relevanceToOffer (tight anchor to verified facts)
 *     3. visualImpact (framing, tactile realism, cinematic light)
 *     4. physicalPlausibility (real-world physics, zero CGI uncanny valley)
 *     5. clarityWithoutText (communicates instantly without text cards)
 * - Returns the winning candidate and full candidate audit trail.
 */
export function selectHook(
  ontology: OntologyClassification,
  factsOrOfferName?: FactNormalizerOutput | string | null,
  optionalFacts?: FactNormalizerOutput,
): HookPlanOutput {
  const facts: FactNormalizerOutput | null =
    factsOrOfferName && typeof factsOrOfferName === 'object' && 'verifiedFacts' in factsOrOfferName
      ? factsOrOfferName
      : optionalFacts || null

  const offerName =
    typeof factsOrOfferName === 'string'
      ? factsOrOfferName
      : facts?.verifiedFacts?.offerName || null

  const subject = offerName || 'ürün'
  const rawBrief = facts?.verifiedFacts?.rawBrief || ''
  const features = facts?.verifiedFacts?.features || []
  const benefits = facts?.verifiedFacts?.benefits || []
  const allContext = `${subject} ${rawBrief} ${features.join(' ')} ${benefits.join(' ')}`.toLowerCase()

  const isAgriOrSprayer =
    ontology.primaryAffordance === 'apply_spray_mist' ||
    Boolean(allContext.match(/(tarım|ziraat|bahçe|çiftlik|ilaçlama|bağ|sera|meyve|fidan|hasat|sulama|püskürt|akülü sırt|sırt pompası|pompa)/i))

  // 1. DYNAMIC ACTION-FOCUSED HOOK (Tangible operation / physical function)
  let actionFamily: HookFamily = 'action_begins_immediately'
  let actionDesc = ''
  if (isAgriOrSprayer || ontology.primaryAffordance === 'apply_spray_mist') {
    actionDesc = `Güneşli, bereketli bir meyve bahçesinde ${subject} nozülünden fışkıran mikronize ince sis bulutu ağaç yapraklarını homojen kaplarken profesyonel bahçe/tarım bakımı 0.3 saniyede devreye girer.`
  } else if (ontology.primaryAffordance === 'screen_tap_filter_result' || ontology.offerType === 'digital_product_or_saas') {
    actionFamily = 'interface_event'
    actionDesc = `Minimalist arayüzde bir arama veya filtre butonuna dokunulur; filtrelenmiş ${subject} veri akışı gecikmesiz olarak ekranda listelenir.`
  } else if (ontology.primaryAffordance === 'pour_drizzle_flow' || ontology.primaryAffordance === 'cut_slice_carve') {
    actionFamily = 'sensory_motion'
    const verb = allContext.includes('kes') || allContext.includes('dilim')
      ? 'bıçakla nizami dilimlenir'
      : 'servise hazır hale getirilirken iştah kabartan formuyla sunulur'
    actionDesc = `Yakın planda ${subject} ${verb}, hareket 0.3 saniyede başlar.`
  } else if (ontology.primaryAffordance === 'lift_stack_haul' || ontology.proofMode === 'scale_or_inventory') {
    actionFamily = 'scale_reveal'
    actionDesc = `Sevkiyata hazır ${subject} birimlerinin nizami yerleşim anı ve dinamik yükleme hareketi ilk karede başlar.`
  } else if (ontology.primaryAffordance === 'material_texture_shift') {
    actionFamily = 'tactile_macro'
    actionDesc = `100mm f/1.8 makro odakta ${subject} yüzeyinin doğal malzeme kalitesi ve belirgin dokusu ilk karede belirir.`
  } else {
    actionDesc = `${subject} ilk karede merkezdedir; ana fonksiyonel hareket 0.3. saniyede gecikmesiz başlar.`
  }

  // 1. DYNAMIC ACTION-FOCUSED HOOK EVALUATION
  let actionRel = 7
  let actionImp = 8
  if (
    ontology.primaryAffordance === 'apply_spray_mist' ||
    ontology.primaryAffordance === 'press_trigger_switch' ||
    allContext.includes('püskürt') ||
    allContext.includes('çalış') ||
    allContext.includes('basınç') ||
    allContext.includes('hareket')
  ) {
    actionRel = 10
    actionImp = 10
  } else if (ontology.proofMode === 'scale_or_inventory' || allContext.includes('tır') || allContext.includes('toptan')) {
    actionRel = 5
    actionImp = 7
  }

  const actionScores = {
    actionSpeed: 10,
    relevanceToOffer: actionRel,
    visualImpact: actionImp,
    physicalPlausibility: 10,
    clarityWithoutText: 9,
  }
  const actionTotal = Object.values(actionScores).reduce((a, b) => a + b, 0)

  const actionCandidate: HookCandidate = {
    id: 'candidate_action_focused',
    type: 'action_focused',
    family: actionFamily,
    visualEventDescription: actionDesc,
    scores: actionScores,
    totalScore: actionTotal,
    reason: 'Doğrudan ürün eylemine ve fiziksel fonksiyona odaklanarak ilk 0.5 saniyede yüksek dikkat yakalar.',
  }

  // 2. DYNAMIC RESULT/REVEAL-FOCUSED HOOK EVALUATION
  let resultFamily: HookFamily = 'result_first'
  let resultDesc = ''
  if (ontology.offerType === 'food_or_consumable') {
    resultFamily = 'sensory_motion'
    resultDesc = `Servise hazır ${subject}, ilk karede iştah kabartan sunumu ve formuyla belirir.`
  } else if (ontology.riskClass === 'regulated_health') {
    resultFamily = 'result_first'
    resultDesc = `Profesyonel klinik ortamında uzman hekim danışmanlığı ilk karede netleşir.`
  } else {
    resultDesc = `${subject} uygulamasının sağladığı somut nihai sonuç ilk karede net şekilde sergilenir.`
  }

  let resultRel = 7
  let resultImp = 8
  if (
    allContext.includes('sonuç') ||
    allContext.includes('gülüş') ||
    allContext.includes('lezzet') ||
    allContext.includes('dönüşüm') ||
    ontology.offerType === 'food_or_consumable' ||
    ontology.riskClass === 'regulated_health' ||
    ontology.offerType === 'venue_or_experience'
  ) {
    resultRel = 10
    resultImp = 10
  } else if (ontology.proofMode === 'scale_or_inventory' || allContext.includes('tır') || allContext.includes('toptan')) {
    resultRel = 6
    resultImp = 7
  }

  const resultScores = {
    actionSpeed: 8,
    relevanceToOffer: resultRel,
    visualImpact: resultImp,
    physicalPlausibility: 10,
    clarityWithoutText: 10,
  }
  const resultTotal = Object.values(resultScores).reduce((a, b) => a + b, 0)

  const resultCandidate: HookCandidate = {
    id: 'candidate_result_reveal_focused',
    type: 'result_reveal_focused',
    family: resultFamily,
    visualEventDescription: resultDesc,
    scores: resultScores,
    totalScore: resultTotal,
    reason: 'Beklemeden doğrudan nihai sonucu ve faydayı göstererek izleyici güvenini ilk saniyede tesis eder.',
  }

  // 3. DYNAMIC CURIOSITY/SCALE-FOCUSED HOOK EVALUATION
  let scaleFamily: HookFamily = 'scale_reveal'
  let scaleDesc = ''
  if (isAgriOrSprayer) {
    scaleFamily = 'scale_reveal'
    scaleDesc = `Güneşli geniş bir meyve bahçesinde sıra sıra dizili ağaçlar arasında ${subject} ile yapılan profesyonel bakım ilk karede kadraja girer.`
  } else if (
    ontology.proofMode === 'scale_or_inventory' ||
    allContext.includes('tır') ||
    allContext.includes('tuğla') ||
    allContext.includes('toptan')
  ) {
    scaleFamily = 'scale_reveal'
    const hasThousands = allContext.includes('binlerce')
    const hasStok = allContext.includes('stok')
    const scaleTerm = hasThousands && hasStok ? 'binlerce stok birimi' : hasThousands ? 'binlerce birim' : hasStok ? 'geniş stok birimleri' : 'nizami birimleri'
    scaleDesc = `Geniş depolama ve sevkiyat alanında nizami istiflenmiş ${scaleTerm} ${subject}, etkileyici hacmiyle ilk karede kadraja girer.`
  } else if (ontology.primaryAffordance === 'material_texture_shift' || ontology.proofMode === 'craftsmanship') {
    scaleFamily = 'tactile_macro'
    scaleDesc = `Yüksek çözünürlüklü makro lens ile ${subject} dokusundaki detaylar ve malzeme yoğunluğu ilk karede vurgulanır.`
  } else {
    scaleFamily = 'unexpected_perspective'
    scaleDesc = `Alışılagelmiş durum ile ${subject} sonrasındaki belirgin fark, odak kaydırma efektiyle ilk saniyede ortaya çıkar.`
  }

  let scaleRel = 5
  let scaleImp = 7
  if (
    !isAgriOrSprayer && (
      ontology.proofMode === 'scale_or_inventory' ||
      allContext.includes('tır') ||
      allContext.includes('toptan') ||
      allContext.includes('ton') ||
      allContext.includes('sevkiyat') ||
      allContext.includes('tuğla') ||
      allContext.includes('hacim')
    )
  ) {
    scaleRel = 10
    scaleImp = 10
  } else if (ontology.primaryAffordance === 'material_texture_shift' || ontology.proofMode === 'craftsmanship') {
    scaleRel = 9
    scaleImp = 9
  }

  const scaleScores = {
    actionSpeed: 7,
    relevanceToOffer: scaleRel,
    visualImpact: scaleImp,
    physicalPlausibility: 10,
    clarityWithoutText: 9,
  }
  const scaleTotal = Object.values(scaleScores).reduce((a, b) => a + b, 0)

  const scaleCandidate: HookCandidate = {
    id: 'candidate_curiosity_or_scale_focused',
    type: 'curiosity_or_scale_focused',
    family: scaleFamily,
    visualEventDescription: scaleDesc,
    scores: scaleScores,
    totalScore: scaleTotal,
    reason: 'Merak uyandıran makro perspektif veya hacim simetrisiyle görsel kanca oluşturur.',
  }

  // Multi-candidate evaluation: Pick highest scoring candidate
  const candidates: HookCandidate[] = [actionCandidate, resultCandidate, scaleCandidate]
  
  let winner = candidates[0]
  for (const c of candidates) {
    if (c.totalScore > winner.totalScore) {
      winner = c
    }
  }

  return {
    family: winner.family,
    subjectVisibleBySeconds: 0.3,
    meaningfulMotionBySeconds: 0.5,
    productOrResultVisible: true,
    establishingShotOnly: false, // Rule: NEVER an establishing-only shot
    relevantToVerifiedValue: true,
    physicallyPlausible: true,
    visualEventDescription: winner.visualEventDescription,
    reasonCode: `hook_${winner.type}_selected_${winner.family}_score_${winner.totalScore}`,
    candidates,
    selectedCandidate: winner,
  }
}
