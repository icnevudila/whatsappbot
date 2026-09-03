/**
 * Metin ureten saglayicilar: kampanya mesaji yazdirmak icin.
 *
 * Gorsel tarafiyla ayni desen: sirali zincir, yapilandirilmamis saglayici
 * atlanir, ilk basarili cevap kazanir. Farki, anahtarsiz bir son care
 * olmamasi; metin ureten ucretsiz ve guvenilir bir anahtarsiz uc yok, bu
 * yuzden anahtar girilmeden bu ozellik kapali kaliyor ve arayuz bunu
 * kullaniciya soyluyor.
 */
import { AI_TIMEOUT_MS, aiConfig, textProviderOrder, type AiProviderId } from './config'

type TextProvider = {
  id: AiProviderId
  label: string
  isConfigured: () => boolean
  complete: (system: string, user: string) => Promise<string>
}

function timeout(): AbortSignal {
  return AbortSignal.timeout(AI_TIMEOUT_MS)
}

const gemini: TextProvider = {
  id: 'gemini',
  label: 'Google Gemini',
  isConfigured: () => Boolean(aiConfig.gemini.apiKey),

  async complete(system, user) {
    const model = aiConfig.gemini.textModel
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
}

const openai: TextProvider = {
  id: 'openai',
  label: 'OpenAI',
  isConfigured: () => Boolean(aiConfig.openai.apiKey),

  async complete(system, user) {
    const response = await fetch(`${aiConfig.openai.baseUrl}/chat/completions`, {
      method: 'POST',
      signal: timeout(),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiConfig.openai.apiKey}`,
      },
      body: JSON.stringify({
        model: aiConfig.openai.textModel,
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
}

const REGISTRY: Partial<Record<AiProviderId, TextProvider>> = { gemini, openai }

export function activeTextProviders(): { id: AiProviderId; label: string }[] {
  return textProviderOrder
    .map((id) => REGISTRY[id])
    .filter((provider): provider is TextProvider => Boolean(provider?.isConfigured()))
    .map(({ id, label }) => ({ id, label }))
}

export function hasTextProvider(): boolean {
  return activeTextProviders().length > 0
}

export async function completeText(system: string, user: string): Promise<string> {
  const attempts: string[] = []

  for (const id of textProviderOrder) {
    const provider = REGISTRY[id]
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
      : 'Metin uretimi icin OPENAI_API_KEY veya GEMINI_API_KEY gerekiyor.',
  )
}
