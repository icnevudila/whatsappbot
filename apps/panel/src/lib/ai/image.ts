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

export type ImageMetadata = {
  workspace?: string
  customer?: string
  tenantId?: string
  orgId?: string
  conversationId?: string
  requestId?: string
}

type ImageProvider = {
  id: AiProviderId
  label: string
  isConfigured: () => boolean
  generate: (prompt: string, aspect: AspectRatio, metadata?: ImageMetadata) => Promise<GeneratedImage>
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
      async generate(prompt, aspect, metadata) {
        const gatewayUrl = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')

        // Yoğunluk & Sağlık Kontrolü
        const healthRes = await fetch(`${gatewayUrl}/health`, { signal: AbortSignal.timeout(5000) }).catch(() => null)
        if (!healthRes || !healthRes.ok) {
          throw new Error('OmniStudio Gateway çevrimdışı')
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
            workspace: metadata?.workspace || 'Ekip Paneli',
            customer: metadata?.customer || 'Ekip',
            tenantId: metadata?.tenantId || metadata?.orgId || null,
            orgId: metadata?.orgId || metadata?.tenantId || null,
            conversationId: metadata?.conversationId || null,
            requestId: metadata?.requestId || null,
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
      isConfigured: () => false,
      async generate() {
        throw new Error('Gemini API devre dışı bırakıldı (Yalnızca OmniStudio desteklenir).')
      },
    },
    openai: {
      id: 'openai',
      label: 'OpenAI',
      isConfigured: () => false,
      async generate() {
        throw new Error('OpenAI API devre dışı bırakıldı (Yalnızca OmniStudio desteklenir).')
      },
    },
    cloudflare: {
      id: 'cloudflare',
      label: 'Cloudflare Workers AI',
      isConfigured: () => false,
      async generate() {
        throw new Error('Cloudflare AI devre dışı bırakıldı (Yalnızca OmniStudio desteklenir).')
      },
    },
    pollinations: {
      id: 'pollinations',
      label: 'Pollinations',
      isConfigured: () => false,
      async generate() {
        throw new Error('Pollinations devre dışı bırakıldı (Yalnızca OmniStudio desteklenir).')
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
  metadata?: ImageMetadata,
): Promise<{ image: GeneratedImage; attempts: string[] }> {
  const registry = buildProviders(resolveAiConfig(bag))
  const attempts: string[] = []

  for (const id of resolveImageProviderOrder(bag)) {
    const provider = registry[id]
    if (!provider.isConfigured()) continue

    try {
      const image = await provider.generate(prompt, aspect, metadata)
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
