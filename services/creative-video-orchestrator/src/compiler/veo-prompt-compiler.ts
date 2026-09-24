import type { ShortAdMasterPlan } from '../planner/short-ad-master-plan.js'

export interface VeoFootagePromptCompilation {
  masterPlanId: string
  cinematicPrompt: string
  negativePrompt: string
  aspectRatio: '9:16' | '16:9'
  targetDurationSec: number
  canonicalHandlesInPrompt: string[]
  footageDirectives: {
    cameraMotion: string
    lighting: string
    actorActions: string[]
    productActions: string[]
    audioSpokenDirective?: string
  }
}

/**
 * VeoPromptCompiler.
 * Compiles a ShortAdMasterPlan into pure generative footage instructions for Veo.
 * Guarantees that:
 * 1. Veo receives cinematography, physical motion, lighting, action directives, and exact native Turkish dialogue.
 * 2. Visual branding (on-screen logos, overlay prices, text slogans, CTAs, subtitles) are STRIPPED from the visual frame.
 * 3. Exact Turkish speech is injected verbatim without translation or paraphrasing.
 * 4. Canonical reference handles (@HeroProduct, @SoftwareUI) are preserved for model conditioning.
 * 5. Statically injects all mandatory negative exclusions for on-screen visible text.
 */
export class VeoPromptCompiler {
  public compileVeoPrompt(plan: ShortAdMasterPlan): VeoFootagePromptCompilation {
    const beats = plan.beats

    const actorActions = beats.map(b => b.actor_action)
    const productActions = beats.map(b => b.product_action)

    // Build beat-by-beat chronological camera & action sequence
    const beatSequence = beats.map((b, idx) => {
      return `[Beat ${idx + 1} (${b.start.toFixed(1)}s-${b.end.toFixed(1)}s)]: ${b.camera}. ${b.visual_action}.`
    }).join(' ')

    const primaryHandles = plan.canonical_asset_handles.length > 0
      ? plan.canonical_asset_handles.join(', ')
      : '@HeroProduct, @BrandLogo'

    // Diegetic Branding Directive on natural physical surface
    let diegeticBrandingDirective = ''
    const diegeticItem = plan.diegetic_branding_plan && plan.diegetic_branding_plan[0]
    const hasBrandLogo = plan.canonical_asset_handles && plan.canonical_asset_handles.includes('@BrandLogo')
    if (diegeticItem || plan.logo_strategy.includes('DIEGETIC') || hasBrandLogo) {
      const surface = diegeticItem?.surface_type || 'physical product surface'
      diegeticBrandingDirective = `[BRANDING]: Preserve canonical identity from @BrandLogo on @HeroProduct (${surface}). Faithful proportions, zero floating watermarks.`
    }

    // Audio & Spoken Turkish dialogue section
    let audioDirective = ''
    if (plan.audio_plan && plan.audio_plan.speech_mode === 'native_veo_dialogue') {
      const fullSpokenScript = plan.master_spoken_script || plan.voiceover_script || plan.audio_plan.exact_spoken_lines[0]?.text || ''
      const ambient = plan.audio_plan.ambient_audio_description || 'natural ambience'
      audioDirective = `[AUDIO]: Turkish spoken dialogue: "${fullSpokenScript}". Confident natural delivery. Ambience: ${ambient}.`
    }

    // Material physics & motion constraints dynamically extracted from beats
    const physicsCues = Array.from(new Set(beats.flatMap(b => b.physics_constraints || []))).filter(Boolean).slice(0, 3).join(', ')
    const materialPhysicsDirective = physicsCues
      ? `[PHYSICS]: Natural gravity and motion: ${physicsCues}.`
      : `[PHYSICS]: Natural gravity, genuine textures, and human ergonomics.`

    // Formulate structured prompt honoring professional film grammar
    const cinematicPrompt = [
      `[SUBJECT LOCK]: Preserve ${primaryHandles} geometry, colors, and authentic appearance exactly as in references.`,
      `[ENVIRONMENT]: Authentic ${beats[0]?.environment || 'commercial setting'}.`,
      `[SEQUENCE (0-8s)]: ${beatSequence}`,
      materialPhysicsDirective,
      diegeticBrandingDirective,
      audioDirective,
      `[NEGATIVE DIRECTIVE]: Strictly NO on-screen subtitles, lower thirds, artificial typography, or floating synthetic logos. All graphical overlays are applied in post-production.`,
    ].filter(Boolean).join(' ')

    const negativePrompt = Array.from(
      new Set([
        ...plan.negative_constraints,
        'NO visible subtitles',
        'NO generated on-screen text',
        'NO generated lower thirds',
        'NO floating logo',
        'NO generated end card',
        'NO watermark',
        'NO generated CTA',
        'NO generated price',
        'NO generated phone number',
        'NO generated website URL',
        'NO campaign typography',
        'NO artificial logo overlays',
        'NO INVENTED LOGO',
        'NO FAKE LOGO',
        'NO ALTERED LOGO',
        'NO EXTRA BRAND MARKS',
        'NO product redesign',
        'visible subtitles',
        'on-screen text',
        'lower thirds',
        'floating logo',
        'floating screen logo',
        'synthetic lower thirds',
        'artificial on-screen graphics',
        'deformed product typography',
        'misspelled brand names',
        'synthetic end-card graphics',
        'floating watermark',
        'generated end card',
        'hallucinated logos',
        'blurry hands',
        'disconnected pipes',
        'cartoony 3d',
        'low resolution',
        'deformed fingers',
      ])
    ).join(', ')

    return {
      masterPlanId: plan.plan_id || `plan_${Date.now()}`,
      cinematicPrompt,
      negativePrompt,
      aspectRatio: '9:16',
      targetDurationSec: 8,
      canonicalHandlesInPrompt: plan.canonical_asset_handles,
      footageDirectives: {
        cameraMotion: beats.map(b => b.camera).join(' -> '),
        lighting: beats.map(b => b.lighting).join('; '),
        actorActions,
        productActions,
        audioSpokenDirective: audioDirective || undefined,
      },
    }
  }
}
