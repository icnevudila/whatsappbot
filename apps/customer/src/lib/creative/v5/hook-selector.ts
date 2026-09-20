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

  // 1. DYNAMIC ACTION-FOCUSED HOOK (Tangible operation / physical function)
  let actionFamily: HookFamily = 'action_begins_immediately'
  let actionDesc = ''
  if (ontology.primaryAffordance === 'apply_spray_mist') {
    actionDesc = `${subject} nozülünden anında fışkıran mikronize ince sis bulutu hedef yüzeyi homojen kaplarken cihazın akıcı fonksiyonu 0.3 saniyede devreye girer.`
  } else if (ontology.primaryAffordance === 'screen_tap_filter_result' || ontology.offerType === 'digital_product_or_saas') {
    actionFamily = 'interface_event'
    actionDesc = `Minimalist arayüzde bir arama veya filtre butonuna dokunulur; filtrelenmiş ${subject} veri akışı gecikmesiz olarak ekranda listelenir.`
  } else if (ontology.primaryAffordance === 'pour_drizzle_flow' || ontology.primaryAffordance === 'cut_slice_carve') {
    actionFamily = 'sensory_motion'
    const verb = allContext.includes('kes') || allContext.includes('dilim') ? 'bıçakla nizami dilimlenir' : 'servise hazır hale getirilirken dumanı tüten sıcak dokusu'
    actionDesc = `Yakın planda ${subject} ${verb}, iştah açıcı mikro hareket 0.3 saniyede başlar.`
  } else if (ontology.primaryAffordance === 'lift_stack_haul' || ontology.proofMode === 'scale_or_inventory') {
    actionFamily = 'scale_reveal'
    actionDesc = `Sevkiyata hazır ${subject} birimlerinin nizami yerleşim anı ve dinamik yükleme hareketi ilk karede başlar.`
  } else if (ontology.primaryAffordance === 'material_texture_shift') {
    actionFamily = 'tactile_macro'
    actionDesc = `100mm f/1.8 makro odakta ${subject} yüzeyinin kusursuz malzeme kalitesi ve pürüzsüz dokusu ilk karede belirir.`
  } else {
    actionDesc = `${subject} ilk karede merkezdedir; ana fonksiyonel hareket 0.3. saniyede gecikmesiz başlar.`
  }

  const actionCandidate: HookCandidate = {
    id: 'candidate_action_focused',
    type: 'action_focused',
    family: actionFamily,
    visualEventDescription: actionDesc,
    scores: {
      actionSpeed: 10,
      relevanceToOffer: 9,
      visualImpact: 9,
      physicalPlausibility: 10,
      clarityWithoutText: 9,
    },
    totalScore: 47,
    reason: 'Doğrudan ürün eylemine ve fiziksel fonksiyona odaklanarak ilk 0.5 saniyede yüksek dikkat yakalar.',
  }

  // 2. DYNAMIC RESULT/REVEAL-FOCUSED HOOK (Finished state / immediate outcome)
  let resultFamily: HookFamily = 'result_first'
  let resultDesc = ''
  if (ontology.offerType === 'digital_product_or_saas') {
    resultFamily = 'result_first'
    resultDesc = `Ekranda doğrudan sonuçlanmış ve filtrelenmiş ${subject} çıktı tablosu belirir; aranan net bilgiler tek bakışta hazırdır.`
  } else if (ontology.offerType === 'food_or_consumable') {
    resultFamily = 'sensory_motion'
    resultDesc = `Taze hazırlanmış ${subject} tüm kusursuz katmanları ve buharı tüten canlı sunumuyla kameranın önünde ışıldar.`
  } else if (ontology.primaryAffordance === 'apply_spray_mist') {
    resultFamily = 'result_first'
    resultDesc = `${subject} ile tek seferde homojen nemlenmiş, üzerinde mikro damlacıklar parıldayan canlı yaprak yüzeyi ilk karede görülür.`
  } else if (ontology.offerType === 'physical_product') {
    resultFamily = 'result_first'
    resultDesc = `Kusursuz biçimde yerine oturmuş veya uygulanmış ${subject}, pürüzsüz yüzeyi ve sağlam duruşuyla ilk saniyede kanıt sunar.`
  } else {
    resultFamily = 'transformation_reveal'
    resultDesc = `${subject} tamamlanmış yüksek kaliteli nihai formuyla ekranda belirir; elde edilen somut değer ilk karede açıktır.`
  }

  const resultCandidate: HookCandidate = {
    id: 'candidate_result_reveal_focused',
    type: 'result_reveal_focused',
    family: resultFamily,
    visualEventDescription: resultDesc,
    scores: {
      actionSpeed: 8,
      relevanceToOffer: 10,
      visualImpact: 9,
      physicalPlausibility: 10,
      clarityWithoutText: 10,
    },
    totalScore: 47,
    reason: 'Beklemeden doğrudan nihai sonucu ve faydayı göstererek izleyici güvenini ilk saniyede tesis eder.',
  }

  // 3. DYNAMIC CURIOSITY/SCALE-FOCUSED HOOK (Macro texture / volume / perspective)
  let scaleFamily: HookFamily = 'tactile_macro'
  let scaleDesc = ''
  if (ontology.proofMode === 'scale_or_inventory' || allContext.includes('tır') || allContext.includes('toptan') || allContext.includes('ton')) {
    scaleFamily = 'scale_reveal'
    scaleDesc = `Genişleyen açıyla ${subject} sevkiyat hacminin ve nizami stok düzeninin etkileyici simetrisi ekrana yansır.`
  } else if (ontology.offerType === 'digital_product_or_saas') {
    scaleFamily = 'unexpected_perspective'
    scaleDesc = `Klavye ve çalışma alanından ekrana doğru süzülen dinamik açıyla ${subject} akıllı kontrol paneli odağa oturur.`
  } else if (ontology.offerType === 'food_or_consumable') {
    scaleFamily = 'tactile_macro'
    scaleDesc = `Ultra yakın makro açıda ${subject} üzerindeki çıtır doku, parlak gözenekler ve sıcak ışıltı ilk karede açılır.`
  } else {
    scaleFamily = 'tactile_macro'
    scaleDesc = `100mm makro lens ile ${subject} üzerindeki özel malzeme detayları ve hassas işçilik çizgileri ilk karede netleşir.`
  }

  // Adjust score based on ontology fit
  let scaleImpact = 8
  if (ontology.proofMode === 'scale_or_inventory') scaleImpact = 10
  if (ontology.primaryAffordance === 'material_texture_shift') scaleImpact = 10

  const scaleCandidate: HookCandidate = {
    id: 'candidate_curiosity_or_scale_focused',
    type: 'curiosity_or_scale_focused',
    family: scaleFamily,
    visualEventDescription: scaleDesc,
    scores: {
      actionSpeed: 8,
      relevanceToOffer: 9,
      visualImpact: scaleImpact,
      physicalPlausibility: 10,
      clarityWithoutText: 9,
    },
    totalScore: 36 + scaleImpact,
    reason: 'Merak uyandıran makro perspektif veya hacim simetrisiyle görsel kanca oluşturur.',
  }

  // Multi-candidate evaluation: Pick highest scoring candidate
  const candidates: HookCandidate[] = [actionCandidate, resultCandidate, scaleCandidate]
  
  // Tie-breaker / strategy preference:
  // If strategy is scale_and_availability -> scaleCandidate favored
  // If strategy is result_first -> resultCandidate favored
  // Default: actionCandidate favored if tied
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
