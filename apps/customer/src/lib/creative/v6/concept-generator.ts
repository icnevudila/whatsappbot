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
 * Adaylar arasında semantik benzerlik matrisi hesaplanır.
 * Benzer mekanizmalar (ör. C1: makro ürün, C2: açı farkıyla makro ürün) reddedilir ve çeşitlendirilir.
 */

import type { ResolvedCreativeFacts, CreativeDNA, StrategicPromise, CreativeConcept } from './creative-types'

export interface ConceptDiversityReport {
  isDiverse: boolean
  pairwiseSimilarityMax: number
  similarityMatrix: number[][]
  duplicateOrSimilarPairs: Array<{ indexA: number; indexB: number; similarity: number; reason: string }>
}

/**
 * İki metin arasındaki token Jaccard semantik benzerliğini hesaplar (0.0 - 1.0)
 */
function computeSemanticSimilarity(textA: string, textB: string): number {
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
 * Concept Diversity Validator:
 * 5 adayın birbirine aşırı benzer olup olmadığını denetler.
 */
export function validateConceptDiversity(
  concepts: CreativeConcept[],
  threshold = 0.45
): ConceptDiversityReport {
  const n = concepts.length
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0))
  const issues: ConceptDiversityReport['duplicateOrSimilarPairs'] = []
  let maxSim = 0

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0
    for (let j = i + 1; j < n; j++) {
      const cA = concepts[i]
      const cB = concepts[j]

      // Açılış, aygıt ve çözüm metinlerinin ağırlıklı karşılaştırması
      const simOpening = computeSemanticSimilarity(cA.openingMechanism, cB.openingMechanism)
      const simDevice = computeSemanticSimilarity(cA.narrativeDevice, cB.narrativeDevice)
      const simPayoff = computeSemanticSimilarity(cA.payoffMechanism, cB.payoffMechanism)

      const compositeSim = simOpening * 0.4 + simDevice * 0.35 + simPayoff * 0.25
      matrix[i][j] = Number(compositeSim.toFixed(3))
      matrix[j][i] = matrix[i][j]

      if (compositeSim > maxSim) maxSim = compositeSim

      if (compositeSim >= threshold || cA.narrativeDevice === cB.narrativeDevice) {
        issues.push({
          indexA: i,
          indexB: j,
          similarity: compositeSim,
          reason: `Konsept ${cA.id} ile ${cB.id} benzer anlatı aygıtı (${cA.narrativeDevice} vs ${cB.narrativeDevice}) veya açılış kullanıyor (Benzerlik: ${(compositeSim * 100).toFixed(1)}%).`,
        })
      }
    }
  }

  return {
    isDiverse: issues.length === 0,
    pairwiseSimilarityMax: maxSim,
    similarityMatrix: matrix,
    duplicateOrSimilarPairs: issues,
  }
}

/**
 * Brief'e, sektöre ve vaade dinamik olarak uyarlanan 5 benzersiz kreatif konsept üretir.
 */
export function generateCreativeConcepts(
  facts: ResolvedCreativeFacts,
  dna: CreativeDNA,
  promise: StrategicPromise
): CreativeConcept[] {
  const brand = facts.brandName
  const product = facts.product.name
  const sector = (facts.sectorFacts.sectorProfileId || '').toLowerCase()
  const materials = dna.product.materials.length > 0 ? dna.product.materials.join(', ') : 'maddi nitelik'
  const primaryAction = dna.product.authenticInteractions[0] || 'sahada profesyonel kullanım'
  const env = dna.product.visualWorld[0] || 'otantik iş ortamı'

  // Sektöre göre dinamik konsept archetype ve aygıt repertuarı
  const isAgri = sector.includes('agri') || sector.includes('tarim')
  const isConstruction = sector.includes('construct') || sector.includes('insaat')
  const isSaaS = sector.includes('saas') || sector.includes('b2b') || sector.includes('tech')
  const isCosmetic = sector.includes('cosmetic') || sector.includes('beauty')

  const candidates: CreativeConcept[] = []

  // KONSEPT 1: Operasyonel Hız & Sürtünmesiz Eylem (Operational Velocity)
  candidates.push({
    id: 'c01_velocity',
    name: isSaaS ? 'Anlık Sinyal ve İlk Teklif' : isAgri ? 'Tek Hamlede Bahçe Koruması' : 'Kesintisiz Eylem Hızı',
    oneSentenceIdea: `${product} kullanımının getirdiği sıfır sürtünme ve anlık operasyonel sonuç hızı.`,
    narrativeDevice: 'kinetic_velocity_burst',
    openingMechanism: `Dinamik ileri hareketle başlayan kameranın ${product} eylemini ilk milisaniyede yakalaması.`,
    payoffMechanism: `Zorlu görevin rekor sürede ve zahmetsizce tamamlandığının gösterilmesi ve ${brand} ile kilitlenmesi.`,
    visualPotential: ['kinetic whip pan', 'instant response tactile feedback', 'effortless motion trajectory'],
    proofUsage: ['Operasyonel verim ve zaman tasarrufu kanıtı.'],
    risks: ['Aşırı hız kurguyu bulanıklaştırabilir; ürün netliği korunmalı.'],
  })

  // KONSEPT 2: Somut Maddi Hakikat ve Doku (Material & Tactile Reality)
  candidates.push({
    id: 'c02_tactile_truth',
    name: isConstruction ? 'Kızgın Kil ve Geometrik Mukavemet' : isCosmetic ? 'Mikronize Doku ve Emilim' : 'Dokusal Hakikat',
    oneSentenceIdea: `${product} formundaki ${materials} kalitesinin mikroskobik netlikten nihai esere uzanan görsel kanıtı.`,
    narrativeDevice: 'extreme_macro_scale_expansion',
    openingMechanism: `Doğal yönlü ışık altında ${materials} yüzey dokusunun 100mm ultra-makro kadrajıyla başlamak.`,
    payoffMechanism: `Kameranın pürüzsüz geri süzülüşle tüm yapıyı/ürünü ${env} içinde sergilemesi ve ${brand} mührü.`,
    visualPotential: ['light glinting on texture', 'ultra-fine focus pull', 'depth of authentic material'],
    proofUsage: ['Fiziksel malzeme üstünlüğü ve imalat kalitesi.'],
    risks: ['Aşırı soyut kalmamalı; 2. saniyede kullanım amacına bağlanmalı.'],
  })

  // KONSEPT 3: Karşıtlık ve Dönüşüm Sınavı (Contrast & Stress Transformation)
  candidates.push({
    id: 'c03_transformation_test',
    name: isSaaS ? 'Kayıp Zamandan Net Ciroya' : isAgri ? 'Zahmetli Pompadan Akülü Konfora' : 'Süreç İspatı',
    oneSentenceIdea: `${product} devreye girmeden önceki yorucu/verimsiz durum ile devreye girdikten sonraki mükemmel netlik arasındaki radikal dönüşüm.`,
    narrativeDevice: 'cause_and_effect_transformation',
    openingMechanism: 'Sahadaki gerçek bir iş probleminin veya zorlu koşulun yüksek gerçekçilikle açılması.',
    payoffMechanism: `${product} müdahalesiyle problemin kalıcı olarak çözüldüğünün ve işin parladığının tescili.`,
    visualPotential: ['stark before-and-after contrast', 'lighting shift from cold to warm', 'flawless resolution'],
    proofUsage: [promise.evidence[0]?.description || 'Somut problem çözme kanıtı.'],
    risks: ['Ucuz tele-alışverişe kaymamalı; sinematik natüralizm korunmalı.'],
  })

  // KONSEPT 4: İnsan Ustalığı ve Ergonomik Uyum (Human Craft & Symbiosis)
  candidates.push({
    id: 'c04_human_craft',
    name: isSaaS ? 'Karar Vericinin Özgüveni' : isAgri ? 'Çiftçinin Sessiz Gururu' : 'Ustanın Dokunuşu',
    oneSentenceIdea: `İşinin ehli bir profesyonelin ${product} ile kurduğu kendinden emin, ergonomik ve sakin ortaklık.`,
    narrativeDevice: 'practitioner_tool_symbiosis',
    openingMechanism: `Kararlı ve odaklanmış ellerin ${product} üzerine yerleştiği sakin ve güçlü 0.4 saniyelik detay.`,
    payoffMechanism: `Tamamlanan eser karşısında profesyonelin duyduğu içsel güven ve ${brand} ile sağlanan kalıcı ortaklık.`,
    visualPotential: ['purposeful human hands without fake acting', 'authentic posture', 'natural work lighting'],
    proofUsage: ['Kullanım konforu, denge ve yorulmadan yüksek verim alma.'],
    risks: ['Kameraya sahte gülümseme veya yapay mimik kesinlikle yasaklanmalıdır.'],
  })

  // KONSEPT 5: Ölçek, Hacim ve Gelecek Güvencesi (Scale & Structural Resilience)
  candidates.push({
    id: 'c05_scale_resilience',
    name: isConstruction ? 'Nesillere Kalan Mimari' : isSaaS ? 'Sürekli Büyüyen Müşteri Portföyü' : 'Kesintisiz Güven ve Hacim',
    oneSentenceIdea: `${brand} arkasındaki kesintisiz tedarik gücünün ve ${product} ile inşa edilen sarsılmaz güvenin geleceğe uzanışı.`,
    narrativeDevice: 'monumental_scale_payoff',
    openingMechanism: `Geniş perspektifte ufka uzanan düzenli ürün nizamı veya genişleyen operasyonel alan.`,
    payoffMechanism: `Nihai büyük eserin veya başarının ihtişamla ortaya çıkışı ve ${brand} kurumsal imzası.`,
    visualPotential: ['sweeping architectural lines', 'rhythmic geometry', 'timeless durability'],
    proofUsage: ['Geleceğe miras kalan sağlamlık ve kesintisiz temin güvencesi.'],
    risks: ['Soğuk kurumsal bir videoya dönmemeli; insani ve somut kanıt bağı kopmamalı.'],
  })

  // Diversity Kontrolü ve Gerekirse Ayrıştırma
  const diversity = validateConceptDiversity(candidates)
  if (!diversity.isDiverse) {
    // Çakışan adayın anlatı aygıtını mutasyona uğrat
    for (const issue of diversity.duplicateOrSimilarPairs) {
      candidates[issue.indexB].narrativeDevice = `inverted_perspective_${issue.indexB}`
      candidates[issue.indexB].openingMechanism = `Alışılmadık ters açıdan (low-angle upward push) ${product} odaklı kanca.`
    }
  }

  return candidates
}
