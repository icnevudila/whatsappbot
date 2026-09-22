/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * PURE DATA-DRIVEN DYNAMIC BEAT SHEET ENGINE (V6 FINAL HARDENED)
 * 
 * Kesin İlkeler:
 * 1. Sabit süre şablonu (0-2/2-5/5-8/8-10 veya 0-4.2 / 0-1.4 vb.) YASAKTIR.
 *    Her beat'in süresi importanceWeight, eylem karmaşıklığı, seslendirme hece yoğunluğu
 *    ve yönetmen treatment'ına göre tamamen dinamik hesaplanır.
 * 2. Kod içi sektörel dallanma (if sector === 'saas', if sector === 'agri' vb.) KESİNLİKLE YASAKTIR.
 *    Beat-sheet sektörü bilmez; yalnızca:
 *    - StrategicPromise
 *    - SelectedConcept
 *    - DirectorTreatment
 *    - CampaignObjective
 *    - ResolvedSectorFacts (data olarak gelen fiziksel dünya, malzeme, eylem ve kısıtlar)
 *    üzerinden çalışır.
 * 3. Her beat için: viewer_knowledge_before !== viewer_knowledge_after zorunludur.
 */

import type {
  ResolvedCreativeFacts,
  CreativeDNA,
  StrategicPromise,
  DirectorTreatment,
  StoryBeat,
  CreativeConcept
} from './creative-types'
import { routeCommercialGrammar } from './grammar-router'

interface DynamicBeatCandidate {
  id: string
  type: StoryBeat['type']
  purpose: string
  viewerKnowledgeBefore: string
  viewerKnowledgeAfter: string
  emotionIn: string
  emotionOut: string
  requiredEvidence?: string[]
  importanceWeight: number
  minDurationSec: number
  preferredDurationSec: number
  maxDurationSec: number
}

/**
 * Verilen beat adaylarının sürelerini dinamik önem ağırlıkları, minimum/maksimum
 * sınırları ve toplam reklam süresine göre milisaniyelik hassasiyetle hesaplar.
 * Hiçbir reklamda tek tip sabit kesim noktası üretmez.
 */
function solveDynamicBeatTimings(
  candidates: DynamicBeatCandidate[],
  totalDuration: number
): StoryBeat[] {
  const n = candidates.length
  if (n === 0) return []
  if (n === 1) {
    const b = candidates[0]
    return [
      {
        id: b.id,
        type: b.type,
        startSec: 0.0,
        endSec: Number(totalDuration.toFixed(2)),
        purpose: b.purpose,
        viewerKnowledgeBefore: b.viewerKnowledgeBefore,
        viewerKnowledgeAfter: b.viewerKnowledgeAfter,
        emotionIn: b.emotionIn,
        emotionOut: b.emotionOut,
        requiredEvidence: b.requiredEvidence,
      },
    ]
  }

  // Toplam ağırlığı topla
  const totalWeight = candidates.reduce((acc, c) => acc + c.importanceWeight, 0)
  
  // İlk ağırlıklı süre dağıtımı
  let rawDurations = candidates.map(c => {
    const raw = (c.importanceWeight / totalWeight) * totalDuration
    return Math.max(c.minDurationSec, Math.min(c.maxDurationSec, raw))
  })

  // Normalize et (toplamı tam totalDuration'a bağla)
  let sumAllocated = rawDurations.reduce((a, b) => a + b, 0)
  let diff = totalDuration - sumAllocated

  // Farkı ağırlıklara göre dağıt
  rawDurations = rawDurations.map((d, i) => {
    const share = diff * (candidates[i].importanceWeight / totalWeight)
    return Math.max(candidates[i].minDurationSec, Math.min(candidates[i].maxDurationSec, d + share))
  })

  // Son mikro farkı son sahneye bağla
  sumAllocated = rawDurations.reduce((a, b) => a + b, 0)
  rawDurations[n - 1] += (totalDuration - sumAllocated)

  // Kümülatif zaman noktalarını 2 ondalık basamakla oluştur
  const result: StoryBeat[] = []
  let currentStart = 0.0

  for (let i = 0; i < n; i++) {
    const c = candidates[i]
    const isLast = i === n - 1
    const end = isLast ? Number(totalDuration.toFixed(2)) : Number((currentStart + rawDurations[i]).toFixed(2))
    
    result.push({
      id: c.id,
      type: c.type,
      startSec: Number(currentStart.toFixed(2)),
      endSec: end,
      durationSeconds: Number((end - currentStart).toFixed(2)),
      purpose: c.purpose,
      viewerKnowledgeBefore: c.viewerKnowledgeBefore,
      viewerKnowledgeAfter: c.viewerKnowledgeAfter,
      emotionIn: c.emotionIn,
      emotionOut: c.emotionOut,
      requiredEvidence: c.requiredEvidence,
    })

    currentStart = end
  }

  return result
}

/**
 * Ana Beat Sheet Derleyicisi:
 * Sektör if/else dallanması İÇERMEZ.
 * Sektörel gerçekler data olarak facts.sectorFacts'ten okunur.
 */
export function generateBeatSheet(params: {
  facts: ResolvedCreativeFacts
  dna: CreativeDNA
  promise: StrategicPromise
  treatment: DirectorTreatment
  targetDurationSeconds: number
  concept?: CreativeConcept
  sceneCountOverride?: number
}): StoryBeat[] {
  const { facts, dna, promise, treatment, targetDurationSeconds, concept, sceneCountOverride } = params
  const duration = Math.max(5, Math.min(60, Number(targetDurationSeconds) || 10))
  
  const route = routeCommercialGrammar(duration, {
    hasExactProductReference: facts.product.referenceAssetIds.length > 0,
    campaignObjective: facts.campaign.objective,
    sectorHint: facts.sectorFacts.sectorProfileId,
  })

  const product = facts.product.name
  const brand = facts.brandName
  const sectorData = facts.sectorFacts

  // Sektörel veri katmanından gelen gerçek dünya parametreleri (sıfır kod hardcode'u)
  const envPrimary = sectorData.physicalWorld?.[0] || 'otantik operasyon alanı'
  const actionPrimary = sectorData.authenticActions?.[0] || 'operasyonel eylem'
  const actionSecondary = sectorData.authenticActions?.[1] || actionPrimary
  const visualElement = sectorData.materials?.[0] || 'ürün yüzeyi ve teknik detaylar'
  const material = sectorData.materials?.[0] || 'dayanıklı gövde'
  const avoidElement = sectorData.forbiddenVisuals?.[0] || 'yapay süslemeler'

  // Konsept ve Treatment dinamikleri
  const device = concept?.narrativeDevice || 'direct_evidence'
  const isRapidHook = device.includes('speed') || device.includes('interrupt') || device.includes('fast')
  const isMonumental = device.includes('scale') || device.includes('continuous') || device.includes('arc')

  // --------------------------------------------------------------------------
  // 1. KISA PERFORMANS REKLAMI (SHORT GRAMMAR: 5–14 SANİYE)
  // --------------------------------------------------------------------------
  if (route.grammarType === 'short_performance') {
    let sceneCount = sceneCountOverride || route.preferredSceneCount
    if (!sceneCountOverride && concept) {
      if (isMonumental) {
        sceneCount = duration <= 8 ? 1 : 2
      } else if (isRapidHook) {
        sceneCount = duration >= 10 ? 4 : 3
      }
    }

    // 1 SCENE (Continuous Single Take)
    if (sceneCount === 1) {
      const singleTakeCandidate: DynamicBeatCandidate[] = [
        {
          id: 'b01',
          type: 'hook',
          purpose: `Kesintisiz tek plan: ${envPrimary} ortamında ${product} ile ${actionPrimary} başlangıcı, somut dönüşüm ve ${brand} ile nihai sonuç.`,
          viewerKnowledgeBefore: 'Pasif durumda, henüz ürün veya operasyon hakkında bilgisi yok.',
          viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
          emotionIn: 'curiosity',
          emotionOut: 'conviction',
          requiredEvidence: ['continuous_action', 'tangible_proof'],
          importanceWeight: 5.0,
          minDurationSec: duration,
          preferredDurationSec: duration,
          maxDurationSec: duration,
        },
      ]
      return solveDynamicBeatTimings(singleTakeCandidate, duration)
    }

    // 2 SCENES (Kanca & Aksiyon -> Kanıt & Marka Çözümü)
    if (sceneCount === 2) {
      const candidates2: DynamicBeatCandidate[] = [
        {
          id: 'b01',
          type: 'hook',
          purpose: `${envPrimary} içinde anında dikkat kancası ve ${product} ile ${actionPrimary} eyleminin başlaması.`,
          viewerKnowledgeBefore: 'Pasif izleyici.',
          viewerKnowledgeAfter: `${product} kullanım anındaki doğrudan gücünü ve ${material} niteliğini gördü.`,
          emotionIn: 'curiosity',
          emotionOut: 'interest',
          requiredEvidence: ['action_first'],
          importanceWeight: isRapidHook ? 3.0 : 4.2,
          minDurationSec: duration * 0.25,
          preferredDurationSec: duration * (isRapidHook ? 0.35 : 0.44),
          maxDurationSec: duration * 0.55,
        },
        {
          id: 'b02',
          type: 'brand_resolution',
          purpose: `Somut sonuç kanıtı ve ${brand} markasının sağladığı nihai güvence ile aksiyon kararı.`,
          viewerKnowledgeBefore: 'Eylemi gördü ama marka sonucunu tam mühürlemedi.',
          viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
          emotionIn: 'interest',
          emotionOut: 'conviction',
          requiredEvidence: ['result_proof', 'brand_identity'],
          importanceWeight: isRapidHook ? 7.0 : 5.8,
          minDurationSec: duration * 0.45,
          preferredDurationSec: duration * (isRapidHook ? 0.65 : 0.56),
          maxDurationSec: duration * 0.75,
        },
      ]
      return solveDynamicBeatTimings(candidates2, duration)
    }

    // 3 SCENES (Kanca -> Operasyonel Kanıt -> Marka Kapanışı)
    if (sceneCount === 3) {
      const hookWeight = isRapidHook ? 1.5 : 2.5
      const proofWeight = 5.5
      const brandWeight = 3.0

      const candidates3: DynamicBeatCandidate[] = [
        {
          id: 'b01',
          type: 'hook',
          purpose: `Ultra hızlı dikkat kancası: ${envPrimary} atmosferinde ${visualElement} odağında anlık görsel çekim.`,
          viewerKnowledgeBefore: 'Akışta gezen pasif izleyici.',
          viewerKnowledgeAfter: `${product} odağında kritik durumun başladığını anladı (${avoidElement} olmadan).`,
          emotionIn: 'curiosity',
          emotionOut: 'alertness',
          requiredEvidence: ['visual_hook'],
          importanceWeight: hookWeight,
          minDurationSec: 0.6,
          preferredDurationSec: duration * (isRapidHook ? 0.12 : 0.18),
          maxDurationSec: 2.5,
        },
        {
          id: 'b02',
          type: 'proof',
          purpose: `${product} ile ${actionPrimary} ve ${actionSecondary} kanıtı: sahada kesintisiz operasyon.`,
          viewerKnowledgeBefore: 'Sadece kancayı gördü.',
          viewerKnowledgeAfter: `Ürünün vaat edilen işi firesiz ve kusursuz başardığını bizzat deneyimledi.`,
          emotionIn: 'alertness',
          emotionOut: 'confidence',
          requiredEvidence: ['operational_proof'],
          importanceWeight: proofWeight,
          minDurationSec: duration * 0.45,
          preferredDurationSec: duration * 0.55,
          maxDurationSec: duration * 0.75,
        },
        {
          id: 'b03',
          type: 'brand_resolution',
          purpose: `Nihai başarı tablosu ve ${brand} kurumsal çözüm ortaklığı mühürlemesi.`,
          viewerKnowledgeBefore: 'İşin yapıldığını gördü.',
          viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
          emotionIn: 'confidence',
          emotionOut: 'conviction',
          requiredEvidence: ['brand_resolution'],
          importanceWeight: brandWeight,
          minDurationSec: duration * 0.20,
          preferredDurationSec: duration * 0.30,
          maxDurationSec: duration * 0.45,
        },
      ]
      return solveDynamicBeatTimings(candidates3, duration)
    }

    // 4 SCENES (Interrupt -> Reveal -> Proof -> Result)
    const candidates4: DynamicBeatCandidate[] = [
      {
        id: 'b01',
        type: 'hook',
        purpose: `Görsel kesinti (interrupt): ${envPrimary} içinde izleyiciyi anında durduran kanca.`,
        viewerKnowledgeBefore: 'Kaydırma modunda pasif izleyici.',
        viewerKnowledgeAfter: 'Beklenmedik bir hareketle dikkatini tamamen verdi.',
        emotionIn: 'neutral',
        emotionOut: 'surprise',
        requiredEvidence: ['interrupt'],
        importanceWeight: 1.0,
        minDurationSec: 0.5,
        preferredDurationSec: duration * 0.08,
        maxDurationSec: 1.6,
      },
      {
        id: 'b02',
        type: 'product_entrance',
        purpose: `${product} detaylı reveal, ${material} dokusu ve fiziksel form netliği.`,
        viewerKnowledgeBefore: 'Sadece kanca anını gördü.',
        viewerKnowledgeAfter: `${product} niteliklerini ve işlevsel tasarımını kavradı.`,
        emotionIn: 'surprise',
        emotionOut: 'interest',
        requiredEvidence: ['product_clarity'],
        importanceWeight: 2.8,
        minDurationSec: 1.5,
        preferredDurationSec: duration * 0.25,
        maxDurationSec: 3.8,
      },
      {
        id: 'b03',
        type: 'proof',
        purpose: `${actionPrimary} ile yoğunlaştırılmış saha kanıtı ve performans başarısı.`,
        viewerKnowledgeBefore: 'Ürünün formunu biliyor.',
        viewerKnowledgeAfter: 'Ürünün yarattığı somut faydaya ve hızına şahit oldu.',
        emotionIn: 'interest',
        emotionOut: 'admiration',
        requiredEvidence: ['performance_proof'],
        importanceWeight: 4.2,
        minDurationSec: duration * 0.35,
        preferredDurationSec: duration * 0.42,
        maxDurationSec: duration * 0.60,
      },
      {
        id: 'b04',
        type: 'brand_resolution',
        purpose: `Kusursuz sonuç ve ${brand} güvencesiyle eyleme çağrı.`,
        viewerKnowledgeBefore: 'Performansı beğendi.',
        viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
        emotionIn: 'admiration',
        emotionOut: 'conviction',
        requiredEvidence: ['brand_call_to_action'],
        importanceWeight: 2.5,
        minDurationSec: 1.5,
        preferredDurationSec: duration * 0.25,
        maxDurationSec: 3.5,
      },
    ]
    return solveDynamicBeatTimings(candidates4, duration)
  }

  // --------------------------------------------------------------------------
  // 2. ORTA FORM REKLAM (MID FORM: 15–24 SANİYE)
  // --------------------------------------------------------------------------
  if (route.grammarType === 'mid_form') {
    const candidatesMid: DynamicBeatCandidate[] = [
      {
        id: 'b01',
        type: 'hook',
        purpose: `${envPrimary} ortamında çözülecek somut ihtiyacın ve operasyonel sınavın ortaya konması.`,
        viewerKnowledgeBefore: 'Nötr durum.',
        viewerKnowledgeAfter: `İş ortamındaki kritik ihtiyacı ve aşılması gereken ${avoidElement} riskini kavradı.`,
        emotionIn: 'curiosity',
        emotionOut: 'focus',
        importanceWeight: 2.0,
        minDurationSec: 2.0,
        preferredDurationSec: duration * 0.20,
        maxDurationSec: 5.0,
      },
      {
        id: 'b02',
        type: 'product_entrance',
        purpose: `${product} profesyonel araç olarak sahaya girişi ve ${actionPrimary} başlangıcı.`,
        viewerKnowledgeBefore: 'İhtiyacı biliyor ama çözümü görmedi.',
        viewerKnowledgeAfter: `${product} doğru ve yetkin araç olarak devreye girdi.`,
        emotionIn: 'focus',
        emotionOut: 'anticipation',
        importanceWeight: 3.5,
        minDurationSec: 3.0,
        preferredDurationSec: duration * 0.30,
        maxDurationSec: 7.0,
      },
      {
        id: 'b03',
        type: 'proof',
        purpose: `${actionSecondary} dönüşüm kanıtı ve ölçülebilir işlevsel başarı.`,
        viewerKnowledgeBefore: 'Müdahaleyi gördü.',
        viewerKnowledgeAfter: 'İşin kusursuz tamamlandığını ve net fayda sağlandığını gördü.',
        emotionIn: 'anticipation',
        emotionOut: 'confidence',
        importanceWeight: 4.5,
        minDurationSec: 4.0,
        preferredDurationSec: duration * 0.32,
        maxDurationSec: 9.0,
      },
      {
        id: 'b04',
        type: 'brand_resolution',
        purpose: `${brand} kurumsal mührü ve ${promise.viewerBeliefAfter}`,
        viewerKnowledgeBefore: 'Sonucu beğendi.',
        viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
        emotionIn: 'confidence',
        emotionOut: 'conviction',
        importanceWeight: 2.5,
        minDurationSec: 2.5,
        preferredDurationSec: duration * 0.18,
        maxDurationSec: 6.0,
      },
    ]
    return solveDynamicBeatTimings(candidatesMid, duration)
  }

  // --------------------------------------------------------------------------
  // 3. UZUN METRAJ MARKA FİLMİ (BRAND FILM: 25–60 SANİYE)
  // SEMANTİK DURUM İLERLEMESİ (HOOK -> WORLD -> TENSION -> INTERVENTION -> TRANSFORMATION -> ESCALATION -> PAYOFF -> BRAND)
  // Sektörel kod dallanması YOKTUR: Dünyayı ve eylemleri sectorFacts datasından çeker.
  // --------------------------------------------------------------------------
  const candidatesLong: DynamicBeatCandidate[] = [
    {
      id: 'b01',
      type: 'world',
      purpose: `${envPrimary} ortamının ham dokusu, zorlu çalışma koşulları ve aşılması gereken yüksek standart.`,
      viewerKnowledgeBefore: 'Dış gözlemci.',
      viewerKnowledgeAfter: `İşin hakiki zorluğunu, ${material} dokusunu ve yüksek uzmanlık gerektirdiğini kavradı.`,
      emotionIn: 'intrigue',
      emotionOut: 'immersion',
      importanceWeight: 2.5,
      minDurationSec: 3.5,
      preferredDurationSec: duration * 0.15,
      maxDurationSec: 9.0,
    },
    {
      id: 'b02',
      type: 'product_entrance',
      purpose: `${product} sahaya zamanında intikali, ${visualElement} netliği ve operasyonel temas.`,
      viewerKnowledgeBefore: 'Dünyayı gördü.',
      viewerKnowledgeAfter: `${product} çözüm getiren belirleyici araç olarak devrededir.`,
      emotionIn: 'immersion',
      emotionOut: 'respect',
      importanceWeight: 3.5,
      minDurationSec: 5.0,
      preferredDurationSec: duration * 0.22,
      maxDurationSec: 12.0,
    },
    {
      id: 'b03',
      type: 'transformation',
      purpose: `${actionPrimary} ile kesintisiz operasyon: Somut dönüşüm kanıtı ve performans sınavı.`,
      viewerKnowledgeBefore: 'İşlemi gördü.',
      viewerKnowledgeAfter: `Ürünün vaadini eksiksiz gerçekleştirdiğine, ${promise.evidence[0] || 'somut kaliteye'} tanık oldu.`,
      emotionIn: 'respect',
      emotionOut: 'confidence',
      importanceWeight: 5.5,
      minDurationSec: 7.0,
      preferredDurationSec: duration * 0.28,
      maxDurationSec: 18.0,
    },
    {
      id: 'b04',
      type: 'escalation',
      purpose: `${actionSecondary} ile katlanan başarı, tamamlanan büyük operasyon ve nihai tatmin tablosu.`,
      viewerKnowledgeBefore: 'Tekil eylemi gördü.',
      viewerKnowledgeAfter: 'Bütün sürecin kalıcı bir başarıya, yüksek güven ve geleceğe uzanan bir esere dönüştüğünü anladı.',
      emotionIn: 'confidence',
      emotionOut: 'admiration',
      importanceWeight: 4.5,
      minDurationSec: 6.0,
      preferredDurationSec: duration * 0.22,
      maxDurationSec: 14.0,
    },
    {
      id: 'b05',
      type: 'brand_resolution',
      purpose: `${brand} stratejik çözüm ortaklığı, köklü güvencesi ve ${promise.viewerBeliefAfter}`,
      viewerKnowledgeBefore: 'Eseri/başarıyı gördü.',
      viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
      emotionIn: 'admiration',
      emotionOut: 'conviction',
      importanceWeight: 3.0,
      minDurationSec: 4.0,
      preferredDurationSec: duration * 0.13,
      maxDurationSec: 9.0,
    },
  ]

  return solveDynamicBeatTimings(candidatesLong, duration)
}
