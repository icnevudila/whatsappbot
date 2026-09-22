/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * BEAT SHEET ENGINE (V6)
 * 
 * Kesin Kural:
 * Sahne görselinden ÖNCE beat üretilir.
 * Beat = o anda izleyicinin zihninde veya duygusunda ne değiştiğidir.
 * viewerKnowledgeBefore ve viewerKnowledgeAfter birbirinden ÖZÜNDE FARKLI olmak zorundadır.
 */

import type {
  ResolvedCreativeFacts,
  CreativeDNA,
  StrategicPromise,
  DirectorTreatment,
  StoryBeat
} from './creative-types'
import { routeCommercialGrammar, type GrammarRoutePlan } from './grammar-router'

export function generateBeatSheet(params: {
  facts: ResolvedCreativeFacts
  dna: CreativeDNA
  promise: StrategicPromise
  treatment: DirectorTreatment
  targetDurationSeconds: number
}): StoryBeat[] {
  const { facts, dna, promise, treatment, targetDurationSeconds } = params
  const duration = Math.max(5, Math.min(60, Number(targetDurationSeconds) || 8))
  const route = routeCommercialGrammar(duration, facts.product.referenceAssetIds.length > 0)
  const product = facts.product.name
  const brand = facts.brandName

  // 1. SHORT PERFORMANCE (6–12s)
  if (route.grammarType === 'short_performance') {
    const isSingleContinuous = route.cameraModePreferred === 'continuous_take'
    if (isSingleContinuous) {
      return [
        {
          id: 'b01',
          type: 'hook',
          startSec: 0.0,
          endSec: Number((duration * 0.35).toFixed(1)),
          purpose: `İzleyiciyi ${product} fiziksel eylemi ve dokusuyla ilk 0.3 saniyede yakalamak.`,
          viewerKnowledgeBefore: 'Henüz ürün ve durum hakkında fikri yok.',
          viewerKnowledgeAfter: `${product} somut fiziksel varlığıyla doğrudan operasyonun merkezindedir.`,
          emotionIn: 'curiosity',
          emotionOut: 'interest',
          requiredEvidence: ['material_texture'],
        },
        {
          id: 'b02',
          type: 'proof',
          startSec: Number((duration * 0.35).toFixed(1)),
          endSec: Number((duration * 0.75).toFixed(1)),
          purpose: `${product} kullanım anındaki mükemmel performans ve işlevsellik kanıtı.`,
          viewerKnowledgeBefore: 'Ürünün sadece var olduğunu gördü.',
          viewerKnowledgeAfter: `Ürünün işlevini kusursuz ve zorlanmadan yerine getirdiğini bizzat gördü.`,
          emotionIn: 'interest',
          emotionOut: 'confidence',
          requiredEvidence: ['operational_competence'],
        },
        {
          id: 'b03',
          type: 'brand_resolution',
          startSec: Number((duration * 0.75).toFixed(1)),
          endSec: duration,
          purpose: `Güven hissini ${brand} markası ve net eylem çağrısıyla (CTA) sabitlemek.`,
          viewerKnowledgeBefore: 'Sadece ürünün başarısını gördü.',
          viewerKnowledgeAfter: `Bu kalitenin arkasındaki güvencenin ${brand} olduğunu ve doğrudan temin edilebileceğini anladı.`,
          emotionIn: 'confidence',
          emotionOut: 'conviction',
          requiredEvidence: ['brand_identity'],
        },
      ]
    }

    // Short Performance 3-Cut Dynamic
    const t1 = Number((duration * 0.28).toFixed(1))
    const t2 = Number((duration * 0.72).toFixed(1))

    return [
      {
        id: 'b01',
        type: 'hook',
        startSec: 0.0,
        endSec: t1,
        purpose: 'Görsel kanca: Sıradanlığı yıkan doğrudan fiziksel eylem başlangıcı.',
        viewerKnowledgeBefore: 'İzleyici pasif konumda.',
        viewerKnowledgeAfter: `${product} ürününün gerçek ve dinamik bir eylem içinde olduğunu algıladı.`,
        emotionIn: 'curiosity',
        emotionOut: 'alertness',
        requiredEvidence: ['action_first'],
      },
      {
        id: 'b02',
        type: 'proof',
        startSec: t1,
        endSec: t2,
        purpose: 'Fonksiyonel kanıt: Malzemenin ve ürünün zorlu görevi başarıyla tamamlaması.',
        viewerKnowledgeBefore: 'Eylemin başladığını biliyor ama sonucu henüz bilmiyor.',
        viewerKnowledgeAfter: `${product} işlevini sıfır hata ve üstün mukavemetle tamamladı.`,
        emotionIn: 'alertness',
        emotionOut: 'admiration',
        requiredEvidence: ['material_durability'],
      },
      {
        id: 'b03',
        type: 'brand_resolution',
        startSec: t2,
        endSec: duration,
        purpose: 'Marka imzası ve ticari kapanış: Kaya gibi stabil güven.',
        viewerKnowledgeBefore: 'Ürünün çalıştığını gördü ama tedarikçiyi tescillemedi.',
        viewerKnowledgeAfter: `Bu kalitenin kaynağının ${brand} olduğunu öğrendi ve harekete geçmeye karar verdi.`,
        emotionIn: 'admiration',
        emotionOut: 'decision',
        requiredEvidence: ['brand_mark'],
      },
    ]
  }

  // 2. MID FORM (13–24s)
  if (route.grammarType === 'mid_form') {
    const s1 = Number((duration * 0.20).toFixed(1))
    const s2 = Number((duration * 0.50).toFixed(1))
    const s3 = Number((duration * 0.78).toFixed(1))

    return [
      {
        id: 'b01',
        type: 'hook',
        startSec: 0.0,
        endSec: s1,
        purpose: 'Görsel kanca ve operasyonel dünya girişi.',
        viewerKnowledgeBefore: 'Nötr durum.',
        viewerKnowledgeAfter: 'Çalışma dünyasını ve çözülmesi gereken durumu fark etti.',
        emotionIn: 'curiosity',
        emotionOut: 'focus',
      },
      {
        id: 'b02',
        type: 'product_entrance',
        startSec: s1,
        endSec: s2,
        purpose: `${product} sahaya girmesi ve doğrudan müdahalesi.`,
        viewerKnowledgeBefore: 'Sadece ihtiyacı veya iş alanını biliyor.',
        viewerKnowledgeAfter: `${product} doğru araç olarak devreye girdi.`,
        emotionIn: 'focus',
        emotionOut: 'anticipation',
      },
      {
        id: 'b03',
        type: 'proof',
        startSec: s2,
        endSec: s3,
        purpose: 'Kanıt ve somut sonuç ortaya çıkışı.',
        viewerKnowledgeBefore: 'Ürünün girdiğini gördü.',
        viewerKnowledgeAfter: 'İşin kusursuz tamamlandığını ve kalitenin ispatlandığını gördü.',
        emotionIn: 'anticipation',
        emotionOut: 'confidence',
      },
      {
        id: 'b04',
        type: 'brand_resolution',
        startSec: s3,
        endSec: duration,
        purpose: `${brand} kurumsal mühür ve stratejik vaadin teyidi.`,
        viewerKnowledgeBefore: 'Sonucu beğendi.',
        viewerKnowledgeAfter: `Tedarikçi olarak ${brand} ile çalışmanın güvenini benimsedi.`,
        emotionIn: 'confidence',
        emotionOut: 'conviction',
      },
    ]
  }

  // 3. BRAND FILM (25–60s: 5 PERDELİ TEK NARRATIVE İLERLEYİŞ)
  const b1 = Number((duration * 0.15).toFixed(1))
  const b2 = Number((duration * 0.35).toFixed(1))
  const b3 = Number((duration * 0.60).toFixed(1))
  const b4 = Number((duration * 0.82).toFixed(1))

  return [
    {
      id: 'b01',
      type: 'world',
      startSec: 0.0,
      endSec: b1,
      purpose: 'Dramatik açılış: Malzemenin ve dünyanın ham gerçeğini hissettirmek.',
      viewerKnowledgeBefore: 'İzleyici dış dünyada.',
      viewerKnowledgeAfter: `Bu dünyanın zorlu standartlarını ve ${product} ait olduğu ortamı hissetti.`,
      emotionIn: 'intrigue',
      emotionOut: 'immersion',
    },
    {
      id: 'b02',
      type: 'product_entrance',
      startSec: b1,
      endSec: b2,
      purpose: 'Ürünün ve insan ustalığının sahneye girişi.',
      viewerKnowledgeBefore: 'Sadece ortamı biliyor.',
      viewerKnowledgeAfter: `${product} tasarımının ve malzemesinin ustaca kontrol edildiğini gördü.`,
      emotionIn: 'immersion',
      emotionOut: 'respect',
    },
    {
      id: 'b03',
      type: 'transformation',
      startSec: b2,
      endSec: b3,
      purpose: 'Maddi dönüşüm ve işlevsel sınav: Süreçteki mükemmellik kanıtı.',
      viewerKnowledgeBefore: 'Ürünün hazır olduğunu gördü.',
      viewerKnowledgeAfter: `Zorlu işlem sırasında malzemenin hiçbir taviz vermeden sonucu yarattığına tanık oldu.`,
      emotionIn: 'respect',
      emotionOut: 'confidence',
    },
    {
      id: 'b04',
      type: 'escalation',
      startSec: b3,
      endSec: b4,
      purpose: 'Büyük ölçek ve nihai sonuç eseri: Payoff zirvesi.',
      viewerKnowledgeBefore: 'Tekil anı gördü.',
      viewerKnowledgeAfter: `Bütün bir eserin veya hasadın bu güçle ayağa kalktığını, kalitenin ölçeklendiğini gördü.`,
      emotionIn: 'confidence',
      emotionOut: 'admiration',
    },
    {
      id: 'b05',
      type: 'brand_resolution',
      startSec: b4,
      endSec: duration,
      purpose: `${brand} stratejik vaadinin kalıcı olarak mühürlenmesi.`,
      viewerKnowledgeBefore: 'Etkilendi ama markanın nihai rolünü henüz içselleştirmedi.',
      viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
      emotionIn: 'admiration',
      emotionOut: 'conviction',
    },
  ]
}
