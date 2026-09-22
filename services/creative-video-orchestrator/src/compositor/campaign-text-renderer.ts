import type { BrandContextSnapshot } from '../types/brand-snapshot.js'

export interface CampaignTextPayload {
  headline?: string
  offer?: string
  price?: string
  cta: string
  phoneNumber?: string
  website?: string
  disclaimer?: string
}

export interface LowerThirdRenderSpec {
  textLine1: string
  textLine2?: string
  fontFamily: string
  fontSize: number
  primaryColor: string
  accentColor: string
  backgroundColor: string
  boxPaddingPx: number
  borderRadiusPx: number
  startSec: number
  durationSec: number
  yPositionExpr: string // mobile safe zone (e.g. above TikTok/Reels UI)
  drawtextFilter: string
}

export interface EndCardTemplateSpec {
  templateFamily: 'minimalist_center' | 'split_product_cta' | 'modern_bold_banner' | 'software_hero_close'
  headline: string
  offerPriceText?: string
  ctaText: string
  contactInfo?: string
  backgroundColor: string
  accentColor: string
  durationSec: number
  filterComplexSnippet: string
}

/**
 * Deterministic Campaign Text Renderer.
 * Ensures pricing, discounts, phone numbers, website URLs, and CTA text
 * are NEVER generated or drawn by generative AI (Veo/Gemini).
 * Formulates strict, pixel-perfect FFmpeg drawtext or overlay specs grounded in BrandContextSnapshot.
 */
export class DeterministicCampaignTextRenderer {
  /**
   * Builds the deterministic Lower-Third specification.
   * Mobile-safe: kept above bottom 18% to avoid Reels/TikTok overlay occlusion.
   */
  public buildLowerThird(
    snapshot: BrandContextSnapshot,
    timing = { startSec: 1.5, durationSec: 4.5 }
  ): LowerThirdRenderSpec {
    const palette = snapshot.brand_palette
    const typography = snapshot.typography

    const unverifiedList = (snapshot.unverified_facts || []).map(u => u.toLowerCase().trim())
    const isVerified = (val?: string): boolean => {
      if (!val || !val.trim()) return false
      const lower = val.toLowerCase().trim()
      return !unverifiedList.some(unv => unv && lower.includes(unv))
    }

    // Line 1: Primary Product or Campaign Headline (only if verified)
    const rawHeadline = isVerified(snapshot.campaign.offer)
      ? snapshot.campaign.offer
      : isVerified(snapshot.campaign.headline)
      ? snapshot.campaign.headline
      : snapshot.brand_name
    const textLine1 = rawHeadline || snapshot.brand_name

    // Line 2: Price or Supporting Value (only if verified)
    const textLine2 = isVerified(snapshot.campaign.price) ? `Fiyat: ${snapshot.campaign.price}` : undefined

    const primaryColor = typography.primaryColor || '#FFFFFF'
    const accentColor = palette.accent || typography.accentColor || '#00FFCC'
    const backgroundColor = palette.primary || '#0A2E28'

    // Clean text for FFmpeg drawtext (escaping colons, single quotes)
    const escapedLine1 = textLine1.replace(/'/g, '').replace(/:/g, '\\:')
    const escapedLine2 = textLine2 ? textLine2.replace(/'/g, '').replace(/:/g, '\\:') : ''

    const fontSize = 34
    const lineSpacing = 10
    // Mobile safe zone: 72% down the screen (above TikTok buttons)
    const yExpr = 'h*0.72'

    // FFmpeg drawtext with box background
    let drawtext = `drawtext=text='${escapedLine1}':fontcolor=${primaryColor}:fontsize=${fontSize}:box=1:boxcolor=${backgroundColor}@0.85:boxborderw=16:x=(w-text_w)/2:y=${yExpr}:enable='between(t,${timing.startSec},${timing.startSec + timing.durationSec})'`

    if (escapedLine2) {
      drawtext += `,drawtext=text='${escapedLine2}':fontcolor=${accentColor}:fontsize=${fontSize - 6}:box=1:boxcolor=${backgroundColor}@0.85:boxborderw=12:x=(w-text_w)/2:y=${yExpr}+${fontSize + lineSpacing}:enable='between(t,${timing.startSec + 0.3},${timing.startSec + timing.durationSec})'`
    }

    return {
      textLine1,
      textLine2,
      fontFamily: typography.headingFont || 'Arial',
      fontSize,
      primaryColor,
      accentColor,
      backgroundColor,
      boxPaddingPx: 16,
      borderRadiusPx: 8,
      startSec: timing.startSec,
      durationSec: timing.durationSec,
      yPositionExpr: yExpr,
      drawtextFilter: drawtext,
    }
  }

  /**
   * Generates a deterministic End-Card specification for the final 1.5 - 2.0s of the short ad.
   */
  public buildEndCard(
    snapshot: BrandContextSnapshot,
    templateFamily: 'minimalist_center' | 'split_product_cta' | 'modern_bold_banner' | 'software_hero_close' = 'minimalist_center',
    endCardDurationSec = 2.0
  ): EndCardTemplateSpec {
    const palette = snapshot.brand_palette
    const campaign = snapshot.campaign
    const unverifiedList = (snapshot.unverified_facts || []).map(u => u.toLowerCase().trim())

    const isVerified = (val?: string): boolean => {
      if (!val || !val.trim()) return false
      const lower = val.toLowerCase().trim()
      return !unverifiedList.some(unv => unv && lower.includes(unv))
    }

    const headline = snapshot.brand_name
    const validOffer = isVerified(campaign.offer) ? campaign.offer : undefined
    const validPrice = isVerified(campaign.price) ? campaign.price : undefined
    const offerPrice = [validOffer, validPrice].filter(Boolean).join(' | ')
    const ctaText = isVerified(campaign.cta) ? campaign.cta : `${snapshot.brand_name} Güvencesiyle`

    // Only render phone or website IF explicitly provided AND not in unverified_facts
    const validPhone = isVerified(campaign.phoneNumber) ? campaign.phoneNumber : undefined
    const validWebsite = isVerified(campaign.website) ? campaign.website : undefined
    const contactInfo = [validPhone, validWebsite].filter(Boolean).join(' | ') || undefined

    const bgColor = palette.primary || '#0A2E28'
    const accentColor = palette.accent || '#FFD700'

    const escapedHeadline = headline.replace(/'/g, '').replace(/:/g, '\\:')
    const escapedCTA = ctaText.replace(/'/g, '').replace(/:/g, '\\:')
    const escapedOffer = offerPrice.replace(/'/g, '').replace(/:/g, '\\:')
    const escapedContact = contactInfo ? contactInfo.replace(/'/g, '').replace(/:/g, '\\:') : ''

    // Video duration is typically 8s, so end card runs from 6.0 to 8.0
    const startSec = Math.max(0, snapshot.requested_duration - endCardDurationSec)

    // Build responsive end card filter snippet
    const filterSnippet = [
      `drawbox=x=0:y=0:w=iw:h=ih:color=${bgColor}@0.95:t=fill:enable='between(t,${startSec},${snapshot.requested_duration})'`,
      `drawtext=text='${escapedHeadline}':fontcolor=white:fontsize=46:x=(w-text_w)/2:y=h*0.32:enable='between(t,${startSec},${snapshot.requested_duration})'`,
      escapedOffer ? `drawtext=text='${escapedOffer}':fontcolor=${accentColor}:fontsize=30:x=(w-text_w)/2:y=h*0.44:enable='between(t,${startSec},${snapshot.requested_duration})'` : '',
      `drawtext=text='${escapedCTA}':fontcolor=white:fontsize=36:box=1:boxcolor=${accentColor}@0.9:boxborderw=20:x=(w-text_w)/2:y=h*0.58:enable='between(t,${startSec + 0.3},${snapshot.requested_duration})'`,
      escapedContact ? `drawtext=text='${escapedContact}':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h*0.75:enable='between(t,${startSec + 0.3},${snapshot.requested_duration})'` : '',
    ].filter(Boolean).join(',')

    return {
      templateFamily,
      headline,
      offerPriceText: offerPrice || undefined,
      ctaText,
      contactInfo,
      backgroundColor: bgColor,
      accentColor,
      durationSec: endCardDurationSec,
      filterComplexSnippet: filterSnippet,
    }
  }

  /**
   * Builds official CapCut Pro kinetic ASS subtitles where the currently spoken word
   * glows in neon yellow/cyan, with bold Arial Black typography, thick outline, soft shadow,
   * and ZERO clunky black background boxes.
   */
  public buildCapCutKineticAss(
    words: Array<{ word: string; start: number; end: number }>,
    options: {
      playResX?: number
      playResY?: number
      fontName?: string
      fontSize?: number
      activeColor?: string
      inactiveColor?: string
      outlineWidth?: number
      shadowDepth?: number
      marginV?: number
    } = {}
  ): string {
    const playResX = options.playResX || 1080
    const playResY = options.playResY || 1920
    const fontName = options.fontName || 'Arial Black'
    const fontSize = options.fontSize || 58
    const activeColor = options.activeColor || '&H0026FFFF&' // Neon Yellow in BGR hex
    const inactiveColor = options.inactiveColor || '&H00FFFFFF&' // Pure White in BGR hex
    const outline = options.outlineWidth || 5.5
    const shadow = options.shadowDepth || 2.5
    const marginV = options.marginV || 320

    const fmtAss = (t: number): string => {
      const safeT = Math.max(0.0, Number(t) || 0)
      const h = Math.floor(safeT / 3600)
      const m = Math.floor((safeT % 3600) / 60)
      const s = Math.floor(safeT % 60)
      let cs = Math.round((safeT - Math.floor(safeT)) * 100)
      if (cs >= 100) cs = 99
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`
    }

    // Chunk into 2-4 words
    const chunks: Array<Array<{ word: string; start: number; end: number }>> = []
    let curr: Array<{ word: string; start: number; end: number }> = []
    for (const w of words) {
      curr.push(w)
      if (curr.length >= 3 || w.word.endsWith('.') || w.word.endsWith(',') || w.word.endsWith('!')) {
        chunks.push(curr)
        curr = []
      }
    }
    if (curr.length > 0) chunks.push(curr)

    const dialogues: string[] = []
    for (let chkIdx = 0; chkIdx < chunks.length; chkIdx++) {
      const chk = chunks[chkIdx]!
      const chkStart = chk[0]!.start
      const rawEnd = chk[chk.length - 1]!.end
      let chkEnd = rawEnd + 0.15
      if (chkIdx < chunks.length - 1) {
        const nextS = chunks[chkIdx + 1]![0]!.start
        chkEnd = Math.min(rawEnd + 0.15, nextS - 0.05)
        if (chkEnd <= chkStart) chkEnd = nextS - 0.02
      }

      const cleanWords = chk.map(w =>
        w.word.toUpperCase().replace(/[.,!?;:]/g, '')
      )

      for (let localIdx = 0; localIdx < chk.length; localIdx++) {
        const wInfo = chk[localIdx]!
        const wS = Math.max(chkStart, wInfo.start)
        let wE = chkEnd
        if (localIdx < chk.length - 1) {
          wE = Math.min(chkEnd, chk[localIdx + 1]!.start)
        }
        if (wE <= wS) wE = wS + 0.15

        const parts: string[] = []
        for (let i = 0; i < cleanWords.length; i++) {
          if (i === localIdx) {
            parts.push(`{\\c${activeColor}}` + cleanWords[i])
          } else {
            parts.push(`{\\c${inactiveColor}}` + cleanWords[i])
          }
        }
        const line = parts.join(' ')
        dialogues.push(`Dialogue: 0,${fmtAss(wS)},${fmtAss(wE)},CapCutNeon,,0,0,0,,${line}`)
      }
    }

    const assHeader = `[Script Info]
Title: Deterministic CapCut Kinetic Subtitles
ScriptType: v4.00+
PlayResX: ${playResX}
PlayResY: ${playResY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: CapCutNeon,${fontName},${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,2,0,1,${outline},${shadow},2,40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`
    return assHeader + dialogues.join('\n') + '\n'
  }
}
