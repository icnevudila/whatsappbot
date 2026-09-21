/**
 * Mesajify Omnistudio - 10 Ticari Video Konusu (10.000 Varyasyon Matrisi)
 * 100 Sektör x 10 Yönetmenlik Açısı (V01-V10) x 10 Video Konusu (T01-T10) = 10.000 Özgün Reklam Senaryosu
 */

const COMMERCIAL_TOPICS = {
  T01_LANSMAN: {
    id: 'T01',
    name: 'Yeni Ürün Lansmanı & Sezon Açılışı',
    keywords: ['yeni', 'lansman', 'yeni sezon', 'çıktı', 'tanıtım', 'ilk kez', 'sezon', 'koleksiyon', 'keşfet'],
    focus: 'Ürünün yeniliği, taze tasarımı ve pazara yeni girişinin prestiji.',
    hookTweak: 'Yeni sezon ambalajının veya ürünün ilk kez gün ışığına çıkışı, taze doku ve parlak açılış.',
    voiceoverTweak: (brand, product) => `${brand} güvencesiyle yeni ${product} projeniz ve işletmeniz için şimdi satışta. Yenilikleri ilk keşfeden olmak için bizimle iletişime geçin.`
  },

  T02_KAMPANYA: {
    id: 'T02',
    name: 'Toptan Fiyat, İndirim & Özel Kampanya',
    keywords: ['fiyat', 'kampanya', 'indirim', 'toptan', 'teklif', 'fırsat', 'avantaj', 'maliyet', 'ekonomik'],
    focus: 'Ekonomik avantaj, toptan alım fırsatı ve doğrudan üreticiden almanın maliyet kazancı.',
    hookTweak: 'Toptan sevkiyat paletleri, hazır paketli ürünler ve doğrudan şantiye/işletme tedarik hazırlığı.',
    voiceoverTweak: (brand, product) => `${brand} ${product} ürünlerinde doğrudan üreticiden avantajlı toptan fiyat fırsatı başladı. Projenize özel fiyat teklifi almak için hemen bize yazın.`
  },

  T03_PROBLEM_COZUM: {
    id: 'T03',
    name: 'Problem & Çözüm (Acı Noktası ve Rahatlama)',
    keywords: ['sorun', 'problem', 'çözüm', 'zorluk', 'zahmet', 'kolaylık', 'pratik', 'zaman kazancı', 'hızlı çözüm'],
    focus: 'Müşterinin yaşadığı geleneksel zorluk ve bu ürünle gelen net pratik rahatlama.',
    hookTweak: 'Geleneksel zorluk yerine pürüzsüz çalışan, tek dokunuşta mükemmel sonuç veren ürün aksiyonu.',
    voiceoverTweak: (brand, product) => `İşinizdeki tüm zorlukları geride bırakın; ${brand} ${product} ile yüksek verim ve kolaylığı yakalayın. Detaylı bilgi için bizimle iletişime geçin.`
  },

  T04_USTALIK_IMALAT: {
    id: 'T04',
    name: 'Ustalık, İmalat Süreci & El İşçiliği',
    keywords: ['usta', 'işçilik', 'imalat', 'üretim', 'nasıl yapılır', 'atölye', 'fabrika', 'zanaat', 'emek'],
    focus: 'Ürünün arkasındaki titiz işçilik, fırınlama, pres, dikiş veya hassas montaj ustalığı.',
    hookTweak: 'Ustanın elleriyle malzemeyi şekillendirmesi, milimetrik montaj ve kaliteli işçilik anı.',
    voiceoverTweak: (brand, product) => `Yılların tecrübesi ve ustalıkla üretilen ${brand} ${product}, her detayında yüksek kaliteyi yaşatıyor. Ürünlerimizi yakından tanımak için bize ulaşın.`
  },

  T05_DENEYIM_POV: {
    id: 'T05',
    name: 'Kullanıcı Gözünden Deneyim & İnceleme (POV)',
    keywords: ['kullanıcı', 'deneyim', 'gözünden', 'inceleme', 'pov', 'yakından', 'test', 'dokun'],
    focus: 'İzleyiciyi doğrudan kullanıcının yerine koyan birinci şahıs kalite kontrolü ve dokunma hissi.',
    hookTweak: 'Kullanıcının göz hizasından ürünün eldivenle kavranması, dokunulması ve pürüzsüz yüzey testi.',
    voiceoverTweak: (brand, product) => `${brand} ${product} kalitesini ve sağlamlığını kendi gözlerinizle yakından deneyimleyin. Projenize özel numune ve bilgi için bize yazın.`
  },

  T06_HIZ_RITIM: {
    id: 'T06',
    name: 'Hızlı Teslimat, Dinamizm & Reels Enerjisi',
    keywords: ['hızlı', 'teslimat', 'anında', 'aynı gün', 'sevkiyat', 'ritim', 'dinamik', 'enerji', 'seri'],
    focus: 'Zamanında teslimat, seri çalışma temposu ve akıcı ritmik geçişler.',
    hookTweak: 'Ritmik hızlı palet yerleşimi, yükleme ve yola çıkan sevkiyat aracının kesintisiz enerjisi.',
    voiceoverTweak: (brand, product) => `Zamanınız değerli; ${brand} ${product} şantiyenize ve işletmenize tam zamanında hızla ulaşıyor. Hızlı sipariş ve teslimat için hemen iletişime geçin.`
  },

  T07_GUVEN_DAYANIKLILIK: {
    id: 'T07',
    name: 'Güven, Dayanıklılık & Test / Garanti',
    keywords: ['dayanıklı', 'güven', 'sağlam', 'ömürlük', 'mukavemet', 'garanti', 'sertifika', 'kalite', 'sağlamlık'],
    focus: 'Ürünün basınca, hava şartlarına, aşınmaya karşı üstün dayanıklılığı ve uzun ömür güvencesi.',
    hookTweak: 'Ürünün sağlamlık testi, mukavemet gösterisi ve sarsılmaz katı duruşu.',
    voiceoverTweak: (brand, product) => `Zorlu koşullara meydan okuyan ${brand} ${product}, yapılarınıza ve işinize nesiller boyu sarsılmaz güven katıyor. Kalite güvencesiyle tanışmak için bize yazın.`
  },

  T08_KARSILASTIRMA: {
    id: 'T08',
    name: 'Fark & Karşılaştırmalı Üstünlük',
    keywords: ['fark', 'neden', 'üstün', 'karşılaştırma', 'farkı', 'seçim', 'en iyi', 'kalite farkı'],
    focus: 'Sıradan alternatiflerle olan net doku, performans ve kurumsal hizmet farkı.',
    hookTweak: 'Sıradan ürünlerin aksine kusursuz kenar geometrisi, homojen doku ve premium malzeme farkı.',
    voiceoverTweak: (brand, product) => `Standart çözümlerle yetinmeyin; ${brand} ${product} ile aradaki farkı ve gerçek kaliteyi görün. Detaylı bilgi ve danışmanlık için bizimle iletişime geçin.`
  },

  T09_MEKAN_TESIS: {
    id: 'T09',
    name: 'Tesis, Showroom & Üretim Gücü Vitrini',
    keywords: ['tesis', 'fabrika', 'showroom', 'depo', 'alan', 'kapasite', 'yerli üretim', 'mekan'],
    focus: 'İşletmenin üretim gücü, geniş depolama kapasitesi, modern makine parkuru veya lüks mağazası.',
    hookTweak: 'Modern tesisin ferah geniş açısı, düzenli stok sıraları ve kurumsal karşılama.',
    voiceoverTweak: (brand, product) => `Yüksek üretim kapasitemiz ve modern tesisimizle ${brand}, ihtiyacınız olan her an yanınızda. Tesisimizi ziyaret etmek veya sipariş vermek için bize yazın.`
  },

  T10_MARKA_MANIFESTO: {
    id: 'T10',
    name: 'Kurumsal Miras & Marka Manifestosu',
    keywords: ['manifesto', 'vizyon', 'marka', 'prestij', 'kurumsal', 'gelecek', 'değer', 'güç'],
    focus: 'Markanın sektördeki öncülüğü, güven veren kurumsal kimliği ve geleceğe değer katan vizyonu.',
    hookTweak: 'Yükselen mimari proje, gün batımında gururlu çalışanlar ve prestijli kurumsal tabela duruşu.',
    voiceoverTweak: (brand, product) => `Geleceğin sağlam yapılarını ${brand} güvencesiyle inşa ediyoruz. Değer katan projeler ve güçlü iş birlikleri için bizimle iletişime geçin.`
  }
};

/**
 * Kullanıcı brief'inden en uygun konuyu otomatik tespit eder
 */
function matchTopic(briefText, fallbackTopic = 'T01_LANSMAN') {
  if (!briefText) return fallbackTopic;
  const clean = briefText.toLowerCase();

  let bestTopic = fallbackTopic;
  let maxScore = 0;

  for (const [topicKey, topicData] of Object.entries(COMMERCIAL_TOPICS)) {
    let score = 0;
    for (const kw of topicData.keywords) {
      if (clean.includes(kw)) score += 2;
    }
    if (score > maxScore) {
      maxScore = score;
      bestTopic = topicKey;
    }
  }

  return bestTopic;
}

/**
 * 100 Sektör x 10 Varyasyon şablonunu 10 Ticari Konu ile çarparak 10.000 kombinasyona dönüştürür.
 */
function applyTopicModifier(baseBlueprint, topicKey, options = {}) {
  const topic = COMMERCIAL_TOPICS[topicKey] || COMMERCIAL_TOPICS.T01_LANSMAN;
  const brand = options.brand || options.brandName || 'Marka';
  const product = options.product || options.productName || 'Ürün';

  // Seslendirmeyi konuya göre %100 kurallı Türkçeye dönüştür
  const customizedVoiceover = options.voiceoverText || topic.voiceoverTweak(brand, product);

  // Veo promptunun girişine ve gövdesine konunun kurgusal odağını ekle
  const topicDirective = `\nREKLAM KONUSU & HEDEFİ: ${topic.name}.
Kurgusal Odak: ${topic.focus}
0.0–2.0s Kanca Revizyonu: ${topic.hookTweak}`;

  return {
    ...baseBlueprint,
    topicId: topic.id,
    topicName: topic.name,
    topicFocus: topic.focus,
    veoPrompt: `${baseBlueprint.veoPrompt}\n${topicDirective}`,
    voiceoverText: customizedVoiceover,
    fullMatrixCode: `${baseBlueprint.sectorId}-${baseBlueprint.variationId}-${topic.id}`
  };
}

module.exports = {
  COMMERCIAL_TOPICS,
  matchTopic,
  applyTopicModifier
};
