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
      return `[Beat ${idx + 1} (${b.start.toFixed(1)}s-${b.end.toFixed(1)}s)]: Camera: ${b.camera}. Action: ${b.visual_action}. Product State: ${b.product_action}. Actor Action: ${b.actor_action}. Lighting: ${b.lighting}. SFX Ambience: ${b.sfx}, ${b.ambience}.`
    }).join(' ')

    const primaryHandles = plan.canonical_asset_handles.length > 0
      ? plan.canonical_asset_handles.join(', ')
      : '@HeroProduct, @BrandLogo'

    // Diegetic Branding Directive on natural physical surface
    let diegeticBrandingDirective = ''
    const diegeticItem = plan.diegetic_branding_plan && plan.diegetic_branding_plan[0]
    if (diegeticItem || plan.logo_strategy.includes('DIEGETIC')) {
      const surface = diegeticItem?.surface_type || 'equipment_panel'
      diegeticBrandingDirective = `[DIEGETIC BRANDING ON NATURAL SURFACE]: Use the exact provided @BrandLogo reference on the selected natural physical surface (${surface}). Preserve the original logo artwork, typography, symbol geometry, spacing, proportions and identity. Do not redesign, rewrite, translate, stylize, abbreviate or invent the brand logo. Do not generate additional brand marks or text.`
    }

    // Audio & Spoken Turkish dialogue section
    let audioDirective = ''
    if (plan.audio_plan && plan.audio_plan.speech_mode === 'native_veo_dialogue') {
      const speechTimeline = plan.speech_timeline || plan.audio_plan.speech_timeline
      const fullSpokenScript = plan.master_spoken_script || plan.voiceover_script || plan.audio_plan.exact_spoken_lines[0]?.text || ''
      const ambient = plan.audio_plan.ambient_audio_description || 'soft natural ambience'
      const sfx = plan.audio_plan.sound_effects_description || 'subtle equipment operating sound'

      if (speechTimeline && speechTimeline.length > 0) {
        const timelineStr = speechTimeline.map(item => `[${item.start_sec.toFixed(1)}s-${item.end_sec.toFixed(1)}s (${item.speaker})]: "${item.exact_text}"`).join(' ')
        audioDirective = [
          `[AUDIO AND CONTINUOUS SPOKEN DIALOGUE (0-8s)]:`,
          `The spoken language is Turkish (${plan.audio_plan.spoken_language}).`,
          `Exact spoken line: "${fullSpokenScript}".`,
          `Continuous dialogue across entire duration: ${timelineStr}.`,
          `Speak this sentence exactly in Turkish. Do not translate it. Do not paraphrase it. Do not add any other spoken words.`,
          `Natural Turkish commercial pronunciation, confident and continuous delivery without dead air silence.`,
          `Ambient audio: ${ambient}.`,
          `Sound effects: ${sfx}.`,
        ].join(' ')
      } else {
        const line = plan.audio_plan.exact_spoken_lines[0]
        const speaker = line?.speaker || 'actor'
        const text = line?.text || ''
        const delivery = line?.delivery_style || 'Natural Turkish pronunciation, confident commercial delivery'

        audioDirective = [
          `[AUDIO AND SPOKEN DIALOGUE]:`,
          `The spoken language is Turkish (${plan.audio_plan.spoken_language}).`,
          `The ${speaker} speaks naturally in Turkish, synchronized with the action.`,
          `Exact spoken line: "${text}".`,
          `Speak this sentence exactly in Turkish. Do not translate it. Do not paraphrase it. Do not add any other spoken words.`,
          `${delivery}.`,
          `Ambient audio: ${ambient}.`,
          `Sound effects: ${sfx}.`,
        ].join(' ')
      }
    }

    // Material physics & motion constraints dynamically extracted from beats
    const physicsCues = Array.from(new Set(beats.flatMap(b => b.physics_constraints || []))).filter(Boolean).join(', ')
    const materialPhysicsDirective = physicsCues
      ? `[MATERIAL PHYSICS & MOTION]: Ensure realistic gravity, genuine physical material textures, correct human grip, and realistic motion: ${physicsCues}.`
      : `[MATERIAL PHYSICS & MOTION]: Ensure realistic gravity, authentic physical textures, correct ergonomics and natural human anatomy.`

    // Formulate structured prompt honoring professional film grammar
    const cinematicPrompt = [
      `[SUBJECT LOCK & CANONICAL REFS]: Preserve ${primaryHandles} identity, geometry, proportions, colors, surface finishes, and mechanical components exactly as shown in authoritative reference assets. Product must not recolor, morph, or redesign.`,
      `[ENVIRONMENT]: Authentic ${beats[0]?.environment || 'commercial setting'}.`,
      `[CINEMATIC SEQUENCE (0-8s)]: ${beatSequence}`,
      materialPhysicsDirective,
      `[TIMING & CONTINUITY]: Seamless micro-story progression across 8 seconds.`,
      diegeticBrandingDirective,
      audioDirective,
      `[CRITICAL VISIBLE ON-SCREEN NEGATIVE DIRECTIVE]: NO visible subtitles. NO generated on-screen text. NO INVENTED LOGO. NO FAKE LOGO. NO ALTERED LOGO. NO EXTRA BRAND MARKS. NO generated price. NO generated CTA. NO generated phone number. NO generated website. NO watermark. NO product redesign. All visual branding is strictly composed in post-production.`,
    ].filter(Boolean).join(' ')

    const negativePrompt = Array.from(
      new Set([
        ...plan.negative_constraints,
        'NO visible subtitles',
        'NO generated on-screen text',
        'NO INVENTED LOGO',
        'NO FAKE LOGO',
        'NO ALTERED LOGO',
        'NO EXTRA BRAND MARKS',
        'NO generated price',
        'NO generated CTA',
        'NO generated phone number',
        'NO generated website',
        'NO watermark',
        'NO product redesign',
        'visible subtitles',
        'on-screen text',
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
