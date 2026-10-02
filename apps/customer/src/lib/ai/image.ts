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
import { ImageJobFailedError, ImageJobPendingError, ImageSubmissionUncertainError, inlineReference, readImageJob, submitImageJob, type ImageJobReceipt } from './omnistudio-image-job'
import { inspectImageOutput, ImageOutputInvalidError } from './image-output'

export type AspectRatio = '1:1' | '4:5' | '9:16' | '16:9'

export type GeneratedImage = {
  data: Buffer
  mimeType: string
  provider: AiProviderId
  width?: number
  height?: number
}

export type ReferenceImage = {
  data: Buffer
  mimeType: string
  role?: 'product' | 'logo' | 'base'
}

export class DirectImageReconciliationError extends Error {
  constructor(public readonly provider: AiProviderId) {
    super(`${provider} üretim çağrısının sonucu uzlaştırılmalı; başka ücretli sağlayıcı denenmedi.`)
    this.name = 'DirectImageReconciliationError'
  }
}

export type ImageMetadata = {
  workspace?: string
  customer?: string
  tenantId?: string
  orgId?: string
  conversationId?: string
  requestId?: string
  brandKit?: Record<string, unknown> | null
  enqueueOnly?: boolean
  recoveringSubmission?: boolean
  submissionGatewayUrl?: string
  onSubmitting?: (intent: { requestId: string; gatewayUrl: string }) => Promise<void>
  onDirectSubmitting?: (intent: { requestId: string; provider: AiProviderId }) => Promise<void>
  onQueued?: (job: ImageJobReceipt) => Promise<void>
}

type ImageProvider = {
  id: AiProviderId
  label: string
  isConfigured: () => boolean
  generate: (
    prompt: string,
    aspect: AspectRatio,
    references?: ReferenceImage[],
    metadata?: ImageMetadata,
  ) => Promise<GeneratedImage>
}

function timeout(): AbortSignal {
  return AbortSignal.timeout(AI_TIMEOUT_MS)
}

const PIXELS: Record<AspectRatio, { width: number; height: number }> = {
  '1:1': { width: 1024, height: 1024 },
  '4:5': { width: 1024, height: 1280 },
  '9:16': { width: 1024, height: 1820 },
  '16:9': { width: 1280, height: 720 },
}

const MAX_REFERENCE_IMAGES = 4

function openaiSize(aspect: AspectRatio): string {
  if (aspect === '16:9') return '1536x1024'
  if (aspect === '1:1') return '1024x1024'
  return '1024x1536'
}

const QUALITY_LEVELS = new Set(['low', 'medium', 'high', 'xhigh', 'max', 'auto'])

/** Varsayılan high: orta üzeri kalite. xhigh/max pahalı, kullanılmaz. */
function openaiQuality(): string {
  const fromEnv = (process.env.OPENAI_IMAGE_QUALITY ?? '').trim().toLowerCase()
  if (QUALITY_LEVELS.has(fromEnv)) return fromEnv
  return 'high'
}

function toInlinePart(image: ReferenceImage) {
  return {
    inlineData: {
      mimeType: image.mimeType || 'image/png',
      data: image.data.toString('base64'),
    },
  }
}

function buildProviders(config: ResolvedAiConfig): Record<AiProviderId, ImageProvider> {
  return {
    omnistudio: {
      id: 'omnistudio',
      label: 'OmniStudio AI Engine',
      isConfigured: () => process.env.OMNISTUDIO_DISABLED !== 'true',
      async generate(prompt, aspect, references, metadata) {
        const gatewayUrl = (metadata?.submissionGatewayUrl || process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')

        // Sağlık Kontrolü (Gateway erişilebilir mi?)
        const healthRes = await fetch(`${gatewayUrl}/health`, { signal: AbortSignal.timeout(5000) }).catch(() => null)
        if (!healthRes || !healthRes.ok) {
          throw new Error('OmniStudio Gateway çevrimdışı')
        }

        const size = `${PIXELS[aspect].width}x${PIXELS[aspect].height}`
        const refs = (references ?? []).slice(0, MAX_REFERENCE_IMAGES)
        const referenceImages = refs.map(inlineReference)

        if (metadata?.onSubmitting) {
          if (!metadata.requestId) throw new ImageSubmissionUncertainError()
          try { await metadata.onSubmitting({ requestId: metadata.requestId, gatewayUrl }) }
          catch { throw new ImageSubmissionUncertainError() }
        }
        const job = await submitImageJob(gatewayUrl, {
            prompt,
            size,
            response_format: 'b64_json',
            referenceImages,
            brandKit: metadata?.brandKit || null,
            optimize: false, // The wizard has already compiled the selected brand/creative template.
            workspace: metadata?.workspace || 'WhatsApp Botu',
            customer: metadata?.customer || 'Panel',
            tenantId: metadata?.tenantId || metadata?.orgId || null,
            orgId: metadata?.orgId || metadata?.tenantId || null,
            conversationId: metadata?.conversationId || null,
            requestId: metadata?.requestId || null,
        })
        // Once accepted, a timeout must NEVER fall through to another paid generator.
        try {
          await metadata?.onQueued?.(job)
          if (metadata?.enqueueOnly) throw new ImageJobPendingError(job)
          const deadline = Date.now() + 90000
          while (Date.now() < deadline) {
            const image = await readImageJob(job, metadata?.tenantId || metadata?.orgId)
            if (image) return { data: image.data, mimeType: image.mimeType, provider: 'omnistudio' }
            await new Promise(resolve => setTimeout(resolve, 2500))
          }
        } catch (error) {
          if (error instanceof ImageJobPendingError || error instanceof ImageJobFailedError) throw error
          // Even a failed observation/persistence cannot justify duplicate billing.
          throw new ImageJobPendingError(job)
        }
        throw new ImageJobPendingError(job)
      },
    },
    gemini: {
      id: 'gemini',
      label: 'Google Gemini',
      isConfigured: () => Boolean(config.gemini.apiKey),
      async generate(prompt, aspect, references) {
        const model = config.gemini.imageModel
        const refs = (references ?? []).slice(0, MAX_REFERENCE_IMAGES)
        const parts = [
          { text: prompt },
          ...refs.map(toInlinePart),
        ]
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
              contents: [{ role: 'user', parts }],
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

        const responseParts = json.candidates?.[0]?.content?.parts ?? []
        const images = responseParts
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
      async generate(prompt, aspect, references) {
        const size = openaiSize(aspect)
        const quality = openaiQuality()
        const model = config.openai.imageModel
        const refs = (references ?? []).slice(0, MAX_REFERENCE_IMAGES)
        const useEdit = refs.length > 0 && model.startsWith('gpt-image')
        if (refs.length && !useEdit) throw new Error('Seçilen OpenAI modeli referans düzenleme desteklemiyor; referanslar atılmadı.')
        if (useEdit) {
          const form = new FormData()
          form.set('model', model)
          form.set('prompt', prompt)
          form.set('size', size)
          form.set('quality', quality)
          form.set('n', '1')
          for (const [index, ref] of refs.entries()) {
            const ext = ref.mimeType.includes('jpeg') || ref.mimeType.includes('jpg') ? 'jpg' : 'png'
            form.append(
              'image[]',
              new Blob([new Uint8Array(ref.data)], { type: ref.mimeType || 'image/png' }),
              `ref-${index}.${ext}`,
            )
          }
          const response = await fetch(`${config.openai.baseUrl}/images/edits`, {
            method: 'POST',
            signal: timeout(),
            headers: { Authorization: `Bearer ${config.openai.apiKey}` },
            body: form,
          })
          if (!response.ok) {
            throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`)
          }
          const json = (await response.json()) as { data?: { b64_json?: string }[] }
          const b64 = json.data?.[0]?.b64_json
          if (!b64) throw new Error('OpenAI gorsel dondurmedi')
          return { data: Buffer.from(b64, 'base64'), mimeType: 'image/png', provider: 'openai' }
        }
        const response = await fetch(`${config.openai.baseUrl}/images/generations`, {
          method: 'POST',
          signal: timeout(),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openai.apiKey}`,
          },
          body: JSON.stringify({
            model,
            prompt,
            size,
            quality,
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
  const config = resolveAiConfig(bag)
  const registry = buildProviders(config)
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
  references?: ReferenceImage[],
  metadata?: ImageMetadata,
): Promise<{ image: GeneratedImage; attempts: string[] }> {
  if ((references?.length || 0) > MAX_REFERENCE_IMAGES) throw new Error(`En fazla ${MAX_REFERENCE_IMAGES} referans destekleniyor; seçilen görseller çıkarılmadı.`)
  const config = resolveAiConfig(bag)
  const registry = buildProviders(config)
  const attempts: string[] = []
  const refs = (references ?? []).slice(0, MAX_REFERENCE_IMAGES)

  const providerOrder = metadata?.recoveringSubmission ? ['omnistudio' as const] : resolveImageProviderOrder(bag)
  for (const id of providerOrder) {
    if (refs.length && (id === 'cloudflare' || id === 'pollinations')) {
      attempts.push(`${id}: seçilen referansları desteklemediği için denenmedi.`)
      continue
    }
    const provider = registry[id]
    if (!provider.isConfigured()) continue
    if (refs.length && id === 'openai' && !config.openai.imageModel.startsWith('gpt-image')) {
      attempts.push('OpenAI: seçilen model referans düzenlemeyi desteklemiyor; üretim çağrısı yapılmadı.')
      continue
    }

    let directSubmissionStarted = false
    try {
      if (id !== 'omnistudio') {
        // All local capability/configuration checks happen before this durable boundary.
        if (metadata?.onDirectSubmitting) {
          if (!metadata.requestId) throw new DirectImageReconciliationError(id)
          await metadata.onDirectSubmitting({ requestId: metadata.requestId, provider: id }).catch(() => { throw new DirectImageReconciliationError(id) })
        }
        directSubmissionStarted = true
      }
      const image = await provider.generate(prompt, aspect, refs, metadata)
      const measured = await inspectImageOutput(image.data)
      return { image: { ...image, ...measured }, attempts }
    } catch (error) {
      if (directSubmissionStarted || error instanceof DirectImageReconciliationError) throw new DirectImageReconciliationError(id)
      if (error instanceof ImageJobPendingError || error instanceof ImageJobFailedError || error instanceof ImageSubmissionUncertainError || error instanceof ImageOutputInvalidError) throw error
      if (metadata?.recoveringSubmission) throw new ImageSubmissionUncertainError()
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
