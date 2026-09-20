import type {
  FactNormalizerOutput,
  OntologyClassification,
  OfferType,
  ProofMode,
  PrimaryValue,
  VisualAffordanceAction,
} from './schemas'

/**
 * Universal Advertising Ontology Analyzer
 * Performs semantic classification independently of sector names.
 * Priority: verified_facts > reference_assets > user_goal > product analysis > sector hint > generic fallback
 */
export function analyzeOntology(facts: FactNormalizerOutput): OntologyClassification {
  const offer = facts.verifiedFacts.offerName || ''
  const rawBrief = facts.verifiedFacts.rawBrief || ''
  const brief = facts.verifiedFacts.benefits.join(' ') + ' ' + facts.verifiedFacts.features.join(' ')
  const text = `${offer} ${rawBrief} ${brief} ${facts.verifiedFacts.brandName || ''} ${facts.sectorHint || ''}`.toLowerCase()

  // 1. Offer Type Classification
  let offerType: OfferType = 'physical_product'

  if (
    text.match(/(burger|döner|pizza|tatlı|kahve|pasta|kebap|\byemek\b|yiyecek|içecek|çikolata|lezzet|kahvaltı|gıda|restoran|kafe)/) &&
    !text.match(/(yemek masası|yemek odası|mama sandalyesi)/)
  ) {
    offerType = 'food_or_consumable'
  } else if (text.match(/(kurs|eğitim|seminer|akademi|ders|workshop|okul|sertifika|müfredat)/)) {
    offerType = 'event_or_education'
  } else if (text.match(/(yazılım|platform|\bb2b\b|\bveri\b|\bdata\b|harita|\bapi\b|\bcrm\b|\berp\b|dashboard|\bapp\b|bulut|cloud|\bbot\b|otomasyon)/)) {
    offerType = 'digital_product_or_saas'
  } else if (text.match(/(avukat|hukuk|mali müşavir|danışmanlık|sigorta|patent|vergi|finans|yeminli)/)) {
    offerType = 'professional_service'
  } else if (text.match(/(villa|daire|konut|arsa|gayrimenkul|mülk|rezidans|plaza)/)) {
    offerType = 'property_or_high_consideration_offer'
  } else if (text.match(/(otel|pansiyon|bungalov|tatil|spa|resort|plaj|kamp|etkinlik|deneyim)/)) {
    offerType = 'venue_or_experience'
  } else if (text.match(/(oto servis|ekspertiz|kuaför|berber|kuru temizleme|nakliyat|halı yıkama|tadilat|boyacı|veteriner|bakım|servis|klinik|diş|doktor|hekim|sağlık|poliklinik|terapi|muayene|fitness|gym|spor salonu|antrenör|pilates)/)) {
    offerType = 'local_service'
  } else if (text.match(/(tuğla|çimento|pompa|mobilya|koltuk|ayakkabı|elbise|parfüm|kulaklık|lastik|deterjan|yüzük|mücevher|saat|kablo|cihaz|makine|alet)/)) {
    offerType = 'physical_product'
  } else if (!offer) {
    offerType = 'unknown'
  }

  facts.verifiedFacts.offerType = offerType

  // 2. Proof Mode Classification
  let proofMode: ProofMode = 'product_in_use'

  if (offerType === 'digital_product_or_saas') {
    proofMode = 'interface_workflow'
  } else if (offerType === 'professional_service') {
    proofMode = 'human_expertise'
  } else if (offerType === 'venue_or_experience') {
    proofMode = 'environment_or_experience'
  } else if (offerType === 'local_service') {
    proofMode = 'process'
  } else if (text.match(/(toptan|palet|tır|stok|fabrika|sevkiyat|koli|depo|ton|hacim|üretim)/)) {
    proofMode = 'scale_or_inventory'
  } else if (text.match(/(el yapımı|el işi|özel dikim|ahşap oyma|zanaat|ustalık|deri dikiş|özenle)/)) {
    proofMode = 'craftsmanship'
  } else if (facts.verifiedFacts.discount || facts.verifiedFacts.price) {
    proofMode = 'offer_value'
  }

  // 3. Primary Value Classification
  let primaryValue: PrimaryValue = 'quality_or_craft'

  if (text.match(/(yorulmadan|kolay|zahmetsiz|tek tuşla|pratik|tek tıkla|otomatik)/)) {
    primaryValue = 'reduces_effort'
  } else if (text.match(/(hızlı|anında|saniyesinde|beklemeden|hemen teslim|zamanında)/)) {
    primaryValue = 'speed'
  } else if (text.match(/(fırsat|indirim|iskonto|ucuz|uygun|kampanya|fiyat)/)) {
    primaryValue = 'price_or_value'
  } else if (text.match(/(sağlam|dayanıklı|garantili|ömürlük|güvenilir|nizami)/)) {
    primaryValue = 'reliability'
  } else if (text.match(/(lezzet|taze|nefis|çıtır|kokulu|iştah|sıcak)/)) {
    primaryValue = 'sensory_appeal'
  } else if (text.match(/(rahat|yumuşak|konfor|ferah|huzur)/)) {
    primaryValue = 'comfort'
  } else if (text.match(/(bulun|keşfedin|ulaşın|tespit edin|harita)/)) {
    primaryValue = 'access_or_discovery'
  } else if (text.match(/(şık|estetik|tasarım|prestij|lüks|asil)/)) {
    primaryValue = 'status_or_design'
  }

  // 4. Visual Affordance (Real tangible action)
  let primaryAffordance: VisualAffordanceAction = 'toggle_open_close'

  if (offerType === 'food_or_consumable') {
    primaryAffordance = text.match(/(kes|dilim|bıçak)/) ? 'cut_slice_carve' : 'pour_drizzle_flow'
  } else if (offerType === 'digital_product_or_saas') {
    primaryAffordance = 'screen_tap_filter_result'
  } else if (offerType === 'venue_or_experience') {
    primaryAffordance = 'enter_experience_space'
  } else if (offerType === 'professional_service' || offerType === 'local_service') {
    primaryAffordance = 'artisan_expert_touch'
  } else if (text.match(/(püskürt|ilaçla|sisle|sprey|damla|su)/)) {
    primaryAffordance = 'apply_spray_mist'
  } else if (text.match(/(kaldır|taşı|palet|forklift|yükle|diz)/)) {
    primaryAffordance = 'lift_stack_haul'
  } else if (text.match(/(düğme|tetik|bas|anahtar|çalıştır|start)/)) {
    primaryAffordance = 'press_trigger_switch'
  } else if (text.match(/(aç|katla|uzat|dön|çevir)/)) {
    primaryAffordance = 'rotate_unfold_extend'
  } else if (text.match(/(kutu|paket|kargo|teslim)/)) {
    primaryAffordance = 'pack_box_deliver'
  } else if (text.match(/(doku|kumaş|yüzey|pürüzsüz|parlak|metal|ahşap)/)) {
    primaryAffordance = 'material_texture_shift'
  } else {
    primaryAffordance = 'service_process_outcome'
  }

  return {
    offerType,
    campaignObjective: facts.campaignObjective,
    proofMode,
    primaryValue,
    primaryAffordance,
    riskClass: facts.riskClass,
    assetState: facts.assets,
    sectorHint: facts.sectorHint,
    confidence: offerType !== 'unknown' ? 0.95 : 0.4,
  }
}
