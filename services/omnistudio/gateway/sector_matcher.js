const fs = require('fs');
const path = require('path');

let sectorBank = null;

function getSectorBank() {
  if (!sectorBank) {
    const jsonPath = path.join(__dirname, 'sector_prompt_bank.json');
    if (fs.existsSync(jsonPath)) {
      sectorBank = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    } else {
      sectorBank = {};
    }
  }
  return sectorBank;
}

/**
 * Keyword index for all 100 sectors to enable instant accurate matching
 */
const SECTOR_KEYWORDS = {
  S001: ['restoran', 'bistro', 'lokanta', 'aşçı', 'şef', 'gurme', 'menü', 'akşam yemeği', 'öğle yemeği'],
  S002: ['kahve', 'kavurucu', 'barista', 'espresso', 'çekirdek kahve', 'filtre kahve', 'latte', 'roaster'],
  S003: ['fırın', 'ekmek', 'unlu mamul', 'simit', 'poğaça', 'somun', 'ekşi maya'],
  S004: ['pastane', 'pasta', 'tatlı', 'kek', 'makaron', 'profiterol', 'yaş pasta'],
  S005: ['çikolata', 'şekerleme', 'bonbon', 'pralin', 'truffle', 'kakao'],
  S006: ['dondurma', 'külah', 'gelato', 'sorbe', 'maraş dondurması'],
  S007: ['pizza', 'pizzacı', 'mozzarella', 'hamur', 'fırın pizza'],
  S008: ['burger', 'sandviç', 'hamburger', 'patates', 'fast food'],
  S009: ['kebap', 'ızgara', 'lahmacun', 'döner', 'ocakbaşı', 'şiş kebap', 'adana', 'urfa'],
  S010: ['su', 'içecek', 'damacana', 'maden suyu', 'gazoz', 'meyve suyu', 'dağıtım'],
  S011: ['manav', 'sebze', 'meyve', 'organik sebze', 'yeşillik', 'taze meyve'],
  S012: ['şarküteri', 'peynir', 'kaşar', 'tulum', 'zeytin', 'gurme peynir'],
  S013: ['kasap', 'et', 'bonfile', 'antrikot', 'kıyma', 'kuzu', 'dana', 'köfte'],
  S014: ['balık', 'deniz ürünleri', 'karides', 'somon', 'çipura', 'levrek', 'kalamar'],
  S015: ['zeytinyağı', 'zeytin', 'soğuk sıkım', 'natürel sızma', 'zeytinlik'],
  S016: ['bal', 'arı', 'arıcılık', 'propolis', 'polen', 'petek bal'],
  S017: ['kuruyemiş', 'kuru meyve', 'fındık', 'fıstık', 'badem', 'ceviz', 'kaju'],
  S018: ['baharat', 'çay', 'bitki çayı', 'yeşil çay', 'kekik', 'nane', 'karabiber'],
  S019: ['catering', 'tabldot', 'toplu yemek', 'davet yemeği', 'ziyafet'],
  S020: ['paketli gıda', 'e-ticaret gıda', 'organik gıda', 'sağlıklı atıştırmalık'],
  S021: ['kadın giyim', 'elbise', 'bluz', 'etek', 'kadın butik', 'pantolon'],
  S022: ['erkek giyim', 'takım elbise', 'gömlek', 'ceket', 'erkek moda', 'smokin'],
  S023: ['çocuk giyim', 'bebek giyim', 'çocuk elbise', 'tulum', 'çocuk moda'],
  S024: ['ayakkabı', 'sneaker', 'bot', 'çizme', 'deri ayakkabı', 'spor ayakkabı'],
  S025: ['çanta', 'deri aksesuar', 'cüzdan', 'kemer', 'sırt çantası', 'el çantası'],
  S026: ['takı', 'kuyumculuk', 'altın', 'pırlanta', 'yüzük', 'kolye', 'küpe', 'bilezik'],
  S027: ['saat', 'kol saati', 'kronograf', 'otomatik saat', 'lüks saat'],
  S028: ['gözlük', 'optik', 'güneş gözlüğü', 'çerçeve', 'numaralı gözlük'],
  S029: ['spor giyim', 'tayt', 'fitness giyim', 'eşofman', 'activewear'],
  S030: ['ev tekstili', 'nevresim', 'havlu', 'çarşaf', 'yatak örtüsü', 'bornoz'],
  S031: ['mobilya', 'koltuk', 'kanepe', 'yemek odası', 'yatak odası', 'sehpa'],
  S032: ['mutfak dolabı', 'özel imalat mobilya', 'mutfak tezgahı', 'ada mutfak'],
  S033: ['banyo', 'vitrifiye', 'lavabo', 'klozet', 'duşakabin', 'batarya'],
  S034: ['aydınlatma', 'avize', 'abajur', 'led aydınlatma', 'spot', 'aplik'],
  S035: ['halı', 'kilim', 'el dokuma halı', 'yolluk', 'modern halı'],
  S036: ['boya', 'dekoratif boya', 'iç cephe boyası', 'dış cephe boyası', 'astar'],
  S037: ['seramik', 'doğal taş', 'fayans', 'mermer', 'granit', 'porselen seramik'],
  S038: ['perde', 'jaluzi', 'stor perde', 'tül', 'motorlu perde'],
  S039: ['mutfak gereçleri', 'tencere', 'tava', 'bıçak seti', 'kesme tahtası'],
  S040: ['ev düzenleme', 'saklama kutusu', 'organizer', 'raf', 'dolap içi'],
  S041: ['elektronik', 'bilgisayar', 'laptop', 'tablet', 'monitör', 'donanım'],
  S042: ['telefon aksesuarı', 'kılıf', 'şarj cihazı', 'ekran koruyucu', 'powerbank'],
  S043: ['oyun ekipmanı', 'gaming', 'oyuncu koltuğu', 'mekanik klavye', 'oyuncu kulaklığı'],
  S044: ['beyaz eşya', 'buzdolabı', 'çamaşır makinesi', 'bulaşık makinesi', 'fırın'],
  S045: ['küçük ev aletleri', 'kahve makinesi', 'blender', 'ütü', 'süpürge', 'airfryer'],
  S046: ['fotoğraf', 'kamera', 'lens', 'objektif', 'tripod', 'gimbal'],
  S047: ['müzik enstrümanı', 'gitar', 'piyano', 'keman', 'bağlama', 'amfi'],
  S048: ['kırtasiye', 'defter', 'kalem', 'ajanda', 'ofis kırtasiye', 'okul çantası'],
  S049: ['kitabevi', 'kitap', 'roman', 'edebiyat', 'yayınevi', 'kitapçı'],
  S050: ['kozmetik', 'cilt bakımı', 'serum', 'nemlendirici', 'güneş kremi', 'tonik'],
  S051: ['parfüm', 'koku', 'esans', 'kolonya', 'parfümör'],
  S052: ['kuaför', 'saç tasarım', 'boya', 'fön', 'keratin', 'gelin saçı'],
  S053: ['berber', 'erkek kuaförü', 'sakal tıraşı', 'saç kesimi', 'fön'],
  S054: ['tırnak', 'nail art', 'protez tırnak', 'manikür', 'pedikür', 'kalıcı oje'],
  S055: ['spa', 'masaj', 'hamam', 'aromaterapi', 'cilt masajı', 'rahatlama'],
  S056: ['spor salonu', 'fitness', 'gym', 'vücut geliştirme', 'ağırlık', 'antrenman'],
  S057: ['pilates', 'yoga', 'reformer', 'stüdyo', 'esneme', 'meditasyon'],
  S058: ['diş', 'diş kliniği', 'diş hekimi', 'implant', 'ortodonti', 'gülüş tasarımı', 'zirkonyum'],
  S059: ['veteriner', 'klinik', 'kedi', 'köpek', 'aşı', 'evcil hayvan tedavisi'],
  S060: ['pet shop', 'kedi maması', 'köpek maması', 'tasma', 'akvaryum', 'kemirme oyuncağı'],
  S061: ['çiçekçi', 'çiçek', 'buket', 'gül', 'orkide', 'aranjman', 'çelenk'],
  S062: ['hediye', 'kişiselleştirme', 'baskılı kupa', 'hediyelik', 'özel tasarım hediye'],
  S063: ['oyuncak', 'hobi', 'makro model', 'puzzle', 'lego', 'kutu oyunu', 'pelüş'],
  S064: ['fotoğraf stüdyosu', 'dış çekim', 'düğün fotoğrafçısı', 'portre', 'ürün çekimi'],
  S065: ['düğün', 'etkinlik organizasyonu', 'kına', 'nişan', 'catering davet', 'balo'],
  S066: ['otel', 'konaklama', 'pansiyon', 'resort', 'tatil köyü', 'butik otel', 'oda'],
  S067: ['seyahat acentesi', 'tur', 'yurt dışı tur', 'bilet', 'tatil paketi', 'vize'],
  S068: ['araç kiralama', 'rent a car', 'filo kiralama', 'günlük kiralama', 'lüks araç kiralama'],
  S069: ['oto galeri', 'oto satış', 'ikinci el araba', 'sıfır araç', 'otomobil satışı'],
  S070: ['oto servis', 'oto bakım', 'periyodik bakım', 'fren balatası', 'motor yağı', 'tamir'],
  S071: ['oto yıkama', 'detailing', 'pasta cila', 'seramik kaplama', 'iç kuaför', 'ppf'],
  S072: ['lastik', 'jant', 'kış lastiği', 'yaz lastiği', 'balans', 'rot'],
  S073: ['motosiklet', 'bisiklet', 'kask', 'mont', 'eldiven', 'koruyucu ekipman'],
  S074: ['lojistik', 'nakliye', 'kargo', 'ambar', 'taşımacılık', 'evden eve nakliyat'],
  S075: ['emlak', 'gayrimenkul', 'satılık daire', 'kiralık konut', 'arsa', 'villa', 'dükkan'],
  S076: ['mimarlık', 'iç mimarlık', 'dekorasyon', 'tasarım ofisi', '3d render', 'proje'],
  S077: ['inşaat', 'tuğla', 'çimento', 'şantiye', 'yapı malzemeleri', 'kiremit', 'harç', 'ayvazoğlu', 'bims', 'ytong', 'palet', 'forklift'],
  S078: ['hırdavat', 'el aletleri', 'matkap', 'vida', 'vida ucu', 'pense', 'nalbur', 'spiral'],
  S079: ['elektrik', 'tesisat', 'su tesisatı', 'sigorta', 'kablo', 'arıza tamir'],
  S080: ['iklimlendirme', 'klima', 'kombi', 'ısıtma', 'soğutma', 'havalandırma', 'radyatör'],
  S081: ['güneş enerjisi', 'güneş paneli', 'ges', 'inverter', 'yenilenebilir enerji', 'solar'],
  S082: ['tarım', 'zeytin', 'hasat', 'silkme', 'çırpıcı', 'sırt pompası', 'bofe', 'ilaçlama', 'pülverizatör', 'budama', 'tarım aletleri'],
  S083: ['tohum', 'fide', 'fidan', 'sebze fidesi', 'meyve fidanı', 'gübre', 'tarımsal tohum'],
  S084: ['peyzaj', 'bahçe bakımı', 'çim biçme', 'otomatik sulama', 'rulo çim', 'ağaç budama'],
  S085: ['endüstriyel makine', 'cnc', 'torna', 'lazer kesim', 'pres', 'imalat tezgahı'],
  S086: ['ambalaj', 'koli', 'baskı', 'matbaa', 'karton kutu', 'etiket', 'kraft'],
  S087: ['iş kıyafeti', 'iş güvenliği', 'baret', 'iş ayakkabısı', 'iş tulumu', 'fosforlu yelek'],
  S088: ['temizlik hizmetleri', 'ofis temizliği', 'ev temizliği', 'inşaat sonrası temizlik', 'cam silme'],
  S089: ['kuru temizleme', 'çamaşırhane', 'ütüleme', 'lostra', 'leke çıkarma'],
  S090: ['güvenlik kamerası', 'cctv', 'alarm sistemi', 'kamera sistemleri', 'güvenlik kaydı'],
  S091: ['b2b yazılım', 'veri', 'yazılım', 'leads', 'istihbarat', 'crm', 'erp', 'platform', 'veriburada', 'veri burada', 'müşteri bul'],
  S092: ['web tasarım', 'dijital ajans', 'sosyal medya yönetimi', 'seo', 'reklam ajansı', 'yazılım ajansı'],
  S093: ['hukuk bürosu', 'avukat', 'danışmanlık', 'hukuki danışmanlık', 'dava'],
  S094: ['mali müşavir', 'muhasebe', 'vergi danışmanlığı', 'finans', 'bordro', 'beyanname'],
  S095: ['özel ders', 'kurs', 'etüt', 'sınava hazırlık', 'yks', 'lgs', 'eğitim'],
  S096: ['dil kursu', 'ingilizce', 'almanca', 'yabancı dil', 'toefl', 'ielts', 'dil eğitimi'],
  S097: ['mesleki eğitim', 'atölye', 'sertifika programı', 'kaynakçılık', 'aşçılık kursu', 'usta öğretici'],
  S098: ['ortak çalışma alanı', 'coworking', 'paylaşımlı ofis', 'hazır ofis', 'toplantı odası'],
  S099: ['gayrimenkul proje tanıtımı', 'konut projesi', 'lansman', 'rezidans', 'örnek daire'],
  S100: ['sanat atölyesi', 'el işi', 'seramik atölyesi', 'resim kursu', 'heykel', 'ahşap oyma']
};

function normalizeTr(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

/**
 * Intelligent sector matcher: finds the exact Sxxx ID matching brand, product, and brief
 */
function matchSector(text) {
  if (!text) return 'S001';
  const rawClean = text.toLowerCase();
  const clean = normalizeTr(text);
  
  // Direct specific brand hooks
  if (clean.includes('ayvazoglu') || clean.includes('tugla')) return 'S077';
  if (clean.includes('bofe') || clean.includes('sirt pompasi') || clean.includes('zeytin hasat')) return 'S082';
  if (clean.includes('veri burada') || clean.includes('veriburada') || clean.includes('leads') || clean.includes('istihbarat')) return 'S091';

  let bestSector = 'S001';
  let bestScore = 0;

  for (const [sectorId, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    let score = 0;
    for (const kw of keywords) {
      const kwNorm = normalizeTr(kw);
      if (clean.includes(kwNorm) || rawClean.includes(kw)) {
        score += kw.length > 5 ? 3 : 2;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestSector = sectorId;
    }
  }

  return bestSector;
}

/**
 * Resolves a full, rich, verified Veo prompt from the 100-sector library
 */
function resolveSectorPrompt(options = {}) {
  const bank = getSectorBank();
  const brand = options.brand || options.brandName || 'Marka';
  const product = options.product || options.offerName || 'Ürün';
  const brief = options.brief || options.rawBrief || '';
  const videoType = options.videoType || 'product_showcase';
  
  // Combine all texts to identify best sector
  const combinedText = `${brand} ${product} ${brief} ${options.sectorHint || ''}`;
  const sectorId = options.sectorId || matchSector(combinedText);
  const sectorData = bank[sectorId] || bank['S001'];
  
  // Select variation based on videoType / goal
  // V01: Dokudan Eyleme (Product showcase / sensory hook)
  // V02: Kullanıcının Gözünden (POV / User experience)
  // V03: Ellerin Anlattığı Süreç (Craft / Behind the scenes)
  // V04: İnsansız Grafik Kompozisyon (Clean product / no human)
  // V05: Karşılaşma ve Seçim (Campaign / Offer / Choice)
  // V06: Meraktan Açıklamaya (Problem - Solution)
  // V07: Hareket Üzerinden Reklam Ritmi (Dynamic motion / Reels energy)
  // V08: Mekândan Markaya (Location / Space reveal)
  // V09: Günlük Anın İçinde (Lifestyle integration)
  // V10: Referans Odaklı Marka Filmi (Hero Brand Anthem / Corporate)
  let varIndex = 0; // Default V01
  if (videoType === 'campaign_promotion' || videoType === 'offer' || videoType === 'kampanya') {
    varIndex = 4; // V05
  } else if (videoType === 'user_experience' || videoType === 'deneyim') {
    varIndex = 1; // V02
  } else if (videoType === 'behind_the_scenes' || videoType === 'craft') {
    varIndex = 2; // V03
  } else if (videoType === 'no_human' || videoType === 'insansiz') {
    varIndex = 3; // V04
  } else if (videoType === 'problem_solution') {
    varIndex = 5; // V06
  } else if (videoType === 'rhythm' || videoType === 'reels') {
    varIndex = 6; // V07
  } else if (videoType === 'brand_film' || videoType === 'manifesto') {
    varIndex = 9; // V10
  }

  const variation = sectorData.variations[varIndex] || sectorData.variations[0];
  
  // Format placeholders
  const logoDescription = options.logoDescription || `Orijinal ${brand} kurumsal logosu`;
  const brandKitDesc = options.brandKitText || 'Kurumsal marka renkleri ve kimliği';
  const approvedLocation = options.location || sectorData.environment || 'İlgili profesyonel ticari alan';

  // Substitute placeholders in veoPrompt
  let finalPrompt = variation.veoPrompt
    .replace(/\[MARKA\]/g, brand)
    .replace(/\[URUN_REF\]/g, product)
    .replace(/\[MEKAN_REF\]/g, approvedLocation)
    .replace(/\[LOGO_REF\]/g, logoDescription)
    .replace(/\[BRAND_KIT\]/g, brandKitDesc);

  // Substitute placeholders in voiceover
  let finalVoiceover = variation.voiceoverSample
    .replace(/\[MARKA\]/g, brand)
    .replace(/\[URUN_REF\]/g, product);

  return {
    sectorId,
    sectorName: sectorData.name,
    variationId: variation.id,
    variationTitle: variation.title,
    hasHuman: variation.hasHuman,
    idea: variation.idea,
    hook: variation.hook,
    veoPrompt: finalPrompt,
    voiceoverText: finalVoiceover,
    negativePrompt: variation.negativePrompt,
    subject: sectorData.subject,
    environment: sectorData.environment,
    humanRoles: sectorData.humanRoles,
    materials: sectorData.materials,
    soundSources: sectorData.soundSources,
    forbiddenClaims: sectorData.forbiddenClaims
  };
}

module.exports = {
  getSectorBank,
  SECTOR_KEYWORDS,
  matchSector,
  resolveSectorPrompt
};
