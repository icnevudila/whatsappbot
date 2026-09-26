export interface ProductAffordanceReport {
  detectedSector: string
  naturalEnvironment: string
  environmentKeywords: string[]
  actorRole: string
  primaryProductAction: string
  lightingProfile: string
  negativeEnvironmentConstraints: string[]
  confidence: number
  source?: 'chatgpt_service' | 'semantic_fallback'
}

export function deduceSemanticAffordance(brandName: string, productName: string, productDescription?: string): ProductAffordanceReport {
  const text = `${brandName} ${productName} ${productDescription || ''}`.toLowerCase()

  // 1. Agriculture, Farming, Spraying, Orchard, Olive grove, Garden
  if (
    text.match(
      /(tarım|bahçe|zeytin|hasat|silkme|çırpıcı|pompa|pülverizatör|sırt pompası|akülü pompa|ilaçlama|fidan|sera|bağ|toprak|tarla|bofe|çiftlik|sulama|budama)/
    )
  ) {
    return {
      detectedSector: 'agriculture_farming',
      naturalEnvironment:
        'Güneşli, taze ve verimli bir meyve bahçesi, yeşil tarla ve zeytinlik; doğal açık hava sabah gün ışığı ve canlı yeşil yapraklar',
      environmentKeywords: ['meyve bahçesi', 'zeytinlik', 'tarla', 'sera', 'açık hava', 'gün ışığı'],
      actorRole: 'Çiftçi / Bahçıvan',
      primaryProductAction:
        'Meyve ağaçlarına ve bitkilere verimli ve ergonomik ilaçlama yaparken kusursuz püskürtme',
      lightingProfile: 'Sabah doğal güneş ışığı, ferah açık hava atmosferi',
      negativeEnvironmentConstraints: [
        'no factory',
        'no warehouse',
        'no concrete industrial floor',
        'no construction hardhat',
        'no reflective safety vest',
        'no heavy industrial machinery',
        'no shipping container yard',
        'no office cubicle',
      ],
      confidence: 0.96,
      source: 'semantic_fallback',
    }
  }

  // 2. Construction, Building, Brick, Cement, Site
  if (
    text.match(
      /(inşaat|tuğla|tugla|çimento|cimento|şantiye|santiye|yapı|yapi|mermer|beton|nalbur|hırdavat|kiremit|bims|ytong|ayvazoğlu|ayvazoglu|harç)/
    )
  ) {
    return {
      detectedSector: 'industrial_construction',
      naturalEnvironment:
        'Modern mimari şantiye, düzenli yapı alanı ve sevkiyat sahası; doğal gün ışığı ve sağlam zemin',
      environmentKeywords: ['şantiye', 'yapı alanı', 'mimari inşaat', 'sevkiyat sahası'],
      actorRole: 'Usta / İnşaat Mühendisi',
      primaryProductAction:
        'Yapı malzemesinin sağlamlık, dayanıklılık ve nizami uygulama ile sergilenmesi',
      lightingProfile: 'Doğal gün ışığı ile net endüstriyel aydınlatma',
      negativeEnvironmentConstraints: [
        'no farmland',
        'no orchard',
        'no kitchen',
        'no clinic',
        'no bedroom',
        'no agricultural tractor',
      ],
      confidence: 0.95,
      source: 'semantic_fallback',
    }
  }

  // 3. B2B, Tech, SaaS, Data, Software, Platform
  if (
    text.match(
      /(veri|data|yazılım|yazilim|b2b|platform|istihbarat|leads|crm|erp|dashboard|veriburada|veri burada|bulut|cloud|fintech|yapay zeka|ai|kod|harita)/
    )
  ) {
    return {
      detectedSector: 'b2b_tech_data',
      naturalEnvironment:
        'Ferah, aydınlık modern cam cepheli ofis ve şık çalışma masası; ince çerçeveli laptop ekranında canlı arayüz',
      environmentKeywords: ['modern ofis', 'çalışma masası', 'laptop ekranı', 'teknoloji stüdyosu'],
      actorRole: 'Profesyonel Yönetici / B2B Analist',
      primaryProductAction:
        'Canlı veri arayüzü ve analitik harita paneli üzerinde odaklanmış profesyonel kontrol',
      lightingProfile: 'Aydınlık ve ferah modern iç mekan gün ışığı',
      negativeEnvironmentConstraints: [
        'no farmland',
        'no orchard',
        'no mud',
        'no construction dust',
        'no manual tools',
        'no factory floor',
        'no heavy machinery',
      ],
      confidence: 0.95,
      source: 'semantic_fallback',
    }
  }

  // 4. Food, Restaurant, Cafe, Gourmet, Bakery
  if (
    text.match(
      /(döner|doner|kebap|burger|pizza|lahmacun|restoran|lokanta|kafe|cafe|tatlı|tatli|kahve|yemek|lezzet|mutfak|şef|sef|et|tavuk|menü|dürüm|fırın)/
    )
  ) {
    return {
      detectedSector: 'food_restaurant',
      naturalEnvironment:
        'Şık restoran mutfağı ve sıcak ahşap sunum masası; iştah kabartan doğal ve sıcak aydınlatma',
      environmentKeywords: ['restoran masası', 'şık mutfak', 'sunum tahtası', 'gurme masa'],
      actorRole: 'Usta Şef / Restoran Misafiri',
      primaryProductAction:
        'Taze malzemelerin ustalıkla hazırlanışı ve dumanı tüten enfes lezzet sunumu',
      lightingProfile: 'Sıcak ve iştah açıcı profesyonel yemek çekimi aydınlatması',
      negativeEnvironmentConstraints: [
        'no warehouse',
        'no factory pallets',
        'no chemical lab',
        'no dirty workshop',
        'no construction site',
        'no mud',
      ],
      confidence: 0.95,
      source: 'semantic_fallback',
    }
  }

  // 5. Cosmetics, Fragrance, Beauty, Personal Care
  if (
    text.match(
      /(parfüm|parfum|koku|esans|ruj|krem|bakım|bakim|serum|makyaj|cilt|güzellik|guzellik|kolonya|losyon|şampuan|sampuan|parfumeri|kozmetik)/
    )
  ) {
    return {
      detectedSector: 'cosmetics_fragrance',
      naturalEnvironment:
        'Şık ve ferah bir butik stüdyo, zarif makyaj masası ve aydınlık mermer tezgah; yumuşak ve estetik lüks aydınlatma',
      environmentKeywords: ['butik stüdyo', 'zarif makyaj masası', 'aydınlık mermer tezgah', 'estetik aydınlatma'],
      actorRole: 'Zarif Model / Kullanıcı',
      primaryProductAction:
        'Parfümü veya kozmetik ürününü zarifçe uygulayarak büyüleyici etkiyi ve zarafeti hissettirir',
      lightingProfile: 'Yumuşak, sıcak ve estetik lüks güzellik çekimi aydınlatması',
      negativeEnvironmentConstraints: [
        'no usta',
        'no construction site',
        'no dirty hands',
        'no farmland',
        'no mud',
        'no safety vest',
        'no heavy machinery',
        'no dirty tools',
        'no industrial warehouse',
      ],
      confidence: 0.96,
      source: 'semantic_fallback',
    }
  }

  // 6. Fashion, Apparel, Footwear, Accessories
  if (
    text.match(
      /(giyim|elbise|tekstil|gomlek|gömlek|pantolon|ceket|ayakkabı|ayakkabi|çanta|canta|takı|taki|moda|kemer|kıyafet|kiyafet|butik|tshirt|tişört)/
    )
  ) {
    return {
      detectedSector: 'fashion_apparel',
      naturalEnvironment:
        'Modern butik mağaza, minimalist loft ve gün ışığı alan seçkin showroom ve podyum atmosferi',
      environmentKeywords: ['butik mağaza', 'minimalist loft', 'gün ışığı', 'seçkin showroom'],
      actorRole: 'Şık Model',
      primaryProductAction:
        'Kıyafetin zarif kumaş dökümünü, kalıbını ve dikiş detaylarını doğal adımlarla sergiler',
      lightingProfile: 'Doğal gün ışığı ile dengeli yüksek moda stüdyo aydınlatması',
      negativeEnvironmentConstraints: [
        'no usta',
        'no construction site',
        'no industrial factory',
        'no heavy tools',
        'no farmland',
        'no mud',
      ],
      confidence: 0.95,
      source: 'semantic_fallback',
    }
  }

  // 7. Electronics, Consumer Tech, Gadgets
  if (
    text.match(
      /(telefon|kulaklık|kulaklik|hoparlör|hoparlor|akıllı saat|akilli saat|tablet|bilgisayar|laptop|şarj|sarj|robot süpürge|robot supurge|cihaz|elektronik)/
    )
  ) {
    return {
      detectedSector: 'electronics_gadgets',
      naturalEnvironment:
        'Modern minimalist çalışma masası, aydınlık akıllı ev salonu veya şık kafe masası',
      environmentKeywords: ['modern çalışma masası', 'akıllı ev', 'aydınlık salon', 'minimalist alan'],
      actorRole: 'Kullanıcı / Teknoloji Meraklısı',
      primaryProductAction:
        'Cihazın ergonomik tasarımını, akıcı fonksiyonel kullanımını ve zarif formunu sergiler',
      lightingProfile: 'Doğal pencere gün ışığı ile modern temiz ortam aydınlatması',
      negativeEnvironmentConstraints: [
        'no construction',
        'no usta',
        'no farmland',
        'no dirty workshop',
        'no heavy machinery',
      ],
      confidence: 0.95,
      source: 'semantic_fallback',
    }
  }

  // 8. Automotive Care & Accessories
  if (
    text.match(
      /(oto|otomobil|araç|araba|lastik|jant|motor yağı|seramik kaplama|oto yıkama|oto aksesuar|detailing|araç bakım)/
    )
  ) {
    return {
      detectedSector: 'automotive_care',
      naturalEnvironment:
        'Aydınlık ve modern detailing garajı, tertemiz araç üzeri ve pırıl pırıl zemin',
      environmentKeywords: ['modern detailing garajı', 'parlak zemin', 'temiz araç yüzeyi'],
      actorRole: 'Detailing Uzmanı / Araç Sahibi',
      primaryProductAction:
        'Ürünü araç yüzeyine veya iç mekanına özenle uygulayarak kusursuz parlaklığı ve korumayı sergiler',
      lightingProfile: 'Boyayı ve detayları ortaya çıkaran homojen LED ve softbox aydınlatması',
      negativeEnvironmentConstraints: [
        'no farmland',
        'no mud',
        'no construction debris',
        'no dirty kitchen',
      ],
      confidence: 0.94,
      source: 'semantic_fallback',
    }
  }

  // 9. Furniture & Home Living
  if (
    text.match(
      /(mobilya|koltuk|yatak|sehpa|dolap|perde|halı|hali|dekorasyon|avize|masa|sandalye)/
    )
  ) {
    return {
      detectedSector: 'furniture_home',
      naturalEnvironment:
        'Geniş pencereli, güneş alan ferah ve sıcak modern salon / yaşam alanı; ahşap parke zemin',
      environmentKeywords: ['modern salon', 'ferah yaşam alanı', 'sıcak ev ortamı', 'tasarım stüdyosu'],
      actorRole: 'Ev Sahibi / Tasarımcı',
      primaryProductAction:
        'Mobilyanın konforunu, kumaş dokusunu ve mekanla estetik uyumunu sergiler',
      lightingProfile: 'Geniş pencerelerden süzülen sıcak ve doğal gün ışığı',
      negativeEnvironmentConstraints: [
        'no construction site',
        'no factory floor',
        'no dirty workshop',
        'no farmland',
      ],
      confidence: 0.94,
      source: 'semantic_fallback',
    }
  }

  // 10. Healthcare, Medical, Clinic, Dental
  if (
    text.match(
      /(diş|dis|klinik|poliklinik|doktor|sağlık|saglik|medikal|implant|ortodonti|göz|goz|estetik|hastane|tedavi|eczane|hekim)/
    )
  ) {
    return {
      detectedSector: 'healthcare_medical',
      naturalEnvironment:
        'Pırıl pırıl, aydınlık, steril ve son derece ferah özel klinik ve sağlık merkezi',
      environmentKeywords: ['özel klinik', 'sağlık merkezi', 'aydınlık muayene odası', 'resepsiyon bankosu'],
      actorRole: 'Uzman Hekim / Danışan',
      primaryProductAction:
        'Hasta ile güven aşılayan hekim diyaloğu ve ileri teknoloji konforlu uygulama',
      lightingProfile: 'Yumuşak, dinlendirici ve pırıl pırıl klinik aydınlatması',
      negativeEnvironmentConstraints: [
        'no rusty garage',
        'no kitchen',
        'no outdoor dirt',
        'no factory floor',
        'no warehouse',
      ],
      confidence: 0.94,
      source: 'semantic_fallback',
    }
  }

  // Universal Fallback (Neutral Commercial Product)
  return {
    detectedSector: 'commercial_product',
    naturalEnvironment:
      'Modern, aydınlık ve prestijli ticari mekan ve stüdyo ortamı; dengeli aydınlatma ve temiz atmosfer',
    environmentKeywords: ['modern ticari mekan', 'prestijli stant', 'aydınlık ortam'],
    actorRole: 'Kullanıcı / Marka Yüzü',
    primaryProductAction: 'Ürünün gerçek kullanım ortamında kusursuz fonksiyonel performansı ve estetik duruşu',
    lightingProfile: 'Doğal gün ışığı ile dengeli ticari aydınlatma',
    negativeEnvironmentConstraints: [
      'no distorted anatomy',
      'no fake ui',
      'no unrelated products',
      'no floating text',
      'no construction site',
      'no usta',
      'no dirty workshop',
    ],
    confidence: 0.85,
    source: 'semantic_fallback',
  }
}

export async function resolveProductAffordance(
  brandName: string,
  productName: string,
  productDescription?: string
): Promise<ProductAffordanceReport> {
  const gatewayUrl = (
    process.env.OMNISTUDIO_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_OMNISTUDIO_URL ||
    'http://127.0.0.1:3456'
  ).replace(/\/$/, '')

  try {
    const res = await fetch(`${gatewayUrl}/v1/chat/affordance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brandName, productName, productDescription }),
      signal: AbortSignal.timeout(2000),
    })

    if (res.ok) {
      const json = await res.json()
      if (json && json.naturalEnvironment && Array.isArray(json.negativeEnvironmentConstraints)) {
        return json
      }
    }
  } catch {
    // Gateway offline or timed out: fall back seamlessly to semantic ontology
  }

  return deduceSemanticAffordance(brandName, productName, productDescription)
}
