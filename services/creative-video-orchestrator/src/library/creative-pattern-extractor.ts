import { CREATIVE_ARCHETYPES, STRICT_ZERO_TEXT_NEGATIVES, type CreativeArchetype } from './creative-patterns.js'
import { isAyvazogluBrick } from '../simple-v5/fidelity-contract.js'

export interface ExtractedCreativePlan {
  archetypeId: string
  archetypeName: string
  cinematicPrompt: string
  negativePrompt: string
  timecodedBeats: {
    timing: string
    purpose: string
    description: string
  }[]
  physicsGuardClause: string
  voiceoverScript: string
  impliedFoley: string
}

export class CreativePatternExtractor {
  /**
   * Automatically resolves the best creative archetype based on product and sector affordance.
   */
  public static resolveArchetype(sector: string, productName: string, productDescription?: string): CreativeArchetype {
    const s = (sector || '').toLowerCase()
    const p = (productName || '').toLowerCase()
    const d = (productDescription || '').toLowerCase()

    if (p.includes('tuğla') || p.includes('brick') || s.includes('inşaat') || s.includes('construction') || d.includes('tuğla')) {
      return CREATIVE_ARCHETYPES.CONSTRUCTION_MATERIAL
    }

    if (p.includes('pompa') || p.includes('ilaçlama') || p.includes('sprayer') || s.includes('tarım') || s.includes('agriculture') || d.includes('ilaçlama') || d.includes('ziraat')) {
      return CREATIVE_ARCHETYPES.AGRICULTURE_EQUIPMENT
    }

    if (s.includes('food') || s.includes('gıda') || s.includes('restaurant') || p.includes('döner') || p.includes('burger') || p.includes('kahve') || p.includes('kebap')) {
      return CREATIVE_ARCHETYPES.FOOD_BEVERAGE_SENSORY
    }

    if (s.includes('tech') || s.includes('software') || s.includes('saas') || p.includes('yazılım') || p.includes('crm') || p.includes('otomasyon') || p.includes('bot') || p.includes('panel')) {
      return CREATIVE_ARCHETYPES.SOFTWARE_SAAS_FLOW
    }

    return CREATIVE_ARCHETYPES.FAST_SALES_SPEED
  }

  /**
   * Compiles a high-craft commercial video prompt with:
   * 1. 35mm cinematic scene setup.
   * 2. Timecoded second-by-second beats (0-2s, 2-5s, 5-8s).
   * 3. Non-negotiable physical fidelity clause.
   * 4. Strict zero-text audio instruction (preventing Veo from burning hallucinated subtitles).
   * 5. Production-grade negative prompt from AdFlow & Gen V.
   */
  public static extractPlan(options: {
    brandName: string
    productName: string
    productDescription?: string
    sector?: string
    spokenScript: string
    durationSeconds?: number
    aspectRatio?: '9:16' | '16:9' | '1:1'
  }): ExtractedCreativePlan {
    const {
      brandName,
      productName,
      productDescription = '',
      sector = '',
      spokenScript,
      durationSeconds = 8.0,
      aspectRatio = '9:16'
    } = options

    const archetype = this.resolveArchetype(sector, productName, productDescription)
    const isBrick = isAyvazogluBrick({ name: productName, description: productDescription })

    // Build Timecoded Beats
    const beats = archetype.beats.map((beatSpec) => ({
      timing: beatSpec.timing,
      purpose: beatSpec.purpose,
      description: beatSpec.actionTemplate(productName, sector, brandName)
    }))

    // Build Specific Physics Guard
    let physicsGuard = archetype.physicsGuard(productName)
    if (isBrick) {
      physicsGuard = `CRITICAL GEOMETRY LOCK FOR CLAY BRICK: The canonical terracotta brick has single-axis perforation ONLY. Hollow grid holes exist strictly and exclusively through the two opposite end faces along one single longitudinal axis. The top face, bottom face, and both long lateral side faces are 100% solid, ribbed terracotta clay with ZERO holes, ZERO cavities, and ZERO perforations. NEVER render holes on the top surface while front also has holes.`
    } else if (productName.toLowerCase().includes('pompa') || productName.toLowerCase().includes('bofe')) {
      physicsGuard = `CRITICAL GEOMETRY LOCK FOR BOFE SPRAYER: Preserve the authoritative light blue backpack sprayer tank geometry, solid tank body, black strap attachments, pressure gauge, and brass lance wand. ZERO liquid leakage, ZERO warped plastic, and ZERO fabricated floating letters.`
    }

    // Assemble the complete high-craft prompt (inspired by awesome-ad-video-prompts & Gen V)
    const promptSections: string[] = [
      `[FORMAT]: ${durationSeconds.toFixed(1)}-second vertical commercial video ad, ${aspectRatio} aspect ratio.`,
      `[SUBJECT]: Authentic commercial showcase of ${productName} by ${brandName}.`,
      `[CANONICAL HERO PRODUCT]: Preserve @HeroProduct shape, silhouette, material texture, and colors exactly as shown in authoritative reference photo.`,
      `[CINEMATIC TAKE & BEATS]: Single unbroken 35mm fluid camera take without jump cuts:`,
      `0-2s (Hook): ${beats[0].description}`,
      `2-5s (Sensory Proof): ${beats[1].description}`,
      `5-8s (Brand Lock): ${beats[2].description}`,
      `[PHYSICAL CONSISTENCY & GEOMETRY LOCK]: ${physicsGuard} Product keeps identical geometry, silhouette, surface texture, and branding across entire video without deformation, drift, melting, or flicker.`,
      `[VOICEOVER AUDIO ONLY]: Spoken Turkish narration: "${spokenScript}". Spoken as natural off-camera voiceover only. ZERO ON-SCREEN SUBTITLES, ZERO ON-SCREEN CAPTIONS, ZERO FLOATING TEXT. Natural ambient audio foley: ${archetype.impliedFoley}.`,
      `[RAW DIFFUSION POLICY]: Clean commercial footage with zero on-screen text, zero artificial logos, zero burned-in titles. (Official brand logo and call to action are deterministically composited in post-production).`
    ]

    const cinematicPrompt = promptSections.join('\n')
    const negativePrompt = archetype.defaultNegativePrompt

    return {
      archetypeId: archetype.id,
      archetypeName: archetype.name,
      cinematicPrompt,
      negativePrompt,
      timecodedBeats: beats,
      physicsGuardClause: physicsGuard,
      voiceoverScript: spokenScript,
      impliedFoley: archetype.impliedFoley
    }
  }
}
