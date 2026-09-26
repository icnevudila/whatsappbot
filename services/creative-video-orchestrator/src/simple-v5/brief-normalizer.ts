import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { SimpleV5Brief, SimpleV5ShotPlan } from './types.js'

// Disallowed marketing buzzwords unless explicitly listed in verified claims
const FORBIDDEN_MARKETING_FORMULAS = [
  'yüksek verim',
  'hızlı sevkiyat',
  'satışlarınızı büyütün',
  'güvencesiyle',
  'kalitesiyle',
  'lider marka',
  'en ucuz',
  'rakipsiz',
]

/**
 * SimpleV5BriefNormalizer.
 * Recovers the core legacy V4/V5 invariant:
 * ONE VIDEO, ONE PRIMARY IDEA, ONE LOCATION, ONE PRIMARY ACTION, ONE HERO PRODUCT, THREE SHOTS.
 * Strictly derives copy only from verified facts and neutral observational prose.
 */
import { resolveProductFidelityContract } from './fidelity-contract.js'

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

    // 1. One Location & Sector Environment (Sector provides atmosphere, NEVER product action)
    const sector = (snapshot.sector_profile || '').toLowerCase()
    let location = 'Otantik ve profesyonel ticari çalışma ortamı'
    let lighting = 'doğal dengeli gün ışığı'
    let cameraMotion = 'pürüzsüz 35mm sinematik takip'

    if (sector.includes('construction') || sector.includes('inşaat') || productName.toLowerCase().includes('tuğla')) {
      location = 'Otantik ticari şantiye ve yapı lojistiği sahası'
      lighting = 'doğal sabah ışığı'
      cameraMotion = 'sabit odak ve akıcı endüstriyel takip'
    } else if (sector.includes('agriculture') || sector.includes('tarım')) {
      location = 'Otantik açık tarım arazisi ve tarla ortamı'
      lighting = 'açık gökyüzü doğal gün ışığı'
      cameraMotion = 'geniş açıdan detay odağına yumuşak kayma'
    } else if (sector.includes('food') || sector.includes('gıda') || sector.includes('restaurant')) {
      location = 'Hijyenik ve profesyonel ticari mutfak istasyonu'
      lighting = 'sıcak ve berrak stüdyo ışığı'
      cameraMotion = 'yakın plan makro kayma'
    } else if (sector.includes('tech') || sector.includes('software')) {
      location = 'Modern ve aydınlık ofis çalışma masası'
      lighting = 'temiz difüze çalışma ortamı ışığı'
      cameraMotion = 'net ekran hizalaması ve sabit kadraj'
    }

    const requestedEnvironment = (snapshot.campaign.environment_preset || 'auto').toLowerCase()
    const environmentOverrides: Record<string, string> = {
      garden: 'Doğal bahçe, tarla veya sera ortamı',
      studio: 'Sade ve kontrollü profesyonel ürün stüdyosu',
      kitchen: 'Hijyenik profesyonel mutfak veya sunum alanı',
      office: 'Modern ve aydınlık ofis çalışma alanı',
      workshop: 'Gerçek atölye, fabrika veya sanayi çalışma alanı',
      construction: 'Otantik ticari şantiye ve yapı lojistiği sahası',
    }
    if (environmentOverrides[requestedEnvironment]) location = environmentOverrides[requestedEnvironment]

    const requestedMotion = (snapshot.campaign.motion_style || 'real_usage').toLowerCase()
    if (requestedMotion === 'studio_orbit') {
      cameraMotion = 'ürün formunu koruyan, tam tur atmayan güvenli 3/4 vitrin hareketi'
    } else if (requestedMotion === 'macro_detail') {
      cameraMotion = 'kontrollü makrodan ürünün tamamına açılan, formu okunur tutan hareket'
    } else if (requestedMotion === 'real_usage') {
      cameraMotion = 'gerçek kullanım adımını takip eden sabit ve yumuşak kamera'
    }

    // 2. One Primary Idea & One Primary Action
    const primaryIdea = `${brandName} bünyesindeki ${productName} ürününün referansa sadık tek bir tanıtım anı.`
    // Sector hints may choose the environment, never the product's capability. Keep
    // the action observational unless the locked campaign supplied an approved line.
    const primaryAction = `${productName} ürününün referanstaki biçimi korunarak tek bir gerçek kullanım anında gösterilmesi.`

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
    // SIMPLE_V5_HYBRID is an explicitly vertical short-ad mode. Never inherit a
    // landscape request/default from CURRENT or from an older persisted draft.
    const aspectRatio = '9:16' as const

    const brief: SimpleV5Brief = {
      goal: snapshot.campaign.objective || 'Ürün tanıtımı',
      subject: productName,
      heroProductHandle: '@HeroProduct',
      heroProductId: product.product_id || product.asset_id,
      heroProductSha: product.sha256,
      productFidelityContract: product.product_fidelity_contract,
      fidelityReport,
      brandName,
      primaryIdea,
      primaryAction,
      location,
      timeOfDay: 'doğal gündüz',
      lighting,
      cameraMotion,
      spokenScript,
      spokenWordCount: words.length,
      verifiedFacts: verifiedClaims,
      aspectRatio,
      durationSeconds,
    }

    const style = (snapshot.campaign.user_style_preference || 'AUTO').toUpperCase()
    const styleDescriptions: Record<string, { hook: string; proof: string; close: string }> = {
      FAST_SALES: {
        hook: `Dinamik ve akıcı kamera hareketi sevkiyata hazır ${productName} üzerinde başlar.`,
        proof: `${location} ortamında düzenli sevkiyat ve kurumsal operasyon akışı içinde ürünün hızlı teslimat güvenini hissettiren kesintisiz akış.`,
        close: `${productName} merkezde; yazısız, temiz ve net doğrudan kapanış kadrajı.`,
      },
      PRODUCT_USAGE: {
        hook: `${location} içinde ${productName} ve kullanım bağlamını birlikte kuran açılış.`,
        proof: `${primaryAction}`,
        close: `${productName} gerçek kullanımın doğal sonucu içinde sabitlenir.`,
      },
      PROBLEM_SOLUTION: {
        hook: `Uydurma hasar veya sonuç göstermeden ${location} çalışma bağlamı kurulur.`,
        proof: `Ürünün dayanıklılık ve kalitesini kanıtlayan kontrollü malzeme ve işlev detayı.`,
        close: `${productName} çözüm iddiası eklenmeden temiz ürün kapanışında.`,
      },
      SOCIAL_UGC: {
        hook: `${productName} için doğal birinci şahıs yaklaşımı; referans sunucu varsa yalnız o kullanılır.`,
        proof: `${primaryAction} Samimi fakat iddiasız kullanım detayı.`,
        close: `${productName} elde veya doğal ortamında okunur son kadrajda.`,
      },
      PREMIUM: {
        hook: `${productName} silüeti ve otantik malzeme kalitesi sakin doğal ışık geçişiyle ortaya çıkar.`,
        proof: `Genişleyen prestijli perspektif ile ortamın derinliğini ve ürünün kalitesini gösteren ağırbaşlı, sarsıntısız yatay slider süzülüşü.`,
        close: `${productName} geniş negatif alanlı sabit hero kapanışında.`,
      },
      AUTO: {
        hook: `Pürüzsüz 35mm sinematik kamera hareketi doğrudan ${productName} ürününün detaylarına ve otantik malzeme dokusuna odaklanır.`,
        proof: `Kamera yavaş ve zarif bir 3/4 orbital açıyla süzülerek ürünün sağlamlığını ve kusursuz geometrisini sergiler; arkada otantik ${brandName} kurumsal varlığı doğal olarak yer alır.`,
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
