/**
 * Metin ureten saglayicilar. Org anahtarlari env uzerine yazar.
 */
import {
  AI_TIMEOUT_MS,
  resolveAiConfig,
  textProviderOrder,
  type AiKeyBag,
  type AiProviderId,
  type ResolvedAiConfig,
} from './config'

type TextProvider = {
  id: AiProviderId
  label: string
  isConfigured: () => boolean
  complete: (system: string, user: string) => Promise<string>
}

function timeout(): AbortSignal {
  return AbortSignal.timeout(AI_TIMEOUT_MS)
}

function buildProviders(config: ResolvedAiConfig): Partial<Record<AiProviderId, TextProvider>> {
  return {
    gemini: {
      id: 'gemini',
      label: 'Google Gemini',
      isConfigured: () => Boolean(config.gemini.apiKey),
      async complete(system, user) {
        const model = config.gemini.textModel
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
              systemInstruction: { parts: [{ text: system }] },
              contents: [{ role: 'user', parts: [{ text: user }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 800 },
            }),
          },
        )

        if (!response.ok) {
          throw new Error(`Gemini ${response.status}: ${(await response.text()).slice(0, 300)}`)
        }

        const json = (await response.json()) as {
          candidates?: { content?: { parts?: { text?: string }[] } }[]
        }

        const text = (json.candidates?.[0]?.content?.parts ?? [])
          .map((part) => part.text ?? '')
          .join('')
          .trim()

        if (!text) throw new Error('Gemini metin dondurmedi')
        return text
      },
    },
    openai: {
      id: 'openai',
      label: 'OpenAI',
      isConfigured: () => Boolean(config.openai.apiKey),
      async complete(system, user) {
        const response = await fetch(`${config.openai.baseUrl}/chat/completions`, {
          method: 'POST',
          signal: timeout(),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openai.apiKey}`,
          },
          body: JSON.stringify({
            model: config.openai.textModel,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: user },
            ],
            temperature: 0.8,
          }),
        })

        if (!response.ok) {
          throw new Error(`OpenAI ${response.status}: ${(await response.text()).slice(0, 300)}`)
        }

        const json = (await response.json()) as {
          choices?: { message?: { content?: string } }[]
        }

        const text = json.choices?.[0]?.message?.content?.trim()
        if (!text) throw new Error('OpenAI metin dondurmedi')
        return text
      },
    },
  }
}

export function activeTextProviders(
  bag?: AiKeyBag | null,
): { id: AiProviderId; label: string }[] {
  const registry = buildProviders(resolveAiConfig(bag))
  return textProviderOrder
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
): Promise<string> {
  const registry = buildProviders(resolveAiConfig(bag))
  const attempts: string[] = []

  for (const id of textProviderOrder) {
    const provider = registry[id]
    if (!provider?.isConfigured()) continue

    try {
      return await provider.complete(system, user)
    } catch (error) {
      attempts.push(
        `${provider.label}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  throw new Error(
    attempts.length > 0
      ? `Hicbir metin saglayici sonuc vermedi. ${attempts.join(' | ')}`
      : 'Metin uretimi icin OpenAI veya Gemini anahtari gerekir (Ayarlar veya sunucu env).',
  )
}
