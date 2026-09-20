import type {
  OntologyClassification,
  HookPlanOutput,
  HookFamily,
} from './schemas'

/**
 * Dynamic Universal Hook Selector
 * Derives visual hooks directly from visual_affordance + proof_mode combinations.
 * Enforces strict criteria: action starts immediately, subject visible <= 0.5s, no establishing-only shot.
 */
export function selectHook(
  ontology: OntologyClassification,
  offerName: string | null,
): HookPlanOutput {
  const subject = offerName || 'ürün ve hizmet'
  let family: HookFamily = 'action_begins_immediately'
  let visualEventDescription = ''

  // 1. Select Hook Family by Affordance and Proof Mode
  if (ontology.proofMode === 'scale_or_inventory') {
    family = 'scale_reveal'
    visualEventDescription = `Kamera paletler dolusu nizami ${subject} stoğuna veya yükleme anına odaklanarak açılır; hacim ve sevkiyat kapasitesi ilk saniyede kanıtlanır.`
  } else if (ontology.proofMode === 'interface_workflow' || ontology.primaryAffordance === 'screen_tap_filter_result') {
    family = 'interface_event'
    visualEventDescription = `Ekrandaki minimalist arayüzde bir butona dokunulur; canlı harita pinleri ve filtrelenmiş ${subject} anında ekranda parlar.`
  } else if (ontology.primaryAffordance === 'pour_drizzle_flow' || ontology.primaryAffordance === 'cut_slice_carve') {
    family = 'sensory_motion'
    visualEventDescription = `Yakın planda taptaze ${subject} dilimlenir veya üzerine dökülen sos/sıvı akışıyla buharı tüten iştah açıcı mikro hareket başlar.`
  } else if (ontology.primaryAffordance === 'apply_spray_mist') {
    family = 'action_begins_immediately'
    visualEventDescription = `${subject} nozülünden anında fışkıran mikronize ince sis bulutu bitkileri kaplarken cihazın akıcı fonksiyonu 0.3 saniyede devreye girer.`
  } else if (ontology.proofMode === 'craftsmanship' || ontology.primaryAffordance === 'artisan_expert_touch') {
    family = 'process_precision'
    visualEventDescription = `Ustanın veya uzmanın elleri ${subject} üzerinde hassas, milimetrik dokunuşunu yaparken malzemenin saf dokusu odak noktasındadır.`
  } else if (ontology.primaryAffordance === 'material_texture_shift') {
    family = 'tactile_macro'
    visualEventDescription = `100mm f/1.8 makro odakta ${subject} yüzeyinin kusursuz malzeme kalitesi, ışık kırılmaları ve pürüzsüz dokusu ilk karede belirir.`
  } else if (ontology.proofMode === 'environment_or_experience') {
    family = 'unexpected_perspective'
    visualEventDescription = `Göz hizasından hızla süzülen kamera doğrudan ${subject} merkezindeki canlı deneyimin ve hareketin içine girer.`
  } else {
    family = 'action_begins_immediately'
    visualEventDescription = `${subject} ilk karede merkezdedir; ana fonksiyon veya eylem 0.4. saniyede gecikmesiz olarak başlar.`
  }

  return {
    family,
    subjectVisibleBySeconds: 0.3,
    meaningfulMotionBySeconds: 0.5,
    productOrResultVisible: true,
    establishingShotOnly: false, // Rule: NEVER an establishing-only shot
    relevantToVerifiedValue: true,
    physicallyPlausible: true,
    visualEventDescription,
    reasonCode: `hook_${family}_from_${ontology.primaryAffordance}_and_${ontology.proofMode}`,
  }
}
