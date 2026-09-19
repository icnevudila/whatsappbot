import type { CreativeSnapshot } from './types'
import { CREATIVE_FORMATS, CREATIVE_STYLES, VARIATION_PRESETS } from './types'

const STYLE_HINT: Record<string, string> = {
  auto: 'Choose the most suitable commercial look from the brief, products and brand (do not invent a sector).',
  modern: 'Modern, clean commercial design, contemporary type hierarchy, generous spacing.',
  premium: 'Premium, refined, high-end campaign look, restrained palette, quality materials.',
  minimal: 'Minimal, lots of whitespace, few elements, one focal product or offer.',
  energetic: 'Energetic, high contrast, bold shapes, still readable on a phone.',
  fun: 'Playful but professional, not childish, still conversion-oriented.',
  corporate: 'Corporate, trustworthy, calm, no visual noise.',
  luxury: 'Luxury, elegant lighting, sparse composition, no clutter.',
  food: 'Appetizing food photography mood, warm light, steam/freshness if relevant, no fake ingredients.',
}

const DENSITY_HINT: Record<string, string> = {
  low: 'Very little on-image text: at most a short headline. No paragraphs, no tiny disclaimers.',
  balanced: 'Limited on-image text: headline + one short offer line. No long body copy. Keep mobile-readable.',
  detailed:
    'More campaign text is allowed (headline, offer, one contact line) but still sparse. Never fill the image with paragraphs.',
}

function formatLabel(formatId: string): string {
  return CREATIVE_FORMATS.find((row) => row.id === formatId)?.label ?? formatId
}

function styleLabel(styleId: string): string {
  return CREATIVE_STYLES.find((row) => row.id === styleId)?.label ?? styleId
}

/**
 * Structured brief → image-model prompt. UI içinde prompt birleştirilmez.
 */
export function buildCreativePrompt(snapshot: CreativeSnapshot): {
  prompt: string
  negative: string
} {
  const aspect =
    CREATIVE_FORMATS.find((row) => row.id === snapshot.formatId)?.aspect ?? snapshot.aspect
  const kit = snapshot.brandKit
  const colors = kit?.colors
    ? Object.entries(kit.colors)
        .filter(([, value]) => typeof value === 'string' && value)
        .map(([key, value]) => `${key} ${value}`)
        .join(', ')
    : null

  const productBlocks = snapshot.products.map((product, index) => {
    const bits: string[] = [`Product ${index + 1}`]
    if (product.include.name && product.name) bits.push(`name: ${product.name}`)
    if (product.include.description && product.description) bits.push(`description: ${product.description}`)
    if (product.include.boxContents && product.boxContents) {
      bits.push(`box contents: ${product.boxContents}`)
    }
    if (product.include.price && (product.price || product.oldPrice)) {
      bits.push(
        `price: ${product.price || '—'} ${product.oldPrice ? `(was ${product.oldPrice})` : ''}`.trim(),
      )
    }
    if (product.include.promo && product.promo) bits.push(`offer: ${product.promo}`)
    if (product.extra) bits.push(`extra: ${product.extra}`)
    if (!snapshot.baseCreativeId && product.include.image && product.imageUrl && index === 0) {
      bits.push('A product photo is attached as a reference. Keep the real product identity.')
    }
    return bits.join('. ')
  })

  const contacts: string[] = []
  for (const phone of snapshot.phones) {
    contacts.push(`Phone/WhatsApp: ${phone.phone}${phone.label ? ` (${phone.label})` : ''}`)
  }
  for (const social of snapshot.socials) {
    const handle = social.label || social.url
    contacts.push(`${social.platform}: ${handle}`)
  }
  if (snapshot.website) contacts.push(`Website: ${snapshot.website}`)
  if (snapshot.address) contacts.push(`Address: ${snapshot.address}`)

  const extras: string[] = []
  if (snapshot.labels.length) extras.push(`Badges/labels to feature: ${snapshot.labels.join(', ')}`)
  if (snapshot.cta) extras.push(`CTA: ${snapshot.cta}`)
  if (snapshot.dateRange) extras.push(`Campaign dates: ${snapshot.dateRange}`)
  if (snapshot.customText) extras.push(`Custom line: ${snapshot.customText}`)

  const variation = snapshot.variationPreset
    ? VARIATION_PRESETS.find((row) => row.id === snapshot.variationPreset)?.label
    : null

  const prompt = [
    'Create ONE professional commercial campaign creative for WhatsApp / social ads.',
    'Turkish audience. High quality, sharp, mobile-first, no watermarks, no stock-photo logos.',
    `Use case: ${formatLabel(snapshot.formatId)} (${aspect}).`,
    `Visual style: ${styleLabel(snapshot.style)}. ${STYLE_HINT[snapshot.style] ?? STYLE_HINT.auto}`,
    DENSITY_HINT[snapshot.textDensity] ?? DENSITY_HINT.balanced,
    kit?.tone ? `Brand tone of voice: ${kit.tone}` : null,
    colors ? `Follow this brand palette in backgrounds, accents and props: ${colors}.` : null,
    kit?.fonts?.heading ? `Prefer a ${kit.fonts.heading}-like heading feel.` : null,
    'Do NOT write internal labels on the image: never paint brand-kit titles, "marka kiti", "brand kit", "kampanya kiti", or similar meta text.',
    snapshot.useLogo
      ? 'STRICT LOGO FIDELITY: A real company logo image is attached as a reference. Place that exact logo cleanly without any modification, restyling, or variation. Keep its exact proportions, geometry, emblem shape, and brand colors. NEVER invent a different logo, NEVER stylize or morph the logo, and NEVER replace the logo with typed text.'
      : 'Do not invent fake logos. Do not type a brand name as a fake logo unless the advertiser brief explicitly asks for the business name as headline text.',
    snapshot.baseCreativeId
      ? 'A base/reference campaign image is attached. Keep the exact same product and brand identity; apply the requested change.'
      : null,
    snapshot.instruction ? `Revision instruction (must follow): ${snapshot.instruction}` : null,
    variation ? `Variation direction: ${variation}. Same offer, different composition.` : null,
    `Campaign brief from the advertiser (do not add facts they did not give): ${snapshot.brief}`,
    productBlocks.length ? `Products:\n${productBlocks.join('\n')}` : 'No specific product catalog items.',
    'STRICT PRODUCT FIDELITY: The real product photo is provided as a reference. You must preserve the real physical product exactly as shown: exact shape, casing, components, buttons, materials, and colors. Do NOT mutate the product, do NOT invent fantasy product variations, do NOT change the product design, and do NOT replace the product with a generic item.',
    contacts.length
      ? `Contact lines that may appear on the creative if text is used: ${contacts.join(' · ')}`
      : null,
    extras.length ? extras.join(' ') : null,
    'Do not invent prices, discounts, slogans, dates, product names or brand claims that are not in this brief.',
    'Do not replace products with different products. Preserve packaging and product shape from reference photos with 100% fidelity.',
    'Clean visual hierarchy. One focal offer. Not cluttered. Readable on a phone screen.',
  ]
    .filter(Boolean)
    .join('\n')

  const negative = [
    'no extra products that were not listed',
    'no fake logos',
    'no distorted logo',
    'no modified logo',
    'no logo variations',
    'no redesigned brand logo',
    'no wrong brand colors',
    'no morphed product',
    'no deformed product design',
    'no fantasy product variations',
    'no generic product replacement',
    'no unreadable micro-text',
    'no watermarks',
    'no misspelled brand names',
    'no text saying marka kiti',
    'no text saying brand kit',
    'no campaign kit title overlays',
  ].join(', ')

  return { prompt, negative }
}

const VIDEO_STYLE_MOODS: Record<string, string> = {
  luxury: 'Ultra-luxurious atmosphere, moody directional lighting, rich shadows, warm specular highlights, whisper-quiet elegance.',
  premium: 'High-end commercial aesthetic, refined balanced lighting, rich tactile textures, authoritative craftsmanship.',
  modern: 'Contemporary commercial look, pristine natural daylight, clean architectural lines, bright vivid tones, crisp focus.',
  minimal: 'Pure minimalist aesthetic, serene spacious environment, elegant simplicity, soft diffused illumination.',
  energetic: 'Dynamic movement, high contrast, vibrant saturated tones, intense lighting, fast-paced cinematic energy.',
  food: 'Mouth-watering commercial culinary mood, warm soft light, glistening textures, fresh appetizing atmosphere.',
  corporate: 'Trustworthy, clean, professional, pristine high-end industrial or office setting, steady measured camera.',
  fun: 'Vibrant, bright, upbeat, cheerful commercial lighting, lively color balance.',
  auto: 'High-end commercial marketing aesthetic, pristine professional lighting, natural color fidelity.',
}

/**
 * Structured brief → High-fidelity cinematic 3-act live-action commercial video prompt (Veo / AI Video).
 * Matches the deep detail, brand kit integration, and style fidelity of the image generation engine.
 * Guaranteed ZERO on-screen text, ZERO logo cards, ZERO graphic overlays.
 */
export function buildVideoPrompt(snapshot: CreativeSnapshot): {
  prompt: string
  negative: string
  overlay: {
    brandName: string
    subTitle?: string
    offerTitle?: string
    offerDetails?: string
    ctaText?: string
    primaryColor?: string
    accentColor?: string
  }
} {
  const kit = snapshot.brandKit
  const brandName = kit?.name?.replace(/Brand Kit/i, '').replace(/Kampanya Kiti/i, '').trim() || ''
  const mainProduct = snapshot.products[0]
  const productName = mainProduct?.name || 'Ürün'

  // 1. Tüm ürünlerin zengin katalog bilgilerini derle
  const productBlocks = snapshot.products.map((product, index) => {
    const bits: string[] = [`Ürün ${index + 1}: ${product.name}`]
    if (product.description) bits.push(product.description)
    if (product.boxContents) bits.push(`Kutu içeriği: ${product.boxContents}`)
    if (product.price || product.oldPrice) {
      bits.push(
        `Fiyat: ${product.price || '—'} ${product.oldPrice ? `(Eski fiyat: ${product.oldPrice})` : ''}`.trim(),
      )
    }
    if (product.promo) bits.push(`Kampanya: ${product.promo}`)
    if (product.extra) bits.push(product.extra)
    return bits.join('. ')
  })

  // 2. Kampanya bağlamı ve ek ayrıntılar
  const campaignContext: string[] = []
  if (snapshot.brief) campaignContext.push(`Kampanya Konsepti: ${snapshot.brief.trim()}`)
  if (snapshot.customText) campaignContext.push(`Özel Kampanya Duyurusu / Slogan: ${snapshot.customText.trim()}`)
  if (snapshot.dateRange) campaignContext.push(`Kampanya Süresi: ${snapshot.dateRange.trim()}`)
  if (snapshot.labels.length) campaignContext.push(`Öne Çıkan Rozetler: ${snapshot.labels.join(', ')}`)
  if (snapshot.cta) campaignContext.push(`Harekete Geçirici Çağrı (CTA): ${snapshot.cta.trim()}`)
  if (snapshot.phones.length) {
    campaignContext.push(`WhatsApp Sipariş Hattı: ${snapshot.phones.map((p) => p.phone).join(', ')}`)
  }

  const fullContext = [
    productBlocks.join(' '),
    snapshot.brief || '',
    snapshot.customText || '',
    snapshot.labels.join(' '),
    kit?.tone || '',
  ]
    .join(' ')
    .toLowerCase()

  // 3. Sektöre ve ürüne göre gerçekçi sinematik ortam tespiti
  let environment = 'profesyonel, aydınlık ve modern bir ticari reklam çekim ortamı'
  let act1Focus = `${productName} yüzeyindeki doğal malzeme dokusu, birinci sınıf işçilik ve kusursuz detaylar`
  let act2Action = `${productName} ürününün gerçek kullanım anı, işlevi ve yüksek dayanıklılığı`
  let act3Climax = `${productName} ürününün yer aldığı kusursuz, tamamlanmış ve güven veren geniş açı son sahne`

  if (fullContext.includes('veri') || fullContext.includes('data') || fullContext.includes('yazılım') || fullContext.includes('b2b') || fullContext.includes('platform') || fullContext.includes('istihbarat') || fullContext.includes('leads') || fullContext.includes('crm') || fullContext.includes('analiz') || fullContext.includes('şirket takip') || fullContext.includes('bilişim')) {
    environment = 'modern, aydınlık ve fütüristik bir cam gökdelen ofisi ve teknoloji veri analitiği merkezi'
    act1Focus = 'ince çerçeveli dizüstü bilgisayar ekranında canlı akan veri grafikleri, harita üzerinde parıldayan yeni işletme bildirimleri'
    act2Action = 'kullanıcının onaylı şirket iletişim bilgilerine tek tıkla ulaşması, sıcak potansiyel müşterilere WhatsApp ile anında teklif sunuşu'
    act3Climax = 'panoramik şehir manzarası önünde yükselen başarı grafikleri ve güven veren prestijli kurumsal teknoloji vitrini'
  } else if (fullContext.includes('tuğla') || fullContext.includes('inşaat') || fullContext.includes('yapı') || fullContext.includes('harç') || fullContext.includes('çimento') || fullContext.includes('boya') || fullContext.includes('fayans') || fullContext.includes('seramik') || fullContext.includes('mermer') || fullContext.includes('çatı')) {
    environment = 'modern bir mimari yapı projesi ve gün ışığında estetik şantiye ortamı'
    act1Focus = 'doğal killi yapı malzemesinin nizami dizilimi, pürüzsüz yüzey dokusu ve sağlam kütlesi'
    act2Action = 'ustalıkla örülen modern ve estetik duvar mimarisi, malzemenin kusursuz yerleşimi'
    act3Climax = 'yeni tamamlanmış çağdaş ve estetik bir mimari yapının güven veren heybetli dış cephesi'
  } else if (fullContext.includes('yemek') || fullContext.includes('gıda') || fullContext.includes('restoran') || fullContext.includes('kahve') || fullContext.includes('kahvaltı') || fullContext.includes('pasta') || fullContext.includes('döner') || fullContext.includes('burger') || fullContext.includes('tatlı') || fullContext.includes('fırın') || fullContext.includes('çikolata')) {
    environment = 'şık, sıcak ve samimi bir gourmet mutfak ve ahşap sunum masası'
    act1Focus = 'taptaze malzemelerin iştah açıcı mikro dokusu, buharı ve canlı renkleri'
    act2Action = 'yemeğin ustalıkla hazırlanışı, sıcak servis anı ve lezzetli sunum detayı'
    act3Climax = 'tüm ziyafet masasını ve davetkâr lezzetleri sergileyen sıcak ışıklı geniş açı sahne'
  } else if (fullContext.includes('pompa') || fullContext.includes('tarım') || fullContext.includes('ilaçlama') || fullContext.includes('traktör') || fullContext.includes('hasat') || fullContext.includes('tohum') || fullContext.includes('fidan') || fullContext.includes('gübre') || fullContext.includes('bahçe')) {
    environment = 'güneşli, bereketli bir tarım arazisi ve yemyeşil meyve bahçesi'
    act1Focus = 'ürünün dayanıklı gövdesi, kaliteli malzeme detayları ve ergonomik formu'
    act2Action = 'ürünün arazideki akıcı ve verimli çalışma performansı, bitkilerle uyumu'
    act3Climax = 'bereketli tarlaları ve ürünün doğadaki kusursuz katkısını gösteren geniş açı plan'
  } else if (fullContext.includes('mobilya') || fullContext.includes('dekorasyon') || fullContext.includes('koltuk') || fullContext.includes('ahşap') || fullContext.includes('yatak') || fullContext.includes('dolap') || fullContext.includes('masa') || fullContext.includes('halı')) {
    environment = 'doğal güneş ışığı alan modern, minimalist ve ferah bir iç mekan yaşam alanı'
    act1Focus = 'kumaş ve ahşap malzemenin zarif dokuma detayları, dikiş kalitesi ve pürüzsüz cila'
    act2Action = 'mobilyanın yaşam alanına kattığı konfor, zarafet ve fonksiyonellik'
    act3Climax = 'tüm odayı ve mobilyanın uyumunu sergileyen ilham verici geniş salon sahnesi'
  } else if (fullContext.includes('giyim') || fullContext.includes('moda') || fullContext.includes('ayakkabı') || fullContext.includes('çanta') || fullContext.includes('butik') || fullContext.includes('elbise') || fullContext.includes('ceket')) {
    environment = 'modern bir moda stüdyosu veya şık bir şehir caddesi'
    act1Focus = 'kumaşın kaliteli dokuması, zarif dikiş hatları ve birinci sınıf malzeme parlaklığı'
    act2Action = 'ürünün üzerdeki dinamik duruşu, akıcı kumaş hareketi ve şık tasarım çizgisi'
    act3Climax = 'tüm kombini ve stil sahibi duruşu öne çıkaran sinematik podyum / cadde planı'
  } else if (fullContext.includes('kozmetik') || fullContext.includes('parfüm') || fullContext.includes('güzellik') || fullContext.includes('cilt') || fullContext.includes('bakım') || fullContext.includes('krem') || fullContext.includes('serum')) {
    environment = 'aydınlık, ferah ve lüks bir spa veya minimalist banyo atmosferi'
    act1Focus = 'şişenin cam yansımaları, mikro damlacık dokusu ve ürünün berrak saf kıvamı'
    act2Action = 'ürünün cilde nazikçe uygulanışı, kadifemsi emilişi ve ışıltılı tazeliği'
    act3Climax = 'ürünü ve tazeleyici saf güzellik hissini yansıtan zarif soft ışıklı geniş plan'
  } else if (fullContext.includes('elektronik') || fullContext.includes('telefon') || fullContext.includes('bilgisayar') || fullContext.includes('kulaklık') || fullContext.includes('cihaz') || fullContext.includes('teknoloji') || fullContext.includes('akıllı')) {
    environment = 'fütüristik, minimalist ve modern bir teknoloji stüdyosu'
    act1Focus = 'ürünün mat metalik kaplaması, mikro hassas kenarları ve kusursuz montajı'
    act2Action = 'cihazın akıcı kullanımı, parlak ekran netliği ve ergonomik kontrolü'
    act3Climax = 'ürünün şık tasarımını ve ileri mühendisliğini sergileyen dramatik stüdyo planı'
  } else if (fullContext.includes('otomotiv') || fullContext.includes('araç') || fullContext.includes('araba') || fullContext.includes('oto') || fullContext.includes('lastik') || fullContext.includes('servis') || fullContext.includes('yıkama') || fullContext.includes('yedek parça')) {
    environment = 'modern bir showroom veya gün batımında akıcı asfalt sahil yolu'
    act1Focus = 'parlatılmış gövdenin metalik yansımaları, aerodinamik hatlar ve işçilik kalitesi'
    act2Action = 'aracın yoldaki akıcı ve güven veren sürüş performansı, dinamik tekerlek dönüşü'
    act3Climax = 'aracın heybetli duruşunu ve yoldaki asaleti sergileyen sinematik geniş takip planı'
  } else if (fullContext.includes('temizlik') || fullContext.includes('deterjan') || fullContext.includes('hijyen') || fullContext.includes('yıkama') || fullContext.includes('dezenfektan')) {
    environment = 'pırıl pırıl, aydınlık ve ferah bir ev ortamı'
    act1Focus = 'ürünün aktif formülü, köpük dokusu ve ferahlatıcı mikro tanecikleri'
    act2Action = 'yüzeyin zahmetsizce temizlenişi, ardında bıraktığı ışıl ışıl ayna gibi parlaklık'
    act3Climax = 'tertemiz, kusursuz ve hijyenik yaşam alanını gösteren aydınlık geniş plan'
  } else if (fullContext.includes('takı') || fullContext.includes('mücevher') || fullContext.includes('saat') || fullContext.includes('altın') || fullContext.includes('pırlanta') || fullContext.includes('gümüş') || fullContext.includes('kolye') || fullContext.includes('yüzük') || fullContext.includes('bileklik')) {
    environment = 'karanlık ve lüks bir mücevher stüdyosu, kadife zemin ve odaklanmış kristal spot ışıkları'
    act1Focus = 'değerli taşların ve parlatılmış metalin mikro prizmatik ışık kırılmaları, kusursuz faset kesimleri ve lüks yansımaları'
    act2Action = 'mücevherin zarif bir ışık hüzmesi altında yavaşça dönmesi, ışıltının her açıdan parıldayan büyüleyici dansı'
    act3Climax = 'ürünün tüm asaleti ve prestijini gözler önüne seren nefes kesici lüks hero planı'
  } else if (fullContext.includes('spor') || fullContext.includes('fitness') || fullContext.includes('gym') || fullContext.includes('antrenman') || fullContext.includes('outdoor') || fullContext.includes('kamp') || fullContext.includes('koşu') || fullContext.includes('protein') || fullContext.includes('bisiklet')) {
    environment = 'modern, dinamik ve enerjik bir fitness kulübü veya gün doğumunda sisli bir dağ patikası'
    act1Focus = 'ürünün nefes alan aerodinamik teknik dokusu, sağlam dikişleri ve yüksek performanslı malzemesi'
    act2Action = 'ürünün dinamik hareket anındaki esnekliği ve gücü, 120fps ağır çekim ile performans detayı'
    act3Climax = 'ürünün kazandırdığı motivasyonu, dinamizmi ve üstün performansı yansıtan güçlü geniş açı'
  } else if (fullContext.includes('sağlık') || fullContext.includes('medikal') || fullContext.includes('diş') || fullContext.includes('klinik') || fullContext.includes('optik') || fullContext.includes('gözlük') || fullContext.includes('eczane') || fullContext.includes('doktor')) {
    environment = 'tertemiz, aydınlık, beyaz ve güven verici bir modern klinik veya optik stüdyosu'
    act1Focus = 'ürünün steril, medikal kalitede pürüzsüz yüzeyi, ergonomik hatları ve hassas mühendisliği'
    act2Action = 'ürünün güven ve konfor sağlayan pratik kullanımı, hassas ve profesyonel dokunuşlar'
    act3Climax = 'ferah, sağlıklı ve güven veren bir atmosferde ürünün estetiğini sergileyen berrak plan'
  } else if (fullContext.includes('emlak') || fullContext.includes('gayrimenkul') || fullContext.includes('villa') || fullContext.includes('daire') || fullContext.includes('rezidans') || fullContext.includes('konut') || fullContext.includes('arsa')) {
    environment = 'gün batımında havuzlu modern bir lüks villa veya panoramik manzaralı rezidans terası'
    act1Focus = 'geniş cam cepheler, mermer zeminler ve birinci sınıf mimari malzeme detayları'
    act2Action = 'iç mekandan gün batımı manzarasına doğru süzülen akıcı ve ferah gimbal / slider çekimi'
    act3Climax = 'yapının ışıklandırılmış heybetli ve büyüleyici akşam siluetini gösteren sinematik geniş açı'
  } else if (fullContext.includes('eğitim') || fullContext.includes('kitap') || fullContext.includes('kırtasiye') || fullContext.includes('sanat') || fullContext.includes('hobi') || fullContext.includes('kurs') || fullContext.includes('okul')) {
    environment = 'sıcak ahşap raflı modern bir kütüphane veya aydınlık, ilham dolu bir tasarım atölyesi'
    act1Focus = 'kaliteli kâğıdın mikro dokusu, kabartma kapak işçiliği veya boya pigmentlerinin canlı renkleri'
    act2Action = 'sayfaların veya fırça darbelerinin akıcı, ilham verici hareketi, odaklanmış yaratıcı an'
    act3Climax = 'tüm çalışma masasını ve yaratıcı atmosferi kucaklayan sıcak ve dingin geniş sahne'
  }

  const styleMood = VIDEO_STYLE_MOODS[snapshot.style] || VIDEO_STYLE_MOODS.auto
  const toneDesc = kit?.tone ? `Marka tonu: ${kit.tone}.` : ''

  // 4. Ses / Konuşma Kurgusu (Voiceover vs Silent Instrumental)
  const isSpeechEnabled = snapshot.videoSpeech !== false
  const voiceSection = isSpeechEnabled
    ? `SESLENDİRME VE TÜRKÇE REKLAM DIŞ SESİ (VOICEOVER NARRATION): Profesyonel, etkileyici ve akıcı bir Türkçe reklam spikeri dış sesi (voiceover). Reklam filmi sahneleriyle senkronize anlatım: SAHNE 1: "${productName} ile tanışın!". SAHNE 2: "${snapshot.brief || mainProduct?.promo || 'Üstün kalite ve özel kampanya avantajları'}". SAHNE 3: "${snapshot.cta || 'Fırsatı kaçırmayın, hemen iletişime geçin!'}". Net stüdyo ses kaydı, sinematik reklam müziği ve gerçekçi ses efektleri (foley).`
    : `SES DÜZENİ (KONUŞMASIZ & SADECE FON MÜZİĞİ VE SES EFEKTLERİ): Videoda KESİNLİKLE hiçbir insan konuşması, dış ses, seslendirme veya diyalog OLMAYACAKTIR. STRICT RULE: NO VOICE, NO SPEECH, NO SPOKEN WORDS, NO DIALOGUE. Sadece sahneye uygun yüksek kaliteli ortam ses efektleri (foley) ve arka planda modern reklam fon müziği.`

  const prompt = [
    `9:16 dikey formatta üst düzey televizyon ve sinematik sosyal medya reklam filmi (Instagram Reels & WhatsApp Durum).`,
    brandName ? `Marka: ${brandName}.` : null,
    `Ürün: ${productName}.`,
    productBlocks.length ? `Ürün Kataloğu ve Detayları:\n${productBlocks.join('\n')}` : null,
    campaignContext.length ? `Kampanya Ayrıntıları:\n${campaignContext.join('\n')}` : null,
    `Çekim Ortamı: ${environment}.`,
    `Görsel Stil ve Işık Atmosferi: ${styleMood} ${toneDesc}`,
    `Sinematografi ve Kamera: Shot on Arri Alexa Mini LF, Master Prime 100mm macro & 35mm sinema lensleri. 180 derece obtüratör açısı, akıcı gimbal ve slider hareketleri, doğal sığ alan derinliği (f/1.8), zarif sinematik bokeh. 4K HDR fotogerçekçi reklam ajansı renk derecelendirmesi (color grading).`,
    `SAHNE 1 (0-3sn - MAKRO TANITIM): Kamera aşırı yakın plan makro odakla yaklaşır. ${act1Focus}. Işığın yüzeyde yarattığı yumuşak yansımalar ve birinci sınıf işçilik ön plandadır.`,
    `SAHNE 2 (3-7sn - DİNAMİK KULLANIM & İŞLEV): Kamera akıcı bir gimbal kaymasıyla sahneye genişler. ${act2Action}. 120fps ağır çekim ile ürünün performansı ve gerçek hayat ortamındaki güvenilirliği sergilenir.`,
    `SAHNE 3 (7-10sn - KAHRAMAN FİNAL REVEAL): Kamera geriye ve hafif yukarı doğru yükselerek kahraman (hero) planına geçer. ${act3Climax}. İlham verici altın saat ışığı, sıcak kontrastlar, üstün kalite hissi.`,
    voiceSection,
    `ÖNEMLİ VE KESİN KURAL 1 (SIFIR METİN & CANLI ÇEKİM): Videoda KESİNLİKLE hiçbir yazı, metin, altyazı, logo kartı, bilgi kutusu veya grafik overlay OLMAYACAKTIR. Ekranda sadece %100 saf, temiz ve sinematik canlı çekim video görüntüsü olacaktır. Tam ekran temiz sinema karesi. STRICT RULE: NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO SUBTITLES, NO CAPTIONS, NO ON-SCREEN TEXT, NO LOGO CARDS, NO GRAPHIC OVERLAYS, NO BANNERS, NO LOWER THIRDS. Pure clean cinematic live-action commercial footage only.`,
    `ÖNEMLİ VE KESİN KURAL 2 (MARKA VE ÜRÜN DOKUNULMAZLIĞI): Marka logosu, amblemi, renkleri ve gerçek ürün tasarımı üzerinde KESİNLİKLE hiçbir oynama, değişiklik, deformasyon veya varyasyon YAPILMAYACAKTIR. Ürünün gerçek fiziksel kasası, formu, renkleri ve amblemi %100 birebir korunacaktır. Hayali veya dönüştürülmüş ürün varyasyonları kesinlikle üretilmeyecektir. STRICT MANDATE: ZERO ALTERATION TO BRAND LOGO OR PRODUCT IDENTITY. PRESERVE ORIGINAL EMBLEM, COLORS, AND PHYSICAL PRODUCT FORM EXACTLY. NO PRODUCT MORPHING, NO LOGO REINVENTION.`,
  ]
    .filter(Boolean)
    .join('\n')

  const negative = [
    'text, words, letters, typography, watermark, logo overlay, graphic box, lower third, subtitles, captions, banner, card',
    'cartoon, 3D animation look, cgi render, uncanny valley, deformed hands, distorted geometry',
    'distorted logo, modified logo, altered logo, logo variations, redesigned logo, wrong brand colors',
    'morphed product, deformed product, altered product design, fantasy product variations, generic product replacement',
    'blurry artifacts, low quality, pixelated, amateur video, jump cuts, jerky camera',
  ].join(', ')

  const offerTitle = snapshot.brief || 'ÖZEL KAMPANYA'
  const offerDetails =
    mainProduct?.promo || (mainProduct?.price ? `Fiyat: ${mainProduct.price}` : snapshot.customText || '')
  const ctaText =
    snapshot.cta ||
    (snapshot.phones?.[0]?.phone ? `WHATSAPP: ${snapshot.phones[0].phone}` : 'WHATSAPP SIPARIS HATTI')

  return {
    prompt,
    negative,
    overlay: {
      brandName,
      subTitle: kit?.tone ? kit.tone.slice(0, 35) : 'Yetkili Satış & Sipariş',
      offerTitle,
      offerDetails,
      ctaText,
      primaryColor: kit?.colors?.background || kit?.colors?.primary || '#026009',
      accentColor: kit?.colors?.accent || '#acfe00',
    },
  }
}
