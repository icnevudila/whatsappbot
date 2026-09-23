/**
 * Product Affordance Reasoner for OmniStudio Gateway
 * Deduces real-world physical operating environment, human roles,
 * and strict cross-sector negative constraints.
 */

function deduceSemanticAffordance({ brandName = '', productName = '', productDescription = '' }) {
  const text = `${brandName} ${productName} ${productDescription}`.toLowerCase();

  // 1. Agriculture, Farming, Spraying, Orchard, Olive grove, Garden
  if (text.match(/(tarım|bahçe|zeytin|hasat|silkme|çırpıcı|pompa|pülverizatör|sırt pompası|akülü pompa|ilaçlama|fidan|sera|bağ|toprak|tarla|bofe|çiftlik|sulama|budama)/)) {
    return {
      detectedSector: 'agriculture_farming',
      naturalEnvironment: 'Güneşli, taze ve verimli bir meyve bahçesi, yeşil tarla ve zeytinlik; doğal açık hava sabah gün ışığı ve canlı yeşil yapraklar',
      environmentKeywords: ['meyve bahçesi', 'zeytinlik', 'tarla', 'sera', 'açık hava', 'gün ışığı'],
      actorRole: 'Çiftçi / Bahçıvan',
      primaryProductAction: 'Meyve ağaçlarına ve bitkilere verimli ve ergonomik ilaçlama yaparken kusursuz püskürtme',
      lightingProfile: 'Sabah doğal güneş ışığı, ferah açık hava atmosferi',
      negativeEnvironmentConstraints: [
        'no factory',
        'no warehouse',
        'no concrete industrial floor',
        'no construction hardhat',
        'no reflective safety vest',
        'no heavy industrial machinery',
        'no shipping container yard',
        'no office cubicle'
      ],
      confidence: 0.96
    };
  }

  // 2. Construction, Building, Brick, Cement, Site
  if (text.match(/(inşaat|tuğla|tugla|çimento|cimento|şantiye|santiye|yapı|yapi|mermer|beton|nalbur|hırdavat|kiremit|bims|ytong|ayvazoğlu|ayvazoglu|harç)/)) {
    return {
      detectedSector: 'industrial_construction',
      naturalEnvironment: 'Modern mimari şantiye, düzenli yapı alanı ve sevkiyat sahası; doğal gün ışığı ve sağlam zemin',
      environmentKeywords: ['şantiye', 'yapı alanı', 'mimari inşaat', 'sevkiyat sahası'],
      actorRole: 'Usta / İnşaat Mühendisi',
      primaryProductAction: 'Yapı malzemesinin sağlamlık, dayanıklılık ve nizami uygulama ile sergilenmesi',
      lightingProfile: 'Doğal gün ışığı ile net endüstriyel aydınlatma',
      negativeEnvironmentConstraints: [
        'no farmland',
        'no orchard',
        'no kitchen',
        'no clinic',
        'no bedroom',
        'no agricultural tractor'
      ],
      confidence: 0.95
    };
  }

  // 3. B2B, Tech, SaaS, Data, Software, Platform
  if (text.match(/(veri|data|yazılım|yazilim|b2b|platform|istihbarat|leads|crm|erp|dashboard|veriburada|veri burada|bulut|cloud|fintech|yapay zeka|ai|kod|harita)/)) {
    return {
      detectedSector: 'b2b_tech_data',
      naturalEnvironment: 'Ferah, aydınlık modern cam cepheli ofis ve şık çalışma masası; ince çerçeveli laptop ekranında canlı arayüz',
      environmentKeywords: ['modern ofis', 'çalışma masası', 'laptop ekranı', 'teknoloji stüdyosu'],
      actorRole: 'Profesyonel Yönetici / B2B Analist',
      primaryProductAction: 'Canlı veri arayüzü ve analitik harita paneli üzerinde odaklanmış profesyonel kontrol',
      lightingProfile: 'Aydınlık ve ferah modern iç mekan gün ışığı',
      negativeEnvironmentConstraints: [
        'no farmland',
        'no orchard',
        'no mud',
        'no construction dust',
        'no manual tools',
        'no factory floor',
        'no heavy machinery'
      ],
      confidence: 0.95
    };
  }

  // 4. Food, Restaurant, Cafe, Gourmet, Bakery
  if (text.match(/(döner|doner|kebap|burger|pizza|lahmacun|restoran|lokanta|kafe|cafe|tatlı|tatli|kahve|yemek|lezzet|mutfak|şef|sef|et|tavuk|menü|dürüm|fırın)/)) {
    return {
      detectedSector: 'food_restaurant',
      naturalEnvironment: 'Şık restoran mutfağı ve sıcak ahşap sunum masası; iştah kabartan doğal ve sıcak aydınlatma',
      environmentKeywords: ['restoran masası', 'şık mutfak', 'sunum tahtası', 'gurme masa'],
      actorRole: 'Usta Şef / Restoran Misafiri',
      primaryProductAction: 'Taze malzemelerin ustalıkla hazırlanışı ve dumanı tüten enfes lezzet sunumu',
      lightingProfile: 'Sıcak ve iştah açıcı profesyonel yemek çekimi aydınlatması',
      negativeEnvironmentConstraints: [
        'no warehouse',
        'no factory pallets',
        'no chemical lab',
        'no dirty workshop',
        'no construction site',
        'no mud'
      ],
      confidence: 0.95
    };
  }

  // 5. Healthcare, Medical, Clinic, Dental
  if (text.match(/(diş|dis|klinik|poliklinik|doktor|sağlık|saglik|medikal|implant|ortodonti|göz|goz|estetik|hastane|tedavi|eczane|hekim)/)) {
    return {
      detectedSector: 'healthcare_medical',
      naturalEnvironment: 'Pırıl pırıl, aydınlık, steril ve son derece ferah özel klinik ve sağlık merkezi',
      environmentKeywords: ['özel klinik', 'sağlık merkezi', 'aydınlık muayene odası', 'resepsiyon bankosu'],
      actorRole: 'Uzman Hekim / Danışan',
      primaryProductAction: 'Hasta ile güven aşılayan hekim diyaloğu ve ileri teknoloji konforlu uygulama',
      lightingProfile: 'Yumuşak, dinlendirici ve pırıl pırıl klinik aydınlatması',
      negativeEnvironmentConstraints: [
        'no rusty garage',
        'no kitchen',
        'no outdoor dirt',
        'no factory floor',
        'no warehouse'
      ],
      confidence: 0.94
    };
  }

  // 6. Automotive, Car Care, Detailing, Repair
  if (text.match(/(oto|araç|arac|araba|lastik|jant|motor|servis|ekspertiz|bakım|bakim|detailing|kaplama|tamir)/)) {
    return {
      detectedSector: 'automotive_service',
      naturalEnvironment: 'Pırıl pırıl, aydınlık ve profesyonel otomotiv detailing stüdyosu ve servis plazasında dinamik çekim',
      environmentKeywords: ['detailing stüdyosu', 'servis plazası', 'lift alanı'],
      actorRole: 'Uzman Teknisyen',
      primaryProductAction: 'Aracın parlayan yüzeyleri ve uzman teknisyenin titiz kontrolleri',
      lightingProfile: 'Keskin modern stüdyo ışıkları ve yansıtıcı yüzey ışıltıları',
      negativeEnvironmentConstraints: [
        'no agricultural field',
        'no kitchen',
        'no bedroom',
        'no medical clinic'
      ],
      confidence: 0.93
    };
  }

  // Universal Fallback
  return {
    detectedSector: 'commercial_product',
    naturalEnvironment: 'Modern, aydınlık ve prestijli ticari mekan ve stüdyo ortamı; dengeli aydınlatma ve temiz atmosfer',
    environmentKeywords: ['modern ticari mekan', 'prestijli stant', 'aydınlık ortam'],
    actorRole: 'Profesyonel Kullanıcı',
    primaryProductAction: 'Ürünün gerçek kullanım ortamında kusursuz fonksiyonel performansı',
    lightingProfile: 'Doğal gün ışığı ile dengeli ticari aydınlatma',
    negativeEnvironmentConstraints: [
      'no distorted anatomy',
      'no fake ui',
      'no unrelated products',
      'no floating text'
    ],
    confidence: 0.85
  };
}

function buildAffordanceGptPrompt({ brandName, productName, productDescription }) {
  return `Sen ticari reklam filmleri için Ürün ve Mekan Fiziksel Uygunluk (Product Affordance) uzmanısın.
Aşağıdaki marka ve ürünü gerçek fiziksel dünya kurallarına göre analiz et:
Marka Adı: "${brandName}"
Öne Çıkan Ürün/Hizmet: "${productName}"
Açıklama: "${productDescription}"

GÖREVİN:
1. Bu ürün fiziksel dünyada NEREDE çalışır? (Doğal ortamı neresidir?)
   - Örn. Tarım/bahçe aletleri -> Açık tarla, zeytinlik, meyve bahçesi veya sera. ASLA fabrika/şantiye DEĞİL!
   - Örn. Tuğla/çimento -> Şantiye, yapı alanı.
   - Örn. Yazılım/B2B -> Modern ofis, laptop ekranı.
2. Bu ürünü KİM, NASIL bir fiziksel hareketle kullanır?
3. Bu ürün için KESİNLİKLE YASAK / ÇELİŞKİLİ OLAN ortamlar nelerdir?

ÇIKTI KURALI:
SADECE aşağıdaki JSON formatında yanıt ver, başka hiçbir metin veya markdown ekleme:
{
  "detectedSector": "sektör adı (örn. agriculture_farming)",
  "naturalEnvironment": "Doğal fiziksel ortam açıklaması",
  "environmentKeywords": ["anahtar", "kelimeler"],
  "actorRole": "Kullanıcı rolü",
  "primaryProductAction": "Kullanıcının yaptığı eylem",
  "lightingProfile": "Işıklandırma tarzı",
  "negativeEnvironmentConstraints": ["no factory", "no warehouse", "no concrete industrial floor", "no construction hardhat", "no reflective vest"],
  "confidence": 0.98
}`;
}

module.exports = {
  deduceSemanticAffordance,
  buildAffordanceGptPrompt
};
