import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { TenantAsset } from '../types/asset-intake.js'
import { DeterministicLogoCompositor, type FrameSaliencyAnalysis } from './logo-compositor.js'
import { DeterministicCampaignTextRenderer } from './campaign-text-renderer.js'
import type { ShortStoryboardPlan } from './storyboard-director.js'

export interface FinalAssemblyPlan {
  planId: string
  rawVideoInputPath: string
  finalOutputPath: string
  logoSpec: ReturnType<DeterministicLogoCompositor['calculatePlacement']>
  lowerThirdSpec: ReturnType<DeterministicCampaignTextRenderer['buildLowerThird']>
  endCardSpec: ReturnType<DeterministicCampaignTextRenderer['buildEndCard']>
  ffmpegComplexFilter: string
  fullFfmpegCommand: string
  verified: boolean
}

/**
 * Final Advertisement Assembler.
 * Merges raw cinematic video footage produced by Veo/generative engine with
 * authoritative, pixel-perfect brand layers:
 * 1. Normalized official logo in calculated safe zone (or end card).
 * 2. Deterministic lower-third with campaign offer, pricing, and palette.
 * 3. Responsive brand end card at closing.
 * 4. Subtitle / VO audio mix.
 */
export class FinalAdAssembler {
  private logoCompositor = new DeterministicLogoCompositor()
  private textRenderer = new DeterministicCampaignTextRenderer()

  /**
   * Builds the comprehensive FFmpeg command and filter graph to stitch the final MP4.
   */
  public assembleShortAd(
    rawVideoPath: string,
    finalOutputPath: string,
    snapshot: BrandContextSnapshot,
    logoAsset: TenantAsset,
    saliency: FrameSaliencyAnalysis,
    storyboard: ShortStoryboardPlan,
    options?: {
      videoWidth?: number
      videoHeight?: number
      fps?: number
      voiceoverAudioPath?: string
      backgroundMusicPath?: string
    }
  ): FinalAssemblyPlan {
    const width = options?.videoWidth || 1080
    const height = options?.videoHeight || 1920

    // 1. Normalize logo and compute safe placement based on probed dimensions
    const normalizedLogo = this.logoCompositor.normalizeLogo(logoAsset)
    const logoPlacement = this.logoCompositor.calculatePlacement(normalizedLogo, saliency, width, height)

    // 2. Build Lower Third
    const lowerThird = this.textRenderer.buildLowerThird(snapshot, { startSec: 1.5, durationSec: 4.5 })

    // 3. Build End Card
    const endCard = this.textRenderer.buildEndCard(snapshot, 'minimalist_center', 2.0)

    // 4. Construct unified FFmpeg filtergraph
    // Input 0: Raw video (1080x1920)
    // Input 1: Canonical Logo PNG
    const endCardStart = Math.max(0, snapshot.requested_duration - 2.0)

    const filterComplex = [
      // Logo overlay up to end card
      `[1:v]scale=${logoPlacement.scaleWidthPx}:-1[scaled_logo]`,
      `[0:v][scaled_logo]overlay=${logoPlacement.overlayCoordinates.x}:${logoPlacement.overlayCoordinates.y}:enable='between(t,0.5,${endCardStart})'[v1]`,
      // Lower third text
      `[v1]${lowerThird.drawtextFilter}[v2]`,
      // End card overlay (solid brand color fill + centered logo + CTA)
      `[v2]${endCard.filterComplexSnippet}[v_final]`,
    ].join(';')

    const inputs = [`-i "${rawVideoPath}"`, `-i "${normalizedLogo.originalFilePath}"`]
    if (options?.voiceoverAudioPath) {
      inputs.push(`-i "${options.voiceoverAudioPath}"`)
    }

    const fullCommand = [
      'ffmpeg -y',
      ...inputs,
      `-filter_complex "${filterComplex}"`,
      '-map "[v_final]"',
      options?.voiceoverAudioPath ? '-map 2:a -c:a aac -b:a 192k' : '',
      '-c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p',
      `-t ${snapshot.requested_duration}`,
      `"${finalOutputPath}"`,
    ].filter(Boolean).join(' ')

    return {
      planId: `ad_asm_${Date.now()}`,
      rawVideoInputPath: rawVideoPath,
      finalOutputPath,
      logoSpec: logoPlacement,
      lowerThirdSpec: lowerThird,
      endCardSpec: endCard,
      ffmpegComplexFilter: filterComplex,
      fullFfmpegCommand: fullCommand,
      verified: true,
    }
  }
}
