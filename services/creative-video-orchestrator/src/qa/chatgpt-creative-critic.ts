import type { CreativeContext, VerifiedFact } from '../types/creative-context.js'
import type { ShortAdMasterPlan } from '../planner/short-ad-master-plan.js'
import type { IChatGPTCreativeProvider } from '../adapters/chatgpt-creative-adapter.js'
import { ChatGPTCreativeAdapter } from '../adapters/chatgpt-creative-adapter.js'

export type CriticDecision = 'PASS' | 'REVISE' | 'BLOCK'

export type CriticFailureCode =
  | 'MINI_FILM_NOT_AD'
  | 'WEAK_HOOK'
  | 'PRODUCT_VISIBLE_TOO_LATE'
  | 'NO_CLEAR_PRODUCT_ROLE'
  | 'GENERIC_COPY'
  | 'TOO_MANY_SLOGANS'
  | 'SPEECH_VISUAL_MISMATCH'
  | 'WRONG_SECTOR'
  | 'UNSUPPORTED_CLAIM'
  | 'REPETITIVE_CREATIVE'
  | 'TOO_SIMILAR_TO_RECENT_AD'
  | 'OVERCOMPLICATED_8S_PLAN'

export interface CreativeCriticReport {
  decision: CriticDecision
  is_real_ad: boolean
  brand_fit: number
  product_fit: number
  objective_fit: number
  hook_strength: number
  product_visibility: number
  visual_variety: number
  speech_visual_alignment: number
  sector_fit: number
  failure_codes: CriticFailureCode[]
  unsupported_claims: string[]
  repetitive_traits: string[]
  physics_risks: string[]
  issues: string[]
  revision_instructions: string[]
}

export class ChatGPTCreativeCritic {
  private chatGptProvider: IChatGPTCreativeProvider

  constructor(chatGptProvider?: IChatGPTCreativeProvider) {
    this.chatGptProvider = chatGptProvider || new ChatGPTCreativeAdapter()
  }

  /**
   * Evaluates the ShortAdMasterPlan before Veo generation.
   * Detects non-commercial mini-films, weak hooks, unsupported claims, slogan stacks, and repetition.
   */
  public async evaluatePlan(
    plan: ShortAdMasterPlan,
    context: CreativeContext,
    revisionCount = 0
  ): Promise<CreativeCriticReport> {
    // 1. Try remote ChatGPT critic
    const remote = await this.chatGptProvider.callCritic(context, plan, revisionCount)
    if (remote && remote.decision && Array.isArray(remote.failure_codes)) {
      return remote
    }

    // 2. Deterministic Critic Evaluation Rules
    const issues: string[] = []
    const failureCodes: CriticFailureCode[] = []
    const unsupportedClaims: string[] = []
    const revisionInstructions: string[] = []

    const verifiedSet = new Set(
      (context.verified_facts || []).map(f => f.claim.toLowerCase().trim())
    )

    // A. Check Unsupported Factual Claims in Speech or Copy
    const allSpokenText = (plan.master_spoken_script || '') + ' ' + (plan.voiceover_script || '')
    const suspiciousKeywords = [
      'su geçirmez', 'waterproof', 'garantili', 'en ucuz', 'en iyi',
      'yüzde 100', '20 saat', 'patentli', 'en hızlı', 'bir numara',
      'ultra dayanıklı', 'özel alaşım'
    ]

    for (const kw of suspiciousKeywords) {
      if (allSpokenText.toLowerCase().includes(kw)) {
        const isVerified = Array.from(verifiedSet).some(v => v.includes(kw))
        if (!isVerified) {
          unsupportedClaims.push(kw)
          failureCodes.push('UNSUPPORTED_CLAIM')
          issues.push(`Doğrulanmamış teknik/üstünlük iddiası tespit edildi: "${kw}"`)
          revisionInstructions.push(`"${kw}" iddiasını metinden çıkarın veya doğrulanmış bir gerçek ile değiştirin.`)
        }
      }
    }

    // B. Check Mini-Film vs Real Ad (Product Visible Too Late or No Clear Product Role)
    const hookBeat = plan.beats.find(b => b.purpose === 'HOOK')
    if (hookBeat) {
      const mentionsProduct =
        hookBeat.visual_action.includes('@HeroProduct') ||
        hookBeat.product_action.includes('@HeroProduct') ||
        hookBeat.visual_action.toLowerCase().includes(context.campaign_context.selected_product_or_service.toLowerCase())

      if (!mentionsProduct && hookBeat.end > 2.0) {
        failureCodes.push('PRODUCT_VISIBLE_TOO_LATE')
        issues.push('Ürün ilk 2 saniye içinde görünmüyor; kanca aşırı uzun ve üründen kopuk.')
        revisionInstructions.push('Ürünü ilk 1.5 saniye içinde (Hook beat) doğrudan odak veya eylem halinde gösterin.')
      }

      if (hookBeat.visual_action.toLowerCase().includes('uzun manzara') || hookBeat.visual_action.toLowerCase().includes('gün doğumu')) {
        failureCodes.push('MINI_FILM_NOT_AD')
        issues.push('Açılış ticari bir reklamdan ziyade sanatsal bir mini film temposunda; kanca zayıf.')
        revisionInstructions.push('Soyut manzara çekimi yerine doğrudan ürün dokusu veya kullanıcı eylemine odaklanın.')
      }
    }

    // C. Check Weak Hook
    if (!plan.advertising_hook || plan.advertising_hook.trim().length < 3) {
      failureCodes.push('WEAK_HOOK')
      issues.push('Reklam kancası (advertising_hook) tanımlanmamış veya çok zayıf.')
      revisionInstructions.push('İlk 1 saniyede izleyiciyi durduracak net bir kanca belirleyin.')
    }

    // D. Check Too Many Slogans (Heuristic: > 4 isolated exclamation sentences)
    const sentences = allSpokenText.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const shortSlogans = sentences.filter(s => s.trim().split(/\s+/).length <= 3)
    if (shortSlogans.length >= 4) {
      failureCodes.push('TOO_MANY_SLOGANS')
      issues.push('Metin katalog sloganları yığını gibi; doğal konuşma omurgası (voice-as-spine) eksik.')
      revisionInstructions.push('Parçalı sloganlar yerine 18-24 kelimelik tek ve akıcı bir konuşma omurgası oluşturun.')
    }

    // E. Check Anti-fatigue / Similarity to Recent Fingerprints
    const recentFingerprints = context.recent_fingerprints || []
    if (plan.creative_fingerprint && recentFingerprints.length > 0) {
      const isTooSimilar = recentFingerprints.slice(0, 2).some(
        rf =>
          rf.format_variant === plan.creative_fingerprint?.format_variant &&
          rf.hook_type === plan.creative_fingerprint?.hook_type
      )
      if (isTooSimilar) {
        failureCodes.push('TOO_SIMILAR_TO_RECENT_AD')
        issues.push('Bu plan firmanın son ürettiği reklamla aynı format varyantını ve kancayı kullanıyor.')
        revisionInstructions.push('Farklı bir görsel açılış ve hikaye yapısı seçerek yaratıcı çeşitliliği koruyun.')
      }
    }

    // Decision Logic
    let decision: CriticDecision = 'PASS'
    if (failureCodes.includes('UNSUPPORTED_CLAIM') || failureCodes.includes('MINI_FILM_NOT_AD')) {
      decision = revisionCount < 1 ? 'REVISE' : 'BLOCK'
    } else if (failureCodes.length > 0) {
      decision = revisionCount < 1 ? 'REVISE' : 'PASS' // soft issues allow pass if already revised once
    }

    const brandFit = failureCodes.includes('WRONG_SECTOR') ? 4 : 9
    const hookStrength = failureCodes.includes('WEAK_HOOK') ? 4 : 9
    const productVisibility = failureCodes.includes('PRODUCT_VISIBLE_TOO_LATE') ? 4 : 9
    const speechAlignment = failureCodes.includes('TOO_MANY_SLOGANS') ? 5 : 9

    return {
      decision,
      is_real_ad: !failureCodes.includes('MINI_FILM_NOT_AD'),
      brand_fit: brandFit,
      product_fit: productVisibility,
      objective_fit: 9,
      hook_strength: hookStrength,
      product_visibility: productVisibility,
      visual_variety: 9,
      speech_visual_alignment: speechAlignment,
      sector_fit: 9,
      failure_codes: Array.from(new Set(failureCodes)),
      unsupported_claims: unsupportedClaims,
      repetitive_traits: failureCodes.filter(f => f === 'TOO_SIMILAR_TO_RECENT_AD'),
      physics_risks: [],
      issues,
      revision_instructions: revisionInstructions,
    }
  }
}
