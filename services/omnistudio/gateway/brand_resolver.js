/**
 * Brand Resolver & Auto Brand Kit Manager for OmniStudio Video Engine
 * Supabase üzerindeki aktif marka kitini (Brand Kit) otomatik çeker,
 * marka adı, logo amblemi, renkler ve Türkçe reklam kurallarını Veo promptuna enjekte eder.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON || 'sb_publishable_S2-QnqQVsshYjQ7PR5lOxg_pYeS9gzB';

let buildLearningPromptBlock;
let convertHexToTurkishColor;
try {
  ({ buildLearningPromptBlock, convertHexToTurkishColor } = require('./brand_learning_store.js'));
} catch (e) {
  buildLearningPromptBlock = () => '';
  convertHexToTurkishColor = (hex) => 'kurumsal asil tonlar';
}

let cachedBrandKit = null;
let lastFetchTime = 0;

/**
 * Supabase'den aktif veya varsayılan Marka Kitini otomatik çeker.
 */
async function getActiveBrandKit(orgId = null, brandHint = null) {
  const brandLower = `${brandHint || ''}`.toLowerCase();

  // Bofe için özel tanımlı kurumsal marka kiti
  if (brandLower.includes('bofe') || orgId === 'afc4ff9f-67a4-4dd1-af1d-e60b38c9ccdc' || orgId === 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0' || orgId === 'af504c75-9db5-4a97-bb92-52d1a0e2de8b') {
    return {
      organization_name: 'Bofe',
      brand_name: 'Bofe',
      colors: {
        primary: '#000000',
        accent: '#acfe00',
        secondary: '#026009',
        text: '#ffffff',
        background: '#000000',
      },
      tone: 'Modern, yüksek teknolojili ve profesyonel tarım & bahçe ekipmanları. Siyah, beyaz, neon lime (#acfe00) ve koyu orman yeşili (#026009).',
      logo_path: '/outputs/bofe_logo.png',
      product_image_path: '/outputs/bofe_product.png',
      hasExplicitLogo: true,
    };
  }

  // Veri Burada için kurumsal marka kiti
  if (brandLower.includes('veri burada') || brandLower.includes('veriburada') || orgId === 'c9b24e55-6d07-48ef-b4e4-e0cb1678ded5') {
    return {
      organization_name: 'Veri Burada',
      brand_name: 'Veri Burada',
      colors: {
        primary: '#1b5e20',
        accent: '#2e7d32',
        secondary: '#4caf50',
        text: '#111827',
        background: '#ffffff',
      },
      tone: 'Google Haritalar işletme verisi, B2B müşteri listesi ve veri madenciliği platformu.',
      logo_path: '/outputs/veriburada_logo.png',
      hasExplicitLogo: true,
    };
  }

  // Ayvazoğlu İnşaat için marka kiti
  if (brandLower.includes('ayvazoğlu') || orgId === '4a58b0dd-0931-4901-880a-686457d15010') {
    return {
      organization_name: 'Ayvazoğlu İnşaat',
      brand_name: 'Ayvazoğlu İnşaat',
      colors: {
        primary: '#ff5733',
        accent: '#ffc300',
        secondary: '#333333',
        text: '#000000',
        background: '#ffffff',
      },
      tone: 'Modern ve güven verici bir tasarım dili. Canlı turuncu ve nötr tonlar, net tipografi.',
      logo_path: '/outputs/ayvazoglu_logo.png',
      product_image_path: '/outputs/ayvazoglu_brick.webp',
      logo_visual_description: "Minimalist kırmızı ince çizgili çatı piktogramı ve ortasından yukarı doğru yükselen kırmızı dikey ok sembolü. Altında siyah, net ve büyük harflerle 'AYVAZOĞLU' ve 'İ N Ş A A T'. Plaket veya tabela üzerinde bu kırmızı çatı ve dikey ok amblemi kesinlikle çizilecektir; yalnızca yazı yazıp amblem asla atlanmayacaktır.",
      product_visual_description: "Karakteristik 18 delikli pişmiş kil blok tuğla (uzunlamasına yatay dikdörtgen prizma oranında, üst yüzeyinde nizami dikdörtgen hava delikli petek oda yapısı, yan yüzeylerinde dikey oluklu çizgiler olan kırmızı-turuncu renkli yapı tuğlası). Kesinlikle kare küp, deliksiz masif taş veya düz harman tuğlası değildir; ekli görseldeki gibi uzun dikdörtgen formunda ve içi hava kanallı delikli kil blok tuğladır.",
      hasExplicitLogo: true,
    };
  }

  // Genel kurumsal fallback (Uydurma logo veya sahte üçgen KESİNLİKLE YOK)
  return {
    organization_name: 'İşletme',
    brand_name: 'İşletme',
    colors: {
      primary: '#111827',
      accent: '#2563eb',
      secondary: '#6b7280',
      text: '#ffffff',
      background: '#ffffff',
    },
    tone: 'Modern ve profesyonel kurumsal tanıtım.',
    logo_path: null,
    hasExplicitLogo: false,
  };
}

/**
 * Marka kiti verilerine göre Veo'nun sahne içinde üreteceği görsel logo tanımını üretir.
 * KURAL: Şirketin tanımlı logosu yoksa ASLA uydurma geometrik üçgen / rastgele sembol ATILMAYACAKTIR.
 */
function getLogoVisualDescription(brandName, logoPath, hasExplicitLogo = false) {
  const lower = (brandName || '').toLowerCase();
  if (lower.includes('bofe')) {
    return "Zarif, minimalist ve modern siyah 'bofe' yazı logosu (küçük harflerle 'bofe', 'e' harfinde karakteristik açılı modern kesim). Kesinlikle uydurma geometrik üçgen, amblem veya rastgele sembol KULLANILMAYACAKTIR; yalnızca saf, estetik 'bofe' kurumsal tipografisi yer alacaktır.";
  }
  if (lower.includes('veri burada') || lower.includes('veriburada')) {
    return "Orijinal yeşil bağlantılı veri ağı (connected network nodes constellation) amblemi: Merkezinde büyük yeşil dairesel çekirdek düğüm ve etrafında ince yeşil çizgilerle birbirine bağlanan farklı yeşil tonlarında veri düğüm noktaları (network graph nodes). Yanında temiz, modern sans-serif 'Veri Burada' kurumsal tipografisi. KESİNLİKLE uydurma yeşil altıgen, uydurma 'V' harfi amblemi, onay tiki, sahte üçgen veya soyut sembol KULLANILMAYACAKTIR; yalnızca ekli görseldeki orijinal yeşil bağlantılı veri ağı amblemi ve temiz 'Veri Burada' kurumsal tipografisi fırçalanmış metal isimliğe işlenecektir.";
  }
  if (lower.includes('ayvazoğlu')) {
    return "Minimalist kırmızı ince çizgili çatı piktogramı ve ortasından yukarı doğru yükselen kırmızı dikey ok sembolü. Altında siyah, net ve büyük harflerle 'AYVAZOĞLU' ve hemen altında geniş aralıklı 'İ N Ş A A T' yazısı içeren resmi kurumsal logo amblemi. Sahnedeki akrilik plaket veya tabela üzerinde KESİNLİKLE EN ÜSTTE BU KIRMIZI ÇATI VE DİKEY OK AMBLEMİ çizilecektir; yalnızca yazı yazıp amblem ASLA atlanmayacaktır.";
  }

  // Tanımlı logo yoksa: SIFIR UYDURMA LOGO — sadece şirket adı yazılır
  return `\"${brandName || 'İşletme'}\" ismi sahneye uygun temiz, modern, şık ve okunaklı kurumsal tipografi ile fiziksel yüzeye kazınmış olacaktır. KESİNLİKLE uydurma geometrik şekil, sarı üçgen veya yapay amblem eklenmeyecektir.`;
}

const CINEMATIC_DIRECTOR_ANGLES = [
  {
    name: 'Macro & Sensory Texture (Aşırı Yakın Doku & İştah/Kalite Hissi)',
    cameraStyle: 'Arri Master Macro 90mm sinema lensi, f/2.0 ultra sığ alan derinliği, 60fps ağır çekim (slow-motion), doku kıvrımları, yüzey detayları, ışık kırılmaları ve zengin mikro hareketler.',
    lighting: 'Dramatik yönlü yan ışık (chiaroscuro), derin sıcak gölgeler ve yüzeyde kayan parlak ışık çizgileri.'
  },
  {
    name: 'Dynamic Motion & Hero Tracking (Akıcı Gimbal & Yüksek Enerji)',
    cameraStyle: 'Pürüzsüz gimbal takibi, nesnenin etrafında 180 derece akıcı yay dönüşü (arc shot), dinamik yaklaşma (push-in), enerjik ve modern 9:16 sinematik dikey kompozisyon.',
    lighting: 'Yüksek kontrastlı neon veya keskin modern stüdyo ışıkları, parlak metalik ve yansıtıcı yüzey ışıltıları.'
  },
  {
    name: 'Luxury & Editorial Reveal (Lüks Katalog & Prestij Sunumu)',
    cameraStyle: 'Minimalist geniş ve orta plan dengesi, alttan yukarı zarif süzülme (crane tilt-up), kusursuz simetri ve prestijli kurumsal duruş.',
    lighting: 'Yumuşak softbox aydınlatması, ferah ve havadar atmosfer, pastel ve asil kurumsal tonlar.'
  },
  {
    name: 'Authentic Craftsmanship & Master Hands (Usta Sanatı & Doğal Zanaat)',
    cameraStyle: 'Usta ellerin titiz dokunuşları, organik ve doğal hareketler, Arri Alexa Mini LF 35mm doğal lens, samimi ve güven aşılayan bakış açısı.',
    lighting: 'Sıcak amber atölye ışıkları veya pencereden süzülen doğal gün ışığı huzmeleri.'
  },
  {
    name: 'Sunset Golden Hour & Epic Atmosphere (Altın Saat & Görkemli Sahne)',
    cameraStyle: 'Görkemli sinematik perspektif, hafif lens parlaması (anamorphic lens flare), düşük açılı kahraman duruşu (low-angle hero shot).',
    lighting: 'Batan güneşin sıcak altın sarısı ve turuncu tonları, uzun gölgeler, masalsı gün batımı parlaklığı.'
  }
];

/**
 * Sektör, Ürün ve Prompta Göre Dinamik Sahne, Çeşitlilik Açısı ve Özgün Reklam Dilini Belirler.
 * Her çağrıda farklı bir sinematik açı seçerek hiçbir videonun birbirinin kopyası olmamasını sağlar.
 */
function detectSectorAndStyle(brand, product, brief) {
  const text = `${brand || ''} ${product || ''} ${brief || ''}`.toLowerCase();

  // Rastgele veya dönüşümlü sinematik kamera açısı seç (Maksimum çeşitlilik)
  const angleIndex = Math.floor(Math.random() * CINEMATIC_DIRECTOR_ANGLES.length);
  const creativeAngle = CINEMATIC_DIRECTOR_ANGLES[angleIndex];

  // 1. B2B, Veri, Yazılım, Teknoloji, Dijital Platform & SaaS
  if (text.match(/(veri|data|yazılım|b2b|platform|istihbarat|leads|crm|erp|analiz|dashboard|şirket takip|veriburada|veri burada|bilişim|müşteri bul|bulut|cloud|fintech|yapay zeka|ai|siber|cyber|kod)/)) {
    return {
      sector: 'b2b_tech_data',
      creativeAngle,
      sceneAtmosphere: 'Gerçekçi, son derece aydınlık ve ferah modern cam gökdelen ofisi ve teknoloji stüdyosu. Şık toplantı masasında ince çerçeveli dizüstü bilgisayar ekranında canlı akan veri grafikleri, harita üzerinde beliren yeni işletme bildirimleri, prestijli kurumsal B2B iş ortamı. Kesinlikle ütopik bilim kurgu unsuru, uzay veya havada uçuşan anlamsız 3D yazılar olmayacaktır; %100 gerçekçi iş dünyası ve yazılım ortamı.',
      brandingPlacements: `
- Ofisin modern ceviz/cam çalışma masası üzerindeki şık mat akrilik masa isimliğinde/plaketinde net "${brand}" logosu ve ismi.
- Laptop ekranındaki profesyonel harita/veri arayüzünün butonunda temiz "MÜŞTERİ BUL".
- Kahraman Final Sahnesi: Güneş alan modern çalışma masası, laptop başında güvenle tebessüm eden profesyonel yönetici ve masadaki şık masa isimliğinde "${brand}". KESİNLİKLE bomboş mermer duvara dev altın tabela veya boş koridor sahnelenmeyecektir. SIFIR ABSÜRT BOŞ DUVAR.`,
      sampleFocus: `${product || 'B2B Veri & Yeni İşletme Takip Çözümü'} yapay zeka destekli firma taraması, sıcak müşteri bildirimleri ve satışları katlayan veri gücü`
    };
  }

  // 2. Sağlık, Tıp, Diş Polikliniği, Estetik & Klinik
  if (text.match(/(diş|klinik|poliklinik|doktor|sağlık|medikal|implant|ortodonti|göz|estetik|hastane|cerrahi|tedavi|eczane|laboratuvar|hekim)/)) {
    return {
      sector: 'healthcare_medical',
      creativeAngle,
      sceneAtmosphere: 'Pırıl pırıl, son derece hijyenik ve ferah modern özel klinik ve sağlık merkezi. Yumuşak tavan aydınlatması, ileri teknoloji diş ünitesi veya medikal cihazlar, güler yüzlü hekimin hasta ile samimi ve güven veren diyaloğu. Kesinlikle karanlık veya rahatsız edici unsur olmayacak; %100 güven, sağlık ve ferahlık dolu sinematik ortam.',
      brandingPlacements: `
- Resepsiyon karşılama deskinin arkasındaki buzlu cam veya ahşap panel üzerinde estetik aydınlatmalı 3D "${brand}" tabelası.
- Doktorun temiz beyaz önlüğünün veya cerrahi formasının sol göğsünde ince nakış işlemeli "${brand}" logosu.
- Randevu kartvizitinde veya steril medikal konsol ekranında net "${brand}" amblemi.
- Kahraman Final Sahnesi: Aydınlık klinik salonunda mutlu hastanın gülümsemesi ve arka planda duvardaki prestijli "${brand}" kliniği tabelası.`,
      sampleFocus: `${product || 'Modern Sağlık & Gülüş Tasarımı'} uzman hekim kadrosu, ağrısız tedavi konforu ve sağlıklı güvenli hizmet`
    };
  }

  // 3. Otomotiv, Araç Servisi, Ekspertiz, Detailing & Kiralama
  if (text.match(/(oto|araç|araba|otomobil|lastik|jant|motor|servis|ekspertiz|bakım|kiralama|rent|detailing|kaplama|modifiye|yıkama|tamir|fren|egzoz)/)) {
    return {
      sector: 'automotive_service',
      creativeAngle,
      sceneAtmosphere: 'Pırıl pırıl, aydınlık ve profesyonel otomotiv servis plazasında veya kapalı detailing stüdyosunda geçen dinamik çekim. Hidrolik liftte yükselen pırıl pırıl araç, parlayan jantlar, uzman teknisyenin titiz kontrolleri ve güven veren atölye düzeni. Kesinlikle dağınık veya paslı ortam olmayacak; %100 yüksek standartlı otomotiv merkezi.',
      brandingPlacements: `
- Servis istasyonu duvarındaki ışıklı endüstriyel metal/akrilik "${brand}" panosu.
- Uzman teknisyenin profesyonel iş tulumunun göğsünde ve servis danışmanı tabletinde "${brand}" logosu.
- Servis girişindeki cam kapıda veya araç plakalığında lazer kesim "${brand}" marka ismi.
- Kahraman Final Sahnesi: Parlayan otomobilin önünde, modern servis stüdyosunda güven veren ekip ve merkezde net "${brand}" kurumsal tabelası.`,
      sampleFocus: `${product || 'Profesyonel Otomotiv & Ekspertiz Hizmeti'} bilgisayarlı arıza tespiti, güvenli sürüş garantisi ve uzman mühendislik`
    };
  }

  // 4. Gastronomi, Restoran, Kafe, Döner, Burger & Gıda
  if (text.match(/(döner|kebap|lahmacun|burger|pizza|pide|köfte|restoran|lokanta|kafe|tatlı|baklava|kahve|yemek|lezzet|mutfak|şef|et|tavuk|menü|dürüm|fırın|pasta|çikolata)/)) {
    return {
      sector: 'food_restaurant',
      creativeAngle,
      sceneAtmosphere: 'Sıcak, iştah kabartan ve samimi gurme gastronomi ortamı. Taze hazırlanan ürünün dumanı, altın sarısı kızarmış detaylar, usta şefin titiz dokunuşları ve şık ahşap veya taş servis masası. Gerçekçi mutfak dinamiği, taze malzemeler ve sıcacık restoran aydınlatması.',
      brandingPlacements: `
- Masadaki doğal ahşap sunum tahtası veya mermer servis tepsisinin kenarında estetik sıcak baskı/dağlama "${brand}" logosu.
- Şefin temiz siyah/beyaz aşçı önlüğünün göğsünde veya restoranın tuğla/ahşap duvarındaki rustik aydınlatmalı "${brand}" tabelasında.
- Paket servis ambalajı veya kraft poşet üzerinde temiz basılı "${brand}" amblemi.
- Kahraman Final Sahnesi: Dumanı tüten nefis sunumun yanında masadaki ahşap logolu sunumluk ve arkada şık restoran ambiyansı eşliğinde "${brand}".`,
      sampleFocus: `${product || 'Enfes Gurme Lezzet'} taze malzeme kalitesi, usta elinden çıkan benzersiz sunum ve damak çatlatan lezzet`
    };
  }

  // 5. İnşaat, İmalat, Sanayi, Ağır Malzeme & Fabrika (Ayvazoğlu usulü)
  if (text.match(/(tuğla|inşaat|çimento|şantiye|yapı|mermer|beton|boya|hırdavat|fabrika|sanayi|metal|çelik|nalbur|palet|nakliye|forklift|kiremit|yalıtım|boru|cam|ahşap)/)) {
    return {
      sector: 'industrial_construction',
      creativeAngle,
      sceneAtmosphere: 'Modern, düzenli ve güçlü üretim fabrikası ve şantiye sevkiyat sahası. Konveyör bandından çıkan nizami fırınlanmış paletler, forkliftin güvenli taşıması, sevkiyat tırı ve gün ışığında parlayan endüstriyel dayanıklılık. Kesinlikle yapay grafik olmayacak; Ayvazoğlu fabrikasındaki gibi %100 fiziksel ve katı doku.',
      brandingPlacements: `
- Fabrika tavanındaki veya sevkiyat sundurmasındaki endüstriyel metal tabelada net ve kalın harflerle "${brand}" ve "FABRİKADAN DOĞRUDAN" yazısı.
- Paletli ürünlerin üzerindeki şeffaf shrink koruyucu ambalajında ve sarı forkliftin gövdesinde basılı "${brand}" amblemi.
- Sevkiyat tırının düz beyaz yan veya arka kasa paneli üzerinde TEK BİR KEZ, büyük, okunaklı "${brand}" kurumsal logosu. (Kavisli şoför kapısına, araç ön ızgarasına veya barete ASLA logo basılmayacaktır; model bu kavisli yüzeylerde logoyu bozar. YALNIZCA pürüzsüz düz kasa panelinde sıfır hata tek logo yer alacaktır).
- Kahraman Final Sahnesi: Nizami dizilmiş tuğla paletleri ve sevkiyat alanı önünde, güneş ışığı altında güven veren düz "${brand}" kurumsal endüstriyel tabelası veya tırın düz kasa paneli.`,
      sampleFocus: `${product || 'Yüksek Mukavemetli Sanayi Ürünü'} üretim dayanıklılığı, standartlara tam uyum ve fabrikadan doğrudan teslimat güvencesi`
    };
  }

  // 6. Tarım, Zeytinlik, Sera, Bahçe & Bofe Teknolojileri
  if (text.match(/(zeytin|hasat|silkme|çırpıcı|tarak|teleskopik|bofe|ilaçlama|tarım|sera|bağ|bahçe|pülverizatör|sırt pompası|akülü pompa|budama|traktör|sulama)/)) {
    return {
      sector: 'agriculture_equipment',
      creativeAngle,
      sceneAtmosphere: 'Bereketli Ege ve Akdeniz arazisi, güneşli zeytinlikler veya ferah modern sera. Yaşlı zeytin ağaçlarının gümüşi yaprakları arasından süzülen altın rengi gün ışığı. Yere serilmiş hasat brandaları üzerine makinenin nazik titreşimiyle doludizgin dökülen etli taze zeytinler. Çiftçinin yorulmadan hafif ve güçlü makineyle yüksek dallara uzanması; saf ve bereketli tarım sinematografisi.',
      brandingPlacements: `
- Makinenin ergonomik gövdesinde ve tutma sapında temiz, orijinal siyah "${brand}" logosu.
- Zeytin bahçesinin girişindeki rustik ahşap çiftlik yönlendirme panosunda kazınmış net "${brand}" tabelası.
- Çiftçinin hasat yeleğinde ve yere serili zeytin brandası köşesinde okunaklı "${brand}" amblemi.
- Kahraman Final Sahnesi: Güneş ışığı hüzmeleri altında, zeytin ağaçları ve bereketli hasat sepetlerinin yanında Bofe makinesi ve duvardaki/panodaki şık "${brand}" kimliği.`,
      sampleFocus: `${product || 'Bofe Akülü Zeytin Hasat & Tarım Teknolojisi'} yüksek hasat verimi, dalları kırmayan karbon fiber çubuklar ve hafif batarya gücü`
    };
  }

  // 7. Moda, Giyim, Tekstil, Butik & Lüks Aksesuar
  if (text.match(/(giyim|elbise|ayakkabı|çanta|mont|parfüm|krem|serum|cilt|kozmetik|saç|makyaj|takı|kolye|saat|moda|butik|tekstil|deri|kumaş|terzi)/)) {
    return {
      sector: 'fashion_luxury',
      creativeAngle,
      sceneAtmosphere: 'Lüks moda katalog ve Vogue reklam filmi estetiği. İpeksi kumaşın rüzgarda zarif dalgalanışı, softbox stüdyo aydınlatması, ince dikiş detayları ve kusursuz renk tonlaması. Doğal ve prestijli estetik.',
      brandingPlacements: `
- Kıyafetin iç veya dış yakasındaki zarif jakarlı dokuma etiketinde ince "${brand}" logosu.
- Lüks sert hediye kutusu veya mat siyah alışveriş çantasında altın/gümüş varak kabartmalı "${brand}" amblemi.
- Butiğin girişindeki minimalist pirinç tabelada net "${brand}" ismi.
- Kahraman Final Sahnesi: Lüks vitrin veya softbox stüdyo fonunda kusursuz kıyafet tasarımı ve hemen yanında şık hediye kutusu üzerinde ışıldayan "${brand}".`,
      sampleFocus: `${product || 'Yeni Sezon Özel Koleksiyon'} birinci sınıf kumaş dokusu, kusursuz kalıp ve zamansız şıklık`
    };
  }

  // 8. Emlak, Gayrimenkul, Mimarlık & Villa Projeleri
  if (text.match(/(emlak|konut|daire|villa|arsa|gayrimenkul|mimar|dekorasyon|mobilya|inşaat projesi|rezidans|yatırım|site|havuz)/)) {
    return {
      sector: 'realestate_architecture',
      creativeAngle,
      sceneAtmosphere: 'Güneş ışığı alan ferah ve lüks villa/rezidans yaşam alanı, yüksek tavanlı modern mimari, geniş panoramik pencerelerden giren doğal gün ışığı, havuz başı peyzajı ve prestijli sinematik drone dış çekimleri.',
      brandingPlacements: `
- Proje girişindeki anıtsal mermer veya bazalt pylon üzerinde zarif metal kabartma "${brand}" amblemi.
- Mimarın masası üzerindeki lüks mimari katalog ve akıllı sunum tabletinde "${brand}" logosu.
- Rezidans lobisindeki akustik ahşap duvar panelinde arkadan aydınlatmalı (backlit) 3D "${brand}" tabelası.
- Kahraman Final Sahnesi: Masmavi havuz ve lüks villa cephesi eşliğinde, bahçe girişindeki mimari kaidede asilce yükselen "${brand}" kurumsal logosu.`,
      sampleFocus: `${product || 'Ayrıcalıklı Yaşam Alanı & Villa Projesi'} yüksek yatırım değeri, mimari ferahlık ve 1. sınıf malzeme kalitesi`
    };
  }

  // 9. Ev Hizmetleri, Tadilat, Tesisat, Temizlik & Zanaat
  if (text.match(/(tadilat|boya badana|tesisat|klima|kombi|temizlik|nakliyat|halı yıkama|marangoz|çilingir|cam balkon|panjur|çatı)/)) {
    return {
      sector: 'home_services_craft',
      creativeAngle,
      sceneAtmosphere: 'Tertemiz, aydınlık bir evin yenilenme ve tamamlanma anı. Titiz çalışan usta, pırıl pırıl teslim edilen mekan, hassas montaj detayları ve ev sahibinin iç rahatlığıyla tebessümü. Güven, dürüst zanaatkarlık ve düzen dolu atmosfer.',
      brandingPlacements: `
- Servis aracının yan kapısında veya bagajında temiz endüstriyel vinil "${brand}" yazısı.
- Ustanın iş tulumunun arkasında ve ölçü aletinde/takım çantasında baskılı "${brand}" logosu.
- Teslim formunda veya kapı girişindeki onay kartında net "${brand}" kimliği.
- Kahraman Final Sahnesi: Yenilenmiş ferah yaşam alanı önünde takım çantasıyla profesyonel usta ve duvardaki şık yönlendirme kartında "${brand}".`,
      sampleFocus: `${product || 'Profesyonel Ev & Tadilat Hizmeti'} garantili işçilik, temiz teslimat ve zamanında kusursuz uygulama`
    };
  }

  // 10. Güzellik, Kuaför, Cilt Bakımı, Spa & Wellness
  if (text.match(/(kuaför|güzellik|cilt bakım|lazer epilasyon|manikür|pedikür|tırnak|masaj|spa|wellness|makyaj|kozmetik|saç bakım|estetisyen)/)) {
    return {
      sector: 'beauty_wellness',
      creativeAngle,
      sceneAtmosphere: 'Yumuşak pembe, pudra, krem ve altın yansımalarla bezenmiş ferah lüks güzellik salonu veya spa süiti. Yuvarlak aydınlatmalı aynalar, cam damlalıklı serum şişeleri, tütsü hafifliği ve dingin şıklık.',
      brandingPlacements: `
- Karşılama mermer bankosundaki altın çerçeveli pleksi isimlikte logo ve "${brand}".
- Ayna çerçevesine monte edilmiş zarif metalik logo amblemi.
- Kozmetik ürün cam şişesindeki zarif etiket üzerinde "${brand}".
- Kahraman Final Sahnesi: Dinlenme köşesi sehpasındaki şık akrilik isimlikte "${brand}" ve sektör sloganı.`,
      sampleFocus: `${product || 'Güzellik & Wellness Hizmeti'} doğal malzemeler, uzman ellerin hassas uygulaması ve dinginleştirici premium deneyim`
    };
  }

  // 11. Mobilya, Dekorasyon, Mutfak, İç Mimari & Showroom
  if (text.match(/(mobilya|koltuk|kanepe|yatak|baza|masa|sandalye|dolap|mutfak dolabı|dekorasyon|showroom|parke|lake|ahşap tasarım)/)) {
    return {
      sector: 'furniture_interior',
      creativeAngle,
      sceneAtmosphere: 'Geniş, yüksek tavanlı, sıcak parke zeminli ferah showroom veya modern mimari salon. Doğal ceviz kaplamalar, dokulu keten kumaşlar, yumuşak lambader ışığı ve huzurlu ev konforu.',
      brandingPlacements: `
- Masif meşe sehpa üzerindeki pirinç masa isimliğinde logo ve "${brand}".
- Koltuk kolçağındaki deri kabartma marka etiketi.
- Tasarım kataloğu ve ahşap katalog standı üzerinde "${brand}".
- Kahraman Final Sahnesi: Sıcak salon yaşam alanı konseptinde kahve fincanı ve mimari katalog yanında şık ceviz isimlikte "${brand}" ve sektör sloganı.`,
      sampleFocus: `${product || 'Özel Tasarım Mobilya'} usta el işçiliği, doğal malzeme kalitesi ve yaşam alanlarına değer katan tasarım`
    };
  }

  // 12. Eğitim, Kurs, Akademi & Dil Okulu
  if (text.match(/(kurs|akademi|eğitim|okul|kolej|üniversite|dershane|yks|lgs|kpss|ingilizce|dil kursu|öğrenci|özel ders|sertifika)/)) {
    return {
      sector: 'education_academy',
      creativeAngle,
      sceneAtmosphere: 'Aydınlık, geniş pencereli, ahşap ve modern renklerle tasarlanmış interaktif sınıf ve kütüphane amfisi. Gençlerin hevesle tablet ve defterleriyle derse katıldığı, pozitif ve geleceğe umut aşılayan modern eğitim atmosferi.',
      brandingPlacements: `
- Karşılama deskindeki şık akrilik masa isimliğinde logo ve "${brand}".
- Derslik kapısındaki mat pleksi yönlendirme levhası üzerinde "${brand}".
- Akademi rozeti veya öğrenci dosyasında "${brand}" baskısı.
- Kahraman Final Sahnesi: Aydınlık danışmanlık ofisi, başarı sertifikaları yanında şık pleksi isimlikte "${brand}" ve sektör sloganı.`,
      sampleFocus: `${product || 'Akademi & Eğitim Hizmetleri'} uzman eğitmen kadrosu, interaktif öğrenme yöntemleri ve kanıtlanmış başarı garantisi`
    };
  }

  // 13. Lojistik, Kargo, Nakliye & Filo
  if (text.match(/(lojistik|kargo|nakliye|nakliyat|taşımacılık|tır|kamyon|filo|antrepo|depo|navlun|gümrük|dağıtım|sevkiyat)/)) {
    return {
      sector: 'logistics_transport',
      creativeAngle,
      sceneAtmosphere: 'Geniş otobanda gün batımına doğru güvenle ilerleyen pırıl pırıl kurumsal tır filosu veya devasa ışıl ışıl modern lojistik aktarma merkezi. Dinamik dron takip açısı, pürüzsüz asfalt ve profesyonel filo gücü.',
      brandingPlacements: `
- Operasyon bankosundaki fırçalanmış çelik masa isimliğinde logo ve "${brand}".
- Tır dorse brandasındaki ve kabin kapısındaki kurumsal logo.
- Koli ve palet etiketlerindeki barkod ve "${brand}" kurumsal kimliği.
- Kahraman Final Sahnesi: Filo sevk masasında planlama yapan uzman, masadaki şık metal isimlikte "${brand}" ve sektör sloganı.`,
      sampleFocus: `${product || 'Güvenli & Zamanında Lojistik'} profesyonel filo yönetimi, gerçek zamanlı takip ve hasarsız teslimat garantisi`
    };
  }

  // 14. Turizm, Otel, Tatil & Konaklama
  if (text.match(/(otel|butik otel|tatil|pansiyon|resort|bungalov|glamping|turizm|seyahat|konaklama|rezervasyon|plaj|havuz|spa resort)/)) {
    return {
      sector: 'tourism_hospitality',
      creativeAngle,
      sceneAtmosphere: 'Turkuaz deniz manzaralı, zeytin ağaçları ve begonvillerle çevrili Ege/Akdeniz butik oteli. Sonsuzluk havuzunda güneş pırıltıları, beyaz keten perdeler, tik ağacı şezlonglar ve huzurlu sessizlik.',
      brandingPlacements: `
- Resepsiyon ceviz tezgahındaki pirinç masa isimliğinde logo ve "${brand}".
- Oda anahtarlığı masif ahşap künyesindeki dağlama logo.
- Karşılama tepsisindeki porselen altlıkta zarif amblem.
- Kahraman Final Sahnesi: Butik otel lobi lounge alanında deniz esintisiyle ahşap isimlikte "${brand}" ve sektör sloganı.`,
      sampleFocus: `${product || 'Ayrıcalıklı Tatil Deneyimi'} huzur dolu konaklama, kişisel hizmet kalitesi ve unutulmaz Ege/Akdeniz atmosferi`
    };
  }

  // 15. Genel Hizmet, Hukuk, Finans, Danışmanlık & Tüm Diğer Branşlar (Evrensel Fallback)
  return {
    sector: 'corporate_services',
    creativeAngle,
    sceneAtmosphere: 'Son derece profesyonel, temiz, modern ve güven aşılayan prestijli iş merkezi veya toplantı salonu ortamı. Geniş cam cepheler, mermer zemin yansımaları, güler yüzlü uzman ekip ve prestijli kurumsal atmosfer.',
    brandingPlacements: `
- Toplantı masası üzeri fırçalanmış metal masa isimliğinde logo ve "${brand}".
- Deri evrak klasörü üzerindeki altın yaldız kurumsal baskı.
- Danışman masasında şeffaf akrilik masa plaketi.
- Kahraman Final Sahnesi: Yönetici ofisi çalışma masasında açık laptop ve şık isimlikte "${brand}" ile sektör sloganı.`,
    sampleFocus: `${product || 'Kurumsal Çözüm & Profesyonel Hizmet'} güvenilirlik, uzmanlık ve yüksek müşteri memnuniyeti`
  };
}

/**
 * Marka kiti ve Türkçe reklam kurallarını içeren tam Veo Director Direktifini derler.
 * Kullanıcı isteği:
 * - Marka ismi ve marka logosu zorunlu olarak videoda gözükecek
 * - Videodaki tüm başlıklar, metinler ve seslendirme %100 Türkçe olacak
 * - Sektöre ve prompta göre sahne, ambiyans ve marka yerleşimi kusursuz optimize edilecek
 * - Tüm bunları videoda Veo kendisi sahne içinde organik üretecek (sıfır yapay kutu)
 */
async function buildTurkishVeoDirectorPrompt(options = {}) {
  const brandKit = await getActiveBrandKit(options.orgId, options.brandName || options.customer);
  const brand = options.brandName || options.customer || brandKit.organization_name || brandKit.brand_name || 'İşletme';
  const logoDesc = getLogoVisualDescription(brand, brandKit.logo_path, brandKit.hasExplicitLogo);
  const colors = {
    primary: options.primaryColor || brandKit.colors?.primary || '#000000',
    accent: options.accentColor || brandKit.colors?.accent || '#acfe00',
    secondary: brandKit.colors?.secondary || '#026009',
  };
  const product = options.productName || 'Özel Ürün & Hizmet';
  const brief = options.prompt || options.brief || '9:16 sinematik reklam filmi';

  const sectorProfile = detectSectorAndStyle(brand, product, brief);
  const angle = sectorProfile.creativeAngle || {
    name: 'Macro & Sensory Texture',
    cameraStyle: 'Arri Master Macro 90mm sinema lensi, f/2.0 ultra sığ alan derinliği, 60fps ağır çekim',
    lighting: 'Dramatik yönlü yan aydınlatma, derin sıcak tonlar'
  };

  const cleanBrand = (brand || 'İŞLETME').toUpperCase();
  const primaryColorDesc = convertHexToTurkishColor(colors.primary);
  const accentColorDesc = convertHexToTurkishColor(colors.accent);

  // 100 Sektör & 1.000 Varyasyonluk Uzman Bankadan Sektör Eşlemesi Yap
  let sectorBlueprint = null;
  try {
    const { resolveSectorPrompt } = require('./sector_matcher.js');
    sectorBlueprint = resolveSectorPrompt({
      brand,
      product,
      brief,
      videoType: options.videoType || 'product_showcase',
      variationIndex: options.variationIndex,
      variationId: options.variationId,
      voiceoverText: options.voiceoverText,
      logoDescription: logoDesc,
      brandKitText: `${accentColorDesc} ve ${primaryColorDesc} kurumsal tonlar`
    });
  } catch (err) {
    console.warn('[BrandResolver] 100-sektör bankası çağrılırken fallback kullanıldı:', err.message);
  }

  // Eğer 100 sektör bankasından tam şablon çözüldüyse, o kusursuz direktifi esas al
  if (sectorBlueprint && sectorBlueprint.veoPrompt) {
    return `${sectorBlueprint.veoPrompt}

KURUMSAL MARKA VE GÖRSEL KİMLİK KİLİDİ:
- Marka / Firma Adı: "${brand}"
- Kurumsal Orijinal Logo: ${logoDesc}
- Kurumsal Renk Paleti: ${accentColorDesc}, ${primaryColorDesc}, beyaz ve siyah.
- Sektörel Kategori: ${sectorBlueprint.sectorId} - ${sectorBlueprint.sectorName} (${sectorBlueprint.variationTitle})
- Zorunlu İnsan & Eylem: ${sectorBlueprint.hasHuman ? 'Sahne çalışan, usta veya yetişkin kullanıcı ile aktiftir. Doğal iş eylemi esastır, poz vermek yasaktır.' : 'Ürün ve malzeme odaklı kompozisyon.'}
- Sektöre Özel Sınır: ${sectorBlueprint.forbiddenClaims || 'Doğrulanmamış özellik, sahte sertifika veya abartılı vaat eklenemez.'}

AUDIO DİREKTİFİ:
AUDIO: Professional crystal-clear Turkish commercial voiceover spoken ONCE between 0.5s and 5.5s with zero repetition, zero looping, and zero echo: "${sectorBlueprint.voiceoverText}". From 5.5s to 8.0s: subtle modern commercial rhythm and natural ambient foley carry the remaining seconds to a polished, confident conclusion with zero voice re-entry.

SIFIR ALTYAZI VE SIFIR SAHTE LOGO MANDATI:
STRICT MANDATE: ZERO ON-SCREEN SUBTITLES, NO FLOATING TEXT, NO CAPTIONS, NO TEXT WATERMARKS. The verified brand name "${brand}" and authentic corporate logo are mandatory on-screen visual elements directly on physical surfaces (5.5s - 8.0s steady shot). Do not redesign or invent a logo.
${buildLearningPromptBlock(brand, product, brief)}`;
  }

  return `9:16 dikey formatta (Instagram Reels & WhatsApp Durum), 8 saniyelik üst düzey Türk televizyon ve sinema reklam filmi.

KURUMSAL MARKA VE KAMPANYA VERİLERİ:
- Marka / Firma Adı: "${brand}" (ZORUNLU: Sahnenin her aşamasında ve finalde açıkça yer alacaktır)
- Kurumsal Logo Amblemi: ${logoDesc} (ZORUNLU: Sahne içinde fiziksel olarak yer alacaktır)
- Kurumsal Renk Paleti: ${accentColorDesc}, ${primaryColorDesc}, beyaz ve siyah.
- Tanıtılan Ürün / Hizmet: ${product}
- Kampanya Konsepti: ${brief}
- Sektör / Atmosfer: ${sectorProfile.sector} (${sectorProfile.sceneAtmosphere})
- Sinematik Yönetmen Açısı: ${angle.name}
  * Kamera Tekniği: ${angle.cameraStyle}
  * Işık & Doku: ${angle.lighting}

VEO VİDEO MOTORU İÇİN KESİN SİNEMATİK DİREKTİF (VEO v4 STANDARDI):
1. TEK LOKASYON & DEVAMLILIK KURALI (SIFIR MEKAN SIÇRAMASI):
   - Tüm video tek bir lokasyonda, aynı ışık kurulumu ve aynı sahne atmosferinde çekilir. Üç perde aynı ortamın üç tamamlayıcı kadrajıdır.
   - Sektörün gerçek hayat dinamikleri %100 korunmalıdır. Nesneler yerçekimine, sahne ışığına ve mimari perspektife tam uyumlu olmalıdır.

2. FİZİKSEL YÜZEYE SABİTLEME & SIFIR YAZI HALÜSİNASYONU:
   - Havada boşlukta uçuşan soyut 3D harfler, havada asılı cümleler veya sonradan yapıştırılmış grafik bantları KESİNLİKLE YASAKTIR.
   - Sahnedeki tek yazılar ve logo, doğrudan sahne içindeki KATI FİZİKSEL DÜZ NESNELERİN DOKUSUNA (metal fabrika tabelası, tırın düz beyaz yan/arka kasa kapağı, bina dış cephesi veya mat pleksi masa isimliği) basılmış, monte edilmiş veya kazınmış olacaktır.
   - Tipografi: En fazla 2-3 kelime, kalın ve net büyük harflerle yazılı, yüksek kontrastlı sans-serif endüstriyel tabela formatı (örn: "${cleanBrand}", "B2B ÇÖZÜMLERİ", "FABRİKADAN DOĞRUDAN").

3. 3 KADRAJLI SİNEMATİK AKIŞ (8 SANİYE VEO 3.1 FLOW STANDARDI):
   - ACT 1 (0.0s - 2.2s) - Görsel Kanca & Makro Kalite: ${sectorProfile.sampleFocus}. Makro yakın plan, yüzey dokusu ve malzeme kalitesi.
   - ACT 2 (2.2s - 5.8s) - Eylem & Kanıt: Ürünün veya hizmetin gerçek çalışma performansı, insan etkileşimi ve sağladığı net fayda.
   - ACT 3 (5.8s - 8.0s) - Odak Kahraman Kapanışı: Güven veren kurumsal duruş, memnun müşteri ve sahnedeki fiziksel tabela/logo ile prestijli kapanış.

4. FİZİKSEL MARKA VE TABELA YERLEŞİMİ:${sectorProfile.brandingPlacements}

5. MARKA KİTİ VE ÜRÜN DOKUNULMAZLIĞI (SIFIR VARYASYON):
   - Firmanın orijinal logosu, amblemi, renk kodları ve gerçek ürün formu asla deforme edilemez, uydurma semboller eklenemez.
   - ZERO MUTATION, ZERO PRODUCT MORPHING, RIGID PHYSICAL SIGNAGE ONLY.

7. SIFIR EKRAN ALTYAZISI KURALI (ZERO ON-SCREEN SUBTITLES / NO CAPTIONS):
   - Videonun ham çekiminde ekranda KESİNLİKLE hiçbir altyazı, kayan yazı, konuşma metni veya havada uçuşan kelimeler OLMAYACAKTIR.
   - Spikerin seslendirmesi YALNIZCA ses kanalında duyulacak, ekrana harf olarak basılmayacaktır.
   - STRICT MANDATE: ZERO ON-SCREEN SUBTITLES, NO FLOATING TEXT, NO CAPTIONS, NO TEXT WATERMARKS. Pure clean cinematic commercial footage only.

8. FİZİKSEL NESNELERE ZORLAMA İLETİŞİM/WHATSAPP BASMA YASAĞI:
   - Masadaki isimlik, ahşap plaket, tabela veya cam yüzeylere 'WHATSAPP İLE BAŞLA', 'WHATSAPP İLE İLETİŞİME GEÇİN' gibi zorlama çağrılar KESİNLİKLE YAZILMAYACAKTIR.
   - Fiziksel tabelalar firmanın kurumsal kimliğine aittir: Orijinal Logo, Firma İsmi ("${cleanBrand}") ve varsa firmanın kurumsal sloganı.

9. SIFIR HATA DÜZ YÜZEY KURALI (ZERO-ERROR FLAT RIGID SURFACE MANDATE):
   - Model logoyu asla kavisli araç şoför kapısına, kapı kolu yanına, araç ön panjuruna, barete veya kıvrımlı kumaşlara çizmeye çalışmayacaktır (buralarda logo bozulur).
   - Logo YALNIZCA sıfır hata verecek geniş, pürüzsüz ve düz (flat) dikdörtgen yüzeylerde TEK BİR KEZ yer alacaktır: Tırın/kamyonun düz beyaz yan/arka kasa paneli veya fabrikanın düz mimari tabelası.
   - STRICT MANDATE: NO LOGOS ON CURVED CABIN DOORS, NO LOGOS ON FRONT GRILLES. SINGLE LOGO ON FLAT RIGID CARGO BED PANEL ONLY.
   - STRICT MANDATE: NO FORCED WHATSAPP OR CONTACT CTA TEXT ON PHYSICAL PROPS/PLAQUES. Only authentic company branding and official slogans.
${buildLearningPromptBlock(brand, product, brief)}`;
}

module.exports = {
  getActiveBrandKit,
  getLogoVisualDescription,
  detectSectorAndStyle,
  buildTurkishVeoDirectorPrompt,
};
