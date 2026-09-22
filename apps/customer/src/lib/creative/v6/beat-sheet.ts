/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * DYNAMIC BEAT SHEET ENGINE (V6 HARDENED)
 * 
 * Kesin İlkeler:
 * 1. Sabit süre şablonu (0-2/2-5/5-8/8-10) YASAKTIR.
 *    Short performance: 1 continuous take, 2 scenes, 3 scenes veya 4 scenes olabilir.
 *    Süreler Director Treatment ve Concept'e göre dinamik bölünür.
 * 2. Sabit hikâye şablonu (Felsefe -> Hammadde -> Ustalık...) YASAKTIR.
 *    Brand film semantic state progression sağlar:
 *    HOOK -> WORLD -> TENSION -> INTERVENTION -> TRANSFORMATION -> ESCALATION -> PAYOFF -> BRAND
 *    Sektöre ve vaade özel özgün beat'ler seçilir (SaaS, Kozmetik, Tarım, İnşaat, Özel Sektörler).
 * 3. Her beat için: viewer_knowledge_before != viewer_knowledge_after zorunludur.
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
  const duration = Math.max(5, Math.min(60, Number(targetDurationSeconds) || 8))
  const sector = (facts.sectorFacts.sectorProfileId || '').toLowerCase()
  const route = routeCommercialGrammar(duration, {
    hasExactProductReference: facts.product.referenceAssetIds.length > 0,
    campaignObjective: facts.campaign.objective,
    sectorHint: sector,
  })

  const product = facts.product.name
  const brand = facts.brandName

  // --------------------------------------------------------------------------
  // 1. SHORT PERFORMANCE (6–12 SANİYE): DİNAMİK SAHNE SAYISI VE SÜRELERİ
  // --------------------------------------------------------------------------
  if (route.grammarType === 'short_performance') {
    // Sahne sayısını belirle: override yoksa treatment ve concept'e göre 1, 2, 3 veya 4 seç
    let sceneCount = sceneCountOverride || route.preferredSceneCount
    if (!sceneCountOverride && concept) {
      if (concept.narrativeDevice.includes('continuous') || concept.narrativeDevice.includes('transformation_arc')) {
        sceneCount = duration <= 8 ? 1 : 2
      } else if (concept.narrativeDevice.includes('speed') || concept.narrativeDevice.includes('interrupt')) {
        sceneCount = duration >= 10 ? 4 : 3
      }
    }

    // A. 1 CONTINUOUS TAKE (Tek kesintisiz eylem / dönüşüm planı, örn: 0-10s)
    if (sceneCount === 1) {
      return [
        {
          id: 'b01',
          type: 'hook',
          startSec: 0.0,
          endSec: duration,
          purpose: `Kesintisiz tek plan çekim: ${product} doğrudan eylemi, somut dönüşüm kanıtı ve ${brand} ile sonuçlanması.`,
          viewerKnowledgeBefore: 'Durum ve ürün hakkında henüz bilgisi yok.',
          viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
          emotionIn: 'curiosity',
          emotionOut: 'conviction',
          requiredEvidence: ['continuous_action', 'tangible_proof'],
        },
      ]
    }

    // B. 2 DYNAMIC SCENES (Kanca & Aksiyon -> Kanıt & Marka Sonucu)
    // Örnek 10s: 0–4.2s hook/action, 4.2–10s proof/payoff
    if (sceneCount === 2) {
      const split = Number((duration * 0.42).toFixed(1))
      return [
        {
          id: 'b01',
          type: 'hook',
          startSec: 0.0,
          endSec: split,
          purpose: `Hızlı dikkat kancası ve ${product} ürününün anında operasyonel eyleme başlaması.`,
          viewerKnowledgeBefore: 'Pasif izleyici.',
          viewerKnowledgeAfter: `${product} kullanım anındaki doğrudan gücünü ve işlevini gördü.`,
          emotionIn: 'curiosity',
          emotionOut: 'interest',
          requiredEvidence: ['action_first'],
        },
        {
          id: 'b02',
          type: 'brand_resolution',
          startSec: split,
          endSec: duration,
          purpose: `Somut sonuç kanıtı ve ${brand} markasının sağladığı nihai güvence ile aksiyon çağrısı.`,
          viewerKnowledgeBefore: 'Eylemin başladığını biliyor ama sonucu henüz tescillemedi.',
          viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
          emotionIn: 'interest',
          emotionOut: 'conviction',
          requiredEvidence: ['result_proof', 'brand_identity'],
        },
      ]
    }

    // C. 3 DYNAMIC SCENES (Dinamik 3 Aşamalı Kurgu)
    // Örnek 10s: 0–1.2s kanca, 1.2–6.8s ürün aksiyon/kanıt, 6.8–10s sonuç/marka
    if (sceneCount === 3) {
      const t1 = Number((duration * 0.14).toFixed(1)) // ~1.2s - 1.4s
      const t2 = Number((duration * 0.68).toFixed(1)) // ~6.8s - 7.0s
      return [
        {
          id: 'b01',
          type: 'hook',
          startSec: 0.0,
          endSec: t1,
          purpose: 'Ultra hızlı dikkat kancası: Sıradanlığı yıkan anlık görsel odak.',
          viewerKnowledgeBefore: 'Pasif durumda.',
          viewerKnowledgeAfter: `${product} odağında kritik durumun başladığını algıladı.`,
          emotionIn: 'curiosity',
          emotionOut: 'alertness',
          requiredEvidence: ['visual_hook'],
        },
        {
          id: 'b02',
          type: 'proof',
          startSec: t1,
          endSec: t2,
          purpose: `${product} sahada kesintisiz operasyonu, eylem ve somut kanıt süreci.`,
          viewerKnowledgeBefore: 'Sadece anlık kancayı gördü.',
          viewerKnowledgeAfter: `Ürünün görevi kusursuz ve zorlanmadan başardığını bizzat deneyimledi.`,
          emotionIn: 'alertness',
          emotionOut: 'confidence',
          requiredEvidence: ['operational_proof'],
        },
        {
          id: 'b03',
          type: 'brand_resolution',
          startSec: t2,
          endSec: duration,
          purpose: `Nihai sonuç tablosu ve ${brand} kurumsal çözümü ile aksiyon çağrısı.`,
          viewerKnowledgeBefore: 'Başarılı eylemi gördü ama markayla bağlamadı.',
          viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
          emotionIn: 'confidence',
          emotionOut: 'conviction',
          requiredEvidence: ['brand_resolution'],
        },
      ]
    }

    // D. 4 DYNAMIC SCENES (Interrupt -> Reveal -> Proof -> Result)
    // Örnek 10s: 0–0.8s interrupt, 0.8–3.2s reveal, 3.2–7.1s proof, 7.1–10s brand result
    const p1 = Number((duration * 0.08).toFixed(1)) // ~0.8s
    const p2 = Number((duration * 0.32).toFixed(1)) // ~3.2s
    const p3 = Number((duration * 0.71).toFixed(1)) // ~7.1s
    return [
      {
        id: 'b01',
        type: 'hook',
        startSec: 0.0,
        endSec: p1,
        purpose: 'Görsel kesinti (interrupt): İzleyicinin akışını anında durduran kanca.',
        viewerKnowledgeBefore: 'Kaydırma modunda pasif izleyici.',
        viewerKnowledgeAfter: 'Beklenmedik bir hareketle dikkatini tamamen verdi.',
        emotionIn: 'neutral',
        emotionOut: 'surprise',
        requiredEvidence: ['interrupt'],
      },
      {
        id: 'b02',
        type: 'product_entrance',
        startSec: p1,
        endSec: p2,
        purpose: `${product} detaylı reveal ve fiziksel tasarım netliği.`,
        viewerKnowledgeBefore: 'Sadece bir kanca gördü.',
        viewerKnowledgeAfter: `${product} niteliklerini ve kullanım amacını kavradı.`,
        emotionIn: 'surprise',
        emotionOut: 'interest',
        requiredEvidence: ['product_clarity'],
      },
      {
        id: 'b03',
        type: 'proof',
        startSec: p2,
        endSec: p3,
        purpose: 'Yoğunlaştırılmış kanıt ve performans başarısı.',
        viewerKnowledgeBefore: 'Ürünün formunu biliyor.',
        viewerKnowledgeAfter: 'Ürünün sahada yarattığı somut faydaya ve hızına şahit oldu.',
        emotionIn: 'interest',
        emotionOut: 'admiration',
        requiredEvidence: ['performance_proof'],
      },
      {
        id: 'b04',
        type: 'brand_resolution',
        startSec: p3,
        endSec: duration,
        purpose: `Marka sonucu ve ${brand} ile kesin aksiyon kararı.`,
        viewerKnowledgeBefore: 'Faydayı gördü.',
        viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
        emotionIn: 'admiration',
        emotionOut: 'conviction',
        requiredEvidence: ['brand_call_to_action'],
      },
    ]
  }

  // --------------------------------------------------------------------------
  // 2. MID FORM (13–24 SANİYE): DİNAMİK ORTA FORM
  // --------------------------------------------------------------------------
  if (route.grammarType === 'mid_form') {
    const s1 = Number((duration * 0.18).toFixed(1))
    const s2 = Number((duration * 0.48).toFixed(1))
    const s3 = Number((duration * 0.76).toFixed(1))

    return [
      {
        id: 'b01',
        type: 'hook',
        startSec: 0.0,
        endSec: s1,
        purpose: 'Durum tespiti ve çözülecek ihtiyacın sahneye konması.',
        viewerKnowledgeBefore: 'Nötr durum.',
        viewerKnowledgeAfter: 'İş ortamındaki kritik ihtiyacı ve bağlamı kavradı.',
        emotionIn: 'curiosity',
        emotionOut: 'focus',
      },
      {
        id: 'b02',
        type: 'product_entrance',
        startSec: s1,
        endSec: s2,
        purpose: `${product} çözüm olarak sahaya girişi ve operasyonel müdahale.`,
        viewerKnowledgeBefore: 'Sadece ihtiyacı biliyor.',
        viewerKnowledgeAfter: `${product} doğru ve etkin araç olarak devreye girdi.`,
        emotionIn: 'focus',
        emotionOut: 'anticipation',
      },
      {
        id: 'b03',
        type: 'proof',
        startSec: s2,
        endSec: s3,
        purpose: 'Dönüşüm kanıtı ve ölçülebilir işlevsel başarı.',
        viewerKnowledgeBefore: 'Müdahaleyi gördü.',
        viewerKnowledgeAfter: 'İşin kusursuz tamamlandığını ve net fayda sağlandığını gördü.',
        emotionIn: 'anticipation',
        emotionOut: 'confidence',
      },
      {
        id: 'b04',
        type: 'brand_resolution',
        startSec: s3,
        endSec: duration,
        purpose: `${brand} kurumsal mühür ve stratejik vaadin kalıcı teyidi.`,
        viewerKnowledgeBefore: 'Sonucu beğendi.',
        viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
        emotionIn: 'confidence',
        emotionOut: 'conviction',
      },
    ]
  }

  // --------------------------------------------------------------------------
  // 3. BRAND FILM (25–60 SANİYE): SEKTÖRE VE KONSEPTİNE ÖZEL SEMANTIC STATE PROGRESSION
  // HOOK -> WORLD -> TENSION -> INTERVENTION -> TRANSFORMATION -> ESCALATION -> PAYOFF -> BRAND
  // --------------------------------------------------------------------------
  const b1 = Number((duration * 0.14).toFixed(1))
  const b2 = Number((duration * 0.32).toFixed(1))
  const b3 = Number((duration * 0.55).toFixed(1))
  const b4 = Number((duration * 0.78).toFixed(1))

  // A. SaaS / B2B İstihbarat & Yazılım
  if (sector.includes('saas') || sector.includes('b2b') || sector.includes('tech') || sector.includes('software')) {
    return [
      {
        id: 'b01',
        type: 'world',
        startSec: 0.0,
        endSec: b1,
        purpose: 'Kaçırılan fırsat veya verimsiz iş arayışının yarattığı görünmez gerilim.',
        viewerKnowledgeBefore: 'İzleyici standart ofis rutini algısında.',
        viewerKnowledgeAfter: 'Doğru veriye hızla ulaşamamanın zaman ve satış kaybı yarattığını hissetti.',
        emotionIn: 'intrigue',
        emotionOut: 'tension',
      },
      {
        id: 'b02',
        type: 'product_entrance',
        startSec: b1,
        endSec: b2,
        purpose: `${product} sinyali ve taze nitelikli verilerin anında ekranda belirmesi.`,
        viewerKnowledgeBefore: 'Sorunu biliyor ama çözüm yolunu görmedi.',
        viewerKnowledgeAfter: `${product} sayesinde yeni açılan şirketler ve nitelikli lead\'ler tek ekranda netleşti.`,
        emotionIn: 'tension',
        emotionOut: 'discovery',
      },
      {
        id: 'b03',
        type: 'transformation',
        startSec: b2,
        endSec: b3,
        purpose: 'Kullanıcının tek tıkla ilk teklifi vermesi ve anlık iletişim aksiyonu.',
        viewerKnowledgeBefore: 'Veriyi gördü.',
        viewerKnowledgeAfter: 'Rakiplerden saatler önce doğru karar vericilere ulaşıldığını gördü.',
        emotionIn: 'discovery',
        emotionOut: 'confidence',
      },
      {
        id: 'b04',
        type: 'escalation',
        startSec: b3,
        endSec: b4,
        purpose: 'Ölçülebilir iş akışı sonucu: Onaylanan sözleşmeler ve satış artışı.',
        viewerKnowledgeBefore: 'Aksiyonu gördü.',
        viewerKnowledgeAfter: 'Bütün satış ekibinin veriminin katlandığını, işin somut büyümeye dönüştüğünü kavradı.',
        emotionIn: 'confidence',
        emotionOut: 'admiration',
      },
      {
        id: 'b05',
        type: 'brand_resolution',
        startSec: b4,
        endSec: duration,
        purpose: `${brand} dijital büyüme motoru kimliğiyle stratejik taahhüt.`,
        viewerKnowledgeBefore: 'Tekil satışı gördü.',
        viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
        emotionIn: 'admiration',
        emotionOut: 'conviction',
      },
    ]
  }

  // B. Kozmetik & Cilt Bakımı
  if (sector.includes('cosmetic') || sector.includes('skincare') || sector.includes('beauty')) {
    return [
      {
        id: 'b01',
        type: 'world',
        startSec: 0.0,
        endSec: b1,
        purpose: 'Cildin çevresel stresle yorulmuş hali ve dokusal ihtiyaç anı.',
        viewerKnowledgeBefore: 'Genel kozmetik reklamı beklentisi.',
        viewerKnowledgeAfter: 'Cildin derinlemesine neme ve arınmaya olan saf ihtiyacını hissetti.',
        emotionIn: 'curiosity',
        emotionOut: 'empathy',
      },
      {
        id: 'b02',
        type: 'product_entrance',
        startSec: b1,
        endSec: b2,
        purpose: `${product} kristal berraklığındaki damlası ve mikronize emilim başlangıcı.`,
        viewerKnowledgeBefore: 'İhtiyacı biliyor.',
        viewerKnowledgeAfter: `${product} saf aktif formülünün doğrudan cilde nüfuz ettiğini algıladı.`,
        emotionIn: 'empathy',
        emotionOut: 'anticipation',
      },
      {
        id: 'b03',
        type: 'transformation',
        startSec: b2,
        endSec: b3,
        purpose: 'Duyusal dönüşüm: Cilt dokusunun anında canlanması ve doğal ışıltı.',
        viewerKnowledgeBefore: 'Uygulamayı gördü.',
        viewerKnowledgeAfter: 'Cildin canlı, pürüzsüz ve sağlıklı bir dokuya kavuştuğuna tanık oldu.',
        emotionIn: 'anticipation',
        emotionOut: 'serenity',
      },
      {
        id: 'b04',
        type: 'escalation',
        startSec: b3,
        endSec: b4,
        purpose: 'Kullanıcının aynadaki kendinden emin, duru ve ışıltılı tebessümü.',
        viewerKnowledgeBefore: 'Yakın çekim dokuyu gördü.',
        viewerKnowledgeAfter: 'Kişinin bu bakımla kazandığı içsel özgüveni ve tazeliği hissetti.',
        emotionIn: 'serenity',
        emotionOut: 'admiration',
      },
      {
        id: 'b05',
        type: 'brand_resolution',
        startSec: b4,
        endSec: duration,
        purpose: `${brand} bilimsel ve zarif bakım vaadinin mühürlenmesi.`,
        viewerKnowledgeBefore: 'Güzel kareler gördü.',
        viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
        emotionIn: 'admiration',
        emotionOut: 'conviction',
      },
    ]
  }

  // C. Tarım & Bahçe Ekipmanları
  if (sector.includes('agri') || sector.includes('tarim') || sector.includes('garden')) {
    return [
      {
        id: 'b01',
        type: 'world',
        startSec: 0.0,
        endSec: b1,
        purpose: 'Geniş meyve bahçesinde sabah çiyi ve gün doğumu koşulları.',
        viewerKnowledgeBefore: 'Nötr izleyici.',
        viewerKnowledgeAfter: 'Zorlu arazi şartlarını ve doğru zamanda ilaçlama zorunluluğunu kavradı.',
        emotionIn: 'intrigue',
        emotionOut: 'immersion',
      },
      {
        id: 'b02',
        type: 'product_entrance',
        startSec: b1,
        endSec: b2,
        purpose: `${product} sırta ergonomik oturumu ve nozuldan yayılan mikronize sis.`,
        viewerKnowledgeBefore: 'Bahçeyi gördü.',
        viewerKnowledgeAfter: `${product} hafif yapısıyla çiftçinin yükünü sıfıra indirdiğini gördü.`,
        emotionIn: 'immersion',
        emotionOut: 'respect',
      },
      {
        id: 'b03',
        type: 'transformation',
        startSec: b2,
        endSec: b3,
        purpose: 'Kesintisiz püskürtme: Her yaprağın altına eşit ve homojen ulaşan koruma.',
        viewerKnowledgeBefore: 'İşin başladığını gördü.',
        viewerKnowledgeAfter: 'Tek damla ziyan olmadan bütün ağaçların tam koruma altına alındığına tanık oldu.',
        emotionIn: 'respect',
        emotionOut: 'confidence',
      },
      {
        id: 'b04',
        type: 'escalation',
        startSec: b3,
        endSec: b4,
        purpose: 'Çiftçinin yorulmadan tamamladığı dönümlerce sağlıklı yeşil bahçe.',
        viewerKnowledgeBefore: 'Tek ağacı gördü.',
        viewerKnowledgeAfter: 'Tüm arazinin tek şarjla kolayca korunduğunu ve bereketli hasat güvencesini anladı.',
        emotionIn: 'confidence',
        emotionOut: 'admiration',
      },
      {
        id: 'b05',
        type: 'brand_resolution',
        startSec: b4,
        endSec: duration,
        purpose: `${brand} dayanıklı tarım güvencesiyle stratejik kapanış.`,
        viewerKnowledgeBefore: 'Sonucu beğendi.',
        viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
        emotionIn: 'admiration',
        emotionOut: 'conviction',
      },
    ]
  }

  // D. İnşaat & Yapı Malzemeleri
  if (sector.includes('construct') || sector.includes('insaat') || sector.includes('build')) {
    return [
      {
        id: 'b01',
        type: 'world',
        startSec: 0.0,
        endSec: b1,
        purpose: 'Fırından çıkan kırmızı kilin ham dokusal hakikati ve geometrisi.',
        viewerKnowledgeBefore: 'Sıradan inşaat algısı.',
        viewerKnowledgeAfter: `${product} yüksek mukavemetinin kökenini ve endüstriyel hassasiyetini hissetti.`,
        emotionIn: 'intrigue',
        emotionOut: 'immersion',
      },
      {
        id: 'b02',
        type: 'product_entrance',
        startSec: b1,
        endSec: b2,
        purpose: 'Şantiyeye zamanında intikal ve ustanın harçla kurduğu milimetrik bağ.',
        viewerKnowledgeBefore: 'Fabrikayı gördü.',
        viewerKnowledgeAfter: `${product} sahadaki kusursuz harç tutuşunu ve taşıyıcı dayanımını gördü.`,
        emotionIn: 'immersion',
        emotionOut: 'respect',
      },
      {
        id: 'b03',
        type: 'transformation',
        startSec: b2,
        endSec: b3,
        purpose: 'Katların yükselişi: Sağlam omurganın depreme ve zamana meydan okuyan örümü.',
        viewerKnowledgeBefore: 'Tek tuğlayı gördü.',
        viewerKnowledgeAfter: 'Tüm yapının sarsılmaz bir bütün halinde yükseldiğine tanık oldu.',
        emotionIn: 'respect',
        emotionOut: 'confidence',
      },
      {
        id: 'b04',
        type: 'escalation',
        startSec: b3,
        endSec: b4,
        purpose: 'Tamamlanan modern mimari başyapıt ve gün batımındaki estetik cephe.',
        viewerKnowledgeBefore: 'İnşaatı gördü.',
        viewerKnowledgeAfter: 'Bu sağlamlığın geleceğe miras kalan prestijli bir yaşam alanına dönüştüğünü gördü.',
        emotionIn: 'confidence',
        emotionOut: 'admiration',
      },
      {
        id: 'b05',
        type: 'brand_resolution',
        startSec: b4,
        endSec: duration,
        purpose: `${brand} köklü güvencesiyle stratejik marka kapanışı.`,
        viewerKnowledgeBefore: 'Binayı gördü.',
        viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
        emotionIn: 'admiration',
        emotionOut: 'conviction',
      },
    ]
  }

  // E. Genel / Yeni / Bilinmeyen Sektör (Generic Universal Semantic Progression)
  return [
    {
      id: 'b01',
      type: 'world',
      startSec: 0.0,
      endSec: b1,
      purpose: 'Otantik çalışma dünyası ve aşılması gereken somut zorluk.',
      viewerKnowledgeBefore: 'Dış gözlemci.',
      viewerKnowledgeAfter: 'Bu sektörün gerektirdiği yüksek standardı ve gerçek durumu kavradı.',
      emotionIn: 'intrigue',
      emotionOut: 'focus',
    },
    {
      id: 'b02',
      type: 'product_entrance',
      startSec: b1,
      endSec: b2,
      purpose: `${product} profesyonel araç olarak devreye girmesi.`,
      viewerKnowledgeBefore: 'Zorluğu biliyor.',
      viewerKnowledgeAfter: `${product} çözüm getiren belirleyici unsur olarak devrededir.`,
      emotionIn: 'focus',
      emotionOut: 'anticipation',
    },
    {
      id: 'b03',
      type: 'transformation',
      startSec: b2,
      endSec: b3,
      purpose: 'Somut dönüşüm kanıtı ve operasyonel sınav.',
      viewerKnowledgeBefore: 'İşlemi gördü.',
      viewerKnowledgeAfter: 'Ürünün vaadini eksiksiz ve firesiz gerçekleştirdiğine tanık oldu.',
      emotionIn: 'anticipation',
      emotionOut: 'confidence',
    },
    {
      id: 'b04',
      type: 'escalation',
      startSec: b3,
      endSec: b4,
      purpose: 'Elde edilen nihai başarı ve ölçeklenen sonuç tatmini.',
      viewerKnowledgeBefore: 'Anlık başarıyı gördü.',
      viewerKnowledgeAfter: 'İşin kalıcı bir başarıya ve yüksek tatmine ulaştığını anladı.',
      emotionIn: 'confidence',
      emotionOut: 'admiration',
    },
    {
      id: 'b05',
      type: 'brand_resolution',
      startSec: b4,
      endSec: duration,
      purpose: `${brand} stratejik çözüm ortaklığı ve güven mührü.`,
      viewerKnowledgeBefore: 'Etkilendi.',
      viewerKnowledgeAfter: `${promise.viewerBeliefAfter}`,
      emotionIn: 'admiration',
      emotionOut: 'conviction',
    },
  ]
}
