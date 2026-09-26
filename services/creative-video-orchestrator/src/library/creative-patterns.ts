/**
 * Creative Ad Archetypes & Performance Patterns
 * Synthesized from:
 * - TikTok Creative Center (Top Ads: 2s View, CTR, Hook Dropoff patterns)
 * - Meta Ad Library (Proven winning commercial formats)
 * - awesome-ad-video-prompts (52 high-craft prompts across 10 categories)
 * - cinematic-ai-prompts (35mm lens, directional lighting, Veo 3.1 parameters)
 * - Google Gen V & AdFlow (Zero-text raw diffusion + deterministic post-production)
 */

export interface CreativeBeatSpec {
  timing: string // e.g. "0-2s", "2-5s", "5-8s"
  purpose: 'HOOK' | 'SENSORY_PROOF' | 'BRAND_LOCK'
  cameraMove: string
  lightingMood: string
  actionTemplate: (productName: string, environment: string, brandName: string) => string
}

export interface CreativeArchetype {
  id: string
  name: string
  description: string
  category: 'product_showcase' | 'construction' | 'agriculture' | 'ugc' | 'fast_sales' | 'problem_solution' | 'luxury' | 'food' | 'software'
  recommendedSectors: string[]
  beats: [CreativeBeatSpec, CreativeBeatSpec, CreativeBeatSpec]
  physicsGuard: (productName: string) => string
  impliedFoley: string
  defaultNegativePrompt: string
}

export const STRICT_ZERO_TEXT_NEGATIVES = [
  'text overlays',
  'subtitles',
  'captions',
  'on-screen text',
  'words on screen',
  'burned-in typography',
  'lower third graphics',
  'synthetic titles',
  'credits',
  'labels',
  'annotations',
  'floating interface',
  'watermark',
  'logos',
  'invented brand names',
  'gibberish lettering',
  'duplicate product',
  'warped geometry',
  'melting',
  'flicker',
  'identity drift',
  'extra limbs',
  'deformed hands'
].join(', ')

export const CREATIVE_ARCHETYPES: Record<string, CreativeArchetype> = {
  // 1. INSAAT & YAPI MALZEMELERI (Tugla, Briket, Harc, Yapi Kimyasallari)
  CONSTRUCTION_MATERIAL: {
    id: 'CONSTRUCTION_MATERIAL',
    name: 'Endüstriyel Yapı & Malzeme Güvencesi',
    description: 'Şantiye ve lojistik sahasında tek eksenli ürün doğruluğu, palet düzeni ve usta işçilik kanıtı.',
    category: 'construction',
    recommendedSectors: ['construction', 'inşaat', 'yapı', 'tuğla', 'lojistik', 'nalburiye'],
    beats: [
      {
        timing: '0-2s',
        purpose: 'HOOK',
        cameraMove: 'Düşük açıdan 35mm pürüzsüz slider yaklaşımı',
        lightingMood: 'Net doğal sabah güneş ışığı, sert gölgeler, endüstriyel netlik',
        actionTemplate: (product, env, brand) =>
          `Sevkiyata hazır ahşap palet üzerinde dizili ${product} merkezdedir; pürüzsüz kamera ürüne doğru yaklaşırken pişmiş kil dokusu ve sağlam köşe hatları keskinleşir.`
      },
      {
        timing: '2-5s',
        purpose: 'SENSORY_PROOF',
        cameraMove: 'Sabit kontrollü 3/4 vitrin açısı, sarsıntısız akış',
        lightingMood: 'Doğal açık hava aydınlatması',
        actionTemplate: (product, env, brand) =>
          `Arka planda düzenli şantiye operasyonu ve baretli lojistik ustası güven verirken, kamera ${product} ürününün sağlam ve nizami formunu sergiler; malzeme ağırlığı ve gerçek yüzey dokusu hissedilir.`
      },
      {
        timing: '5-8s',
        purpose: 'BRAND_LOCK',
        cameraMove: 'Göz hizasında durağan ve prestijli hero kadrajı',
        lightingMood: 'Altın saat gün ışığı vurumu',
        actionTemplate: (product, env, brand) =>
          `Kamera ${product} üzerinde dengeli, temiz ve net bir şekilde sabitlenir; doğrudan ve yazısız hero ürün kapanışı.`
      }
    ],
    physicsGuard: (product) =>
      `Kanonik ${product} geometrisi video boyunca birebir korunur: Delikli tuğla yapısında boşluklar kesinlikle yalnızca tek eksen üzerinde (iki karşılıklı uç yüzeyde) bulunur. Üst yüzey, alt yüzey ve iki uzun yan yüzey KESİNLİKLE deliksiz, pürüzsüz yivli masif kil yüzeydir. Yan yüzeylerde veya üstte fazladan delik, çatlak, erime veya geometri sapması üretilmez.`,
    impliedFoley: 'Ağır seramik dokunuş sesi, hafif rüzgar esintisi, uzaktan gelen doğal şantiye ambiyansı',
    defaultNegativePrompt: `${STRICT_ZERO_TEXT_NEGATIVES}, holes on side surfaces, perforations on multiple faces, side cavities, holes on top surface while front also has holes, warped brick corners`
  },

  // 2. TARIM & ZIRAAT EKIPMANLARI (Ilac Pompasi, Pulverizator, Damlama Sulama, Gubre)
  AGRICULTURE_EQUIPMENT: {
    id: 'AGRICULTURE_EQUIPMENT',
    name: 'Tarım & Saha Performansı',
    description: 'Açık tarla veya sera bağlamında otantik ürün gövdesi, hassas nozul püskürtmesi ve dayanıklılık.',
    category: 'agriculture',
    recommendedSectors: ['agriculture', 'tarım', 'ziraat', 'bahçe', 'sera', 'sulama'],
    beats: [
      {
        timing: '0-2s',
        purpose: 'HOOK',
        cameraMove: 'Geniş açıdan ürünün sağlam gövdesine odaklanan akıcı kayma',
        lightingMood: 'Açık gökyüzü doğal güneş ışığı, canlı doğal renkler',
        actionTemplate: (product, env, brand) =>
          `Doğal tarım ve çalışma sahasında ${product} merkezdedir; pürüzsüz kamera ürüne yaklaşırken sağlam gövde yapısı, hortum ve paslanmaz püskürtme borusu berrakça seçilir.`
      },
      {
        timing: '2-5s',
        purpose: 'SENSORY_PROOF',
        cameraMove: 'Orta plandan hassas nozul ucuna odaklanan kontrollü açı',
        lightingMood: 'Güneş ışığının su damlacıklarında parıldadığı ters ışık',
        actionTemplate: (product, env, brand) =>
          `Pirinç püskürtme nozulundan çıkan homojen mikronize ilaçlama sisi bitki yaprakları üzerine eşit şekilde dağılır; ${product} sarsıntısız ve yüksek basınçlı çalışma stabilitesini kanıtlar.`
      },
      {
        timing: '5-8s',
        purpose: 'BRAND_LOCK',
        cameraMove: 'Sabit ve güven veren üç çeyrek hero kapanışı',
        lightingMood: 'Dengeli berrak gün ışığı',
        actionTemplate: (product, env, brand) =>
          `${product} dik ve dengeli konumda, tüm aksesuarlarıyla birlikte temiz ve yazısız bir şekilde kadrajda sabitlenir.`
      }
    ],
    physicsGuard: (product) =>
      `${product} gövde rengi, tank silüeti, sırt askı detayları ve pirinç nozul geometrisi referans fotoğrafa birebir sadık kalır. Şişe veya tank yüzeyinde uydurma etiket, deformasyon, sızıntı veya form erimesi meydana gelmez.`,
    impliedFoley: 'Basınçlı nozul püskürtme tıslaması, yapraklara konan ince su sisi fısıltısı, hafif bahçe esintisi',
    defaultNegativePrompt: `${STRICT_ZERO_TEXT_NEGATIVES}, leaking tank, warped plastic, detached hose, floating text, phantom labels`
  },

  // 3. FAST SALES & TOPTAN/PERAKENDE (Hızlı Gönderi, Stoktan Teslimat)
  FAST_SALES_SPEED: {
    id: 'FAST_SALES_SPEED',
    name: 'Hızlı Teslimat & Doğrudan Satış',
    description: 'Düzenli depo ve sevkiyat operasyonu ile hızlı teslimat ve stok güvencesi hissettiren dinamik akış.',
    category: 'fast_sales',
    recommendedSectors: ['toptan', 'retail', 'e-commerce', 'satış', 'hırdavat', 'ambalaj'],
    beats: [
      {
        timing: '0-2s',
        purpose: 'HOOK',
        cameraMove: 'Hızlı ve dinamik 35mm push-in',
        lightingMood: 'Aydınlık modern depo aydınlatması',
        actionTemplate: (product, env, brand) =>
          `Dinamik ve akıcı kamera hareketi sevkiyata hazır, korumalı ambalajındaki ${product} üzerinde başlar.`
      },
      {
        timing: '2-5s',
        purpose: 'SENSORY_PROOF',
        cameraMove: 'Akıcı yatay takip ve derinlik vurgusu',
        lightingMood: 'Profesyonel kurumsal ışık',
        actionTemplate: (product, env, brand) =>
          `Operasyon sahasında düzenli sevkiyat akışı içinde ürünün hızlı teslimat güvenini ve kurumsal kalite kontrolünü hissettiren kesintisiz akış.`
      },
      {
        timing: '5-8s',
        purpose: 'BRAND_LOCK',
        cameraMove: 'Kararlı merkezleme',
        lightingMood: 'Sıcak kapanış ışığı',
        actionTemplate: (product, env, brand) =>
          `${product} merkezde; yazısız, temiz, net ve doğrudan kapanış kadrajı.`
      }
    ],
    physicsGuard: (product) =>
      `${product} ambalajı, kutu formu ve ürün silüeti tam olarak korunur. Yabancı marka veya uydurma barkod üretilmez.`,
    impliedFoley: 'Koli bandı kayma sesi, hafif forklift mekanik sesi, tok kutu yerleştirme sesi',
    defaultNegativePrompt: `${STRICT_ZERO_TEXT_NEGATIVES}, broken package, crushed box, deformed product`
  },

  // 4. RESTORAN & GIDA (Doner, Burger, Kahve, Unlu Mamuller)
  FOOD_BEVERAGE_SENSORY: {
    id: 'FOOD_BEVERAGE_SENSORY',
    name: 'İştah Açıcı Gıda & Gastronomi',
    description: 'Duman, buhar, sulu dokular, taze malzeme kesimi ve sıcacık sunum anı.',
    category: 'food',
    recommendedSectors: ['food', 'gıda', 'restaurant', 'döner', 'kafe', 'tatlı', 'fırın'],
    beats: [
      {
        timing: '0-2s',
        purpose: 'HOOK',
        cameraMove: 'Ekstrem makro push-in ve hafif yukarı tilt',
        lightingMood: 'Sıcak iştah açıcı stüdyo ışığı, dumanı aydınlatan arka ters ışık',
        actionTemplate: (product, env, brand) =>
          `Taptaze ve sıcacık ${product} üzerinden hafifçe tüten dumanlar yükselirken, makro kamera lezzetli çıtır dokuyu ve sos parlaklığını yakından yakalar.`
      },
      {
        timing: '2-5s',
        purpose: 'SENSORY_PROOF',
        cameraMove: 'Yumuşak 45 derece orbital süzülüş',
        lightingMood: 'Doğal sıcak gün ışığı ile dengeli dolgu ışığı',
        actionTemplate: (product, env, brand) =>
          `${product} tabağında veya sunum tezgahında tüm zengin malzemeleri ve taze garnitürleriyle kusursuz bir gastronomi deneyimi sergiler.`
      },
      {
        timing: '5-8s',
        purpose: 'BRAND_LOCK',
        cameraMove: 'Masif ahşap sunum tahtasında sabitlenen hero kadraj',
        lightingMood: 'Işıltılı şef masası ambiyansı',
        actionTemplate: (product, env, brand) =>
          `${product} merkezde mükemmel iştah kabartıcı son karesinde sabitlenir; arkada hafif bokehli şık restoran ortamı.`
      }
    ],
    physicsGuard: (product) =>
      `Yiyecek dokusu gerçekçi viskozitede kalır, erime veya yapay piksellenme olmaz, porsiyon oranları ve sos akışkanlığı doğal fizik kurallarına uyar.`,
    impliedFoley: 'Cızırdayan sıcak et veya ekmek çıtırtısı, hafif tabak çatal tınısı, iştah açıcı sunum sesi',
    defaultNegativePrompt: `${STRICT_ZERO_TEXT_NEGATIVES}, unappetizing textures, burnt food, plastic appearance, floating text`
  },

  // 5. YAZILIM & SAAS (Dashboard, CRM, Otomasyon, B2B Platformlar)
  SOFTWARE_SAAS_FLOW: {
    id: 'SOFTWARE_SAAS_FLOW',
    name: 'Modern Yazılım & Dijital Çözüm',
    description: 'Aydınlık ofiste modern monitör, pürüzsüz arayüz gezinimi ve tek tıkla iş bitirme rahatlığı.',
    category: 'software',
    recommendedSectors: ['software', 'saas', 'yazılım', 'b2b', 'crm', 'otomasyon', 'fintech'],
    beats: [
      {
        timing: '0-2s',
        purpose: 'HOOK',
        cameraMove: 'Göz hizasında modern monitör ekranına doğru pürüzsüz yaklaşma',
        lightingMood: 'Modern difüze ofis gün ışığı, ferah ve temiz atmosfer',
        actionTemplate: (product, env, brand) =>
          `Aydınlık ve düzenli bir çalışma masasında, ince çerçeveli yüksek çözünürlüklü ekranda ${product} arayüzü açılır; temiz ve ferah grafikler hemen dikkat çeker.`
      },
      {
        timing: '2-5s',
        purpose: 'SENSORY_PROOF',
        cameraMove: 'Hafif 3/4 omuz üstü perspektifi, doğal kullanıcı deneyimi',
        lightingMood: 'Ekran parlaklığı ile uyumlu doğal çalışma ışığı',
        actionTemplate: (product, env, brand) =>
          `Kullanıcı imleci zahmetsizce tek bir butona tıklar ve karmaşık işlemler anında organize dashboard özetine dönüşür; sistemin hızı ve kolaylığı ekranda kanıtlanır.`
      },
      {
        timing: '5-8s',
        purpose: 'BRAND_LOCK',
        cameraMove: 'Hafifçe geriye süzülerek şık çalışma alanını ve monitörü çerçeveleyen kapanış',
        lightingMood: 'Prestijli akşamüstü ofis ışığı',
        actionTemplate: (product, env, brand) =>
          `Ekrandaki ${product} başarı ekranı ve masa düzeni estetik bir dinginlikle sabitlenir.`
      }
    ],
    physicsGuard: (product) =>
      `Ekran görüntüsü bozulmaz, yapay kod veya yabancı saçma karakterler üretilmez, modern minimalist UI tasarımı korunur.`,
    impliedFoley: 'Hafif mekanik klavye tıkırtısı, farenin pürüzsüz tıklama sesi, hafif ofis ambiyansı',
    defaultNegativePrompt: `${STRICT_ZERO_TEXT_NEGATIVES}, flickering monitor, distorted UI, matrix code, hacker aesthetic`
  }
}
