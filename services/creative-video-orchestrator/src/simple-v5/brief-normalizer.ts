import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { SimpleV5Brief, SimpleV5ShotPlan } from './types.js'
import { resolveProductFidelityContract } from './fidelity-contract.js'
import { classifyOperationalDomain } from './domain-classifier.js'

// Disallowed deceptive claims unless explicitly listed in verified claims
const FORBIDDEN_MARKETING_FORMULAS = [
  'en ucuz',
  'rakipsiz',
  'lider marka',
  'garantili kazanç',
  'yüksek verim',
  'hızlı sevkiyat',
]

/**
 * SimpleV5BriefNormalizer.
 * Recovers the core legacy V4/V5 invariant:
 * ONE VIDEO, ONE PRIMARY IDEA, ONE LOCATION, ONE PRIMARY ACTION, ONE HERO PRODUCT, THREE SHOTS.
 * Strictly derives copy only from verified facts and neutral observational prose.
 * Uses Universal Domain Classifier for authentic real-world environmental matching.
 */
export class SimpleV5BriefNormalizer {
  public static normalize(snapshot: BrandContextSnapshot): {
    brief: SimpleV5Brief
    shotPlan: SimpleV5ShotPlan
  } {
    const brandName = snapshot.brand_name || 'İşletme'
    const product = snapshot.products[0]
    if (!product?.name || !product.asset_id || !product.sha256) {
      throw new Error('SIMPLE_V5_SELECTED_PRODUCT_REQUIRED: a locked canonical product/service asset is required')
    }
    const productName = product.name
    const verifiedClaims = (snapshot.verified_claims || []).filter(Boolean)
    const fidelityReport = resolveProductFidelityContract({ product })

    // 1. Universal Multi-Layer Domain & Environment Classification
    const domainProfile = classifyOperationalDomain({
      brandName,
      productName,
      productDescription: product.description,
      brandKitTone: snapshot.tone_of_voice.join(' '),
      sectorHint: snapshot.sector_profile,
      campaignBrief: snapshot.brand_description,
    })

    let location = domainProfile.location
    let lighting = domainProfile.lighting
    let cameraMotion = domainProfile.cameraMotion

    const requestedEnvironment = (snapshot.campaign.environment_preset || 'auto').toLowerCase()
    const environmentOverrides: Record<string, string> = {
      garden: 'Güneşli, verimli açık meyve bahçesi, yeşil asma bağları ve sağlıklı doğal bitki örtüsü',
      studio: 'Sade ve kontrollü profesyonel ürün stüdyosu',
      kitchen: 'Hijyenik ve profesyonel ticari mutfak istasyonu ve taze sunum tezgâhı',
      office: 'Modern ve aydınlık mimari ofis çalışma alanı',
      workshop: 'Gerçek düzenli atölye veya sanayi çalışma alanı',
      construction: 'Otantik ticari şantiye sahasında tek sabit ürün sergileme yüzeyi',
    }
    if (environmentOverrides[requestedEnvironment]) {
      location = environmentOverrides[requestedEnvironment]
      const environmentLighting: Record<string, string> = {
        studio: 'çekim boyunca değişmeyen yumuşak kontrollü stüdyo ana ışığı ve dengeli dolgu ışığı',
        garden: 'çekim boyunca değişmeyen doğal bahçe gün ışığı',
        kitchen: 'çekim boyunca değişmeyen hijyenik mutfak aydınlatması ve yumuşak dolgu ışığı',
        office: 'çekim boyunca değişmeyen dengeli ofis aydınlatması',
        workshop: 'çekim boyunca değişmeyen kontrollü atölye aydınlatması',
        construction: 'çekim boyunca değişmeyen doğal açık saha gün ışığı',
      }
      lighting = environmentLighting[requestedEnvironment]
    }

    const style = (snapshot.campaign.user_style_preference || 'AUTO').toUpperCase()
    const usageStyle = style === 'PRODUCT_USAGE' || style === 'SOCIAL_UGC'
    const verifiedAction = product.product_fidelity_contract?.allowed_actions?.find(Boolean)
    if (!environmentOverrides[requestedEnvironment] && domainProfile.domain === 'CONSTRUCTION_STRUCTURAL') {
      location = 'Otantik ticari şantiye sahasında tek sabit ürün sergileme yüzeyi'
    }
    const requestedMotion = (snapshot.campaign.motion_style || 'studio_orbit').toLowerCase()
    if (requestedMotion === 'studio_orbit') {
      cameraMotion = 'ürün formunu koruyan, tam tur atmayan güvenli 3/4 vitrin hareketi'
    } else if (requestedMotion === 'macro_detail') {
      cameraMotion = 'kontrollü makrodan ürünün tamamına açılan, formu okunur tutan hareket'
    } else if (requestedMotion === 'real_usage' && usageStyle && verifiedAction) {
      cameraMotion = 'gerçek kullanım adımını takip eden sabit ve yumuşak kamera'
    } else {
      cameraMotion = 'tek yönde yavaş, kısa mesafeli ve sarsıntısız kamera yaklaşımı; ürün ve yüzey sabit'
    }

    // 2. One Primary Idea & One Primary Action
    const primaryIdea = `${brandName} bünyesindeki ${productName} ürününün referansa sadık tek bir tanıtım anı.`
    const primaryAction = usageStyle && verifiedAction
      ? `${productName} ürününün doğrulanmış kullanım adımı: ${verifiedAction}`
      : `${productName} ürününün referanstaki biçimi korunarak tek bir sade ürün gösteriminde sergilenmesi.`

    // 3. Build Spoken Turkish Voiceover (Strict 10-14 words, max 18 words, zero banned formulas)
    let spokenScript = snapshot.campaign.approved_spoken_line?.trim() || ''

    if (!spokenScript) {
      // Neutral fallback contains identity only; it makes no capability or benefit claim.
      spokenScript = `${brandName}, ${productName} ürününü bu kısa tanıtımda gerçek çalışma ortamında gösteriyor.`
    }

    // Sanitize against forbidden marketing buzzwords if not verified
    const lowerScript = spokenScript.toLowerCase()
    for (const forbidden of FORBIDDEN_MARKETING_FORMULAS) {
      if (lowerScript.includes(forbidden)) {
        const isVerified = verifiedClaims.some(c => c.toLowerCase().includes(forbidden))
        if (!isVerified) {
          throw new Error(`SIMPLE_V5_UNVERIFIED_SPEECH: approved speech contains unverified formula "${forbidden}"`)
        }
      }
    }

    // Never truncate approved speech: truncation can silently change meaning.
    const words = spokenScript.split(/\s+/).filter(Boolean)
    if (words.length > 18) {
      throw new Error(`SIMPLE_V5_SPEECH_TOO_LONG: approved Turkish speech is ${words.length} words; hard maximum is 18`)
    }

    const durationSeconds = snapshot.requested_duration || 8

    const brief: SimpleV5Brief = {
      goal: 'Commercial Video',
      subject: productName,
      heroProductHandle: '@HeroProduct',
      heroProductId: product.product_id,
      heroProductSha: product.sha256,
      productFidelityContract: product.product_fidelity_contract,
      fidelityReport,
      brandName,
      primaryIdea,
      primaryAction,
      location,
      timeOfDay: 'gündüz',
      lighting,
      cameraMotion,
      spokenScript,
      spokenWordCount: words.length,
      verifiedFacts: verifiedClaims,
      aspectRatio: '9:16',
      durationSeconds,
      operationalDomain: domainProfile.domain,
      // User-selected environment wins over sector-derived background prohibitions.
      domainNegatives: environmentOverrides[requestedEnvironment]
        ? domainProfile.isolationNegatives.filter(term => !/indoor|warehouse|shelv|interior|ceiling|fluorescent|office|room|depot|workbench|carpet|store|furniture/i.test(term))
        : domainProfile.isolationNegatives,
      productPresentationDirective: usageStyle && verifiedAction
        ? `Tek doğrulanmış eylem: ${verifiedAction}. Aynı ürün, aynı ortam ve kesintisiz tek çekim; gerekirse anatomik olarak tutarlı bir operatör kullanılır.`
        : 'Ürün tek bir gerçek destek yüzeyinde sabit durur. Yüzey, yerleşim, arka plan ve ışık çekim boyunca değişmez. Ürün duvara, başka ürüne veya kullanım sahnesine dönüşmez; insan, el, taşıma, montaj ve püskürtme eklenmez.',
    }

    const styleDescriptions: Record<string, { hook: string; proof: string; close: string }> = {
      FAST_SALES: {
        hook: `${location} içinde sabit destek yüzeyindeki ${productName} ilk kareden itibaren tamamıyla okunur.`,
        proof: `Seçilen tek kamera hareketi sürer; ${productName} ve destek yüzeyi hareket etmeden gerçek malzeme detayı okunur.`,
        close: `${productName} merkezde; doğrudan kapanış kadrajı ve temiz CTA alanı.`,
      },
      DIRECT_OFFER: {
        hook: `${location} içinde ${productName} doğrudan odak noktasında; teklif metni sahneye basılmaz.`,
        proof: `Aynı yüzeyde sabit ${productName} ve değişmeyen arka plan; yeni sevkiyat veya kullanım eylemi eklenmez.`,
        close: `${productName} merkezde; yazısız, temiz ve net doğrudan kapanış kadrajı.`,
      },
      PRODUCT_USAGE: {
        hook: `${location} içinde ${productName} ve kullanım bağlamını birlikte kuran açılış.`,
        proof: `${primaryAction}`,
        close: `${productName} aynı ortam ve yüzeyde okunur kapanışta kalır.`,
      },
      PROBLEM_SOLUTION: {
        hook: `Uydurma hasar veya sonuç göstermeden ${location} çalışma bağlamı kurulur.`,
        proof: `Dayanıklılık veya sonuç iddiası üretmeden aynı sabit ürünün referansta görünen malzeme ve işlev detayına odaklanılır.`,
        close: `${productName} çözüm iddiası eklenmeden temiz ürün kapanışında.`,
      },
      SOCIAL_UGC: {
        hook: `${productName} için doğal birinci şahıs yaklaşımı; referans sunucu varsa yalnız o kullanılır.`,
        proof: `${primaryAction} Samimi fakat iddiasız kullanım detayı.`,
        close: `${productName} aynı doğal ortamında okunur son kadrajda.`,
      },
      PREMIUM: {
        hook: `${productName} silüeti ve referansta görünen malzeme dokusu sabit dengeli ışık ve geniş negatif alanla okunur.`,
        proof: `Başlangıçtaki tek kamera hareketi devam eder; sabit ürünün otantik yüzey dokusu ve ortam derinliği sakin kadrajda okunur.`,
        close: `${productName} geniş negatif alanlı sabit hero kapanışında.`,
      },
      AUTO: {
        hook: `Pürüzsüz 35mm sinematik kamera hareketi doğrudan ${productName} ürününün detaylarına ve otantik malzeme dokusuna odaklanır.`,
        proof: `Başlangıçtaki tek kamera hareketi devam eder; ${primaryAction}. Arka plan, ürün ve destek yüzeyi değişmez.`,
        close: `${productName} kadrajda kararlı, net ve heybetli bir şekilde sabitlenir; yazısız, temiz ve prestijli doğrudan kapanış kadrajı.`,
      },
      OFFER: {
        hook: `${productName} ilk saniyede okunur kadrajda; teklif metni sahne içine üretilmez.`,
        proof: `Teklif yalnız deterministic finishing alanına ayrılır.`,
        close: `${productName} ve boş teklif alanı bulunan temiz marka kapanışında.`,
      },
    }
    const selectedStyle = styleDescriptions[style] || styleDescriptions.AUTO

    // 4. Three Shots Layout; every user style keeps the same timing contract but materially changes visual grammar.
    const shotPlan: SimpleV5ShotPlan = {
      shot1_hook: {
        timing: '0.0-2.2s',
        description: selectedStyle.hook,
        framing: 'Orta plan açılış ve odaklanma',
      },
      shot2_proof: {
        timing: '2.2-5.8s',
        description: selectedStyle.proof,
        action: primaryAction,
      },
      shot3_close: {
        timing: '5.8-8.0s',
        description: selectedStyle.close,
        resolution: 'Sabit son kadraj ve temiz alan',
      },
    }

    return { brief, shotPlan }
  }
}
