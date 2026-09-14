/**
 * Gorsel ureten saglayicilar ve aralarindaki dusme zinciri.
 * Org anahtarlari (bag) env uzerine yazar.
 */
import {
  AI_TIMEOUT_MS,
  resolveAiConfig,
  resolveImageProviderOrder,
  type AiKeyBag,
  type AiProviderId,
  type ResolvedAiConfig,
} from './config'

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

const QUALITY_LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max', 'auto'])

function openaiQuality(): string {
  const fromEnv = (process.env.OPENAI_IMAGE_QUALITY ?? '').trim().toLowerCase()
  if (QUALITY_LEVELS.has(fromEnv)) return fromEnv
  return 'high'
}

const PIXELS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
  '9:16': { width: 1024, height: 1820 },
}

function buildProviders(config: ResolvedAiConfig): Record<AiProviderId, ImageProvider> {
  return {
    omnistudio: {
      id: 'omnistudio',
      label: 'OmniStudio AI Engine',
      isConfigured: () => process.env.OMNISTUDIO_DISABLED !== 'true',
      async generate(prompt, aspect) {
        const gatewayUrl = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')

        // Yoğunluk & Sağlık Kontrolü (Aynı anda onlarca kişi yaparsa doğrudan OpenAI resmi API'ye yönlendir)
        const healthRes = await fetch(`${gatewayUrl}/health`, { signal: AbortSignal.timeout(3000) }).catch(() => null)
        if (!healthRes || !healthRes.ok) {
          throw new Error('OmniStudio Gateway çevrimdışı')
        }
        const health = await healthRes.json()
        if (health.pending > 0) {
          throw new Error(`OmniStudio meşgul (${health.pending} bekleyen iş) - Doğrudan resmi OpenAI API'ye aktarılıyor`)
        }

        const size = '1024x1024'
        const response = await fetch(`${gatewayUrl}/v1/images/generations`, {
          method: 'POST',
          signal: AbortSignal.timeout(180000),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            size,
            response_format: 'b64_json',
          }),
        })

        if (!response.ok) {
          throw new Error(`OmniStudio ${response.status}: ${(await response.text()).slice(0, 200)}`)
        }

        const json = (await response.json()) as { data?: { b64_json?: string; url?: string }[] }
        const item = json.data?.[0]
        if (!item) throw new Error('OmniStudio görsel döndürmedi')

        let imageBuffer: Buffer
        if (item.b64_json) {
          imageBuffer = Buffer.from(item.b64_json, 'base64')
        } else if (item.url) {
          const publicUrl = item.url
            .replace('localhost:3456', '167.233.201.31:3456')
            .replace('127.0.0.1:3456', '167.233.201.31:3456')
          const imgRes = await fetch(publicUrl, { signal: AbortSignal.timeout(30000) })
          imageBuffer = Buffer.from(await imgRes.arrayBuffer())
        } else {
          throw new Error('OmniStudio geçersiz veri')
        }

        return {
          data: imageBuffer,
          mimeType: 'image/png',
          provider: 'omnistudio',
        }
      },
    },
    gemini: {
      id: 'gemini',
      label: 'Google Gemini',
      isConfigured: () => Boolean(config.gemini.apiKey),
      async generate(prompt, aspect) {
        const model = config.gemini.imageModel
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
          {
            method: 'POST',
            signal: timeout(),
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': config.gemini.apiKey,
            },
            body: JSON.stringify({
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              generationConfig: {
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
    },
    openai: {
      id: 'openai',
      label: 'OpenAI',
      isConfigured: () => Boolean(config.openai.apiKey),
      async generate(prompt, aspect) {
        const size = aspect === '1:1' ? '1024x1024' : '1024x1536'
        const response = await fetch(`${config.openai.baseUrl}/images/generations`, {
          method: 'POST',
          signal: timeout(),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openai.apiKey}`,
          },
          body: JSON.stringify({
            model: config.openai.imageModel,
            prompt,
            size,
            quality: openaiQuality(),
          }),
        })

        if (!response.ok) {
          throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`)
        }

        const json = (await response.json()) as { data?: { b64_json?: string }[] }
        const b64 = json.data?.[0]?.b64_json
        if (!b64) throw new Error('OpenAI gorsel dondurmedi')

        return { data: Buffer.from(b64, 'base64'), mimeType: 'image/png', provider: 'openai' }
      },
    },
    cloudflare: {
      id: 'cloudflare',
      label: 'Cloudflare Workers AI',
      isConfigured: () => Boolean(config.cloudflare.accountId && config.cloudflare.apiToken),
      async generate(prompt) {
        const { accountId, apiToken, imageModel } = config.cloudflare
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
    },
    pollinations: {
      id: 'pollinations',
      label: 'Pollinations',
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
    },
  }
}

export function activeImageProviders(
  bag?: AiKeyBag | null,
): { id: AiProviderId; label: string }[] {
  const registry = buildProviders(resolveAiConfig(bag))
  return resolveImageProviderOrder(bag)
    .map((id) => registry[id])
    .filter((provider) => provider.isConfigured())
    .map(({ id, label }) => ({ id, label }))
}

export function hasImageProvider(bag?: AiKeyBag | null): boolean {
  return activeImageProviders(bag).length > 0
}

export async function generateImage(
  prompt: string,
  aspect: AspectRatio,
  bag?: AiKeyBag | null,
): Promise<{ image: GeneratedImage; attempts: string[] }> {
  const registry = buildProviders(resolveAiConfig(bag))
  const attempts: string[] = []

  for (const id of resolveImageProviderOrder(bag)) {
    const provider = registry[id]
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
      ? `Hiçbir görsel sağlayıcı sonuç vermedi. ${attempts.join(' | ')}`
      : 'Yapilandirilmis gorsel saglayici yok.',
  )
}
