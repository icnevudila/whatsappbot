/**
 * P0 — VEO TURKISH VOICEOVER CONTRACT
 *
 * For every production Veo video job, a REAL Turkish voiceover sentence is mandatory.
 * Validates language, non-empty Turkish sentence, exact prompt embedding, and prevents English narration.
 */

export interface VoiceoverContractInput {
  voiceover_language?: string | null
  voiceover_text?: string | null
  final_provider_prompt?: string | null
}

export interface VoiceoverContractResult {
  valid: boolean
  error_code?:
    | 'VOICEOVER_REQUIRED'
    | 'TURKISH_VOICEOVER_REQUIRED'
    | 'VOICEOVER_PLACEHOLDER_FORBIDDEN'
    | 'VOICEOVER_PROMPT_MISMATCH'
    | 'VOICEOVER_PROMPT_INSTRUCTION_MISSING'
  error_message?: string
  voiceover_language?: string
  voiceover_text?: string
}

const PLACEHOLDER_PATTERNS = [
  /^turkish voiceover$/i,
  /^speak turkish$/i,
  /^türkçe seslendirme$/i,
  /^seslendirme metni$/i,
  /^örnek seslendirme$/i,
  /^placeholder$/i,
  /^lorem ipsum/i,
]

export function validateVoiceoverContract(input: VoiceoverContractInput): VoiceoverContractResult {
  const text = (input.voiceover_text || '').trim()
  const lang = (input.voiceover_language || '').trim()
  const prompt = (input.final_provider_prompt || '').trim()

  // 1. voiceover_text exists and is not empty
  if (!text) {
    return {
      valid: false,
      error_code: 'VOICEOVER_REQUIRED',
      error_message: 'Video üretimi için gerçek bir Türkçe seslendirme cümlesi zorunludur.',
    }
  }

  // 2. voiceover_text is not a placeholder
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      valid: false,
      error_code: 'VOICEOVER_PLACEHOLDER_FORBIDDEN',
      error_message: 'Geçersiz veya placeholder seslendirme metni girilemez.',
    }
  }

  // 3. voiceover_language === 'tr-TR'
  if (lang !== 'tr-TR') {
    return {
      valid: false,
      error_code: 'TURKISH_VOICEOVER_REQUIRED',
      error_message: 'Seslendirme dili tr-TR (Türkçe) olmak zorundadır.',
    }
  }

  // 4. If finalized provider prompt is provided, validate embedding
  if (prompt) {
    // finalized provider prompt must contain the exact voiceover_text
    if (!prompt.includes(text)) {
      return {
        valid: false,
        error_code: 'VOICEOVER_PROMPT_MISMATCH',
        error_message: 'Nihai video promptu belirtilen Türkçe seslendirme cümlesini birebir içermelidir.',
      }
    }
  }

  return {
    valid: true,
    voiceover_language: 'tr-TR',
    voiceover_text: text,
  }
}

/**
 * Builds the mandatory Turkish voiceover instruction block for Veo prompts
 */
export function buildVeoVoiceoverPromptBlock(voiceoverText: string): string {
  const clean = voiceoverText.trim().replace(/"/g, "'")
  return [
    `VOICEOVER — TURKISH (tr-TR), EXACTLY ONCE:`,
    `"${clean}"`,
    `- Turkish voiceover starts after 0.5s.`,
    `- Speak this exact approved Turkish sentence once naturally between 0.5s and 5.25s. Voiceover fully finishes before 5.5s.`,
    `- After voiceover ends: music/ambient only.`,
    `- Strictly forbid any English narration or English speech. No English narration.`,
    `- Do not translate it. No translation.`,
    `- No other spoken words. No second narration.`,
  ].join('\n')
}

