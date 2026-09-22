/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DIRECTOR TREATMENT ENGINE (V6)
 * 
 * Amaç:
 * Seçilen konsepti somut bir yönetmen vizyonuna, görsel ve duygusal ark yapısına dönüştürür.
 * Kamera sıfatları yığını yerine; hareket, ışık, malzeme ve ritim ilkelerini belirler.
 */

import type {
  ResolvedCreativeFacts,
  CreativeDNA,
  StrategicPromise,
  CreativeConcept,
  DirectorTreatment
} from './creative-types'

export function formulateDirectorTreatment(
  concept: CreativeConcept,
  facts: ResolvedCreativeFacts,
  dna: CreativeDNA,
  promise: StrategicPromise
): DirectorTreatment {
  const product = facts.product.name
  const brand = facts.brandName
  const material = dna.product.materials[0] || 'engineered material'
  const isIndustrial = dna.brand.premiumLevel === 'industrial_grade'
  const isLuxury = dna.brand.premiumLevel === 'luxury'

  // 1. Yönetmen Niyeti (Director Intent)
  const directorIntent = `${brand} ile ${product} arasındaki ilişkiyi kuru bir ürün teşhiri olarak değil; ${concept.oneSentenceIdea} vizyonuyla, fiziksel gerçekliğe ve zanaat mükemmelliğine dayalı bir zafer olarak aktarmak.`

  // 2. Duygusal Ark (Emotional Arc)
  const emotionalArc: DirectorTreatment['emotionalArc'] = [
    { stage: 'opening', emotion: 'curiosity and tactile focus', intensity: 0.85 },
    { stage: 'middle', emotion: 'operational confidence and rhythm', intensity: 0.70 },
    { stage: 'escalation', emotion: 'perceived proof and mastery', intensity: 0.90 },
    { stage: 'resolution', emotion: 'quiet authority and conclusive satisfaction', intensity: 0.95 },
  ]

  // 3. Görsel Motif (Visual Motif)
  const visualMotif: DirectorTreatment['visualMotif'] = {
    description: isIndustrial
      ? 'Karakteristik dikdörtgen geometri, malzemenin mikron dokusu ve düzenli istif ritmi.'
      : isLuxury
      ? 'Lüks ışık kırılmaları, ipeksi akışkanlık ve monolitik kusursuz yüzeyler.'
      : 'Net ergonomik hatlar, işlevsel detaylar ve doğal çalışma ışığı.',
    recurringElements: [
      `${material} yüzey dokusu`,
      'Doğal yönlendirilmiş ışık huzmesi',
      'Karakteristik fiziksel geometri',
    ],
  }

  // 4. Hareket Motifi (Motion Motif)
  const motionMotif: DirectorTreatment['motionMotif'] = {
    primaryDirection: 'continuous forward progression (Soldan sağa ve derine doğru kararlı akış)',
    movementCharacter: 'rock-steady, deliberate, momentum-preserving with zero jerky oscillations',
    progression: 'Hareketsiz potansiyelden aktif çalışma ritmine, oradan sarsılmaz nihai dengeye geçiş.',
  }

  // 5. Malzeme Motifi (Material Motif)
  const materialMotif = [
    dna.product.materials[0] || 'authentic physical material',
    'ambient natural reflection',
    'fine functional texture',
  ]

  // 6. Kamera Dili (Camera Language)
  const cameraLanguage: DirectorTreatment['cameraLanguage'] = {
    opening: 'Striking macro or medium-wide establishing focus, immediately anchoring to authentic physical world within 0.3s.',
    middle: 'Dynamic purposeful tracking or unbroken push-in, preserving physical momentum without disruptive jumps.',
    payoff: 'Rock-steady authoritative framing settling with dignity on the authentic product form and corporate mark.',
    forbiddenPatterns: [
      'disorienting rapid 360 degree turntable spins',
      'unmotivated erratic handheld camera shake',
      'generic drone flyover with zero commercial purpose',
      'spinning floating objects with defying gravity physics',
    ],
  }

  // 7. Aydınlatma Arkı (Lighting Arc)
  const lightingArc: DirectorTreatment['lightingArc'] = {
    opening: isIndustrial
      ? 'Yönlendirilmiş doğal sabah ışığı, fırın veya şantiye derinliğini vurgulayan kontrollü gölgeler.'
      : 'Doğal gün ışığı ile dengeli yumuşak kontrast.',
    middle: 'Net çalışma aydınlatması; malzemenin gerçek rengini ve yüzeyini doğru veren gerçekçi ışık.',
    ending: 'Sıcak sinematik kontur ışığı (rim highlight), ürünü arka plandan ayıran prestijli final tonu.',
  }

  // 8. Kurgu Ritmi (Editing Rhythm)
  const editingRhythm: DirectorTreatment['editingRhythm'] = {
    start: 'Hızlı dikkat yakalama (0-2s yüksek görsel çekim).',
    middle: 'Akıcı, neden-sonuç bağıyla birbirine bağlanan tutarlı tempo.',
    end: 'Yavaşlayan, algılanabilir ve hafızaya kazınan en az 2 saniyelik net marka ve ürün kapanışı.',
  }

  // 9. Marka ve Ürün Görünürlük Stratejisi
  const brandVisibilityStrategy = 'Açılışta ürünün kendi fiziksel dokusu ön plandadır; marka adı doğal yüzeylerde yer alır, finalde ise kurumsal logo ve mühür kaya gibi stabil bir kadrajla onaylanır.'
  const productVisibilityStrategy = 'Ürün veya ürünün doğrudan çalışma dünyası filmin en az %60-70 zaman diliminde ekranda kalıcı ve belirgindir.'

  return {
    conceptId: concept.id,
    directorIntent,
    emotionalArc,
    visualMotif,
    motionMotif,
    materialMotif,
    cameraLanguage,
    lightingArc,
    editingRhythm,
    brandVisibilityStrategy,
    productVisibilityStrategy,
  }
}
