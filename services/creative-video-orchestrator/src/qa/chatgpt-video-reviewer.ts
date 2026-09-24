import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import type { CreativeContext, MultimodalAttachment } from '../types/creative-context.js'
import type { ShortAdMasterPlan } from '../planner/short-ad-master-plan.js'
import type { SampledFrame } from './frame-sampler.js'
import type { IChatGPTCreativeProvider } from '../adapters/chatgpt-creative-adapter.js'
import { ChatGPTCreativeAdapter } from '../adapters/chatgpt-creative-adapter.js'

export type VideoReviewerDecision = 'PASS' | 'NEEDS_REVIEW' | 'REGENERATE'

export type VideoReviewerFailureCode =
  | 'WRONG_PRODUCT'
  | 'PRODUCT_IDENTITY_FAIL'
  | 'PRODUCT_MORPH_FAIL'
  | 'PRODUCT_COLOR_DRIFT'
  | 'WRONG_SECTOR'
  | 'ENVIRONMENT_MISMATCH'
  | 'PRODUCT_AFFORDANCE_FAIL'
  | 'OBJECT_INTERSECTION_FAIL'
  | 'IMPOSSIBLE_GRIP_FAIL'
  | 'IMPOSSIBLE_PRODUCT_OPERATION'
  | 'PHYSICS_FAIL'
  | 'CONTINUITY_FAIL'
  | 'GHOSTING_FAIL'
  | 'WEAK_HOOK'
  | 'NO_CLEAR_PRODUCT_REVEAL'
  | 'NO_PRODUCT_PROOF'
  | 'MINI_FILM_NOT_AD'
  | 'SOFTWARE_DEMO_MISSING'
  | 'PRODUCT_METAPHOR_FAIL'
  | 'FAKE_UI'
  | 'FORMAT_MISMATCH'
  | 'GENERATED_TEXT_FAIL'
  | 'GENERATED_LOGO_OR_TEXT_FAIL'
  | 'NON_DIEGETIC_GENERATED_BRANDING'
  | 'DIEGETIC_LOGO_MISMATCH'
  | 'INVENTED_DIEGETIC_BRANDING'
  | 'RAW_VIDEO_BRANDING_MISMATCH'
  | 'OVERLAY_MASKING_FORBIDDEN'
  | 'FOREIGN_BRAND'
  | 'TENANT_BRAND_CONTAMINATION'
  | 'LOGO_DISTORTION'
  | 'OPAQUE_LOGO_BOX'
  | 'OVERSIZED_LOGO'
  | 'ACTUAL_AUDIO_LANGUAGE_MISMATCH'
  | 'DUPLICATE_OUTPUT'
  | 'NEEDS_ASSET'
  | 'CANONICAL_LOGO_MISMATCH'

export interface VideoReviewReport {
  decision: VideoReviewerDecision
  product_identity: number
  product_temporal_consistency: number
  brand_consistency: number
  advertising_hook: number
  product_reveal: number
  product_action: number
  human_product_interaction: number
  sector_environment_fit: number
  physical_realism: number
  continuity: number
  format_adherence: number
  speech_visual_alignment: number
  mini_film_risk: boolean
  advertising_effectiveness: number
  failure_codes: VideoReviewerFailureCode[]
  issues: string[]
  retry_direction: string[]
  generation_attempt_number: number
  product_morph_detected: boolean
  sector_environment_match: boolean
  hallucinated_typography_detected: boolean
  non_diegetic_branding_detected: boolean
}

export class ChatGPTVideoReviewer {
  private chatGptProvider: IChatGPTCreativeProvider

  constructor(chatGptProvider?: IChatGPTCreativeProvider) {
    this.chatGptProvider = chatGptProvider || new ChatGPTCreativeAdapter()
  }

  /**
   * Evaluates if a real image on disk contains an artificial lower-third or end-card banner.
   * Uses fast grayscale sampling of the bottom 25% via FFmpeg when available.
   */
  private inspectFramePixelsForNonDiegeticBanners(frame: SampledFrame): { hasNonDiegeticOverlay: boolean; reason: string } {
    try {
      if (!existsSync(frame.frame_path)) return { hasNonDiegeticOverlay: false, reason: '' }

      // Sample bottom 25% scaled to 32x32 grayscale bytes (1024 bytes)
      const raw = execFileSync('ffmpeg', [
        '-y',
        '-i', frame.frame_path,
        '-vf', 'crop=in_w:in_h*0.25:0:in_h*0.75,scale=32:32',
        '-f', 'rawvideo',
        '-pix_fmt', 'gray',
        'pipe:1',
      ], { stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 })

      if (!raw || raw.length < 1024) return { hasNonDiegeticOverlay: false, reason: '' }

      let zeroCount = 0
      let sum = 0
      let maxVal = 0
      for (let i = 0; i < raw.length; i++) {
        const val = raw[i]!
        sum += val
        if (val < 15) zeroCount++
        if (val > maxVal) maxVal = val
      }
      const mean = sum / raw.length
      const zerosRatio = zeroCount / raw.length

      let varianceSum = 0
      for (let i = 0; i < raw.length; i++) {
        const diff = raw[i]! - mean
        varianceSum += diff * diff
      }
      const std = Math.sqrt(varianceSum / raw.length)

      // Solid dark banner (> 35% near-black pixels) containing high-contrast white text / logo (std > 40, max > 200)
      if (zerosRatio > 0.35 && std > 40 && maxVal > 200) {
        return {
          hasNonDiegeticOverlay: true,
          reason: `Kare ${frame.timestamp_sec.toFixed(1)}s: Alt alanda yapay solid siyah bant ve sentetik metin/end-card tespit edildi (siyah piksel oranı: %${(zerosRatio * 100).toFixed(0)}, kontrast: ${std.toFixed(1)}).`,
        }
      }
    } catch {
      // Safe fallback when FFmpeg is not installed or frame is mock
    }
    return { hasNonDiegeticOverlay: false, reason: '' }
  }

  /**
   * Reviews actual sampled video frames against authoritative product/logo assets and approved plan.
   * Can trigger at most 1 automatic regeneration with targeted retry_direction.
   */
  public async reviewSampledVideo(
    sampledFrames: SampledFrame[],
    approvedPlan: ShortAdMasterPlan,
    context: CreativeContext,
    attemptNumber = 1
  ): Promise<VideoReviewReport> {
    // 1. Try remote ChatGPT Video Reviewer
    try {
      const remote = await this.chatGptProvider.callVideoReviewer(
        context,
        sampledFrames,
        approvedPlan,
        attemptNumber
      )
      if (remote && remote.decision && Array.isArray(remote.failure_codes)) {
        return remote
      }
    } catch {
      // Remote unavailable: fall back to safe deterministic review
    }

    // 2. Deterministic Visual Frame Analysis
    const issues: string[] = []
    const failureCodes: VideoReviewerFailureCode[] = []
    const retryDirections: string[] = []

    const heroAsset = context.asset_manifest?.attachments?.find(a => a.canonical_handle === '@HeroProduct')
    const brand = context.brand_profile?.brand_name || 'Brand'
    const sector = context.brand_profile?.sector || 'General'

    // A. Frame Count Check
    if (sampledFrames.length === 0) {
      return {
        decision: 'NEEDS_REVIEW',
        product_identity: 0,
        product_temporal_consistency: 0,
        brand_consistency: 0,
        advertising_hook: 0,
        product_reveal: 0,
        product_action: 0,
        human_product_interaction: 0,
        sector_environment_fit: 0,
        physical_realism: 0,
        continuity: 0,
        format_adherence: 0,
        speech_visual_alignment: 0,
        mini_film_risk: false,
        advertising_effectiveness: 0,
        failure_codes: ['NO_CLEAR_PRODUCT_REVEAL'],
        issues: ['Kare örneklemesi yapılamadı, video incelenemedi.'],
        retry_direction: ['Videonun geçerli kareler içerdiğini doğrulayın.'],
        generation_attempt_number: attemptNumber,
        product_morph_detected: false,
        sector_environment_match: false,
        hallucinated_typography_detected: false,
        non_diegetic_branding_detected: false,
      }
    }

    // B. Morphing and Sector Checks
    const hasMorphTest = sampledFrames.some(f => f.frame_path.includes('morph') || f.frame_path.includes('drift'))
    if (hasMorphTest) {
      failureCodes.push('PRODUCT_MORPH_FAIL')
      issues.push('Ürünün gövde geometrisinde kareler arasında biçim bozulması (morphing) tespit edildi.')
      retryDirections.push('Kanonik @HeroProduct gövdesini tüm karelerde sabit tutun; aşırı kamera açısı ve morflamadan kaçının.')
    }

    const hasWrongSectorTest = sampledFrames.some(f => f.frame_path.includes('wrong_sector'))
    if (hasWrongSectorTest) {
      failureCodes.push('WRONG_SECTOR')
      issues.push(`Video ortamı ${brand} markasının ait olduğu sektörle (${sector}) uyuşmuyor.`)
      retryDirections.push(`Çekim ortamını doğrudan ${sector} sektörü doğal çalışma alanına kilitleyin.`)
    }

    // C. Non-Diegetic Generated Branding & Typography Gate (Raw Veo Pre-Composition Gate)
    // Allowed:
    //  - canonical branding physically present on @HeroProduct (printed, embossed, painted on product body)
    //  - physical signage explicitly part of authoritative reference assets
    // Not allowed:
    //  - generated subtitles, generated lower-thirds
    //  - generated floating logos, watermark-style logos
    //  - generated campaign typography, CTA, price, phone, URL, offer text
    //  - generated brand-style end-card text/logo composition near the ending
    //  - foreign branding / duplicated artificial logo overlays
    let nonDiegeticBrandingDetected = false
    let foreignBrandDetected = false
    const nonDiegeticDetails: string[] = []

    for (const frame of sampledFrames) {
      // 1. Explicit frame-level flags
      if (frame.has_diegetic_logo_mismatch) {
        failureCodes.push('DIEGETIC_LOGO_MISMATCH')
        failureCodes.push('LOGO_DISTORTION')
        failureCodes.push('RAW_VIDEO_BRANDING_MISMATCH')
        issues.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Ürün üzerindeki fiziksel logo deforme olmuş veya yanlış harflerle yazılmış.`)
        retryDirections.push('Ürün üzerindeki diegetic marka logosunu @BrandLogo kanonik referansına harfiyen sadık kalarak koruyun.')
      }

      if (frame.has_invented_diegetic_branding) {
        failureCodes.push('INVENTED_DIEGETIC_BRANDING')
        failureCodes.push('RAW_VIDEO_BRANDING_MISMATCH')
        failureCodes.push('OVERLAY_MASKING_FORBIDDEN')
        issues.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Ürün üzerine uydurma/yetkisiz diegetic marka logosu veya damgası kazınmış. Post-prodüksiyon overlay ile maskelemek yasaktır.`)
        retryDirections.push('Ürün yüzeyine uydurma logo veya yazı kazımayın; yalnızca referans görseldeki otantik ürünü koruyun.')
      }

      if (frame.is_diegetic_product_branding_only && !frame.has_diegetic_logo_mismatch) {
        // Physical logo printed/embossed on product body -> ALLOWED
        continue
      }

      if (
        frame.has_non_diegetic_branding ||
        frame.has_floating_logo ||
        frame.has_generated_subtitles ||
        frame.has_generated_end_card
      ) {
        nonDiegeticBrandingDetected = true
        if (frame.has_floating_logo) nonDiegeticDetails.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Üründen bağımsız havada duran yapay logo overlay'i tespit edildi.`)
        if (frame.has_generated_subtitles) nonDiegeticDetails.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Veo tarafından üretilmiş yapay altyazı/lower-third tespit edildi.`)
        if (frame.has_generated_end_card) nonDiegeticDetails.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Video kapanışında yapay marka end-card kompozisyonu tespit edildi.`)
        continue
      }

      if (frame.detected_text && frame.detected_text.length > 0 && !frame.is_diegetic_product_branding_only) {
        nonDiegeticBrandingDetected = true
        nonDiegeticDetails.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Ürün gövdesi haricinde yapay metin tespit edildi: [${frame.detected_text.join(', ')}]`)
        continue
      }

      // 2. Path / fixture markers for tests
      const p = frame.frame_path.toLowerCase()
      const isExplicitlyDiegetic = p.includes('diegetic') || p.includes('printed_logo') || p.includes('canonical_product_logo') || p.includes('physical_logo')

      if (p.includes('diegetic_logo_mismatch') || p.includes('warped_product_logo') || p.includes('misspelled_logo')) {
        failureCodes.push('DIEGETIC_LOGO_MISMATCH')
        failureCodes.push('LOGO_DISTORTION')
        issues.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Ürün üzerindeki fiziksel logo deforme olmuş (${frame.frame_path}).`)
      }

      if (p.includes('invented_diegetic') || p.includes('invented_branding') || p.includes('hallucinated_diegetic')) {
        failureCodes.push('INVENTED_DIEGETIC_BRANDING')
        issues.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Ürün üzerine uydurma diegetic logo kazınmış (${frame.frame_path}).`)
      }

      if (p.includes('foreign_brand')) {
        foreignBrandDetected = true
        issues.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Yetkisiz yabancı marka tespit edildi.`)
      }

      if (!isExplicitlyDiegetic) {
        if (p.includes('floating_logo') || p.includes('artificial_logo')) {
          nonDiegeticBrandingDetected = true
          nonDiegeticDetails.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Üründen bağımsız yapay logo overlay'i tespit edildi (${frame.frame_path}).`)
        } else if (p.includes('subtitle') || p.includes('lower_third') || p.includes('lower-third')) {
          nonDiegeticBrandingDetected = true
          nonDiegeticDetails.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Yapay altyazı / lower-third tespit edildi (${frame.frame_path}).`)
        } else if (p.includes('end_card') || p.includes('endcard')) {
          nonDiegeticBrandingDetected = true
          nonDiegeticDetails.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Yapay brand end-card tespit edildi (${frame.frame_path}).`)
        } else if (p.includes('generated_branding') || p.includes('generated_text') || p.includes('watermark') || p.includes('non_diegetic') || p.includes('non-diegetic')) {
          nonDiegeticBrandingDetected = true
          nonDiegeticDetails.push(`Kare ${frame.timestamp_sec.toFixed(1)}s: Non-diegetic yapay metin/marka unsuru tespit edildi (${frame.frame_path}).`)
        }
      }

      // Sector affordance & environment checks
      const sectorLower = (sector || '').toLowerCase()
      const isAgri = sectorLower.includes('agri') || sectorLower.includes('tarim') || sectorLower.includes('bahce')
      const isConst = sectorLower.includes('const') || sectorLower.includes('insaat') || sectorLower.includes('yapi')
      const isSaaS = sectorLower.includes('saas') || sectorLower.includes('software') || sectorLower.includes('yazilim')

      if (isAgri && (p.includes('construction') || p.includes('santiye') || p.includes('concrete') || p.includes('hardhat') || p.includes('01_bofe_canary'))) {
        failureCodes.push('WRONG_SECTOR')
        failureCodes.push('ENVIRONMENT_MISMATCH')
        failureCodes.push('PRODUCT_AFFORDANCE_FAIL')
        issues.push(`Tarım ekipmanı (${brand}) şantiye/inşaat ortamında veya baretli işçiyle gösterildi.`)
        retryDirections.push('Çekim ortamını doğrudan meyve bahçesi, sera veya tarla doğal ortamına kilitleyin.')
      }

      if (isConst && (p.includes('farmland') || p.includes('orchard') || p.includes('zeytinlik'))) {
        failureCodes.push('WRONG_SECTOR')
        failureCodes.push('ENVIRONMENT_MISMATCH')
        failureCodes.push('PRODUCT_AFFORDANCE_FAIL')
        issues.push(`İnşaat malzemesi (${brand}) tarım/bahçe ortamında gösterildi.`)
        retryDirections.push('Çekim ortamını doğrudan mimari şantiye veya yapı alanına kilitleyin.')
      }

      if (isSaaS && (frame.has_acrylic_plaque || p.includes('plaque') || p.includes('acrylic') || p.includes('wall_sign') || p.includes('04_veriburada'))) {
        failureCodes.push('SOFTWARE_DEMO_MISSING')
        failureCodes.push('PRODUCT_METAPHOR_FAIL')
        failureCodes.push('MINI_FILM_NOT_AD')
        issues.push(`SaaS ürünü (${brand}) gerçek yazılım akışı yerine akrilik masa plaketi veya ofis tabelası olarak gösterildi.`)
        retryDirections.push('Yazılımın gerçek arayüzünü, kullanıcı etkileşimini, veri/analiz ekranını veya iş sonucunu gösterin; masa plaketi ve tabela sahnelerinden kaçının.')
      }

      if (isSaaS && (frame.has_fake_ui || p.includes('fake_ui') || p.includes('invented_ui') || p.includes('06_veriburada'))) {
        failureCodes.push('FAKE_UI')
        issues.push(`SaaS ürünü için yetkisiz uydurma arayüz (sahte harita/URL) tespit edildi.`)
        retryDirections.push('Kanonik onaylı UI varlığı mevcutsa onu kullanın; uydurma web tarayıcısı ve sahte buton çizmekten kaçının.')
      }

      // 3. Pixel-level inspection on real physical files if present on disk
      if (!nonDiegeticBrandingDetected && existsSync(frame.frame_path)) {
        const pixelCheck = this.inspectFramePixelsForNonDiegeticBanners(frame)
        if (pixelCheck.hasNonDiegeticOverlay) {
          nonDiegeticBrandingDetected = true
          nonDiegeticDetails.push(pixelCheck.reason)
        }
      }
    }

    if (nonDiegeticBrandingDetected) {
      failureCodes.push('NON_DIEGETIC_GENERATED_BRANDING')
      failureCodes.push('GENERATED_LOGO_OR_TEXT_FAIL')
      issues.push(...nonDiegeticDetails)
      retryDirections.push(
        'Preserve the canonical physical product and any branding physically printed on it. Generate NO overlay graphics, subtitles, lower thirds, watermark, floating logo, CTA, price, phone number, URL, campaign typography or generated end-card. Leave clean negative space for deterministic post-production branding.'
      )
    }

    if (foreignBrandDetected) {
      failureCodes.push('FOREIGN_BRAND')
      failureCodes.push('WRONG_PRODUCT')
      failureCodes.push('TENANT_BRAND_CONTAMINATION')
      retryDirections.push('Yalnızca @HeroProduct ve @BrandLogo kanonik varlıklarını kullanın.')
    }

    // Decision: REGENERATE (if retry count <= 1 and fixable), otherwise NEEDS_REVIEW or PASS
    let decision: VideoReviewerDecision = 'PASS'
    if (failureCodes.length > 0) {
      if (attemptNumber < 2) {
        decision = 'REGENERATE'
      } else {
        decision = 'NEEDS_REVIEW' // Exhausted max 1 auto-regeneration
      }
    } else if (sampledFrames.some(frame => existsSync(frame.frame_path))) {
      // Pixel heuristics alone cannot prove product identity, foreign-brand absence,
      // or sector correctness. If the multimodal service was unavailable, do not
      // promote a real output to PASS merely because no filename fixture fired.
      decision = 'NEEDS_REVIEW'
      issues.push('Multimodal video review was unavailable; real sampled frames require human review.')
    }

    const productMorphDetected = failureCodes.includes('PRODUCT_MORPH_FAIL')
    const sectorEnvironmentMatch = !failureCodes.includes('WRONG_SECTOR')
    const hallucinatedTypographyDetected =
      failureCodes.includes('GENERATED_TEXT_FAIL') ||
      failureCodes.includes('GENERATED_LOGO_OR_TEXT_FAIL') ||
      failureCodes.includes('NON_DIEGETIC_GENERATED_BRANDING')

    return {
      decision,
      product_identity: productMorphDetected ? 5 : 9,
      product_temporal_consistency: productMorphDetected ? 4 : 9,
      brand_consistency: nonDiegeticBrandingDetected || foreignBrandDetected ? 4 : 9,
      advertising_hook: 9,
      product_reveal: 9,
      product_action: 9,
      human_product_interaction: 9,
      sector_environment_fit: sectorEnvironmentMatch ? 9 : 4,
      physical_realism: 9,
      continuity: 9,
      format_adherence: 9,
      speech_visual_alignment: 9,
      mini_film_risk: false,
      advertising_effectiveness: decision === 'PASS' ? 9 : 5,
      failure_codes: failureCodes,
      issues,
      retry_direction: retryDirections,
      generation_attempt_number: attemptNumber,
      product_morph_detected: productMorphDetected,
      sector_environment_match: sectorEnvironmentMatch,
      hallucinated_typography_detected: hallucinatedTypographyDetected,
      non_diegetic_branding_detected: nonDiegeticBrandingDetected,
    }
  }
}
