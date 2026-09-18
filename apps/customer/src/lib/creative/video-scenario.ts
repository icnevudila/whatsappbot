import { completeText } from '@/lib/ai/text'
import type { AiKeyBag } from '@/lib/ai/config'

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

ÇOK ÖNEMLİ KURALLAR:
- Format: 9:16 Dikey (Instagram Reels, TikTok, WhatsApp Durum formatı).
- Süre: 10 saniye (3 Perde: 0-3s Giriş/Kanca, 3-7s Eylem/Mesaj, 7-10s Kapanış/Aksiyon Çağrısı).
- Dış Ses / Konuşma Durumu: ${
    isSpeech
      ? 'Dış ses veya oyuncu konuşması VARDIR. Oyuncunun Türkçe konuşma repliği veya dış ses tam metin olarak senaryoya yazılmalıdır.'
      : 'Konuşma ve insan sesi YOKTUR. Sadece foley doğal ses efektleri ve dinamik fon müziği vardır.'
  }
- EKRANDA YAZI YASAKTIR: Videonun ham çekiminde kesinlikle ekranda hiçbir banner, altyazı, yazı, tipografi, logo kartı OLMAYACAKTIR. 'STRICT RULE: NO ON-SCREEN TEXT, NO WORDS, NO LETTERS, NO LOGO CARDS' kuralı promptun sonuna eklenmelidir.
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
  const product = context.products?.[0]?.name || 'Ticari Hizmet ve Ürün'
  const brief = context.brief || 'WhatsApp ile dijital broşür ve sipariş'

  const strictRule =
    'ÖNEMLİ KURAL: Videoda KESİNLİKLE hiçbir yazı, metin, altyazı, logo kartı, bilgi kutusu veya grafik overlay OLMAYACAKTIR. STRICT RULE: NO TEXT, NO WORDS, NO LETTERS, NO TYPOGRAPHY, NO SUBTITLES, NO CAPTIONS, NO ON-SCREEN TEXT, NO LOGO CARDS, NO GRAPHIC OVERLAYS. Pure clean cinematic live-action commercial footage only.'

  // 1. Samimi Esnaf & Telefon Senaryosu (Örn. Dönerci / İşletme Sahibi)
  const speech1 = isSpeech
    ? `Oyuncu kameraya samimiyetle gülümseyerek konuşur: "Artık broşür bastırmıyorum! Bunun yerine ${brand} ile dijital broşürümü etrafımdaki tüm müşterilere tek tıkla WhatsApp'tan gönderiyorum, siparişler patladı!"`
    : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Doğal mekan sesleri, telefon bildirim sesleri ve dinamik fon müziği.`

  const prompt1 = `9:16 vertical cinematic commercial advertisement for "${brand}".
ACT 1 (0-3s): Sizzling macro close-up (100mm f/1.8 lens) of fresh, seasoned ${product}, fragrant steam rising, clean professional prep counter in warm appetizing lighting.
ACT 2 (3-7s): Medium shot of an authentic, friendly business owner/chef in clean uniform standing proudly behind the counter. He holds up a sleek smartphone toward the camera showing a WhatsApp chat screen with digital brochures. ${speech1}
ACT 3 (7-10s): Smooth cinematic gimbal pull-back showing the buzzing shop, notifications chiming, the actor giving an energetic thumbs up with a confident smile. 4K live-action commercial cinematography, Arri Alexa natural color grade.
${strictRule}`

  // 2. Hızlı & Dinamik Sipariş Patlaması Senaryosu
  const speech2 = isSpeech
    ? `Dış ses enerjik bir spiker tonuyla seslendirir: "Geleneksel kağıt broşür bitti, dijital dönüşüm başladı! ${brand} ile WhatsApp üzerinden anında tüm müşterilerinize ulaşın, siparişleri katlayın!"`
    : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Hızlı tempo perküsyon ve dinamik modern ritimler.`

  const prompt2 = `9:16 vertical fast-paced cinematic commercial for "${brand}".
ACT 1 (0-3s): Dynamic tilt-down showing rapid orders arriving on modern tablets and smartphones, notification chimes echoing, bustling business energy.
ACT 2 (3-7s): Eye-level tracking shot of staff preparing fresh orders of ${product} with speed and precision, smiling team members packing items into branded eco-friendly delivery bags. ${speech2}
ACT 3 (7-10s): Wide hero shot of happy staff looking into camera, customer receiving package with delight, vibrant street background in golden hour light. Sharp 4K advertising aesthetic.
${strictRule}`

  // 3. Premium Sinematik & İştah Açıcı Ürün Vitrini Senaryosu
  const speech3 = isSpeech
    ? `Karizmatik bir dış ses konuşur: "Müşterileriniz tek dokunuşla en taze lezzetlerinize ve kampanyalarınıza ulaşsın. ${brand}, işletmenizin yeni nesil dijital vitrini."`
    : `STRICT RULE: NO VOICE, NO SPEECH, NO DIALOGUE. Derin baslar, akustik melodiler ve iştah açıcı foley efektleri.`

  const prompt3 = `9:16 vertical luxury cinematic showcase commercial for "${brand}".
ACT 1 (0-3s): High-speed 120fps slow-motion capture of ${product} being prepared with supreme craftsmanship, rich textures, glistening details, studio cinematic backlighting.
ACT 2 (3-7s): Elegant camera glide around the finished hero presentation on a dark slate surface, gentle natural steam, subtle bokeh. ${speech3}
ACT 3 (7-10s): Smooth transition to a customer smiling while admiring the digital menu on their smartphone and placing a seamless order. High-end television commercial cinematography, 4K crisp resolution.
${strictRule}`

  return [
    {
      id: 'scenario_1',
      title: 'Usta & Akıllı Telefon (Samimi Esnaf)',
      badge: 'En Çok Tercih Edilen',
      summary:
        'İşletme sahibi tezgah başında akıllı telefonunu kameraya gösterir: "Artık broşür basmıyorum, dijital broşürümü WhatsApp\'tan gönderiyorum!" diyerek siparişlerin hızını anlatır.',
      fullPrompt: prompt1,
    },
    {
      id: 'scenario_2',
      title: 'Dinamik Sipariş Patlaması (Hızlı & Enerjik)',
      badge: 'Yüksek Dönüşüm',
      summary:
        'Telefonlara düşen sipariş bildirimleri, mutfakta ve tezgâhta hızlı hazırlık ve mutlu kurye teslimatıyla işletmenin yoğun hareketliliği vurgulanır.',
      fullPrompt: prompt2,
    },
    {
      id: 'scenario_3',
      title: 'Premium Sinematik Vitrin (120fps Ağır Çekim)',
      badge: 'Sinematik Kalite',
      summary:
        'Ürünün en iştah açıcı ve kaliteli detayları 120fps ağır çekimde ekrana gelir; tek tıkla dijital sipariş konforu zarif bir dille aktarılır.',
      fullPrompt: prompt3,
    },
  ]
}
