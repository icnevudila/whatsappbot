/**
 * Gorsel ureten saglayicilar ve aralarindaki dusme zinciri.
 *
 * Hepsi ayni sozlesmeyi uyguluyor: bir istem ve en boy orani al, PNG/JPEG
 * baytlari dondur. Cagiran taraf hangi saglayicinin kullanildigini bilmek
 * zorunda degil.
 */
import {
  AI_TIMEOUT_MS,
  aiConfig,
  imageProviderOrder,
  type AiProviderId,
} from './config'

/** Kreatif bicimlerimizin en boy oranlari. */
export type AspectRatio = '1:1' | '4:5' | '9:16'

export type GeneratedImage = {
  data: Buffer
  mimeType: string
  provider: AiProviderId
}

type ImageProvider = {
  id: AiProviderId
  label: string
  isConfigured: () => boolean
  generate: (prompt: string, aspect: AspectRatio) => Promise<GeneratedImage>
}

function timeout(): AbortSignal {
  return AbortSignal.timeout(AI_TIMEOUT_MS)
}

/** Saglayicilarin cogu serbest olcu kabul etmiyor, en yakin olcuye yuvarliyoruz. */
const PIXELS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
  '9:16': { width: 1024, height: 1820 },
}

// --- Gemini (Nano Banana) --------------------------------------------------

const gemini: ImageProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  isConfigured: () => Boolean(aiConfig.gemini.apiKey),

  async generate(prompt, aspect) {
    const model = aiConfig.gemini.imageModel
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        signal: timeout(),
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': aiConfig.gemini.apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            // IMAGE tek basina yeterli degil, TEXT de istenmeli.
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: aspect },
          },
        }),
      },
    )

    if (!response.ok) {
      throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`)
    }

    const json = (await response.json()) as {
      candidates?: {
        content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] }
      }[]
    }

    /**
     * Cevapta birden fazla gorsel parcasi gelebiliyor: model once 1K
     * varsayilanini, ardindan istenen yuksek cozunurluklu halini koyuyor.
     * Sabit indis almak yerine en buyuk parcayi seciyoruz.
     */
    const parts = json.candidates?.[0]?.content?.parts ?? []
    const images = parts
      .map((part) => part.inlineData)
      .filter((inline): inline is { mimeType?: string; data: string } =>
        Boolean(inline?.data),
      )
      .sort((a, b) => b.data.length - a.data.length)

    const best = images[0]
    if (!best) throw new Error('Gemini gorsel dondurmedi')

    return {
      data: Buffer.from(best.data, 'base64'),
      mimeType: best.mimeType ?? 'image/png',
      provider: 'gemini',
    }
  },
}

// --- OpenAI ----------------------------------------------------------------

const openai: ImageProvider = {
  id: 'openai',
  label: 'OpenAI',
  isConfigured: () => Boolean(aiConfig.openai.apiKey),

  async generate(prompt, aspect) {
    // GPT image modelleri yalnizca bu uc olcuyu kabul ediyor.
    const size = aspect === '1:1' ? '1024x1024' : '1024x1536'

    const response = await fetch(`${aiConfig.openai.baseUrl}/images/generations`, {
      method: 'POST',
      signal: timeout(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.openai.imageModel,
        prompt,
        size,
        // GPT image modelleri b64_json'i varsayilan olarak donuyor,
        // response_format gondermek bazi surumlerde hata veriyor.
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`)
    }

    const json = (await response.json()) as {
      data?: { b64_json?: string }[]
    }

    const b64 = json.data?.[0]?.b64_json
    if (!b64) throw new Error('OpenAI gorsel dondurmedi')

    return { data: Buffer.from(b64, 'base64'), mimeType: 'image/png', provider: 'openai' }
  },
}

// --- Cloudflare Workers AI (FLUX schnell) ----------------------------------

const cloudflare: ImageProvider = {
  id: 'cloudflare',
  label: 'Cloudflare Workers AI',
  isConfigured: () =>
    Boolean(aiConfig.cloudflare.accountId && aiConfig.cloudflare.apiToken),

  async generate(prompt) {
    const { accountId, apiToken, imageModel } = aiConfig.cloudflare

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${imageModel}`,
      {
        method: 'POST',
        signal: timeout(),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ prompt }),
      },
    )

    if (!response.ok) {
      throw new Error(
        `Cloudflare ${response.status}: ${(await response.text()).slice(0, 300)}`,
      )
    }

    const json = (await response.json()) as { result?: { image?: string } }
    const b64 = json.result?.image
    if (!b64) throw new Error('Cloudflare gorsel dondurmedi')

    return {
      data: Buffer.from(b64, 'base64'),
      mimeType: 'image/jpeg',
      provider: 'cloudflare',
    }
  },
}

// --- Pollinations (anahtarsiz, son care) -----------------------------------

const pollinations: ImageProvider = {
  id: 'pollinations',
  label: 'Pollinations',
  // Anahtar istemiyor, bu yuzden her zaman kullanilabilir. Zincirin sonunda
  // durmasinin nedeni bu: hicbir anahtar yoksa bile gorsel uretilebilsin.
  isConfigured: () => true,

  async generate(prompt, aspect) {
    const { width, height } = PIXELS[aspect]
    const params = new URLSearchParams({
      width: String(width),
      height: String(height),
      seed: String(Math.floor(Math.random() * 1e6)),
      model: 'flux',
      nologo: 'true',
    })

    const response = await fetch(
      `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?${params}`,
      { signal: timeout(), cache: 'no-store' },
    )

    if (!response.ok) throw new Error(`Pollinations ${response.status}`)

    return {
      data: Buffer.from(await response.arrayBuffer()),
      mimeType: response.headers.get('content-type') ?? 'image/jpeg',
      provider: 'pollinations',
    }
  },
}

const REGISTRY: Record<AiProviderId, ImageProvider> = {
  gemini,
  openai,
  cloudflare,
  pollinations,
}

/** Hangi gorsel saglayicilari su an kullanilabilir? Ayarlar ekrani icin. */
export function activeImageProviders(): { id: AiProviderId; label: string }[] {
  return imageProviderOrder
    .map((id) => REGISTRY[id])
    .filter((provider) => provider.isConfigured())
    .map(({ id, label }) => ({ id, label }))
}

/**
 * Zinciri sirayla dener. Bir saglayici kotasi dolmus, anahtari gecersiz veya
 * gecici olarak erisilemez olabilir; tek bir saglayiciya bagli kalmak
 * kullaniciya sebepsiz hata gostermek anlamina gelir.
 */
export async function generateImage(
  prompt: string,
  aspect: AspectRatio,
): Promise<{ image: GeneratedImage; attempts: string[] }> {
  const attempts: string[] = []

  for (const id of imageProviderOrder) {
    const provider = REGISTRY[id]
    if (!provider.isConfigured()) continue

    try {
      const image = await provider.generate(prompt, aspect)
      return { image, attempts }
    } catch (error) {
      attempts.push(
        `${provider.label}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  throw new Error(
    attempts.length > 0
      ? `Hicbir gorsel saglayici sonuc vermedi. ${attempts.join(' | ')}`
      : 'Yapilandirilmis gorsel saglayici yok.',
  )
}
