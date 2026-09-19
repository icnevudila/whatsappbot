const fs = require('fs');
const path = require('path');

const LEARNINGS_FILE = process.env.LEARNINGS_FILE || path.join(__dirname, 'brand_learnings.json');

// Varsayılan çekirdek öğrenimler ve altın yönetmen kuralları
const DEFAULT_LEARNINGS = {
  version: "1.0",
  lastUpdated: new Date().toISOString(),
  universalRules: [
    "STRICT ZERO TEXT SALAD: Difüzyon video modellerine havada boşlukta uçuşan soyut 3D harfler veya uzun cümleler yazdırma; harfler erir ve bozulur.",
    "RIGID PHYSICAL SURFACE ANCHORING (FİZİKSEL YÜZEY KURALI): Ekranda yer alacak her metin ve logo fiziksel bir nesneye (metal fabrika tabelası, ahşap yönlendirme panosu, araç şoför kapısı, ürün ambalaj etiketi, bina cephesi, klinik camı, iş tulumu nakışı) kazınmış, monte edilmiş veya basılmış olmalıdır (Ayvazoğlu İnşaat fabrikadan doğrudan tabelası gibi).",
    "SHORT & IMPACTFUL TYPOGRAPHY (MAKSİMUM 2-3 KELİME & ALL CAPS): Yazılacak metin en fazla 2-3 kelimeden oluşmalı, kısa, net ve büyük harfli (ALL CAPS) olmalıdır (Örn: 'FABRİKADAN DOĞRUDAN', 'BOFE', 'HASAT ZAMANI', 'WHATSAPP SİPARİŞ'). Asla uzun slogan veya paragraf yazdırılamaz.",
    "HIGH-CONTRAST SANS-SERIF SPECIFICATION: Tipografi daima kalın, net, okunaklı modern endüstriyel sans-serif ve yüksek kontrastlı (koyu zemin üstü beyaz/sarı ya da açık yüzey üstü siyah) olarak sahnelenmelidir.",
    "ANTI-UTOPIAN REALISTIC PHYSICS (GERÇEK DÜNYA MANTIĞI): Videolar kesinlikle ütopik, bilim kurgu ya da mantıksız nesne kombinasyonları içermeyecektir. Yerçekimi, sahne ışığı, gölgeler ve insan etkileşimi %100 gerçek dünyayla uyumlu olmalıdır.",
    "UNIVERSAL SECTOR ADAPTABILITY: Hangi sektör veya branş gelirse gelsin (diş hekimi, oto servis, dönerci, yazılım, mimarlık, tarım), sahne o sektörün doğal dünyasında kurgulanmalıdır.",
    "STRICT BRAND & LOGO INVIOLABILITY: Yüklenen kurumsal logo, amblem şekli ve kurumsal renk kodları asla değiştirilemez, stilize varyasyonu yapılamaz.",
    "STRICT PRODUCT FIDELITY: Gerçek ürün fotoğrafındaki kasa, gövde, renk ve fiziksel detaylar %100 birebir korunmalıdır; hayali veya farklılaştırılmış ürün varyasyonları üretilemez.",
    "REALISTIC CINEMATIC SECTOR CONTEXT: Sektör asla karıştırılamaz (B2B teknoloji için gökdelen ofis; tarım için güneşli bahçe; inşaat için mimari şantiye; sağlık için hijyenik klinik)."
  ],
  brands: {
    "bofe": {
      brandName: "Bofe",
      organization: "Bofe Tarım & Bahçe Teknolojileri",
      colors: {
        primary: "#000000",
        secondary: "#026009",
        accent: "#acfe00",
        background: "#ffffff"
      },
      logoGuidelines: "Küçük harfli, temiz geometrik 'bofe' tipografisi (tilted 'e' harfi ile). Ürünün kendi kasasında veya sahne köşesinde saf beyaz veya siyah olarak net görünmeli; asla harfleri bozulmamalıdır.",
      products: {
        "zeytin_hasat": {
          productName: "Bofe Akülü Teleskopik Zeytin Silkme ve Hasat Makinesi",
          keywords: ["zeytin", "silkme", "hasat", "tarak", "teleskopik", "çırpıcı"],
          visualIdentity: "Üstte sarı/lime mekanik şanzıman kutusu, üzerinde çift hareketli esnek siyah karbon fiber tarak çubukları, hafif siyah alüminyum/karbon teleskopik boru, altta sarı/lime ergonomik tetikli tutma sapı ve spiral batarya bağlantı kablosu.",
          cinematicScene: "Ege ve Akdeniz'in güneşli, bereketli zeytinlikleri. Yaşlı zeytin ağaçlarının gümüşi yeşil yaprakları arasından süzülen altın rengi gün ışığı. Yere serilmiş temiz hasat brandaları üzerine makinenin titreşimiyle doludizgin dökülen etli parlak yeşil ve siyah zeytinler. Çiftçinin yorulmadan, titreşimsiz ve hafif teleskopik makineyle yüksek dallara kolayca ulaşma anı.",
          goldenPromptTemplate: "Güneşli bir Ege zeytinliğinde, yere serilmiş geniş hasat brandaları üzerinde çalışan Bofe akülü teleskopik zeytin hasat makinesi. Makinenin sarı/lime renkli üst şanzıman kafasındaki esnek siyah karbon çubuklar zeytin dalları arasında hızla titreşerek zeytinleri nazikçe yere dökerken, etli taze zeytinlerin brandaya yağmur gibi dökülüşü. Kullanıcının ergonomik tutma sapıyla yüksek dallara zahmetsizce uzanması, gün ışığı hüzmeleri, 4K sinematik canlı çekim."
        },
        "sarjli_pompa": {
          productName: "Bofe Şarjlı Akülü Sırt İlaçlama Pompası",
          keywords: ["pompa", "sırt pompası", "ilaçlama", "sisleme", "akülü pompa"],
          visualIdentity: "Açık mavi polietilen ergonomik depo gövdesi, üzerinde belirgin siyah 'bofe' logosu, siyah kalın omuz askıları, yüksek basınçlı mikronize nozul lansı.",
          cinematicScene: "Meyve bahçesinde ve serada gün doğumunda mikronize sisleme yapan çiftçi. Bitki yaprakları üzerinde parıldayan mikro su damlacıkları, hafif ve güçlü çalışma anı."
        }
      },
      pastSuccesses: [
        {
          id: "video_1789816453729",
          product: "Bofe Şarjlı Akülü Sırt İlaçlama Pompası",
          result: "Mükemmel fotogerçekçi su damlalı mavi gövde ve net 'bofe' logosu; sıfır metin çorbası."
        }
      ]
    },
    "veriburada": {
      brandName: "Veri Burada",
      organization: "Veri Burada B2B Veri & Google Haritalar Müşteri Platformu",
      colors: {
        primary: "#1b5e20",
        accent: "#2e7d32",
        secondary: "#4caf50",
        background: "#ffffff"
      },
      logoGuidelines: "Orijinal yeşil bağlantılı veri ağı (connected network nodes graph) amblemi: Merkezinde büyük yeşil dairesel çekirdek ve etrafında ince çizgilerle birbirine bağlanan veri düğüm noktaları (network constellation). Yanında sans-serif 'Veri Burada' tipografisi. Asla uydurma onay tiki veya farklı şekil yapılmayacak.",
      products: {
        "harita_veri": {
          productName: "Google Haritalar'daki İşletmeleri Liste Olarak İndirme Çözümü",
          keywords: ["harita", "liste", "müşteri", "b2b", "veri", "leads", "işletme", "excel", "google haritalar"],
          visualIdentity: "Ekrandaki modern yazılım arayüzünde Google Haritalar üzerinde yeşil pinlerle işaretlenmiş işletmeler (İzmir nalbur listesi, restoranlar, klinikler vb.), '567 işletme bulundu' bilgi kartı, 'Hemen Başla' butonu ve Excel listesi olarak saniyeler içinde indirilen sıcak müşteri kontakları.",
          cinematicScene: "Aydınlık ve ferah modern bir ofiste, şık masada açık ince çerçeveli dizüstü bilgisayar. Ekranda çalışan Veri Burada web platformunda harita üzerinden taranan binlerce yeni işletmenin tek tıkla Excel listesine dönüştüğü an. Masadaki zarif akrilik ofis isimliğinde veya ofis cam bölmesinde yeşil veri ağı amblemi ve 'VERİ BURADA' kurumsal tabelası. Kameranın ekrandaki harita verilerinden mutlu ve güven dolu iş insanına doğru akıcı sinematik kayması, 4K gerçekçi kurumsal çekim.",
          goldenPromptTemplate: "Aydınlık ve ferah modern bir kurumsal ofiste, cam toplantı masası üzerinde açık ince çerçeveli dizüstü bilgisayar. Ekranda Veri Burada platformunun gerçek arayüzü: Harita üzerindeki yeşil pinlerle taranan binlerce işletme ve 'Google Haritalar'daki işletmeleri liste olarak indirin' ekranı. Masanın üzerindeki şık şeffaf akrilik masa isimliğinde ve ofis cam bölmesinde net ve fiziksel olarak yeşil veri ağı amblemi ve büyük harflerle 'VERİ BURADA' kurumsal tabelası. Ekranda 'Excel Olarak İndir' butonuna basılmasıyla listelenen gerçek müşteri verileri, Arri Alexa 4K sinematik canlı çekim, sıfır yapay kutu, sıfır harf bozulması."
        }
      },
      cinematicScene: "Aydınlık ve ferah modern cam gökdelen ofisi, laptop ekranında harita üzerinde parıldayan işletme pinleri ve müşteri veri listeleri, masadaki akrilik kurumsal tabela.",
      pastSuccesses: []
    },
    "ayvazoglu": {
      brandName: "Ayvazoğlu İnşaat",
      organization: "Ayvazoğlu İnşaat & Yapı Malzemeleri Sanayi",
      colors: {
        primary: "#ff5733",
        accent: "#ffc300",
        secondary: "#333333",
        background: "#ffffff"
      },
      logoGuidelines: "Cesur geometrik sarı ve sıcak turuncu (#ffc300, #ff5733) tonlarında stilize mimari üçgen 'A' inşaat logo amblemi.",
      products: {
        "tugla": {
          productName: "Tuğla (Fabrikadan Halka Toptan Satış)",
          keywords: ["tuğla", "inşaat", "şantiye", "palet", "çimento", "yapı"],
          visualIdentity: "Nizami dizilmiş fırınlanmış killi kırmızı tuğla paletleri, şeffaf koruyucu shrink ambalaj üzerinde baskılı Ayvazoğlu İnşaat amblemi, sarı endüstriyel forklift ve sevkiyat tırı.",
          cinematicScene: "Modern ve aydınlık tuğla üretim fabrikası ve şantiye sevkiyat sahası. Konveyör bantları, nizami tuğla paletleri, vinç ve tır yükleme alanı, gün ışığında güven veren endüstriyel çekim.",
          goldenPromptTemplate: "Modern ve aydınlık bir tuğla üretim fabrikası ve sevkiyat sahası. Konveyör bandından çıkan nizami killi tuğla paletlerinin şeffaf ambalajı üzerinde baskılı Ayvazoğlu İnşaat logosu. Fabrika tavanındaki endüstriyel metal tabelada net ve kusursuz büyük harflerle 'FABRİKADAN DOĞRUDAN' yazısı. Sarı forkliftin paletleri güvenle taşıması, şantiye alanına yanaşan tır, 4K sinematik canlı çekim."
        }
      },
      pastSuccesses: [
        {
          id: "video_ayvazoglu_tugla_flow",
          product: "Tuğla (Fabrikadan Halka Toptan Satış)",
          result: "Kusursuz 3D endüstriyel metal tabela ('FABRİKADAN DOĞRUDAN'), ambalaj üstü logo ve tır kapısı kurumsal kimliği; sıfır harf bozulması."
        }
      ]
    }
  }
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

  buildLearningPromptBlock(brandName, productName, brief = '') {
    const brand = this.getBrandLearnings(brandName);
    const rules = (this.data.universalRules || []).map((r, i) => `${i + 1}. ${r}`).join('\n');
    
    let brandSection = '';
    if (brand) {
      brandSection = `\nÖĞRENİLMİŞ MARKA HAFIZASI (${brand.brandName}):\n- Kurumsal Kimlik & Logo Kuralı: ${brand.logoGuidelines}\n- Kurumsal Renkler: Accent: ${brand.colors?.accent || '#acfe00'}, Secondary: ${brand.colors?.secondary || '#026009'}, Primary: ${brand.colors?.primary || '#000000'}\n`;
      
      const searchContext = `${productName || ''} ${brief || ''}`.toLowerCase();
      let matchedProduct = null;
      if (brand.products) {
        for (const prod of Object.values(brand.products)) {
          if (prod.keywords && prod.keywords.some(k => searchContext.includes(k))) {
            matchedProduct = prod;
            break;
          }
        }
      }

      if (matchedProduct) {
        brandSection += `- Öğrenilmiş Ürün Görseli & Formu: ${matchedProduct.visualIdentity}\n- İdeal Sinematik Ortam & Atmosfer: ${matchedProduct.cinematicScene}\n`;
        if (matchedProduct.goldenPromptTemplate) {
          brandSection += `- Referans Altın Senaryo: "${matchedProduct.goldenPromptTemplate}"\n`;
        }
      }
    }

    return `\n=== YAPAY ZEKA SÜREKLİ ÖĞRENME MOTORU (CONTINUOUS LEARNING INJECTION) ===\n${rules}${brandSection}=== BU KURALLARA VE ÖĞRENİLMİŞ MARKA HAFIZASINA %100 SADIK KALINACAKTIR ===\n`;
  }

  recordSuccess(brandName, { product, videoId, resultNotes }) {
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
      timestamp: new Date().toISOString()
    });
    this.data.brands[key].pastSuccesses = this.data.brands[key].pastSuccesses.slice(0, 10);
    this.saveLearnings();
    console.log(`[LearningStore] ✅ '${brandName}' için yeni başarılı üretim öğrenildi ve hafızaya kaydedildi!`);
  }
}

const storeInstance = new BrandLearningStore();

module.exports = {
  learningStore: storeInstance,
  getBrandLearnings: (name) => storeInstance.getBrandLearnings(name),
  buildLearningPromptBlock: (brand, product, brief) => storeInstance.buildLearningPromptBlock(brand, product, brief),
  recordSuccess: (brand, data) => storeInstance.recordSuccess(brand, data)
};
