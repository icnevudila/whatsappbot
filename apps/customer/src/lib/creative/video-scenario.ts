import { completeText } from '../ai/text'
import type { AiKeyBag } from '../ai/config'

export interface VideoScenarioOption {
  id: string
  title: string
  badge: string
  summary: string
  fullPrompt: string
}

export interface VideoScenarioContext {
  brandName?: string | null
  about?: string | null
  sector?: string | null
  brief: string
  customText?: string | null
  dateRange?: string | null
  cta?: string | null
  videoSpeech?: boolean
  products?: Array<{
    name: string
    price?: string | null
    promo?: string | null
    extra?: string | null
  }>
}

/**
 * ChatGPT üzerinden 3 farklı reklam filmi senaryosu ve Veo promptu üretir.
 * Herhangi bir API sorunu veya kesintide yüksek kaliteli yerel senaryolarla sıfır hata garantisi verir.
 */
export async function generateVideoScenarios(
  context: VideoScenarioContext,
  bag?: AiKeyBag | null,
): Promise<VideoScenarioOption[]> {
  const brand = context.brandName?.trim() || 'Mesajify'
  const isSpeech = context.videoSpeech !== false
  const productsSummary = (context.products || [])
    .filter((p) => p.name)
    .map((p) => `${p.name}${p.price ? ` (${p.price})` : ''}${p.promo ? ` - ${p.promo}` : ''}`)
    .join(', ')

  const systemPrompt = `Sen Cannes ödüllü bir ticari reklam filmi yönetmeni ve Google Veo video prompt uzmanısın.
Görevin: Verilen işletme ve kampanya bağlamını inceleyerek kullanıcıya sunulacak 3 FARKLI reklam senaryosu üretmek.

Her senaryo şu 2 seviyeden oluşmalıdır:
1. "summary": Kullanıcı dostu, sade Türkçe ile yazılmış 1-2 cümlelik kısa özet. Kullanıcı bu özeti okuduğunda videoda ne olacağını (kim var, ne yapıyor, ne söylüyor) saniyesinde anlar.
2. "fullPrompt": Google Veo yapay zeka video motoruna iletilecek ultra detaylı 9:16 dikey sinematik çekim direktifi (İngilizce + Türkçe diyalog/dış ses).

ÇOK ÖNEMLİ KURALLAR (VEO v4 STANDARDI):
- Format: 9:16 Dikey (Instagram Reels, TikTok, WhatsApp Durum formatı).
- Süre: 8 saniye (3 Perde: ACT 1: 0-2.2s Görsel Kanca, ACT 2: 2.2-5.8s Ürün/Hizmet Eylemi & Kanıt, ACT 3: 5.8-8s Odak Kapanış).
- Tek Lokasyon Devamlılığı: Üç perde aynı lokasyonun üç tamamlayıcı kadrajı olmalıdır. Mekan sıçraması kesinlikle yasaktır.
- Dış Ses / Konuşma Durumu: ${
    isSpeech
      ? 'Dış ses veya oyuncu konuşması VARDIR. En fazla 18, ideal olarak 10-14 Türkçe kelimeden oluşan doğal, akıcı ve devrik olmayan tam Türkçe replik yazılmalıdır. Tırnak işareti kullanılmaz.'
      : 'Konuşma ve insan sesi YOKTUR. Sadece foley doğal ses efektleri ve dinamik fon müziği vardır. STRICT RULE: NO VOICE, NO SPEECH.'
  }
- EKRANDA YAZI YASAKTIR (Post-prodüksiyon Ayrımı): Videonun ham çekiminde kesinlikle ekranda hiçbir banner, altyazı, yazı, tipografi, logo kartı OLMAYACAKTIR. 'STRICT RULE: NO ON-SCREEN TEXT, NO WORDS, NO LETTERS, NO LOGO CARDS' kuralı promptun sonuna eklenmelidir.
- Yanıtı YALNIZCA geçerli bir JSON dizisi olarak dön. Başka hiçbir açıklama, selamlama veya markdown tırnağı yazma.

JSON ŞEMASI:
[
  {
    "id": "scenario_1",
    "title": "Kısa Çarpıcı Başlık (Örn: Usta & Akıllı Telefon)",
    "badge": "En Çok Tercih Edilen",
    "summary": "1-2 cümlelik sade, anlaşılır Türkçe kullanıcı özeti.",
    "fullPrompt": "9:16 vertical cinematic commercial for [Brand]... ACT 1... ACT 2... ACT 3... STRICT RULE: NO ON-SCREEN TEXT..."
  },
  {
    "id": "scenario_2",
    "title": "2. Senaryo Başlığı",
    "badge": "Dinamik & Enerjik",
    "summary": "...",
    "fullPrompt": "..."
  },
  {
    "id": "scenario_3",
    "title": "3. Senaryo Başlığı",
    "badge": "Premium Sinematik",
    "summary": "...",
    "fullPrompt": "..."
  }
]`

  const userPrompt = `Marka: ${brand}
Açıklama / Sektör: ${context.about || context.sector || 'Genel Ticari İşletme'}
Kampanya Fikri / Brief: ${context.brief}
Ek Metin / Kampanya Detayı: ${context.customText || '—'}
Ürünler: ${productsSummary || 'Ana Ticari Ürün'}
Kampanya Tarihi: ${context.dateRange || 'Hemen Şimdi'}
Aksiyon Çağrısı (CTA): ${context.cta || 'WhatsApp İle Sipariş Ver'}
Dış Ses / Konuşma: ${isSpeech ? 'Sesli / Konuşmalı' : 'Sessiz / Sadece Müzik ve Foley'}`

  try {
    const rawResponse = await completeText(systemPrompt, userPrompt, {
      ...bag,
      preferredTextProvider: 'openai',
    })

    const cleanJson = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleanJson) as VideoScenarioOption[]
    if (Array.isArray(parsed) && parsed.length >= 3) {
      return parsed.slice(0, 3)
    }
  } catch (err) {
    console.warn('[VideoScenario] ChatGPT üretimi başarısız veya anahtar yok, zengin şablonlar kullanılıyor:', err)
  }

  // Akıllı Fallback: Bağlama özel 3 profesyonel hazır senaryo
  return generateFallbackScenarios(context)
}

function generateFallbackScenarios(context: VideoScenarioContext): VideoScenarioOption[] {
  const brand = context.brandName?.trim() || 'Mesajify'
  const isSpeech = context.videoSpeech !== false
  const product = context.products?.[0]?.name || 'Kurumsal Hizmet ve Ürün'
  const brief = context.brief || 'WhatsApp ile dijital tanıtım ve hızlı iletişim'
  const allText = `${brand} ${context.about || ''} ${context.sector || ''} ${product} ${brief}`.toLowerCase()

  const strictRule =
    'ÖNEMLİ KURAL: Videoda KESİNLİKLE hiçbir yazı, metin, altyazı, logo kartı, bilgi kutusu veya grafik overlay OLMAYACAKTIR. STRICT RULE: NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO SUBTITLES, NO CAPTIONS, NO ON-SCREEN TEXT, NO LOGO CARDS, NO GRAPHIC OVERLAYS, NO 3D LETTERING. Pure clean cinematic live-action commercial footage only.'

  // 1. B2B / Veri / Yazılım / Kurumsal Platform (Örn: Veri Burada)
  if (allText.match(/(veri|data|yazılım|b2b|platform|istihbarat|leads|crm|erp|teknoloji|analiz|dashboard|şirket|veriburada|veri burada|bilişim)/)) {
    const speech1 = isSpeech
      ? `Oyuncu kameraya samimiyetle konuşur: "Yeni açılan tüm işletmeleri anında tespit edip WhatsApp'tan ilk teklifi biz veriyoruz, ${brand} ile satışlarımız patladı!"`
      : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Doğal klavye ve modern ofis ortam sesleri, dinamik fon müziği.`

    const prompt1 = `9:16 vertical cinematic corporate tech commercial for "${brand}".
ACT 1 (0-3s): Macro 100mm f/2.0 cinematic close-up of a sleek, ultra-thin laptop screen in a sunlit modern glass skyscraper office. The screen displays vibrant real-time data analytics, interactive map pins, and qualified business leads glowing in green and white lights.
ACT 2 (3-7s): Medium shot of a sharp, charismatic business professional (30s, smart casual blazer) standing near the panoramic glass window holding a smartphone with real-time business notifications. ${speech1}
ACT 3 (7-10s): Dynamic cinematic gimbal pull-back revealing the high-rise corporate office and city skyline, upward trending growth metrics on background monitors, executive smiling with confident nod. 4K high-end commercial cinematography, Arri Alexa natural color grade.
${strictRule}`

    const speech2 = isSpeech
      ? `Dış ses enerjik bir kurumsal tonla seslendirir: "Müşteri aramakla vakit kaybetmeyin! ${brand} ile hedef sektörünüzdeki yeni işletmelere tek tıkla ulaşın, satışlarınızı katlayın!"`
      : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Yüksek tempolu kurumsal modern ritimler.`

    const prompt2 = `9:16 vertical dynamic B2B intelligence commercial for "${brand}".
ACT 1 (0-3s): Dynamic tilt-down from modern glass ceiling to high-performance tablet showing real-time incoming qualified business contacts and directory updates.
ACT 2 (3-7s): Tracking shot of energetic sales team in an open-space tech office, smiling professionals closing partnerships and reviewing verified company data. ${speech2}
ACT 3 (7-10s): Wide hero shot of executive confidently shaking hands, smartphone screen buzzing with incoming deals, warm afternoon sunlight filling the workspace. 4K crisp advertising aesthetic.
${strictRule}`

    const prompt3 = `9:16 vertical premium executive showcase commercial for "${brand}".
ACT 1 (0-3s): 120fps slow-motion capture of executive typing on a minimalist aluminium keyboard, reflections of data charts on glasses, pristine executive desk.
ACT 2 (3-7s): Elegant camera glide around high-tech holographic data presentation, smooth glowing UI elements and verified lead analytics. ${isSpeech ? `Karizmatik dış ses: "${brand}, şirketinizin dijital büyüme motoru. Doğru müşteriye, doğru zamanda ulaşın."` : 'STRICT RULE: NO VOICE, NO SPEECH.'}
ACT 3 (7-10s): Smooth transition to modern executive smiling into camera, giving a confident nod of success against stunning architectural background. 4K commercial cinematography.
${strictRule}`

    return [
      {
        id: 'scenario_1',
        title: 'Canlı Veri Paneli & B2B Leads',
        badge: 'En Çok Tercih Edilen',
        summary: 'Gökdelen ofisinde laptop ekranındaki canlı veriler, gelen bildirimler ve yöneticinin hızlı müşteri bulma başarısı.',
        fullPrompt: prompt1,
      },
      {
        id: 'scenario_2',
        title: 'Dinamik B2B Satış Büyümesi',
        badge: 'Yüksek Dönüşüm',
        summary: 'Modern teknoloji ofisinde ekibin yeni şirket kayıtlarını incelemesi ve anında iletişime geçerek satışları katlaması.',
        fullPrompt: prompt2,
      },
      {
        id: 'scenario_3',
        title: 'Prestijli Kurumsal İstihbarat',
        badge: 'Sinematik Kalite',
        summary: '120fps ağır çekim yönetici masası, yüksek teknoloji veri grafikleri ve kurumsal güvenilirlik vurgusu.',
        fullPrompt: prompt3,
      },
    ]
  }

  // 2. Tarım / Bahçe / Bofe Ekipmanları
  if (allText.match(/(bofe|ilaçlama|tarım|sera|bağ|bahçe|pülverizatör|sırt pompası|akülü pompa)/)) {
    const speech1 = isSpeech
      ? `Bahçe sahibi gülümseyerek konuşur: "Artık sırt pompasıyla yorulmak bitti! ${brand} akülü pompa ile tüm bahçeyi tek şarjla kolayca ilaçlıyorum, verimimiz katlandı!"`
      : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Kuş sesleri, hafif rüzgar ve foley mikronize sisleme sesleri.`

    const prompt1 = `9:16 vertical cinematic agriculture commercial for "${brand}".
ACT 1 (0-3s): Macro close-up (100mm lens) of the ergonomic sky-blue sprayer tank with crisp "${brand}" branding in warm morning sunlight, brass nozzle spraying ultra-fine micronized mist over lush green orchard leaves.
ACT 2 (3-7s): Medium shot of a friendly modern farmer/gardener in clean outdoor vest comfortably holding the lightweight spray wand, walking effortlessly through sunlit rows of fruit trees. ${speech1}
ACT 3 (7-10s): Wide cinematic gimbal sweep showing the vibrant green orchard, golden sunbeams streaming through leaves, the gardener smiling proudly and giving a thumbs up. 4K commercial cinematography, Arri Alexa natural grade.
${strictRule}`

    const prompt2 = `9:16 vertical high-performance equipment commercial for "${brand}".
ACT 1 (0-3s): Dynamic low-angle track showing high-pressure uniform spraying across fertile greenhouse plants, crystalline water droplets catching morning light.
ACT 2 (3-7s): Fast-paced tracking shot of the powerful rechargeable battery pack clicking securely into place, digital battery level glowing, effortless continuous spraying action.
ACT 3 (7-10s): Hero shot of the sprayer resting gracefully on a wooden farm crate against rich green farmland, satisfied grower smiling in background. 4K advertising aesthetic.
${strictRule}`

    const prompt3 = `9:16 vertical luxury farm & garden showcase for "${brand}".
ACT 1 (0-3s): 120fps slow-motion capture of golden hour droplets gently dispersing over emerald vineyard leaves, cinematic backlight.
ACT 2 (3-7s): Elegant camera glide around the sprayer's durable build, comfortable padded shoulder straps, and stainless steel telescopic wand in action.
ACT 3 (7-10s): Cinematic drone pull-back revealing endless fertile land at sunset, farmer standing proudly with the equipment. Sharp 4K television commercial quality.
${strictRule}`

    return [
      {
        id: 'scenario_1',
        title: 'Meyve Bahçesinde Kolay İlaçlama',
        badge: 'En Çok Tercih Edilen',
        summary: 'Güneşli bahçede Bofe akülü sırt pompasının mikronize sisi, konforlu kullanımı ve bahçe sahibinin memnuniyeti.',
        fullPrompt: prompt1,
      },
      {
        id: 'scenario_2',
        title: 'Yüksek Basınç & Güçlü Batarya',
        badge: 'Yüksek Performans',
        summary: 'Serada ve arazide kesintisiz yüksek basınçlı püskürtme, kolay takılan batarya ve iş verimliliği.',
        fullPrompt: prompt2,
      },
      {
        id: 'scenario_3',
        title: 'Gün Batımında Bereketli Hasat',
        badge: 'Sinematik Kalite',
        summary: '120fps ağır çekimde gün batımı ışığında su damlacıkları, dayanıklı paslanmaz ekipman ve prestijli tarım.',
        fullPrompt: prompt3,
      },
    ]
  }

  // 3. İnşaat, Yapı Malzemeleri & Sanayi (Tuğla, Mermer vb.)
  if (allText.match(/(tuğla|inşaat|çimento|şantiye|yapı|mermer|beton|sanayi|metal|nalbur)/)) {
    const speech1 = isSpeech
      ? `Usta baretini düzeltip gülümseyerek konuşur: "Şantiyemize malzeme lazım olduğunda beklemiyoruz; ${brand} ile WhatsApp'tan siparişi veriyoruz, doğrudan kapımıza geliyor!"`
      : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Endüstriyel ortam sesleri ve ritmik müzik.`

    const prompt1 = `9:16 vertical cinematic industrial commercial for "${brand}".
ACT 1 (0-3s): Macro 100mm close-up of high-grade construction ${product}, smooth texture, precise geometric edges, morning sunlight glancing off pristine material.
ACT 2 (3-7s): Medium shot of a confident construction engineer in white hardhat and safety vest at an organized modern building site, holding smartphone showing WhatsApp order confirmation. ${speech1}
ACT 3 (7-10s): Wide cinematic crane tilt-up showing majestic newly built modern architectural project, delivery truck arriving in background, engineer smiling with thumbs up. 4K Arri Alexa commercial cinematography.
${strictRule}`

    return [
      {
        id: 'scenario_1',
        title: 'Şantiye & Hızlı Fabrika Teslimatı',
        badge: 'En Çok Tercih Edilen',
        summary: 'Şantiyede mimari malzemenin sağlamlığı, mühendisin WhatsApp ile hızlı sipariş kolaylığı ve güvenilir teslimat.',
        fullPrompt: prompt1,
      },
      {
        id: 'scenario_2',
        title: 'Yüksek Mukavemet & Malzeme Kalitesi',
        badge: 'Yüksek Dayanıklılık',
        summary: 'Malzemenin sağlamlığı, nizami istiflenmesi ve fabrikadan doğrudan teslim avantajı.',
        fullPrompt: prompt1,
      },
      {
        id: 'scenario_3',
        title: 'Modern Mimari Proje Vitrini',
        badge: 'Sinematik Kalite',
        summary: 'Çağdaş mimari yapının görkemli dış cephesi ve birinci sınıf yapı malzemesi vurgusu.',
        fullPrompt: prompt1,
      },
    ]
  }

  // 4. Gıda & Restoran (Sadece gıda kelimeleri varsa!)
  if (allText.match(/(döner|kebap|lahmacun|burger|pizza|pide|köfte|restoran|lokanta|kafe|tatlı|baklava|yemek|lezzet|mutfak|şef|dürüm)/)) {
    const speech1 = isSpeech
      ? `Usta kameraya samimiyetle gülümseyerek konuşur: "Artık broşür bastırmıyorum! Bunun yerine ${brand} ile dijital menümü etrafımdaki tüm müşterilere tek tıkla WhatsApp'tan gönderiyorum, siparişler patladı!"`
      : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Doğal mekan sesleri, telefon bildirim sesleri ve dinamik fon müziği.`

    const prompt1 = `9:16 vertical cinematic commercial advertisement for "${brand}".
ACT 1 (0-3s): Sizzling macro close-up (100mm f/1.8 lens) of fresh, seasoned ${product}, fragrant natural steam rising, clean professional prep counter in warm appetizing lighting.
ACT 2 (3-7s): Medium shot of an authentic, friendly business owner in clean uniform standing proudly behind the counter. He holds up a sleek smartphone toward the camera showing a WhatsApp chat screen. ${speech1}
ACT 3 (7-10s): Smooth cinematic gimbal pull-back showing the buzzing shop, incoming orders ringing, the actor giving an energetic thumbs up with a confident smile. 4K live-action commercial cinematography, Arri Alexa natural color grade.
${strictRule}`

    return [
      {
        id: 'scenario_1',
        title: 'Usta & Akıllı Telefon (Samimi Esnaf)',
        badge: 'En Çok Tercih Edilen',
        summary: 'İşletme sahibi tezgah başında akıllı telefonunu kameraya gösterir: "Artık broşür basmıyorum, dijital broşürümü WhatsApp\'tan gönderiyorum!" diyerek siparişlerin hızını anlatır.',
        fullPrompt: prompt1,
      },
      {
        id: 'scenario_2',
        title: 'Dinamik Sipariş Patlaması (Hızlı & Enerjik)',
        badge: 'Yüksek Dönüşüm',
        summary: 'Telefonlara düşen sipariş bildirimleri, mutfakta hızlı hazırlık ve mutlu kurye teslimatıyla işletmenin yoğun hareketliliği vurgulanır.',
        fullPrompt: prompt1,
      },
      {
        id: 'scenario_3',
        title: 'Premium Sinematik Vitrin (120fps Ağır Çekim)',
        badge: 'Sinematik Kalite',
        summary: 'Ürünün en iştah açıcı ve kaliteli detayları 120fps ağır çekimde ekrana gelir; tek tıkla dijital sipariş konforu aktarılır.',
        fullPrompt: prompt1,
      },
    ]
  }

  // 5. Genel Ticari İşletme & Hizmet (Temiz, kurumsal, gıdasız default!)
  const speechGen = isSpeech
    ? `İşletme yetkilisi samimiyetle konuşur: "Müşterilerimize en hızlı şekilde ulaşıp siparişleri doğrudan ${brand} WhatsApp hattımızdan alıyoruz, işlerimiz çok kolaylaştı!"`
    : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Dinamik modern fon müziği ve doğal foley sesleri.`

  const promptGen = `9:16 vertical modern commercial advertisement for "${brand}".
ACT 1 (0-3s): Macro close-up of ${product}, pristine surface details, elegant studio lighting, premium craftsmanship and sleek design.
ACT 2 (3-7s): Medium shot of a friendly, professional team member interacting with a customer and showing a smartphone with WhatsApp instant communication. ${speechGen}
ACT 3 (7-10s): Smooth gimbal sweep showing happy customer, stylish business storefront, confident team smiling toward the camera. 4K crisp advertising aesthetic.
${strictRule}`

  return [
    {
      id: 'scenario_1',
      title: 'Hızlı İletişim & WhatsApp Kolaylığı',
      badge: 'En Çok Tercih Edilen',
      summary: 'Müşterilerle kesintisiz iletişim, kaliteli ürün sunumu ve tek tıkla WhatsApp sipariş kolaylığı.',
      fullPrompt: promptGen,
    },
    {
      id: 'scenario_2',
      title: 'Dinamik Ticari Büyüme & Memnuniyet',
      badge: 'Yüksek Dönüşüm',
      summary: 'Hızlı sipariş akışı, güler yüzlü hizmet ve modern işletme konforu.',
      fullPrompt: promptGen,
    },
    {
      id: 'scenario_3',
      title: 'Prestijli Ürün ve Marka Vitrini',
      badge: 'Sinematik Kalite',
      summary: 'Ürünün üstün kalitesini ve işletmenin güvenilir kurumsal kimliğini öne çıkaran 4K reklam çekimi.',
      fullPrompt: promptGen,
    },
  ]
}

/**
 * Kullanıcıyı teknik prompt detaylarıyla meşgul etmeden,
 * arka planda ChatGPT üzerinden tek bir kusursuz sinematik reklam promptu üretir.
 */
export async function generateBackgroundMasterPrompt(
  snapshot: any,
  bag?: AiKeyBag | null,
): Promise<string> {
  const brand = snapshot.brandKit?.name?.trim() || 'İşletme'
  const isSpeech = snapshot.videoSpeech !== false
  const products = snapshot.products || []
  const productsSummary = products
    .map((p: any) => `${p.name}${p.price ? ` (${p.price})` : ''}${p.promo ? ` - ${p.promo}` : ''}${p.description ? ` [${p.description}]` : ''}`)
    .join(', ')

  const systemPrompt = `Sen Cannes ödüllü bir ticari reklam filmi yönetmeni ve Google Veo video prompt uzmanısın.
Görevin: Verilen marka, marka kiti, ürünler ve kampanya bağlamını inceleyerek Google Veo yapay zeka video motorunun üreteceği tek bir MASTER reklam filmi promptu (çekim senaryosu) oluşturmak.

ÇOK ÖNEMLİ KURALLAR:
- Format: 9:16 Dikey (Instagram Reels, TikTok, WhatsApp Durum formatı).
- Süre: 10 saniye (3 Perde: ACT 1 (0-3s Giriş/Kanca/Ürün Detayı), ACT 2 (3-7s Eylem/Mesaj/Kullanım/Esnaf veya Oyuncu Diyaloğu), ACT 3 (7-10s Kapanış/Aksiyon Çağrısı)).
- Dış Ses / Konuşma Durumu: ${
    isSpeech
      ? 'Dış ses veya oyuncu konuşması VARDIR. Promptun sonuna MUTLAKA tam olarak şu formatta ekle: SESLENDİRME: Kristal netliğinde profesyonel Türkçe erkek reklam spikeri sesi: "[15-20 kelimelik akıcı Türkçe reklam repliği]"'
      : 'Konuşma ve insan sesi YOKTUR. Sadece foley doğal ses efektleri ve dinamik fon müziği vardır. STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE ekle.'
  }
- EKRANDA YAZI VE TABELA KURALI: Ham videoda fiyat, indirim, telefon, uzun kampanya metni, altyazı, CTA butonu veya grafik overlay olmayacaktır. Veo küçük yazılarda sapıttığı için küçük masa levhası, elde taşınan mini tabela, arka plan raf etiketi, karmaşık ekran metni ve rastgele CTA tabelası KESİNLİKLE yasaktır. Marka görünürlüğü ise Veo içinde doğal üretilmelidir: "${brand.toUpperCase()}" adı ve varsa ekli gerçek logo ürün gövdesi/ambalaj etiketi, iş kıyafeti nakışı, araç etiketi, büyük dükkân/fabrika giriş tabelası veya ana hero üründeki marka plakası gibi büyük, temiz, okunabilir fiziksel yüzeylerde yer alacaktır. Marka renk paleti ürün, kıyafet, mekan aksanı ve ışıkta kullanılacaktır. "ANINDA TEKLİF AL", "SİPARİŞ VER", "HEMEN ARA" gibi CTA yazıları kullanıcı açıkça istemedikçe sahneye yazılmayacaktır; CTA gerekiyorsa dış sesle söylenir.
- MARKA VE ÜRÜN DOKUNULMAZLIĞI (ASLA OYNAMA YA DA VARYASYON YAPMA): Firmanın orijinal logosu, amblemi, marka renkleri ve gerçek ürün tasarımı kesinlikle korunacaktır. Ürün üzerinde hiçbir oynama, deformasyon veya varyasyon yapılmayacaktır. STRICT MANDATE: ZERO ALTERATION TO BRAND LOGO OR PRODUCT IDENTITY. PRESERVE ORIGINAL EMBLEM, COLORS, AND PHYSICAL PRODUCT FORM EXACTLY.
- Çıktı olarak SADECE video motoruna gönderilecek nihai prompt metnini dön. Başka hiçbir açıklama, selamlama veya markdown tırnağı yazma.`

  const userPrompt = `Marka: ${brand}
Marka Tonu: ${snapshot.brandKit?.tone || 'Güvenilir, dinamik ve kaliteli'}
Kampanya Fikri / Brief: ${snapshot.brief}
Ek Metin / Kampanya Detayı: ${snapshot.customText || '—'}
Ürünler ve Detaylar: ${productsSummary || 'Ana Ticari Ürün'}
Kampanya Tarihi: ${snapshot.dateRange || 'Hemen Şimdi'}
Aksiyon Çağrısı (CTA): ${snapshot.cta || 'WhatsApp İle Sipariş Ver'}
Dış Ses / Konuşma: ${isSpeech ? 'Sesli / Türkçe Konuşmalı' : 'Sessiz / Sadece Müzik ve Foley'}`

  try {
    const rawPrompt = await completeText(systemPrompt, userPrompt, {
      ...bag,
      preferredTextProvider: 'openai',
    })

    const cleanPrompt = rawPrompt
      .replace(/^```text\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    if (cleanPrompt.length > 80) {
      console.log(`[VideoScenario] ChatGPT arka planda master prompt üretti (${cleanPrompt.length} karakter)`)
      return cleanPrompt
    }
  } catch (err) {
    console.warn('[VideoScenario] ChatGPT arka plan üretimi atlandı, zengin yerel şablon devrede:', err)
  }

  // Akıllı Fallback: 16 sektör destekli zengin video promptu
  const { buildVideoPrompt } = await import('./prompt')
  const { prompt } = buildVideoPrompt(snapshot)
  return prompt
}

export interface BusinessVideoIdea {
  label: string
  text: string
}

/**
 * İşletmenin adı, sektörü ve kayıtlı ürünlerini analiz ederek
 * o işletmeye özel 4 adet vurucu, hazır 9:16 reklam fikri üretir.
 */
export function buildSmartBusinessVideoIdeas(
  org: { name?: string | null; about?: string | null },
  products?: Array<{ name: string; description?: string | null }>,
): BusinessVideoIdea[] {
  const name = org.name?.trim() || 'İşletmemiz'
  const about = (org.about || '').toLowerCase()
  const prodList = (products || []).filter((p) => p.name)
  const firstProd = prodList[0]?.name || ''
  const allKeywords = `${name} ${about} ${prodList.map((p) => p.name).join(' ')}`.toLowerCase()

  // 1. B2B / Veri / Yazılım / Kurumsal Platform (Örn: Veri Burada)
  if (
    allKeywords.includes('veri') ||
    allKeywords.includes('data') ||
    allKeywords.includes('yazılım') ||
    allKeywords.includes('b2b') ||
    allKeywords.includes('platform') ||
    allKeywords.includes('istihbarat') ||
    allKeywords.includes('leads') ||
    allKeywords.includes('crm') ||
    allKeywords.includes('erp') ||
    allKeywords.includes('analiz') ||
    allKeywords.includes('şirket') ||
    allKeywords.includes('bilişim')
  ) {
    return [
      {
        label: 'Yeni Müşteri Keşfi',
        text: `${name} ile sektörünüzde yeni açılan tüm işletmeleri anında tespit edin, rakiplerinizden önce ilk teklifi WhatsApp ile siz verin.`,
      },
      {
        label: 'Sıcak Müşteri Listesi',
        text: `Hedef sektörünüze özel filtrelenmiş güncel firma listelerine ${name} ile tek tıkla ulaşın, WhatsApp üzerinden satışlarınızı büyütün.`,
      },
      {
        label: 'Satış Verimliliği & İstihbarat',
        text: `Satış ekibinizin verimini artıran doğrulanmış kurumsal verilerle hemen tanışın. Ayrıntılı bilgi için WhatsApp'tan iletişime geçin.`,
      },
      {
        label: 'Ücretsiz Demo ve Örnek Liste',
        text: `Sektörünüze özel ücretsiz örnek firma listesi ve canlı sistem tanıtımı için doğrudan ${name} WhatsApp hattımıza yazın.`,
      },
    ]
  }

  // 2. Restoran / Döner / Kafe / Gıda
  if (
    allKeywords.includes('döner') ||
    allKeywords.includes('kebap') ||
    allKeywords.includes('restoran') ||
    allKeywords.includes('lokanta') ||
    allKeywords.includes('kafe') ||
    allKeywords.includes('cafe') ||
    allKeywords.includes('burger') ||
    allKeywords.includes('pizza') ||
    allKeywords.includes('pide') ||
    allKeywords.includes('lezzet') ||
    allKeywords.includes('yemek')
  ) {
    const dish = firstProd || 'günün spesiyali'
    return [
      {
        label: 'Günün Taze Spesiyali',
        text: `${name} mutfağında taze hazırlanan ${dish} lezzetini kaçırmayın. Sıcacık kapınıza teslim için hemen WhatsApp'tan sipariş verin.`,
      },
      {
        label: 'Dijital Menü & Kolay Sipariş',
        text: `${name} güncel menüsünü inceleyin, dilediğiniz lezzeti WhatsApp üzerinden tek tıkla zahmetsizce sipariş edin.`,
      },
      {
        label: 'Hafta Sonuna Özel Fırsat',
        text: `Hafta sonuna özel avantajlı fiyatlar ve sürpriz ikramlar sizi bekliyor. Siparişinizi WhatsApp hattımızdan hemen oluşturun.`,
      },
      {
        label: 'Hızlı Paket Servis',
        text: `Sıra beklemeden doğrudan WhatsApp hattımız üzerinden sipariş verin, en taze lezzetler sıcacık adresinize gelsin.`,
      },
    ]
  }

  // 3. Otomotiv / Donanım / Teknoloji (Örn: Bofe Şarjlı Pompa)
  if (
    allKeywords.includes('pompa') ||
    allKeywords.includes('lastik') ||
    allKeywords.includes('oto') ||
    allKeywords.includes('araba') ||
    allKeywords.includes('araç') ||
    allKeywords.includes('motor') ||
    allKeywords.includes('şarj') ||
    allKeywords.includes('teknoloji') ||
    allKeywords.includes('tamir') ||
    allKeywords.includes('yedek parça')
  ) {
    const item = firstProd || 'Akıllı Şarjlı Pompa'
    return [
      {
        label: 'Acil Durum Kurtarıcısı',
        text: `Yolda lastik basıncınız düştüğünde ${item} yanınızda. Pratik kullanım ve hızlı sipariş için hemen WhatsApp hattımıza yazın.`,
      },
      {
        label: 'Kompakt Güç ve Performans',
        text: `Kompakt tasarımı ve üstün gücüyle ${item} her an elinizin altında. Avantajlı fiyatlarla satın almak için WhatsApp ile iletişime geçin.`,
      },
      {
        label: 'Sınırlı Stok Kampanyası',
        text: `${item} için bu haftaya özel indirim ve ücretsiz kargo avantajı başladı. Stoklar tükenmeden WhatsApp üzerinden sipariş verin.`,
      },
      {
        label: 'Ürün Bilgisi ve Sipariş',
        text: `${name} güvencesiyle ${item} teknik özelliklerini öğrenin ve tek tıkla WhatsApp üzerinden siparişinizi tamamlayın.`,
      },
    ]
  }

  // 4. İnşaat / Yapı / Malzeme (Örn: Ayvazoğlu Tuğla)
  if (
    allKeywords.includes('inşaat') ||
    allKeywords.includes('tuğla') ||
    allKeywords.includes('yapı') ||
    allKeywords.includes('malzeme') ||
    allKeywords.includes('hafriyat') ||
    allKeywords.includes('beton') ||
    allKeywords.includes('lojistik')
  ) {
    const mat = firstProd || 'yapı malzemesi'
    return [
      {
        label: 'Şantiyeye Doğrudan Teslimat',
        text: `${name} güvencesiyle fabrikadan doğrudan şantiyenize birinci kalite ${mat} teslimatı. Hızlı fiyat teklifi için WhatsApp'tan yazın.`,
      },
      {
        label: 'Toptan Alımlarda Özel İskonto',
        text: `Bu aya özel toptan ${mat} alımlarında geçerli özel iskonto avantajları. Anında net fiyat teklifi almak için WhatsApp hattımıza bağlanın.`,
      },
      {
        label: 'Üstün Kalite ve Dayanıklılık',
        text: `Projelerinizde uzun ömürlü sağlamlık için birinci sınıf ${mat}. Detaylı ürün bilgisi ve toplu sipariş için bizimle iletişime geçin.`,
      },
      {
        label: 'Dijital Katalog ve Fiyat Listesi',
        text: `${name} güncel ürün kataloğuna ve toptan fiyat listesine doğrudan WhatsApp hattımız üzerinden tek tıkla ulaşın.`,
      },
    ]
  }

  // 5. Moda / Butik / Tekstil
  if (
    allKeywords.includes('butik') ||
    allKeywords.includes('giyim') ||
    allKeywords.includes('elbise') ||
    allKeywords.includes('moda') ||
    allKeywords.includes('kombin') ||
    allKeywords.includes('ayakkabı') ||
    allKeywords.includes('çanta')
  ) {
    const item = firstProd || 'Yeni sezon koleksiyonu'
    return [
      {
        label: 'Yeni Sezon Vitrini',
        text: `${name} yeni sezonun en göz alıcı kombinleri mağazamızda. Beğendiğiniz modelleri incelemek ve sipariş vermek için WhatsApp'tan yazın.`,
      },
      {
        label: 'Sınırlı Stok İndirimi',
        text: `${item} parçalarında geçerli sınırlı stok indirimi başladı. Tükenmeden hemen WhatsApp hattımız üzerinden siparişinizi oluşturun.`,
      },
      {
        label: 'Dijital Katalog',
        text: `${name} yeni sezon dijital kataloğunu ve özel parçalarını doğrudan WhatsApp hattımız üzerinden keşfedin.`,
      },
      {
        label: 'Kumaş Kalitesi ve Detaylar',
        text: `Özenli el işçiliği ve birinci sınıf kumaş kalitesiyle üretilen modellerimizi keşfetmek için hemen WhatsApp'tan bilgi alın.`,
      },
    ]
  }

  // 6. Genel / Hizmet / WhatsApp İşletmesi
  const genericProd = firstProd ? `${firstProd} ve ` : ''
  return [
    {
      label: 'Dijital Liste & Ürünler',
      text: `${name} güncel ürün ve hizmet kataloğuna doğrudan WhatsApp hattımız üzerinden tek tıkla ulaşın.`,
    },
    {
      label: 'Hızlı Sipariş Kolaylığı',
      text: `${name} güvencesiyle sunulan ${genericProd}hizmetlerimiz için sıra beklemeden tek tıkla WhatsApp üzerinden sipariş verebilirsiniz.`,
    },
    {
      label: 'Haftaya Özel Fırsatlar',
      text: `Bu haftaya özel avantajlı fiyatlarımızı kaçırmayın. Size özel fiyat teklifi almak için WhatsApp'tan hemen iletişime geçin.`,
    },
    {
      label: 'Doğrudan WhatsApp İletişimi',
      text: `Tüm soru ve siparişleriniz için ${name} WhatsApp hattı üzerinden doğrudan satış ekibimize bağlanın.`,
    },
  ]
}
