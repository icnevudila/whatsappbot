const fs = require('fs');
const path = require('path');

const LEARNINGS_FILE = process.env.LEARNINGS_FILE || path.join(__dirname, 'brand_learnings.json');

// Hex renk kodlarını difüzyon modelinin anlayacağı doğal Türkçe sinematik ışık ve renk diline çeviren yardımcı
function convertHexToTurkishColor(hex) {
  if (!hex || typeof hex !== 'string') return 'kurumsal asil tonlar';
  const clean = hex.toLowerCase().replace(/[^0-9a-f]/g, '');
  const colorMap = {
    '1b5e20': 'koyu zümrüt yeşili',
    '2e7d32': 'orman yeşili',
    '4caf50': 'parlak canlı yeşil',
    '25d366': 'canlı yeşil',
    'ff5733': 'sıcak tuğla kırmızısı / terakota',
    'e65100': 'derin pas turuncusu',
    'ffc300': 'parlak altın sarısı / kehribar',
    'ffb300': 'sıcak kehribar sarısı',
    '0d47a1': 'derin kurumsal kobalt mavisi',
    '1976d2': 'açık gökyüzü mavisi',
    '000000': 'mat asil siyah',
    'ffffff': 'parlak temiz beyaz',
    '888888': 'fırçalanmış platin grisi',
    '333333': 'antrasit grafit'
  };
  if (colorMap[clean]) return colorMap[clean];

  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    if (r > 210 && g > 210 && b > 210) return 'parlak temiz beyaz';
    if (r < 40 && g < 40 && b < 40) return 'mat asil siyah';
    if (g > r && g > b) return g > 150 ? 'canlı açık yeşil' : 'koyu zümrüt yeşili';
    if (r > g && r > b) return r > 200 && g > 120 ? 'parlak altın sarısı / turuncu' : 'sıcak kiremit kırmızısı';
    if (b > r && b > g) return b > 180 ? 'parlak okyanus mavisi' : 'derin lacivert';
  }
  return 'özel kurumsal tonlar';
}

// Varsayılan çekirdek öğrenimler ve altın yönetmen kuralları
const DEFAULT_LEARNINGS = {
  version: "3.5",
  lastUpdated: new Date().toISOString(),
  universalRules: [
    "STRICT ZERO TEXT SALAD: Difüzyon video modellerine havada boşlukta uçuşan soyut 3D harfler veya uzun cümleler yazdırma; harfler erir ve bozulur.",
    "RIGID PHYSICAL BRAND SURFACE RULE (FİZİKSEL MARKA YÜZEYİ): Ekranda yer alacak marka adı ve logo yalnızca büyük, temiz ve doğal fiziksel marka yüzeylerinde olmalıdır: ürün gövdesi/ambalaj etiketi, araç gövde etiketi, iş önlüğü nakışı, dükkan/fabrika giriş tabelası veya ana hero ürün plakası. Küçük masa levhası, elde taşınan mini tabela ve arka plan raf etiketi yasaktır.",
    "NO RANDOM CTA SIGNS: 'ANINDA TEKLİF AL', 'SİPARİŞ VER', 'HEMEN ARA', 'WHATSAPP İLE BAŞLA' gibi CTA yazıları kullanıcı açıkça istemedikçe sahne içine tabela/levha olarak yazdırılmaz. CTA gerekiyorsa seslendirmede söylenir veya post-prodüksiyonda temiz overlay olarak eklenir.",
    "SHORT CLEAN BRAND TYPOGRAPHY ONLY: Sahne içinde zorunlu metin yalnızca marka adı veya kullanıcı doğrulamışsa tek kısa hero ibaresidir. Metin büyük, net, yüksek kontrastlı ve tek ana yüzeyde olmalıdır. Küçük yazı, uzun slogan, paragraf ve dekoratif tabela yasaktır.",
    "HIGH-CONTRAST SANS-SERIF SPECIFICATION: Tipografi daima kalın, net, okunaklı modern endüstriyel sans-serif ve yüksek kontrastlı (koyu zemin üstü beyaz/sarı ya da açık yüzey üstü siyah) olarak sahnelenmelidir.",
    "STRICT BRAND & LOGO INVIOLABILITY: Yüklenen kurumsal logo, amblem şekli ve kurumsal renk kodları asla değiştirilemez, stilize varyasyonu yapılamaz. Şirketin tanımlı logosu yoksa ASLA uydurma rastgele sembol/üçgen üretilmez, sadece okunaklı şirket adı yazılır.",
    "STRICT PRODUCT FIDELITY: Gerçek ürün fotoğrafındaki kasa, gövde, renk ve fiziksel detaylar %100 birebir korunmalıdır; hayali veya farklılaştırılmış ürün varyasyonları üretilemez.",
    "REALISTIC CINEMATIC SECTOR CONTEXT: Sektör asla karıştırılamaz (B2B teknoloji için gökdelen ofis; gastronomi için rustik mutfak; tarım için güneşli bahçe; inşaat için mimari şantiye; sağlık için hijyenik klinik; otomotiv için pırıl pırıl servis plazasında).",
    "BRAND PALETTE WITHOUT TEXT: Marka renk paleti ürün gövdesi, kıyafet, mekan aksanı, ambalaj, araç kaplaması ve ışıkta kullanılmalıdır; renk kodları ve küçük yazılar sahneye basılmaz.",
    "SECTOR-AUTHENTIC AUDIO & FOLEY: Arka plan ses efektleri (foley) sektöre tam uygun olmalıdır (mutfakta cızırtı ve bıçak tıkırtısı, ofiste hafif klavye ve fincan sesi, şantiyede güçlü forklift ve çekiç, doğada kuş cıvıltısı ve yaprak hışırtısı).",
    "NATIVE TURKISH VOICEOVER DIRECTIVE (SESLENDİRME BLOĞU): Her video promptunun sonunda 'SESLENDİRME: Kristal netliğinde profesyonel Türkçe erkek reklam spikeri sesi: [replik]' bloğu yer alacaktır. Veo/Flow bu bloğu okuyarak natif Türkçe seslendirme üretir. Sonrasında CapCut altyazı servisimiz senkronize dinamik neon altyazıyı giydirir.",
    "CLEAN SCENE & REALISTIC COMMERCIAL CLOSING (SIFIR ABSÜRT BOŞ DUVAR): Bomboş mermer duvara devasa altın veya metal kutu tabela asıp boş koridor göstermek KESİNLİKLE YASAKTIR. Kapanış sahnesi gerçek çalışma ortamı, ürünün canlı kullanımı veya marka renkleriyle düzenlenmiş doğal ortamdır. Kurumsal logo ve marka adı küçük masa levhasında değil; ürün, araç, kıyafet veya giriş tabelası gibi büyük ve doğal yüzeylerde yer alır.",
    "NO HEX CODES IN PROMPTS (HEX KODU YASAĞI): Prompt metinlerine ASLA '#4caf50', '#1b5e20' gibi hex kodları yazılmayacaktır; difüzyon modelleri bunları tabela metni sanıp sahneye basar. Renkler daima doğal dille tarif edilir.",
    "CLEAN MINIMALIST DIGITAL UI & MAPS (SAHTE HARİTA YAZISI YASAĞI): Ekranda harita veya dijital arayüz gösterildiğinde uydurma sokak/şehir metinleri KESİNLİKLE OLMAYACAKTIR. Harita minimalist grafik çizgilerden, yollardan ve parlayan temiz konum pinlerinden ibaret olmalıdır.",
    "ZERO PROMPT JARGON ON SIGNS (TABELAYA TEKNİK KELİME BASMA YASAĞI): Tabelaya veya standa ASLA 'ALL CAPS', 'TEXT CARD', 'FONT', 'LOGO' gibi prompt komutları yazılmayacaktır. Plakette yalnızca ve sadece firmanın kurumsal ismi ve varsa kurumsal sloganı yer alacaktır.",
    "NO FORCED CONTACT CTA ON PHYSICAL PROPS (ZORLAMA İLETİŞİM YASAĞI): Fiziksel nesnelerin üzerine 'WHATSAPP İLE BAŞLA', 'WHATSAPP İLE İLETİŞİME GEÇİN', 'ANINDA TEKLİF AL' veya telefon numarası gibi zorlama çağrılar KESİNLİKLE YAZILMAYACAKTIR. Fiziksel nesneler sadece firmanın prestijli kurumsal kimliğine aittir: Orijinal logo, marka ismi ve marka renkleri."
  ]
};

// 3 Temel Kreatif Yönetmen Arketipi
const CREATIVE_ARCHETYPES = {
  VIRAL_REELS: {
    id: 'VIRAL_REELS',
    name: '🔥 Viral Reels (CapCut Tarzı)',
    cameraStyle: 'Dinamik yaklaşma (push-in), enerjik ve akıcı gimbal hareketleri, hızlı ritim, yüksek görsel dinamizm',
    lightingStyle: 'Canlı, yüksek kontrastlı, modern ve pop renk paleti',
    audioDirectives: 'AUDIO: Dynamic modern upbeat rhythmic beat, punchy foley sound design (sizzle, clicks, whoosh), energetic bass groove.',
    subtitleConfig: {
      type: 'capcut_highlight',
      font: 'Arial Black',
      fontSize: 34,
      primaryColor: '&H00FFFFFF&', // Beyaz
      highlightColor: '&H0026FFFF&', // Neon Sarı
      ctaHighlightColor: '&H004CD825&',
      outline: 3.2,
      shadow: 1.8,
      marginV: 220
    }
  },
  LUXURY_PRESTIGE: {
    id: 'LUXURY_PRESTIGE',
    name: '💎 Lüks & Prestij (Apple Tarzı)',
    cameraStyle: 'Ultra yavaş süzülme (slow cinematic drift), makro doku odakları, sığ alan derinliği (cinematic bokeh), kusursuz stabilite',
    lightingStyle: 'Asil doğal gün ışığı, yumuşak difüze stüdyo aydınlatması, sıcak altın yansımalar ve derin gölgeler',
    audioDirectives: 'AUDIO: Deep elegant cinematic ambient piano, warm atmospheric synth pads, tactile crisp foley (leather, glass, premium surfaces).',
    subtitleConfig: {
      type: 'minimal_luxury',
      font: 'Arial Black',
      fontSize: 34,
      primaryColor: '&H00FFFFFF&',
      highlightColor: '&H0026FFFF&',
      ctaHighlightColor: '&H00FFFFFF&',
      outline: 3.2,
      shadow: 1.8,
      marginV: 220
    }
  },
  DIRECT_RESPONSE: {
    id: 'DIRECT_RESPONSE',
    name: '🎯 Doğrudan Satış & Kampanya (Hard Response)',
    cameraStyle: 'Net ürün odağı, kararlı açılar, belirgin katı tabela ve çözüm odaklı net görsel kadraj',
    lightingStyle: 'Pırıl pırıl, net, gölgesiz kurumsal endüstriyel aydınlatma',
    audioDirectives: 'AUDIO: Driving corporate bassline, confident rhythmic pulse, crisp mechanical/action foley and positive alert sounds.',
    subtitleConfig: {
      type: 'direct_campaign',
      font: 'Arial Black',
      fontSize: 34,
      primaryColor: '&H00FFFFFF&',
      highlightColor: '&H0026FFFF&',
      ctaHighlightColor: '&H0025D366&',
      outline: 3.2,
      shadow: 1.8,
      marginV: 220
    }
  }
};

// Sektör bazlı varsayılan kurumsal sloganlar (Fiziksel masa isimliğine yazılacak prestijli unvan)
const SECTOR_SLOGANS = {
  food_restaurant: 'DOĞAL GURME LEZZETLER',
  healthcare_medical: 'GÜVENİLİR SAĞLIK & ESTETİK',
  automotive_service: 'PROFESYONEL SERVİS & DETAY',
  b2b_tech_data: 'B2B VERİ ÇÖZÜMLERİ',
  industrial_construction: 'TOPTAN İMALAT & SATIŞ',
  agriculture_equipment: 'ÇİFTÇİ DOSTU TEKNOLOJİ',
  fashion_boutique: 'ÖZEL TASARIM & STİL',
  real_estate_architecture: 'MİMARİ YAŞAM PROJELERİ',
  tourism_hospitality: 'AYRICALIKLI TATİL DENEYİMİ',
  logistics_transport: 'ZAMANINDA GÜVENLİ LOJİSTİK',
  education_academy: 'GELECEĞİN EĞİTİM VİZYONU',
  beauty_wellness: 'DOĞAL IŞILTI & GÜZELLİK',
  furniture_interior: 'ÖZEL MOBİLYA TASARIMI',
  corporate_services: 'STRATEJİK KURUMSAL ÇÖZÜMLER'
};

class BrandLearningStore {
  constructor() {
    this.data = this.loadLearnings();
  }

  loadLearnings() {
    try {
      if (fs.existsSync(LEARNINGS_FILE)) {
        const raw = fs.readFileSync(LEARNINGS_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[LearningStore] Dosya okunamadı, varsayılan şablon yükleniyor:', e.message);
    }
    this.saveLearnings(DEFAULT_LEARNINGS);
    return DEFAULT_LEARNINGS;
  }

  saveLearnings(dataToSave) {
    try {
      const data = dataToSave || this.data;
      data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(LEARNINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[LearningStore] Öğrenim kaydı yazılamadı:', e.message);
    }
  }

  getBrandLearnings(brandName) {
    if (!brandName) return null;
    const key = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const [k, val] of Object.entries(this.data.brands || {})) {
      if (key.includes(k) || k.includes(key)) {
        return val;
      }
    }
    return null;
  }

  detectSector(brandName, productName, brief = '') {
    const text = `${brandName || ''} ${productName || ''} ${brief || ''}`.toLowerCase();
    const sectors = this.data.sectors || {};
    
    let bestSectorKey = null;
    let bestSectorObj = null;
    let highestScore = 0;

    for (const [sectorKey, sectorObj] of Object.entries(sectors)) {
      let score = 0;
      if (sectorObj.keywords && Array.isArray(sectorObj.keywords)) {
        for (const kw of sectorObj.keywords) {
          const kwLower = kw.toLowerCase();
          if (text.includes(kwLower)) {
            score += Math.max(kwLower.length, 3);
          }
        }
      }
      if (score > highestScore) {
        highestScore = score;
        bestSectorKey = sectorKey;
        bestSectorObj = sectorObj;
      }
    }

    if (bestSectorKey && bestSectorObj && highestScore > 0) {
      return { sectorKey: bestSectorKey, score: highestScore, ...bestSectorObj };
    }

    const fallbackKey = 'corporate_services';
    const fallback = sectors[fallbackKey] || sectors['b2b_tech_data'] || Object.values(sectors)[0];
    return {
      sectorKey: fallbackKey,
      score: 0,
      ...fallback
    };
  }

  listSectors() {
    const sectors = this.data.sectors || {};
    return Object.entries(sectors).map(([key, val]) => ({
      key,
      name: val.name,
      recommendedCTAs: val.recommendedTurkishCTAs,
      rigidSurfaces: val.rigidSurfaceObjects
    }));
  }

  getSector(sectorKey) {
    return (this.data.sectors || {})[sectorKey] || null;
  }

  getRecommendedCTAs(sectorKey) {
    const s = this.getSector(sectorKey);
    return s?.recommendedTurkishCTAs || ["HEMEN DANIŞIN", "TEKLİF ALIN", "RANDEVU OLUŞTUR"];
  }

  resolveCreativeArchetype(brandName, productName, brief = '', sector = null) {
    const text = `${brandName || ''} ${productName || ''} ${brief || ''}`.toLowerCase();
    if (text.includes('kampanya') || text.includes('fiyat') || text.includes('indirim') || text.includes('fırsat') || text.includes('toptan')) {
      return CREATIVE_ARCHETYPES.DIRECT_RESPONSE;
    }
    if (text.includes('lüks') || text.includes('premium') || text.includes('estetik') || text.includes('mimari') || text.includes('rezidans') || text.includes('özel tasarım')) {
      return CREATIVE_ARCHETYPES.LUXURY_PRESTIGE;
    }
    return CREATIVE_ARCHETYPES.VIRAL_REELS;
  }

  buildLearningPromptBlock(brandName, productName, brief = '') {
    const brand = this.getBrandLearnings(brandName);
    const sector = this.detectSector(brandName, productName, brief);
    const archetype = this.resolveCreativeArchetype(brandName, productName, brief, sector);

    // En kritik 5 kural — tüm listeyi değil, modelin en çok ihlal ettiği kurallar
    const TOP_CRITICAL_RULES = [
      "SIFIR METİN ÇORBASI: Havada uçuşan soyut 3D harfler veya uzun cümleler KESİNLİKLE YASAKTIR — harfler difüzyon modelde erir ve bozulur.",
      "BÜYÜK MARKA YÜZEYİ ZORUNLULUĞU: Marka adı ve logo yalnızca büyük, temiz fiziksel marka yüzeylerinde olmalıdır: ürün etiketi, araç etiketi, iş önlüğü nakışı, dükkan/fabrika giriş tabelası. Küçük masa levhası ve elde taşınan tabela YASAK.",
      "CTA LEVHASI YASAĞI: Kullanıcı açıkça istemedikçe 'ANINDA TEKLİF AL', 'SİPARİŞ VER', 'HEMEN ARA' gibi CTA metinleri sahneye tabela/plaket olarak yazdırılmaz. CTA seslendirmede kalır.",
      "SIFIR HEX KODU: Prompt metnine '#1b5e20', '#ffc300' gibi hex kodları ASLA yazılmayacaktır — model bunu tabelaya metin olarak basar. Renkler doğal dille tarif edilir.",
      "SIFIR UYDURMA LOGO: Firmanın tanımlı logosu yoksa KESİNLİKLE geometrik üçgen, sembol veya rastgele amblem üretilmeyecektir. Sadece firma adı temiz tipografiyle yazılır."
    ];

    const rules = TOP_CRITICAL_RULES.map(r => `• ${r}`).join('\n');

    let archetypeSection = `\nÖĞRENİLMİŞ YARATICI ARKETİP: ${archetype.name}\n` +
      `- Kamera: ${archetype.cameraStyle}\n` +
      `- Işık: ${archetype.lightingStyle}\n`;

    let sectorSection = '';
    if (sector) {
      const sceneShortCTA = '';
      const brandSlogan = SECTOR_SLOGANS[sector.sectorKey] || 'KURUMSAL ÇÖZÜMLER';

      // Çoklu Varyasyon Çözümleme (Kullanıcı Talebi: Tekdüzelik olmasın, zengin varyasyonlar olsun)
      let activeVariation = null;
      if (sector.variations && Array.isArray(sector.variations) && sector.variations.length > 0) {
        const queryText = `${productName || ''} ${brief || ''}`.toLowerCase();
        // 1. Önce brief içindeki anahtar kelimelerle en uygun varyasyonu bul
        for (const v of sector.variations) {
          const vTitle = (v.title || '').toLowerCase();
          const vId = (v.id || '').toLowerCase();
          if (queryText.includes(vId) || vTitle.split(' ').some(w => w.length > 3 && queryText.includes(w))) {
            activeVariation = v;
            break;
          }
        }
        // 2. Özel eşleşme yoksa zamana göre dönüşümlü (rotasyonlu) varyasyon seç
        if (!activeVariation) {
          const vIdx = Math.abs(Math.floor(Date.now() / 1000)) % sector.variations.length;
          activeVariation = sector.variations[vIdx];
        }
      }

      const activeAtmosphere = activeVariation ? activeVariation.atmosphere : sector.sceneAtmosphere;
      const activeTemplate = activeVariation ? activeVariation.template : sector.goldenPromptTemplate;
      const variationTitle = activeVariation ? ` [Varyasyon Modeli: ${activeVariation.title}]` : '';

      sectorSection = `\nÖĞRENİLMİŞ SEKTÖR (${sector.name}${variationTitle}):\n` +
        `- Sahne atmosferi: ${activeAtmosphere}\n` +
        `- Fiziksel yüzeyler: ${(sector.rigidSurfaceObjects || []).join(' | ')}\n` +
        `- CTA levhası: kullanıcı açıkça istemedikçe sahne içinde yok; CTA seslendirmede veya post-prodüksiyonda kalır.\n` +
        `- Yasaklı unsurlar: ${(sector.forbiddenElements || []).join(', ')}\n`;

      if (activeTemplate) {
        sectorSection += `- Temiz kapanış referansı: "SAHNE 3: Ürün veya hizmet doğal ortamında net görünür; marka adı ve varsa gerçek logo yalnızca büyük, temiz ürün/araç/kıyafet/giriş tabelası yüzeyinde yer alır. Küçük yazı, masa levhası ve CTA tabelası yoktur."\n`;
      }
    }

    let brandSection = '';
    if (brand) {
      brandSection = `\nÖĞRENİLMİŞ MARKA HAFIZASI (${brand.brandName}):\n` +
        `- Logo kuralı: ${brand.logoGuidelines}\n`;

      const searchContext = `${productName || ''} ${brief || ''}`.toLowerCase();
      if (brand.products) {
        for (const prod of Object.values(brand.products)) {
          if (prod.keywords && prod.keywords.some(k => searchContext.includes(k))) {
            brandSection += `- Ürün görünümü: ${prod.visualIdentity}\n` +
              `- Sahne ortamı: ${prod.cinematicScene}\n`;
            break;
          }
        }
      }

      if (brand.pastSuccesses && brand.pastSuccesses.length > 0) {
        brandSection += `- Önceki başarılı üretimden çıkarım: "${brand.pastSuccesses[0].result}"\n`;
      }
    }

    return `\n=== SÜREKLİ ÖĞRENME & KRİTİK KURAL BLOĞU ===\n${rules}${archetypeSection}${sectorSection}${brandSection}=== YUKARIDA BELİRTİLEN KURALLARA VE MARKA HAFIZASINA TAM UYUM ZORUNLUDUR ===\n`;
  }

  recordSuccess(brandName, { product, videoId, resultNotes, sectorKey }) {
    if (!brandName) return;
    const key = brandName.toLowerCase().replace(/[^a-z0-9]/g, '');
    this.data.brands = this.data.brands || {};
    this.data.brands[key] = this.data.brands[key] || {
      brandName,
      pastSuccesses: []
    };
    this.data.brands[key].pastSuccesses = this.data.brands[key].pastSuccesses || [];
    this.data.brands[key].pastSuccesses.unshift({
      id: videoId || `success_${Date.now()}`,
      product: product || 'Genel Ürün',
      result: resultNotes || 'Başarılı üretim',
      sector: sectorKey || 'Genel',
      timestamp: new Date().toISOString()
    });
    this.data.brands[key].pastSuccesses = this.data.brands[key].pastSuccesses.slice(0, 15);
    this.saveLearnings();
    console.log(`[LearningStore] ✅ '${brandName}' için yeni başarılı üretim öğrenildi ve hafızaya kaydedildi!`);
  }

  exportLearningsSummary() {
    return {
      version: this.data.version,
      lastUpdated: this.data.lastUpdated,
      totalSectors: Object.keys(this.data.sectors || {}).length,
      sectors: this.listSectors(),
      totalBrands: Object.keys(this.data.brands || {}).length,
      brands: Object.keys(this.data.brands || {}),
      archetypes: Object.values(CREATIVE_ARCHETYPES).map(a => ({ id: a.id, name: a.name }))
    };
  }
}

const storeInstance = new BrandLearningStore();

module.exports = {
  learningStore: storeInstance,
  convertHexToTurkishColor,
  CREATIVE_ARCHETYPES,
  SECTOR_SLOGANS,
  getBrandLearnings: (name) => storeInstance.getBrandLearnings(name),
  detectSector: (b, p, br) => storeInstance.detectSector(b, p, br),
  resolveCreativeArchetype: (b, p, br, s) => storeInstance.resolveCreativeArchetype(b, p, br, s),
  buildLearningPromptBlock: (brand, product, brief) => storeInstance.buildLearningPromptBlock(brand, product, brief),
  recordSuccess: (brand, data) => storeInstance.recordSuccess(brand, data),
  listSectors: () => storeInstance.listSectors(),
  getSector: (k) => storeInstance.getSector(k),
  getRecommendedCTAs: (k) => storeInstance.getRecommendedCTAs(k),
  exportLearningsSummary: () => storeInstance.exportLearningsSummary()
};
