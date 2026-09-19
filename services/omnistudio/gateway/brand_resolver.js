/**
 * Brand Resolver & Auto Brand Kit Manager for OmniStudio Video Engine
 * Supabase üzerindeki aktif marka kitini (Brand Kit) otomatik çeker,
 * marka adı, logo amblemi, renkler ve Türkçe reklam kurallarını Veo promptuna enjekte eder.
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON || 'sb_publishable_S2-QnqQVsshYjQ7PR5lOxg_pYeS9gzB';

let cachedBrandKit = null;
let lastFetchTime = 0;

/**
 * Supabase'den aktif veya varsayılan Marka Kitini otomatik çeker.
 */
async function getActiveBrandKit(orgId = null) {
  const now = Date.now();
  // 2 dakikalık önbellek
  if (cachedBrandKit && !orgId && now - lastFetchTime < 120000) {
    return cachedBrandKit;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_active_brand_kit`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON,
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orgId ? { p_org_id: orgId } : {}),
      signal: AbortSignal.timeout(4000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.brand_name) {
        cachedBrandKit = data;
        lastFetchTime = now;
        return data;
      }
    }
  } catch (err) {
    console.warn('[BrandResolver] Supabase get_active_brand_kit uyarısı:', err.message);
  }

  // Fallback varsayılan marka kiti
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
    logo_path: '4a58b0dd-0931-4901-880a-686457d15010/kits/489f335c-ea99-46e4-b8dd-b75dd68255ea/sample.jpg',
  };
}

/**
 * Marka kiti verilerine göre Veo'nun sahne içinde üreteceği görsel logo tanımını üretir.
 */
function getLogoVisualDescription(brandName, logoPath) {
  const lower = (brandName || '').toLowerCase();
  if (lower.includes('ayvazoğlu') || lower.includes('inşaat') || (logoPath && logoPath.includes('4a58b0dd'))) {
    return "Cesur geometrik sarı ve sıcak turuncu (#ffc300, #ff5733) tonlarında stilize mimari üçgen 'A' inşaat logo amblemi";
  }
  if (lower.includes('bofe') || lower.includes('tarım')) {
    return "Modern koyu yeşil ve parlak neon lime (#026009, #acfe00) tarım teknolojisi dairesel logo amblemi";
  }
  if (lower.includes('döner') || lower.includes('restoran')) {
    return "Kırmızı ve altın sarısı sıcak gastronomi logo amblemi";
  }
  return "Modern ve estetik kurumsal logo amblemi";
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

  // 1. Gıda & Restoran (Döner, Kebap, Burger, Kafe, Tatlı vb.)
  if (text.match(/(döner|kebap|lahmacun|burger|pizza|pide|köfte|restoran|lokanta|kafe|tatlı|baklava|kahve|yemek|lezzet|mutfak|şef|et|tavuk|menü|dürüm)/)) {
    return {
      sector: 'food_restaurant',
      creativeAngle,
      sceneAtmosphere: 'Sıcak ve iştah kabartan gastronomi ortamı. Taze hazırlanan ürünün dumanı, çıtırtısı ve lezzeti, altın sarısı kızarmış detaylar, usta sunumu ve şık ahşap veya taş servis masası.',
      brandingPlacements: `
- Ahşap sunum tahtası, taş tabak kenarı veya servis tepsisi üzerinde estetik sıcak baskı/dağlama "${brand}" logosu.
- Şefin temiz aşçı önlüğünün göğsünde veya modern restoran duvarındaki aydınlatmalı tabelada zarif "${brand}" amblemi.
- Kahraman Final Sahnesi: Sahnenin üstünde ışıldayan kurumsal logo ve altında altın sarısı/sıcak beyaz 3D fontla "${brand}" ismi.`,
      sampleFocus: `${product || 'Enfes Gurme Lezzet'} hazırlığı, dumanı tüten sunumu ve iştah kabartan yakın çekimleri`
    };
  }

  // 2. İnşaat, İmalat, Sanayi & Ağır Malzeme (Tuğla, Mermer, Çimento, Metal, Fabrika vb.)
  if (text.match(/(tuğla|inşaat|çimento|şantiye|yapı|mermer|beton|boya|hırdavat|fabrika|sanayi|metal|çelik|nalbur|palet|nakliye|forklift|kiremit|yalıtım)/)) {
    return {
      sector: 'industrial_construction',
      creativeAngle,
      sceneAtmosphere: 'Düzenli, güçlü ve modern üretim fabrikası veya prestijli şantiye ortamı. Sevkiyat alanında forklift veya tır hareketi, paletli ürünlerin sağlamlığı ve güven veren endüstriyel estetik.',
      brandingPlacements: `
- Forkliftin taşıdığı paletli ürünlerin endüstriyel ambalajı veya kutusu üzerinde büyük ve net basılı "${brand}" logosu.
- Sevkiyat aracı kapısında veya baretli mühendisin/personelin iş yeleğinde okunaklı "${brand}" amblemi.
- Kahraman Final Sahnesi: Sahnenin üst merkezinde büyük ışıldayan kurumsal amblem; hemen altında kalın beyaz/metalik 3D fontla "${brand}" kurumsal ismi.`,
      sampleFocus: `${product || 'Yüksek Mukavemetli Sanayi Ürünü'} üretim kalitesi, dayanıklılığı ve fabrikadan doğrudan teslimat güveni`
    };
  }

  // 3. E-Ticaret, Tüketici Elektroniği & Akıllı Cihazlar (Şarjlı Pompa, Telefon, Robot, Alet vb.)
  if (text.match(/(pompa|şarjlı|elektronik|cihaz|robot|telefon|kulaklık|akıllı|aksesuar|lamba|led|alet|aparat|şarj|oto aksesuar|lastik şişirme|vantilatör|hoparlör)/)) {
    return {
      sector: 'ecommerce_tech',
      creativeAngle,
      sceneAtmosphere: 'Son teknoloji minimalist stüdyo ve gerçek hayat pratik kullanım sahnesi. Mat yüzeyler, ürünün modern LED dijital ekranındaki dinamik göstergeler, kusursuz 3D dönme ve yüksek teknoloji aydınlatması.',
      brandingPlacements: `
- Ürünün mat ergonomik gövdesinde lazer kazıma şeklinde parlayan kaliteli "${brand}" logosu.
- Premium minimalist siyah veya beyaz ürün ambalaj kutusunun üzerinde şık kabartma gümüş/altın varak "${brand}" logosu.
- Kahraman Final Sahnesi: Ürünün yanında 3D holografik parlayan kurumsal logo ve altında modern fütüristik beyaz fontla "${brand}" ismi.`,
      sampleFocus: `${product || 'Akıllı Yeni Nesil Cihaz'} kablosuz gücü, taşınabilir ergonomisi ve hayatı kolaylaştıran performansı`
    };
  }

  // 4. Moda, Giyim, Kozmetik & Güzellik
  if (text.match(/(giyim|elbise|ayakkabı|çanta|mont|parfüm|krem|serum|cilt|kozmetik|saç|makyaj|takı|kolye|saat|moda|butik|tekstil|deri)/)) {
    return {
      sector: 'fashion_beauty',
      creativeAngle,
      sceneAtmosphere: 'Vogue ve lüks reklam filmi estetiği. İpeksi kumaş salınımları, su damlacıkları veya softbox stüdyo ışıkları, zarafet dolu yakın planlar ve kusursuz lüks renk tonlaması.',
      brandingPlacements: `
- Ürün ambalajında veya kıyafetin zarif dokuma etiketinde şık ve estetik "${brand}" logosu.
- Lüks hediye kutusu veya alışveriş çantası üzerinde altın varak işlemeli "${brand}" yazısı.
- Kahraman Final Sahnesi: Üst merkezde parıldayan zarif logo amblemi ve altında tipografik ince lüks fontla "${brand}" ismi.`,
      sampleFocus: `${product || 'Yeni Sezon Özel Tasarım'} estetiği, dokusal kalitesi ve benzersiz şıklığı`
    };
  }

  // 5. Otomotiv, Araç Servisi & Kiralama
  if (text.match(/(oto|araç|araba|otomobil|lastik|jant|motor|servis|ekspertiz|bakım|kiralama|rent|detailing|kaplama|modifiye)/)) {
    return {
      sector: 'automotive',
      creativeAngle,
      sceneAtmosphere: 'Dinamik sinematik otomobil reklamı. Pırıl pırıl aydınlatılmış modern servis plazasında yansıyan ışıklar, dönen parlak jantlar ve yüksek tempolu kamera takibi.',
      brandingPlacements: `
- Modern servis plazasının giriş tabelasında ve çalışanların tulumlarında "${brand}" logosu.
- Aracın kaputunda veya plakalığında şık lazer kesim "${brand}" marka ismi.
- Kahraman Final Sahnesi: Sahnenin ortasında krom parıltılı 3D kurumsal logo ve altında keskin neon beyaz "${brand}" yazısı.`,
      sampleFocus: `${product || 'Profesyonel Araç Hizmeti'} yol güvenliği, uzman mühendislik ve konfor`
    };
  }

  // 6. Emlak, Gayrimenkul & Mimarlık
  if (text.match(/(emlak|konut|daire|villa|arsa|gayrimenkul|mimar|dekorasyon|mobilya|inşaat projesi|rezidans|yatırım)/)) {
    return {
      sector: 'realestate_interior',
      creativeAngle,
      sceneAtmosphere: 'Gün ışığı alan ferah ve lüks yaşam alanı, yüksek tavanlı modern mimari, geniş panoramik pencerelerden giren güneş, şık tasarım mobilyalar ve prestijli drone dış çekimleri.',
      brandingPlacements: `
- Proje girişindeki anıtsal mermer pylon üzerinde zarif altın kaplama "${brand}" amblemi.
- Masa üstündeki lüks mimari katalog ve akıllı tablet sunumunda "${brand}" logosu.
- Kahraman Final Sahnesi: Gökyüzüne doğru açılan açıda parıldayan kurumsal amblem ve altında asil beyaz fontla "${brand}" ismi.`,
      sampleFocus: `${product || 'Ayrıcalıklı Yaşam Alanı'} konforu, yüksek yatırım değeri ve prestijli yaşam standardı`
    };
  }

  // 7. Genel Hizmet, Sağlık, Hukuk, B2B & Kurumsal (Default)
  return {
    sector: 'services_corporate',
    creativeAngle,
    sceneAtmosphere: 'Son derece profesyonel, temiz ve güven aşılayan modern iş merkezi veya klinik ortamı. Geniş cam cepheler, güler yüzlü uzman ekip ve prestijli kurumsal atmosfer.',
    brandingPlacements: `
- Karşılama deski arkasındaki buzlu cam veya ahşap panel üzerinde kabartmalı 3D "${brand}" logosu.
- Personelin profesyonel kartvizit ve tablet ekranında kurumsal "${brand}" kimliği.
- Kahraman Final Sahnesi: Sahnenin üstünde ışıldayan kurumsal amblem ve altında kalın net beyaz fontla "${brand}" ismi.`,
    sampleFocus: `${product || 'Kurumsal Çözüm & Hizmet'} güvenilirliği, uzmanlığı ve müşteri memnuniyeti`
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
  const brandKit = await getActiveBrandKit(options.orgId);
  const brand = options.brandName || options.customer || brandKit.organization_name || brandKit.brand_name || 'İşletme';
  const logoDesc = getLogoVisualDescription(brand, brandKit.logo_path);
  const colors = brandKit.colors || { primary: '#ff5733', accent: '#ffc300' };
  const product = options.productName || 'Özel Ürün & Hizmet';
  const brief = options.prompt || options.brief || '9:16 sinematik reklam filmi';

  const sectorProfile = detectSectorAndStyle(brand, product, brief);
  const angle = sectorProfile.creativeAngle || {
    name: 'Macro & Sensory Texture',
    cameraStyle: 'Arri Master Macro 90mm sinema lensi, f/2.0 ultra sığ alan derinliği, 60fps ağır çekim',
    lighting: 'Dramatik yönlü yan aydınlatma, derin sıcak tonlar'
  };

  const cleanProduct = product.toUpperCase();

  return `9:16 dikey formatta (Instagram Reels & WhatsApp Durum), 10 saniyelik üst düzey Türk televizyon ve sinema reklam filmi.

KURUMSAL MARKA VE KAMPANYA VERİLERİ:
- Marka Adı: "${brand}" (ZORUNLU: Sahnenin her aşamasında ve finalde açıkça yer alacaktır)
- Marka Logo Amblemi: ${logoDesc} (ZORUNLU: Sahne içinde fiziksel olarak yer alacaktır)
- Kurumsal Renk Paleti: ${colors.accent || '#ffc300'}, ${colors.primary || '#ff5733'}, Beyaz ve Siyah.
- Öne Çıkan Ürün: ${product}
- Kampanya Konsepti: ${brief}
- Sektör Teması: ${sectorProfile.sector} (${sectorProfile.sceneAtmosphere})
- Sinematik Yönetmen Açısı: ${angle.name}
  * Kamera: ${angle.cameraStyle}
  * Işıklandırma: ${angle.lighting}

VEO YAPAY ZEKA VİDEO MOTORU İÇİN ZORUNLU KURALLAR (VEO KENDİSİ SAHNEDE ÜRETECEK):
1. DİL VE TİPOGRAFİ (100% TÜRKÇE):
   - Videodaki tüm başlıklar, tabelalar, ambalaj yazıları ve ekran metinleri İSTİSNASIZ TÜRKÇE olacaktır.
   - Perde 1 Üst Başlık (3D Sinematik): "${brand.toUpperCase()} İLE ${cleanProduct}" (Kalın 3D sinematik yazı karakteri, hafif gölgeli).
   - Perde 2 Kampanya Başlığı: "${cleanProduct} - ÖZEL LANSMAN FIRSATI".
   - Perde 3 Eylem Çağrısı: "HEMEN SİPARİŞ & TEKLİF İÇİN İLETİŞİME GEÇİN" ve yeşil WhatsApp butonu ("WhatsApp ile İletişim").
   - Türkçe Seslendirme (Audio Voiceover): Kristal netliğinde profesyonel Türkçe reklam spikeri sesi: "${brand} kalitesiyle ${product}... En avantajlı teklif ve hızlı teslimat için WhatsApp'tan hemen iletişime geçin."

2. MARKA İSMİ VE LOGO YERLEŞİMİ (SEKTÖRE ÖZEL ORGANİK YERLEŞİM):${sectorProfile.brandingPlacements}

3. SIFIR YAPAY KUTU (HER ŞEYİ VEO VİDEONUN KENDİSİNDE OLUŞTURACAK):
   - Sonradan harici grafik bant veya yapay overlay EKLENMEYECEKTİR; tüm 3D tipografi, logolar ve yazılar Google Veo video motorunun ürettiği fotogerçekçi canlı sahnenin doğrudan fiziksel bir parçası olacaktır.
   - 4K reklam ajansı estetiği, 24 FPS akıcı sinematik kamera hareketi, sahneye uygun kusursuz ışıklandırma.`;
}

module.exports = {
  getActiveBrandKit,
  getLogoVisualDescription,
  detectSectorAndStyle,
  buildTurkishVeoDirectorPrompt,
};
