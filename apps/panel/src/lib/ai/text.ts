/**
 * Metin ureten saglayicilar. Org anahtarlari env uzerine yazar.
 */
import {
  AI_TIMEOUT_MS,
  resolveAiConfig,
  resolveTextProviderOrder,
  type AiKeyBag,
  type AiProviderId,
  type ResolvedAiConfig,
} from './config'

export type TextMetadata = {
  customer?: string
  tenantId?: string
  orgId?: string
  conversationId?: string
  requestId?: string
}

type TextProvider = {
  id: AiProviderId
  label: string
  isConfigured: () => boolean
  complete: (system: string, user: string, metadata?: TextMetadata) => Promise<string>
}

function timeout(): AbortSignal {
  return AbortSignal.timeout(AI_TIMEOUT_MS)
}

function buildProviders(_config: ResolvedAiConfig): Partial<Record<AiProviderId, TextProvider>> {
  return {
    omnistudio: {
      id: 'omnistudio',
      label: 'OmniStudio AI Engine',
      isConfigured: () => process.env.OMNISTUDIO_DISABLED !== 'true',
      async complete(system, user, metadata) {
        const gatewayUrl = (process.env.OMNISTUDIO_GATEWAY_URL || 'http://167.233.201.31:3456').replace(/\/$/, '')
        const customer = metadata?.customer || 'Mesajify'
        const tenantId = metadata?.tenantId || metadata?.orgId || null
        const orgId = metadata?.orgId || metadata?.tenantId || null
        const conversationId = metadata?.conversationId || null
        const requestId = metadata?.requestId || null

        const response = await fetch(`${gatewayUrl}/v1/chat/completions`, {
          method: 'POST',
          signal: timeout(),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.CHATGPT_API_KEY || 'sk-omnistudio-2026'}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            customer,
            company: customer,
            tenantId,
            orgId,
            conversationId,
            requestId,
          }),
        })

        if (!response.ok) {
          throw new Error(`OmniStudio ${response.status}: ${(await response.text()).slice(0, 300)}`)
        }

        const json = (await response.json()) as {
          choices?: { message?: { content?: string } }[]
        }

        const text = json.choices?.[0]?.message?.content?.trim()
        if (!text) throw new Error('OmniStudio metin döndürmedi')
        return text
      },
    },
    gemini: {
      id: 'gemini',
      label: 'Google Gemini',
      isConfigured: () => false,
      async complete() {
        throw new Error('Gemini API devre dışı bırakıldı (Yalnızca OmniStudio desteklenir).')
      },
    },
    openai: {
      id: 'openai',
      label: 'OpenAI',
      isConfigured: () => false,
      async complete() {
        throw new Error('OpenAI API devre dışı bırakıldı (Yalnızca OmniStudio desteklenir).')
      },
    },
  }
}

export function activeTextProviders(
  bag?: AiKeyBag | null,
): { id: AiProviderId; label: string }[] {
  const registry = buildProviders(resolveAiConfig(bag))
  return resolveTextProviderOrder(bag)
    .map((id) => registry[id])
    .filter((provider): provider is TextProvider => Boolean(provider?.isConfigured()))
    .map(({ id, label }) => ({ id, label }))
}

export function hasTextProvider(bag?: AiKeyBag | null): boolean {
  return activeTextProviders(bag).length > 0
}

export async function completeText(
  system: string,
  user: string,
  bag?: AiKeyBag | null,
  metadata?: TextMetadata,
): Promise<string> {
  const registry = buildProviders(resolveAiConfig(bag))
  const attempts: string[] = []

  for (const id of resolveTextProviderOrder(bag)) {
    const provider = registry[id]
    if (!provider?.isConfigured()) continue

    try {
      return await provider.complete(system, user, metadata)
    } catch (error) {
      attempts.push(
        `${provider.label}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  throw new Error(
    attempts.length > 0
      ? `Hiçbir metin sağlayıcı sonuç vermedi. ${attempts.join(' | ')}`
      : 'Metin üretimi için OmniStudio servisi yapılandırılmalıdır.',
  )
}
