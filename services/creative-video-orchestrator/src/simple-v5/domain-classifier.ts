/**
 * Universal Domain Classifier
 * Dynamically categorizes any business, brand, product, and campaign into its authentic
 * operational domain using multi-layer semantic keyword analysis.
 * Zero hardcoded company names; fully universal for all industries.
 */

export type OperationalDomain =
  | 'AGRICULTURE_NATURE'
  | 'CONSTRUCTION_STRUCTURAL'
  | 'FOOD_CULINARY'
  | 'HEALTH_MEDICAL'
  | 'AUTOMOTIVE_INDUSTRIAL'
  | 'RETAIL_LIFESTYLE'
  | 'TECH_DIGITAL'
  | 'GENERAL_COMMERCIAL'

export interface DomainProfile {
  domain: OperationalDomain
  location: string
  lighting: string
  cameraMotion: string
  suggestedAction: string
  isolationNegatives: string[]
  productPresentationDirective?: string
}

interface DomainInput {
  brandName?: string
  productName?: string
  productDescription?: string
  brandKitTone?: string
  sectorHint?: string
  campaignBrief?: string
}

function containsDomainTerm(text: string, term: string): boolean {
  const normalized = text.replace(/[_-]+/g, ' ')
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'iu').test(normalized)
}

export function classifyOperationalDomain(input: DomainInput): DomainProfile {
  const combined = [
    input.brandName || '',
    input.productName || '',
    input.productDescription || '',
    input.brandKitTone || '',
    input.sectorHint || '',
    input.campaignBrief || '',
  ].join(' ').toLowerCase()

  // 1. AGRICULTURE & NATURE
  const agriKeywords = [
    'tarım', 'ziraat', 'bahçe', 'peyzaj', 'tohum', 'sera', 'ilaçlama', 'hasat',
    'bağ', 'bağcılık', 'sulama', 'fidan', 'bitki', 'gübre', 'pompa', 'pülverizatör',
    'çiftlik', 'toprak', 'hasat', 'meyve bahçesi', 'zeytin', 'budama', 'agro',
    'agriculture', 'farming', 'orchard', 'vineyard', 'greenhouse', 'sprayer'
  ]
  if (agriKeywords.some(k => containsDomainTerm(combined, k))) {
    return {
      domain: 'AGRICULTURE_NATURE',
      location: 'Otantik, güneşli açık meyve bahçesi, yeşil asma bağları ve sağlıklı doğal bitki örtüsü',
      lighting: 'açık gökyüzü doğal güneş ışığı, yapraklar arasında yumuşak doğal aydınlatma',
      cameraMotion: 'yemyeşil yapraklardan ürüne doğru pürüzsüz 35mm sinematik kayma',
      suggestedAction: 'Ürün doğal açık hava bahçe ortamında konumlanırken, lans ucundan taze yeşil yapraklara doğru ince şeffaf su sisi püskürtülür',
      isolationNegatives: [
        'indoor', 'warehouse', 'storage shelves', 'industrial metal shelving',
        'interior concrete walls', 'ceiling pipes', 'fluorescent ceiling lights',
        'office table', 'indoor room', 'domestic furniture', 'concrete depot floor',
        'garage workbench', 'dark enclosed room'
      ],
      productPresentationDirective: 'Position the product exclusively outdoors surrounded by vibrant green foliage, healthy orchard trees, or vineyard rows under natural sunlight. Never render on an indoor workbench or inside a warehouse.'
    }
  }

  // 2. CONSTRUCTION & STRUCTURAL MASONRY
  const constrKeywords = [
    'inşaat', 'yapı', 'tuğla', 'briket', 'beton', 'harç', 'çimento', 'kiremit',
    'şantiye', 'izolasyon', 'yalıtım', 'blok', 'demir', 'çelik', 'duvar', 'örme',
    'moloz', 'iskele', 'ustası', 'palet', 'klinker', 'gazbeton', 'seramik',
    'construction', 'masonry', 'brick', 'building material', 'structural'
  ]
  if (constrKeywords.some(k => containsDomainTerm(combined, k))) {
    return {
      domain: 'CONSTRUCTION_STRUCTURAL',
      location: 'Otantik ticari şantiye sahası, taze harçlı yapı duvarı sırası ve nizami istifli paletler',
      lighting: 'doğal sabah inşaat gün ışığı',
      cameraMotion: 'sabit odak ve taze örülmüş duvardan ürüne akıcı endüstriyel takip',
      suggestedAction: 'Yapı malzemesi, iş eldivenli bir usta tarafından taze çimento harcı üzerine nizami yatay şekilde yerleştirilir',
      isolationNegatives: [
        'indoor domestic room', 'office desk', 'carpet', 'living room',
        'retail store', 'toy blocks', 'plastic lego', 'oversized hollow hole face',
        'raw vertical honeycomb grid pointing into camera', 'floating brick'
      ],
      productPresentationDirective: 'Show building and masonry materials in authentic structural application: laid horizontally flat into a real building wall with clean mortar joints, or resting neatly banded on wooden pallets. The camera-facing surface must be the clean, solid, textured finish face.'
    }
  }

  // 3. FOOD & CULINARY
  const foodKeywords = [
    'gıda', 'restoran', 'cafe', 'kafe', 'döner', 'kebap', 'fırın', 'lezzet',
    'mutfak', 'sos', 'tatlı', 'pasta', 'içecek', 'yemek', 'et', 'tavuk', 'gurme',
    'food', 'culinary', 'restaurant', 'bakery', 'kitchen', 'chef'
  ]
  if (foodKeywords.some(k => containsDomainTerm(combined, k))) {
    return {
      domain: 'FOOD_CULINARY',
      location: 'Hijyenik ve profesyonel ticari mutfak istasyonu ve taze sunum tezgâhı',
      lighting: 'iştah açıcı sıcak ve berrak stüdyo ışığı',
      cameraMotion: 'taze detaylara odaklanan yakın plan makro sinematik kayma',
      suggestedAction: 'Şef eldiveniyle taze malzemeler özenle hazırlanır, hafif dumanı tüten lezzetli sunum tamamlanır',
      isolationNegatives: [
        'outdoor dirt', 'construction dust', 'industrial warehouse',
        'messy workshop', 'rusty tools', 'unhygienic surfaces'
      ],
      productPresentationDirective: 'Present food and culinary items on immaculate surfaces with appetizing textures, fresh steam, and vibrant garnish.'
    }
  }

  // 4. HEALTH & MEDICAL
  const healthKeywords = [
    'sağlık', 'klinik', 'medikal', 'hastane', 'doktor', 'diş', 'hekim', 'tedavi',
    'laboratuvar', 'estetik', 'eczane', 'ilaç', 'sağlıklı yaşam', 'med',
    'health', 'clinic', 'medical', 'dental', 'doctor'
  ]
  if (healthKeywords.some(k => containsDomainTerm(combined, k))) {
    return {
      domain: 'HEALTH_MEDICAL',
      location: 'Steril, modern, son derece aydınlık ve ileri teknolojili klinik alanı',
      lighting: 'temiz, yumuşak ve difüze beyaz klinik gün ışığı',
      cameraMotion: 'güven veren sabit ve pürüzsüz medikal kadraj kayması',
      suggestedAction: 'Uzman profesyonel steril ekipmanla hassas ve güven verici bir uygulama gerçekleştirir',
      isolationNegatives: [
        'dirty floor', 'construction site', 'dark enclosed room',
        'cluttered workshop', 'rusty equipment', 'amateur environment'
      ]
    }
  }

  // 5. AUTOMOTIVE & INDUSTRIAL
  const autoKeywords = [
    'oto', 'otomotiv', 'araç', 'servis', 'yedek parça', 'motor', 'lastik',
    'garaj', 'tamir', 'bakım', 'sanayi', 'makine', 'metal', 'yağlama',
    'automotive', 'garage', 'mechanic', 'car care'
  ]
  if (autoKeywords.some(k => containsDomainTerm(combined, k))) {
    return {
      domain: 'AUTOMOTIVE_INDUSTRIAL',
      location: 'Modern, aydınlık ve düzenli profesyonel araç servis istasyonu',
      lighting: 'net ve profesyonel yüksek kontrastlı endüstriyel ışık',
      cameraMotion: 'hassas mekanik detaylara akıcı yatay kayma',
      suggestedAction: 'Uzman teknisyen ekipmanı araç üzerine titizlikle ve güvenle uygular',
      isolationNegatives: [
        'living room', 'kitchen table', 'domestic bedroom', 'nature forest'
      ]
    }
  }

  // 6. TECH & SOFTWARE
  const techKeywords = [
    'yazılım', 'teknoloji', 'dijital', 'bilişim', 'yapay zeka', 'telekom',
    'app', 'uygulama', 'sistem', 'platform', 'otomasyon', 'tech', 'software'
  ]
  if (techKeywords.some(k => containsDomainTerm(combined, k))) {
    return {
      domain: 'TECH_DIGITAL',
      location: 'Modern, aydınlık ve ferah mimari teknoloji ofisi çalışma alanı',
      lighting: 'temiz difüze çalışma ortamı gün ışığı',
      cameraMotion: 'net ekran hizalaması ve sabit profesyonel kadraj',
      suggestedAction: 'Kullanıcı sezgisel arayüzde akıcı bir işlem gerçekleştirir',
      isolationNegatives: [
        'construction dust', 'messy workshop', 'dirty outdoors'
      ]
    }
  }

  // 7. RETAIL & LIFESTYLE (Fallback for consumer products)
  const retailKeywords = [
    'giyim', 'moda', 'tekstil', 'ayakkabı', 'çanta', 'aksesuar', 'kozmetik',
    'parfüm', 'ev yaşam', 'mobilya', 'dekorasyon', 'fashion', 'retail', 'lifestyle'
  ]
  if (retailKeywords.some(k => containsDomainTerm(combined, k))) {
    return {
      domain: 'RETAIL_LIFESTYLE',
      location: 'Şık, estetik ve modern çağdaş vitrin ve yaşam alanı',
      lighting: 'yumuşak sıcak stüdyo ışığı ve doğal gün ışığı vurgusu',
      cameraMotion: 'ürünün estetik formunu öne çıkaran pürüzsüz 3/4 vitrin kayması',
      suggestedAction: 'Ürün doğal ışık altında zarafetle sergilenir',
      isolationNegatives: [
        'industrial dirt', 'construction site', 'messy warehouse'
      ]
    }
  }

  // 8. GENERAL COMMERCIAL FALLBACK
  return {
    domain: 'GENERAL_COMMERCIAL',
    location: 'Otantik, aydınlık ve profesyonel ticari çalışma ortamı',
    lighting: 'doğal dengeli ticari gün ışığı',
    cameraMotion: 'pürüzsüz 35mm sinematik takip',
    suggestedAction: 'Ürün gerçek çalışma ortamında referanstaki biçimi korunarak güvenle sergilenir',
    isolationNegatives: [
      'messy cluttered floor', 'distorted background', 'amateur framing'
    ]
  }
}
