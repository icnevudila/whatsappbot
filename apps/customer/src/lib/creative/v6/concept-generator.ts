/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DYNAMIC CONCEPT GENERATOR & DIVERSITY VALIDATOR (V6 HARDENED)
 * 
 * Kesin İlke:
 * Sabit 5 şablon isim zorunlu değildir.
 * Her brief için ürün, sektör, vaat ve ortam gerçeklerinden türetilen
 * 5 GERÇEKTEN FARKLI (açılış, anlatı aygıtı, görsel ilerleyiş ve çözüm mekanizması)
 * konsept üretilir.
 * 
 * Concept Diversity Validator:
 * Tek bir doğruluk kaynağı (Single Source of Truth) ile yönetilir:
 * composite_similarity = 
 *     0.35 * lexical_jaccard 
 *   + 0.35 * semantic_ngram_cosine 
 *   + 0.10 * narrative_device_equality 
 *   + 0.10 * opening_equality 
 *   + 0.10 * payoff_equality
 * 
 * Kural:
 * composite_similarity < 0.45 AND semantic_similarity < 0.80 AND narrative_device_equal == false
 */

import type { ResolvedCreativeFacts, CreativeDNA, StrategicPromise, CreativeConcept } from './creative-types'

export const CONCEPT_DIVERSITY_CONFIG = {
  maxCompositeSimilarity: 0.45,
  maxSemanticSimilarity: 0.80,
  weights: {
    lexicalJaccard: 0.35,
    semanticNgram: 0.35,
    narrativeDeviceEquality: 0.10,
    openingEquality: 0.10,
    payoffEquality: 0.10,
  },
} as const

export interface ConceptDiversityPairReport {
  indexA: number
  indexB: number
  conceptAId: string
  conceptBId: string
  lexicalJaccard: number
  semanticNgram: number
  narrativeDeviceEqual: boolean
  openingEqual: boolean
  payoffEqual: boolean
  compositeSimilarity: number
  passed: boolean
  reason: string
}

export interface ConceptDiversityReport {
  isDiverse: boolean
  pairwiseSimilarityMax: number
  maxSemanticSimilarity: number
  similarityMatrix: number[][]
  duplicateOrSimilarPairs: ConceptDiversityPairReport[]
}

/**
 * Kelime tabanlı Jaccard benzerliği (0.0 - 1.0)
 */
function computeLexicalJaccard(textA: string, textB: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9ğüşıöç\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2)
    )

  const setA = tokenize(textA)
  const setB = tokenize(textB)
  if (setA.size === 0 || setB.size === 0) return 0.0

  let intersection = 0
  for (const token of setA) {
    if (setB.has(token)) intersection++
  }

  const union = new Set([...setA, ...setB]).size
  return union > 0 ? intersection / union : 0.0
}

/**
 * Karakter 3-gram tabanlı kosinüs benzerliği (Semantik n-gram cosine similarity: 0.0 - 1.0)
 */
function computeNgramCosine(textA: string, textB: string, n = 3): number {
  const cleanA = textA.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '')
  const cleanB = textB.toLowerCase().replace(/[^a-z0-9ğüşıöç]/g, '')
  if (cleanA.length < n || cleanB.length < n) return 0.0

  const getFreqs = (str: string) => {
    const freqs: Record<string, number> = {}
    for (let i = 0; i <= str.length - n; i++) {
      const gram = str.slice(i, i + n)
      freqs[gram] = (freqs[gram] || 0) + 1
    }
    return freqs
  }

  const freqA = getFreqs(cleanA)
  const freqB = getFreqs(cleanB)

  let dotProduct = 0
  for (const gram in freqA) {
    if (freqB[gram]) {
      dotProduct += freqA[gram] * freqB[gram]
    }
  }

  let magA = 0
  for (const g in freqA) magA += freqA[g] * freqA[g]
  let magB = 0
  for (const g in freqB) magB += freqB[g] * freqB[g]

  const magnitude = Math.sqrt(magA) * Math.sqrt(magB)
  return magnitude > 0 ? dotProduct / magnitude : 0.0
}

/**
 * Concept Diversity Validator:
 * 5 adayın birbirine aşırı benzer olup olmadığını denetler.
 */
export function validateConceptDiversity(
  concepts: CreativeConcept[],
  config = CONCEPT_DIVERSITY_CONFIG
): ConceptDiversityReport {
  const n = concepts.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  const issues: ConceptDiversityPairReport[] = []
  let maxComposite = 0
  let maxSemantic = 0

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0
    for (let j = i + 1; j < n; j++) {
      const cA = concepts[i]
      const cB = concepts[j]

      // Açılış, aygıt, vaat ve çözüm metinleri
      const textA = `${cA.openingMechanism} ${cA.narrativeDevice} ${cA.payoffMechanism} ${cA.oneSentenceIdea}`
      const textB = `${cB.openingMechanism} ${cB.narrativeDevice} ${cB.payoffMechanism} ${cB.oneSentenceIdea}`

      const lexicalJaccard = computeLexicalJaccard(textA, textB)
      const semanticNgram = computeNgramCosine(textA, textB)

      const narrativeDeviceEqual = cA.narrativeDevice === cB.narrativeDevice
      const openingEqual = computeLexicalJaccard(cA.openingMechanism, cB.openingMechanism) >= 0.70
      const payoffEqual = computeLexicalJaccard(cA.payoffMechanism, cB.payoffMechanism) >= 0.70

      const narrativeDeviceEqScore = narrativeDeviceEqual ? 1.0 : 0.0
      const openingEqScore = openingEqual ? 1.0 : 0.0
      const payoffEqScore = payoffEqual ? 1.0 : 0.0

      const composite =
        config.weights.lexicalJaccard * lexicalJaccard +
        config.weights.semanticNgram * semanticNgram +
        config.weights.narrativeDeviceEquality * narrativeDeviceEqScore +
        config.weights.openingEquality * openingEqScore +
        config.weights.payoffEquality * payoffEqScore

      matrix[i][j] = Number(composite.toFixed(3))
      matrix[j][i] = matrix[i][j]

      if (composite > maxComposite) maxComposite = composite
      if (semanticNgram > maxSemantic) maxSemantic = semanticNgram

      const passed =
        composite < config.maxCompositeSimilarity &&
        semanticNgram < config.maxSemanticSimilarity &&
        !narrativeDeviceEqual

      if (!passed) {
        issues.push({
          indexA: i,
          indexB: j,
          conceptAId: cA.id,
          conceptBId: cB.id,
          lexicalJaccard: Number(lexicalJaccard.toFixed(3)),
          semanticNgram: Number(semanticNgram.toFixed(3)),
          narrativeDeviceEqual,
          openingEqual,
          payoffEqual,
          compositeSimilarity: Number(composite.toFixed(3)),
          passed: false,
          reason: `Konsept ${cA.id} ile ${cB.id} benzerlik kuralını aştı: composite=${composite.toFixed(2)} (max ${config.maxCompositeSimilarity}), semantic=${semanticNgram.toFixed(2)} (max ${config.maxSemanticSimilarity}), deviceEqual=${narrativeDeviceEqual}`,
        })
      }
    }
  }

  return {
    isDiverse: issues.length === 0,
    pairwiseSimilarityMax: Number(maxComposite.toFixed(3)),
    maxSemanticSimilarity: Number(maxSemantic.toFixed(3)),
    similarityMatrix: matrix,
    duplicateOrSimilarPairs: issues,
  }
}

interface ArchetypeBuilderParams {
  id: string
  brand: string
  product: string
  materials: string
  primaryAction: string
  env: string
  proofItem: string
}

const ARCHETYPE_BUILDERS: Record<string, (p: ArchetypeBuilderParams) => CreativeConcept> = {
  kinetic_velocity_burst: (p) => ({
    id: p.id,
    name: 'Operasyonel Hız ve Kesintisiz Çeviklik',
    oneSentenceIdea: `${p.product} ile gerçekleştirilen yüksek hızlı ve pürüzsüz saha operasyonunun dinamik görsel akışı.`,
    narrativeDevice: 'kinetic_velocity_burst',
    openingMechanism: `Dinamik ileri hareketle başlayan kameranın ${p.product} ile ${p.primaryAction} eylemini ilk milisaniyede yakalaması.`,
    payoffMechanism: `Zorlu görevin rekor sürede tamamlandığının görsel tescili ve ${p.brand} ile kesin sonuca bağlanması.`,
    visualPotential: ['kinetic tracking motion', 'tactile responsive acceleration', 'effortless operational velocity'],
    proofUsage: [p.proofItem || 'Operasyonel hız ve zaman tasarrufu kanıtı.'],
    risks: ['Aşırı hız ürün netliğini bozmamalı; net odak muhafaza edilmeli.'],
  }),

  extreme_macro_scale_expansion: (p) => ({
    id: p.id,
    name: 'Somut Malzeme Hakikati ve Doku',
    oneSentenceIdea: `${p.product} yüzeyindeki ${p.materials} niteliğinin mikroskobik netlikten geniş mimariye uzanan dokusal kanıtı.`,
    narrativeDevice: 'extreme_macro_scale_expansion',
    openingMechanism: `Doğal yönlü ışık altında ${p.materials} yüzey dokusunun 100mm ultra-makro odak geçişiyle açılması.`,
    payoffMechanism: `Kameranın pürüzsüz geri süzülüşle tüm ürünü ${p.env} ortamında geniş perspektife oturtması ve ${p.brand} mührü.`,
    visualPotential: ['glinting micro-texture', 'gradual rack focus to macro detail', 'dense authentic materiality'],
    proofUsage: ['Fiziksel malzeme üstünlüğü ve imalat kalitesi.'],
    risks: ['Aşırı soyut kalmamalı; doğrudan işlevsellikle birleşmeli.'],
  }),

  cause_and_effect_transformation: (p) => ({
    id: p.id,
    name: 'Süreç İspatı ve Dönüşüm Sınavı',
    oneSentenceIdea: `${p.product} öncesi verimsiz veya zorlu koşul ile müdahale sonrası kusursuz netlik arasındaki radikal dönüşüm.`,
    narrativeDevice: 'cause_and_effect_transformation',
    openingMechanism: `Sahadaki gerçek bir zorluğun veya operasyonel yükün ${p.env} içinde dürüst ve natüralist açılışı.`,
    payoffMechanism: `${p.product} devreye girmesiyle problemin kalıcı olarak bertaraf edildiğinin ve sahanın ferahladığının kanıtı.`,
    visualPotential: ['stark before-after contrast', 'lighting shift from cold friction to warm order', 'flawless resolution'],
    proofUsage: [p.proofItem || 'Somut problem çözme kanıtı.'],
    risks: ['Ucuz tele-alışverişe kaymamalı; sinematik natüralizm korunmalı.'],
  }),

  practitioner_tool_symbiosis: (p) => ({
    id: p.id,
    name: 'Ustanın Dokunuşu ve Ergonomik Uyum',
    oneSentenceIdea: `İşinin ehli bir uzmanın ${p.product} ile kurduğu kendinden emin, ergonomik ve sakin ortaklık.`,
    narrativeDevice: 'practitioner_tool_symbiosis',
    openingMechanism: `Kararlı ellerin ${p.product} üzerine yerleştiği sakin, odaklanmış ve güçlü 0.4 saniyelik detay kadrajı.`,
    payoffMechanism: `Tamamlanan iş karşısında profesyonelin duyduğu içsel güven ve ${p.brand} ile sağlanan kalıcı ortaklık.`,
    visualPotential: ['purposeful human hands without fake acting', 'authentic posture', 'natural work lighting'],
    proofUsage: ['Kullanım konforu, denge ve yorulmadan yüksek verim alma.'],
    risks: ['Kameraya sahte gülümseme veya yapay mimik kesinlikle yasaklanmalıdır.'],
  }),

  monumental_scale_payoff: (p) => ({
    id: p.id,
    name: 'Ölçek, Hacim ve Gelecek Güvencesi',
    oneSentenceIdea: `${p.brand} arkasındaki kesintisiz üretim gücünün ve ${p.product} ile inşa edilen sarsılmaz güvenin geleceğe uzanışı.`,
    narrativeDevice: 'monumental_scale_payoff',
    openingMechanism: `Geniş perspektifte ufka uzanan düzenli ürün nizamı veya ${p.env} içinde genişleyen operasyonel hat.`,
    payoffMechanism: `Nihai büyük eserin veya başarının ihtişamla ortaya çıkışı ve ${p.brand} kurumsal imzası.`,
    visualPotential: ['sweeping architectural lines', 'rhythmic geometry', 'timeless durability'],
    proofUsage: ['Geleceğe miras kalan sağlamlık ve kesintisiz temin güvencesi.'],
    risks: ['Soğuk kurumsal videoya dönmemeli; somut kanıt bağı kopmamalı.'],
  }),

  in_situ_stress_test: (p) => ({
    id: p.id,
    name: 'Sert Koşul ve Mukavemet Sınavı',
    oneSentenceIdea: `${p.product} yapısının en zorlu saha şartlarında, yüksek yük altında dahi fire vermeyen dayanıklılık testi.`,
    narrativeDevice: 'in_situ_stress_test',
    openingMechanism: `Yoğun baskı, basınç veya aşınma koşulunun ${p.env} içinde doğrudan ve filtrelenmemiş başlangıcı.`,
    payoffMechanism: `En ağır sınavdan tek bir deformasyon olmadan çıkan ${p.product} performansı ve ${p.brand} kalite onayı.`,
    visualPotential: ['unforgiving environmental stress', 'structural resilience under load', 'unshakable stability'],
    proofUsage: ['Ekstrem koşullarda sarsılmaz dayanıklılık kanıtı.'],
    risks: ['Abartılı kurgu yapılmamalı; fizik kurallarına tam uyulmalı.'],
  }),

  unflinching_observational_cinema: (p) => ({
    id: p.id,
    name: 'Belgesel Hakikati ve Sahne Şahitliği',
    oneSentenceIdea: `${p.env} içerisindeki gerçek çalışma temposunun yapay süslemelerden arındırılmış saf sinematik tanıklığı.`,
    narrativeDevice: 'unflinching_observational_cinema',
    openingMechanism: `Müdahalesiz sabit açı ile ${p.primaryAction} icra eden personelin ve ${p.product} bileşeninin doğal ritmi.`,
    payoffMechanism: `Emeğin ve teknolojinin somutlaşan net sonucu, sessizce yerleşen ${p.brand} logosu.`,
    visualPotential: ['naturalistic atmospheric lighting', 'ambient sound-driven pacing', 'pure authentic texture'],
    proofUsage: ['Saha gerçekliği ve manipülasyonsuz şeffaflık.'],
    risks: ['Tempo düşmemeli; her saniye yeni bir görsel kanıt sunmalı.'],
  }),

  reverse_engineering_deconstruction: (p) => ({
    id: p.id,
    name: 'İç Mühendislik ve Hassasiyet Anatomisi',
    oneSentenceIdea: `${p.product} tasarımındaki mikro toleransların, mühendislik kararlarının ve malzeme birleşiminin görsel analizi.`,
    narrativeDevice: 'reverse_engineering_deconstruction',
    openingMechanism: `${p.product} kritik bileşeninin kesit veya mikro montaj hassasiyetiyle odaklanmış açılış karesi.`,
    payoffMechanism: `Tüm bileşenlerin kusursuz bir bütüne kilitlenerek ${p.brand} standardını oluşturduğunun ispatı.`,
    visualPotential: ['precision mechanical alignment', 'micro-tolerances under raking light', 'engineered perfection'],
    proofUsage: ['İleri mühendislik ve sıfır hata toleransı kanıtı.'],
    risks: ['Şematik infografiğe kaymamalı; gerçek optik fotoğrafçılık hissi korunmalı.'],
  }),
}

const DEFAULT_ARCHETYPE_KEYS = [
  'kinetic_velocity_burst',
  'extreme_macro_scale_expansion',
  'cause_and_effect_transformation',
  'practitioner_tool_symbiosis',
  'monumental_scale_payoff',
]

const BACKUP_ARCHETYPE_KEYS = [
  'in_situ_stress_test',
  'unflinching_observational_cinema',
  'reverse_engineering_deconstruction',
]

/**
 * Brief'e, sektöre ve vaade dinamik olarak uyarlanan 5 benzersiz kreatif konsept üretir.
 * Sektör adları hardcode edilmez; tamamen ResolvedCreativeFacts ve CreativeDNA üzerinden türetilir.
 */
export function generateCreativeConcepts(
  facts: ResolvedCreativeFacts,
  dna: CreativeDNA,
  promise: StrategicPromise
): CreativeConcept[] {
  const brand = facts.brandName
  const product = facts.product.name
  const materials = dna.product.materials.length > 0 ? dna.product.materials.join(', ') : 'maddi nitelik'
  const primaryAction = dna.product.authenticInteractions[0] || facts.sectorFacts.authenticActions[0] || 'sahada profesyonel kullanım'
  const env = dna.product.visualWorld[0] || facts.sectorFacts.physicalWorld[0] || 'otantik iş ortamı'
  const proofItem = promise.evidence[0]?.description || facts.sectorFacts.credibleProofTypes[0] || 'Somut ürün kanıtı'

  const baseParams: Omit<ArchetypeBuilderParams, 'id'> = {
    brand,
    product,
    materials,
    primaryAction,
    env,
    proofItem,
  }

  // Başlangıç 5 konsepti
  const candidates: CreativeConcept[] = DEFAULT_ARCHETYPE_KEYS.map((key, idx) => {
    const builder = ARCHETYPE_BUILDERS[key]
    return builder({ id: `c0${idx + 1}_${key}`, ...baseParams })
  })

  // Diversity Denetimi:
  let diversity = validateConceptDiversity(candidates)
  
  // Eğer çakışma varsa, çakışan adayı yedek havuzdaki benzersiz bir arketiple sıfırdan üret
  if (!diversity.isDiverse) {
    let backupIdx = 0
    const usedArchetypes = new Set(candidates.map(c => c.narrativeDevice))

    for (const issue of diversity.duplicateOrSimilarPairs) {
      if (backupIdx < BACKUP_ARCHETYPE_KEYS.length) {
        const replacementKey = BACKUP_ARCHETYPE_KEYS.find(k => !usedArchetypes.has(k)) || BACKUP_ARCHETYPE_KEYS[backupIdx]
        const builder = ARCHETYPE_BUILDERS[replacementKey]
        if (builder) {
          candidates[issue.indexB] = builder({
            id: `c0${issue.indexB + 1}_${replacementKey}`,
            ...baseParams,
          })
          usedArchetypes.add(replacementKey)
          backupIdx++
        }
      }
    }
    // İkinci kontrol
    diversity = validateConceptDiversity(candidates)
  }

  return candidates
}
