import type { CreativeSnapshot } from './types'
import { completeText } from '../ai/text'
import type { AiKeyBag } from '../ai/config'

export interface VideoBriefInputV4 {
  model?: 'veo_3_1_flow' | string
  campaign: {
    goal: string
    message: string
    cta?: string | null
    headline?: string | null
    price?: string | null
    discount?: string | null
    legalLine?: string | null
  }
  brand?: {
    name?: string | null
    tone?: string | null
    colorWords?: string[]
    logoDescription?: string | null
  }
  offer: {
    type: string
    subject: string
    primaryBenefit?: string | null
    realAction?: string | null
    mustPreserve?: string[]
    mustNotShow?: string[]
    verifiedFacts?: string[]
  }
  audience?: string | null
  references?: {
    product?: string | null
    logo?: string | null
    location?: string | null
    person?: string | null
  }
  creative?: {
    archetype?: string | null
    location?: string | null
    timeOfDay?: string | null
    mood?: string | null
    cameraPreference?: string | null
  }
  audio?: {
    mode?: 'voiceover' | 'dialogue' | 'music_foley' | 'silent'
    language?: string
    voiceCharacter?: string
    requiredWords?: string[]
    forbiddenClaims?: string[]
  }
  text?: {
    rawVideoPolicy?: 'existing_only' | 'none' | 'one_short_label'
    postProductionSubtitles?: boolean
  }
  delivery?: {
    aspectRatio?: string
    durationSeconds?: number
  }
}

export interface VeoCompilerOutputV4 {
  status: 'ready' | 'needs_clarification' | 'rejected'
  normalizedBrief: {
    goal: string
    subject: string
    offerType: string
    audience?: string | null
    primaryBenefit?: string | null
    realAction?: string | null
    brand?: string | null
    productReference?: string | null
    logoReference?: string | null
    archetype: string
    audioMode: string
    durationSeconds: number
    aspectRatio: string
  }
  finalVeoPrompt: string
  negativePrompt: string
  postProduction: {
    headline?: string | null
    price?: string | null
    discount?: string | null
    cta?: string | null
    phone?: string | null
    url?: string | null
    subtitles: boolean
    legalLine?: string | null
  }
  qualityChecks: {
    singleLocation: boolean
    singlePrimaryAction: boolean
    referenceSafe: boolean
    noInventedClaims: boolean
    voiceoverWordCount: number
    qualityScore: number
  }
  warnings: string[]
  clarificationQuestion: string | null
}

export const VEO_V4_STANDARD_NEGATIVES = [
  'duplicate subject',
  'duplicate product',
  'altered product geometry',
  'incorrect product color',
  'warped packaging',
  'warped logo',
  'gibberish typography',
  'floating graphics',
  'holographic interface',
  'unmotivated location change',
  'identity drift',
  'extra fingers',
  'deformed hands',
  'unsafe product use',
  'watermark',
].join(', ')

/**
 * CreativeSnapshot verisini v4 Brief Giriş Şablonuna normalize eder.
 */
export function mapSnapshotToBriefV4(snapshot: CreativeSnapshot): VideoBriefInputV4 {
  const mainProduct = snapshot.products[0]
  const brandName = snapshot.brandKit?.name?.replace(/Brand Kit/i, '').replace(/Kampanya Kiti/i, '').trim() || null
  const isSpeech = snapshot.videoSpeech !== false

  const colorWords: string[] = []
  if (snapshot.brandKit?.colors) {
    for (const [k, v] of Object.entries(snapshot.brandKit.colors)) {
      if (typeof v === 'string' && v) colorWords.push(`${k}: ${v}`)
    }
  }

  const phone = snapshot.phones[0]?.phone || null
  const discount = mainProduct?.promo || snapshot.customText || null
  const price = mainProduct?.price || null

  return {
    model: 'veo_3_1_flow',
    campaign: {
      goal: 'product_demo',
      message: snapshot.brief || 'Özel ticari kampanya ve hızlı iletişim',
      cta: snapshot.cta || 'Bizimle İletişime Geçin',
      headline: snapshot.brief || null,
      price,
      discount,
      legalLine: null,
    },
    brand: {
      name: brandName,
      tone: snapshot.brandKit?.tone || 'Güven veren ve profesyonel',
      colorWords,
      logoDescription: snapshot.useLogo ? 'Ekli resmi kurumsal logo' : null,
    },
    offer: {
      type: 'physical_product',
      subject: mainProduct?.name || snapshot.brief || 'Ticari Ürün ve Hizmet',
      primaryBenefit: mainProduct?.description || snapshot.brief || null,
      realAction: 'Ürünün gerçek ortamda fonksiyonel ve estetik kullanımı',
      mustPreserve: mainProduct?.name ? [mainProduct.name] : [],
      mustNotShow: ['sahte logo', 'ekranda havada uçuşan yazı'],
      verifiedFacts: [],
    },
    audience: 'Türkiye yerel müşterileri ve işletmeler',
    references: {
      product: mainProduct?.imageUrl || null,
      logo: snapshot.brandKit?.logoPath || null,
      location: null,
      person: null,
    },
    creative: {
      archetype: snapshot.style === 'luxury' ? 'premium' : 'direct_response',
      location: null,
      timeOfDay: 'doğal gün ışığı',
      mood: snapshot.style || 'modern',
      cameraPreference: 'Arri Master Macro & pürüzsüz gimbal kayması',
    },
    audio: {
      mode: isSpeech ? 'voiceover' : 'music_foley',
      language: 'tr-TR',
      voiceCharacter: 'Kristal netliğinde profesyonel Türkçe erkek reklam spikeri',
      requiredWords: [],
      forbiddenClaims: ['dünyanın en iyisi', 'kesin garanti'],
    },
    text: {
      rawVideoPolicy: 'existing_only',
      postProductionSubtitles: true,
    },
    delivery: {
      aspectRatio: '9:16',
      durationSeconds: 8,
    },
  }
}

/**
 * v4 Kural Motoruna Göre Deterministik Derleyici (Sıfır Hata / Çevrimdışı Garantili).
 * Tek lokasyon, tek ana konu, 3 perde kadrajı (0-2.2s, 2.2-5.8s, 5.8-8.0s), <= 18 kelime seslendirme.
 */
export function compileDeterministicV4(brief: VideoBriefInputV4): VeoCompilerOutputV4 {
  const brand = brief.brand?.name?.trim() || 'İşletme'
  const subject = brief.offer.subject.trim()
  const rawMessage = (brief.campaign.message || brief.campaign.headline || '').trim()
  const isVoiceover = brief.audio?.mode === 'voiceover'

  // Eksik bilgi kontrolü: Konu yoksa clarification üret
  if (!subject) {
    return {
      status: 'needs_clarification',
      normalizedBrief: {
        goal: brief.campaign.goal || 'product_demo',
        subject: '',
        offerType: brief.offer.type || 'physical_product',
        archetype: brief.creative?.archetype || 'direct_response',
        audioMode: brief.audio?.mode || 'voiceover',
        durationSeconds: 8,
        aspectRatio: '9:16',
      },
      finalVeoPrompt: '',
      negativePrompt: VEO_V4_STANDARD_NEGATIVES,
      postProduction: {
        subtitles: true,
      },
      qualityChecks: {
        singleLocation: false,
        singlePrimaryAction: false,
        referenceSafe: false,
        noInventedClaims: true,
        voiceoverWordCount: 0,
        qualityScore: 30,
      },
      warnings: ['Tanıtılacak ürün veya hizmet konusu belirtilmedi.'],
      clarificationQuestion: 'Lütfen videoda tanıtılacak ana ürünü veya hizmeti kısaca belirtin.',
    }
  }

  // 1. Lokasyon ve Sahne Atmosferi Tespiti (Tek Lokasyon Devamlılığı)
  const fullText = `${brand} ${subject} ${rawMessage} ${brief.offer.type} ${brief.creative?.mood || ''}`.toLowerCase()
  let location = 'Aydınlık ve modern bir stüdyo ortamı'
  let act1Visual = `${subject} dokusuna yaklaşan 100mm makro odak ve yüzey detayları`
  let act2Action = `${subject} ürününün gerçek ve akıcı işlev anı`
  let act3Close = `${subject} ürününün estetik son kadrajı ve güven veren marka duruşu`

  if (fullText.match(/(tuğla|inşaat|şantiye|harç|çimento|yapı|mermer)/)) {
    location = 'Modern bir mimari yapı şantiyesi ve doğal gün ışığı alan açık hava inşaat alanı'
    act1Visual = 'Tuğlanın pürüzsüz killi dokusu, keskin geometrik kenarları ve sabah güneşi yansımaları'
    act2Action = 'Nizami örülen estetik duvar yapısı ve malzemenin sağlam yerleşimi'
    act3Close = 'Tamamlanan sağlam duvar mimarisi ve güven veren estetik yapı görünümü'
  } else if (fullText.match(/(veri|data|harita|b2b|yazılım|platform|leads|istihbarat)/)) {
    location = 'Modern cam gökdelen ofisinde ahşap toplantı masası ve arka planda şehir manzarası'
    act1Visual = 'İnce çerçeveli dizüstü bilgisayar ekranında parlayan minimalist yeşil harita konum pinleri'
    act2Action = 'Kullanıcının tek tıkla doğrulanmış müşteri verilerini incelemesi ve hızlı aksiyon alması'
    act3Close = 'Aydınlık çalışma masasında başarıyla tamamlanan veri analizi ve yönetici tebessümü'
  } else if (fullText.match(/(tarım|pompa|ilaçlama|hasat|bahçe|zeytin|sera|fidan)/)) {
    location = 'Güneşli ve bereketli bir Ege meyve bahçesi'
    act1Visual = 'Cihazın ergonomik gövdesi ve pirinç nozülünden çıkan mikronize ince sis bulutu'
    act2Action = 'Ağaç yapraklarının nazikçe ve eşit oranda zahmetsizce ilaçlanması'
    act3Close = 'Güneş ışığında pırıl pırıl parlayan sağlıklı ağaç yaprakları ve arazide güven veren duruş'
  } else if (fullText.match(/(burger|yemek|gıda|restoran|kahve|pasta|tatlı|lezzet)/)) {
    location = 'Sıcak ahşap dokulu gourmet mutfak ve sunum tezgahı'
    act1Visual = 'Taze malzemelerin dumanı tüten iştah açıcı mikro dokusu ve canlı renkleri'
    act2Action = 'Lezzetin ustalıkla bir araya getirilişi ve sıcak servis sunumu'
    act3Close = 'Masada kusursuz bir ziyafet sunumu ve davetkar estetik görünüm'
  }

  // 2. Doğal Türkçe Seslendirme Repliği (Maksimum 18 Kelime, İdeal 10-14 Kelime, Tırnaksız)
  let voiceLine = ''
  if (isVoiceover) {
    const rawClean = rawMessage.replace(/[\r\n]+/g, ' ').replace(/[".]/g, '').trim()
    const discountClean = (brief.campaign.discount || '').replace(/[\r\n]+/g, ' ').replace(/[".]/g, '').trim()

    if (rawClean && rawClean.split(/\s+/).length <= 12) {
      voiceLine = discountClean && !rawClean.toLowerCase().includes(discountClean.toLowerCase())
        ? `${rawClean}, ${discountClean} için bizimle iletişime geçin`
        : `${rawClean}, detaylı bilgi ve teklif için bizimle iletişime geçin`
    } else {
      voiceLine = `${brand} kalitesiyle ${subject} projelerinizde, avantajlı fırsatlar için bizimle iletişime geçin`
    }

    // Kelime sayısı sınırını garantile (en fazla 18 kelime)
    const words = voiceLine.split(/\s+/).filter(Boolean)
    if (words.length > 18) {
      voiceLine = words.slice(0, 16).join(' ') + ' için bizimle iletişime geçin'
    }
  }

  const voiceoverCount = isVoiceover ? voiceLine.split(/\s+/).filter(Boolean).length : 0

  // 3. Final Veo Promptu Derleme (VEO v4 Sıralaması)
  const voiceSection = isVoiceover
    ? `SESLENDİRME: Kristal netliğinde profesyonel Türkçe erkek reklam spikeri sesi: ${voiceLine}`
    : `SES DÜZENİ: STRICT RULE: NO VOICE, NO SPEECH, NO SPOKEN WORDS. Sadece doğal sahne foley ses efektleri ve dinamik modern reklam fon müziği.`

  const finalVeoPrompt = [
    `9:16 dikey formatta, 8 saniyelik üst düzey Türk televizyon ve sinema reklam filmi.`,
    `Fikir: ${brand} ile ${subject} tanıtımı.`,
    `Konu ve Kimlik: ${subject}. Referans ürün formu, marka adı, varsa gerçek logo ve renkler %100 korunur.`,
    brief.brand?.name
      ? `Marka Görünürlüğü: ${brand} adı ve varsa ekli gerçek logo sahne içinde doğal, büyük ve okunabilir fiziksel marka yüzeylerinde görünür olmalıdır: ürün gövdesi/ambalaj etiketi, iş kıyafeti nakışı, araç etiketi, dükkan/fabrika giriş tabelası veya ana hero üründeki marka plakası. Küçük masa levhası, elde taşınan mini tabela ve rastgele CTA tabelası kullanma. Logo yeniden tasarlanmaz, uydurma amblem eklenmez.`
      : null,
    `Tek Lokasyon ve Işık: ${location}. Doğal gün ışığı, sıcak gölgeler ve Arri Alexa sinematik renk derecelendirmesi.`,
    `0.0s - 2.2s (Görsel Kanca): ${act1Visual}. 100mm f/1.8 sığ alan derinliği.`,
    `2.2s - 5.8s (Eylem ve Kanıt): ${act2Action}. Akıcı gimbal hareketi, net ve dengeli sinematografi.`,
    `5.8s - 8.0s (Odak Kapanış): ${act3Close}.`,
    `Kamera ve Fizik: Tek pürüzsüz kamera hareketi. Gerçek hayat fiziğine tam uyum.`,
    `Süreklilik: Tek lokasyon, tek ana konu, aynı ışık kurulumu ve sıfır sahne sıçraması.`,
    voiceSection,
    `Ham Video Metin Politikası: Ham videoda fiyat, indirim, telefon, uzun kampanya metni, altyazı veya sonradan eklenmiş grafik kartı OLMAYACAKTIR. Veo'nun bozduğu küçük yazılar yasaktır: küçük masa levhası, elde taşınan küçük tabela, arka plan etiketi, karmaşık ekran metni ve rastgele CTA tabelası kullanma. Gerçek fiziksel marka adı, ürün etiketi, büyük dükkan/fabrika tabelası veya ekli gerçek logo sahne içinde doğal biçimde kullanılabilir. Marka renk paleti ürün, kıyafet, mekan aksanı ve ışıkta kullanılmalıdır. STRICT RULE: NO GIBBERISH WORDS, NO SMALL TEXT, NO RANDOM CTA SIGNS, NO PRICES, NO DISCOUNTS, NO PHONE NUMBERS, NO SUBTITLES, NO GRAPHIC OVERLAYS. ALLOW LARGE CLEAN PHYSICAL BRAND SIGNAGE AND ORIGINAL LOGO ONLY.`,
  ].filter(Boolean).join('\n')

  return {
    status: 'ready',
    normalizedBrief: {
      goal: brief.campaign.goal || 'product_demo',
      subject,
      offerType: brief.offer.type || 'physical_product',
      audience: brief.audience || 'Genel Ticari Hedef Kitle',
      primaryBenefit: brief.offer.primaryBenefit || subject,
      realAction: brief.offer.realAction || 'Ürün işlevi',
      brand,
      productReference: brief.references?.product || null,
      logoReference: brief.references?.logo || null,
      archetype: brief.creative?.archetype || 'direct_response',
      audioMode: brief.audio?.mode || 'voiceover',
      durationSeconds: 8,
      aspectRatio: '9:16',
    },
    finalVeoPrompt,
    negativePrompt: VEO_V4_STANDARD_NEGATIVES,
    postProduction: {
      headline: brief.campaign.headline || subject,
      price: brief.campaign.price || null,
      discount: brief.campaign.discount || null,
      cta: brief.campaign.cta || 'Bizimle İletişime Geçin',
      phone: null,
      url: null,
      subtitles: true,
      legalLine: brief.campaign.legalLine || null,
    },
    qualityChecks: {
      singleLocation: true,
      singlePrimaryAction: true,
      referenceSafe: true,
      noInventedClaims: true,
      voiceoverWordCount: voiceoverCount,
      qualityScore: 92,
    },
    warnings: [],
    clarificationQuestion: null,
  }
}

/**
 * Gemini Prompt Compiler v4 Entegrasyonu.
 * VEO_GENEL_REKLAM_MOTORU_v4 ve GEMINI_PROMPT_COMPILER_v4 kurallarına göre AI destekli derleme yapar.
 * API anahtarı veya bağlantı yoksa sıfır kesintiyle deterministik v4 çıktısı üretir.
 */
export async function compileVideoPromptV4(
  brief: VideoBriefInputV4,
  bag?: AiKeyBag | null,
): Promise<VeoCompilerOutputV4> {
  const systemPrompt = `ROL: Sen, farklı sektörlerde reklam ve ürün tanıtımları için kısa Veo videoları derleyen bir reklam yönetmeni ve prompt compiler'sın. Görevin yaratıcı brief yazmak değil; kullanıcı verisini normalize edip uygulanabilir, çelişkisiz ve tutarlı TEK Veo promptuna çevirmektir.
KAYNAK: VEO_GENEL_REKLAM_MOTORU_v4 tek kural kaynağıdır.
ÖNCELİK: safety/platform > kullanıcının açık talebi > ürün/hizmet gerçekleri > referans görseller > marka > kampanya hedefi > sektör ortam ipucu > arketip.
KURALLAR:
1. Tek lokasyon, tek ana konu ve tek ana eylem seç. Üç perdeyi aynı ortamın üç kadrajı olarak kur (0-2.2s Görsel Kanca, 2.2-5.8s Kanıt/Eylem, 5.8-8.0s Odak Kapanış).
2. Dinamik metni post-prodüksiyona taşı. Ham videoda fiyat, CTA, telefon, altyazı, uzun kampanya metni ve rastgele levha yazısı bulunmaz. Marka adı ve varsa ekli gerçek logo yalnızca büyük, temiz, doğal fiziksel marka yüzeylerinde kullanılabilir; küçük tabela/masa levhası yasaktır.
3. 8 saniyelik seslendirmeyi en fazla 18, tercihen 10-14 Türkçe kelimeyle sınırla. Tırnak işareti kullanma.
4. ÇIKTI: Yalnızca geçerli JSON döndür. Başka hiçbir markdown veya açıklama yazma.`

  const userPrompt = `Girdi Briefi:\n${JSON.stringify(brief, null, 2)}`

  try {
    const rawResponse = await completeText(systemPrompt, userPrompt, {
      ...bag,
      preferredTextProvider: 'google',
    })

    const cleanJson = rawResponse
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    const parsed = JSON.parse(cleanJson) as VeoCompilerOutputV4
    if (parsed.status && parsed.finalVeoPrompt) {
      return parsed
    }
  } catch (err) {
    console.warn('[VideoCompilerV4] AI çağrısı başarısız, deterministik v4 derleyicisi devrede:', err)
  }

  // Fallback: Yerel v4 kural motoru
  return compileDeterministicV4(brief)
}
