import sharp, { type OverlayOptions } from 'sharp'
import { createHash } from 'node:crypto'
import { IMAGE_FORMATS_V2, type ImageFormatV2 } from './types'

export type CompositorInput = {
  baseImageBuffer: Buffer
  logoBuffer?: Buffer | null
  targetFormat: ImageFormatV2
  brandPalette?: {
    primary?: string | null
    accent?: string | null
    secondary?: string | null
  }
  copy: {
    headline: string
    supportingLine?: string | null
    price?: string | null
    oldPrice?: string | null
    offer?: string | null
    dateRange?: string | null
    cta?: string | null
  }
  layout?: {
    textSafeZone?: 'top_third' | 'bottom_third' | 'side_margin'
    logoPosition?: 'top_left' | 'top_right' | 'top_center'
  }
}

export type CompositedImageResult = {
  buffer: Buffer
  width: number
  height: number
  mimeType: string
  generationSha256: string
  finalSha256: string
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let currentLine = ''

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim()
    } else {
      if (currentLine) lines.push(currentLine)
      currentLine = word
    }
  }
  if (currentLine) lines.push(currentLine)
  return lines.slice(0, 3) // max 3 lines
}

export async function compositeCommercialCreative(
  input: CompositorInput,
): Promise<CompositedImageResult> {
  const formatConfig = IMAGE_FORMATS_V2.find((f) => f.id === input.targetFormat) || IMAGE_FORMATS_V2[0]
  const targetWidth = formatConfig.width
  const targetHeight = formatConfig.height

  // 1. Validate & Hash raw base image
  const generationSha256 = createHash('sha256').update(input.baseImageBuffer).digest('hex')

  // 2. Resize base image to target dimensions (cover crop)
  const baseResized = await sharp(input.baseImageBuffer)
    .resize(targetWidth, targetHeight, {
      fit: 'cover',
      position: 'center',
    })
    .toBuffer()

  // 3. Resolve Colors
  const primaryColor = input.brandPalette?.primary || '#008069'
  const accentColor = input.brandPalette?.accent || '#00a884'

  // 4. Prepare Copy & Typography
  const headline = (input.copy.headline || '').trim()
  const supporting = (input.copy.supportingLine || '').trim()
  const cta = (input.copy.cta || '').trim()
  const price = (input.copy.price || '').trim()
  const oldPrice = (input.copy.oldPrice || '').trim()
  const offer = (input.copy.offer || '').trim()
  const dateRange = (input.copy.dateRange || '').trim()

  const headlineLines = wrapText(headline, targetWidth > 1000 ? 24 : 20)
  const supportingLines = wrapText(supporting, targetWidth > 1000 ? 42 : 36)

  // Top header margin & spacing
  const sidePadding = Math.round(targetWidth * 0.055)
  const topPadding = Math.round(targetHeight * 0.045)
  const bottomPadding = Math.round(targetHeight * 0.045)

  // Process Logo if available
  let processedLogoBuffer: Buffer | null = null
  let logoWidth = 0
  let logoHeight = 0
  const maxLogoWidth = Math.round(targetWidth * 0.24)
  const maxLogoHeight = Math.round(targetHeight * 0.065)

  if (input.logoBuffer && input.logoBuffer.length > 32) {
    try {
      const logoMetadata = await sharp(input.logoBuffer).metadata()
      if (logoMetadata.width && logoMetadata.height) {
        processedLogoBuffer = await sharp(input.logoBuffer)
          .resize(maxLogoWidth, maxLogoHeight, {
            fit: 'inside',
            withoutEnlargement: true,
          })
          .png()
          .toBuffer()

        const resizedMeta = await sharp(processedLogoBuffer).metadata()
        logoWidth = resizedMeta.width || 0
        logoHeight = resizedMeta.height || 0
      }
    } catch (err) {
      console.warn('[DeterministicImageCompositor] Logo resize failed:', err)
      processedLogoBuffer = null
    }
  }

  // Determine Logo Position
  let logoLeft = sidePadding
  const logoTop = topPadding
  if (input.layout?.logoPosition === 'top_right') {
    logoLeft = targetWidth - sidePadding - logoWidth
  } else if (input.layout?.logoPosition === 'top_center') {
    logoLeft = Math.round((targetWidth - logoWidth) / 2)
  }

  // Calculate Text Positions
  const headlineStartY = topPadding + (logoHeight > 0 ? logoHeight + 35 : 20)
  const headlineFontSize = targetWidth > 1000 ? 48 : 40
  const headlineLineHeight = headlineFontSize * 1.2
  const headlineTotalHeight = headlineLines.length * headlineLineHeight

  const supportingStartY = headlineStartY + headlineTotalHeight + 14
  const supportingFontSize = targetWidth > 1000 ? 22 : 18
  const supportingLineHeight = supportingFontSize * 1.35
  const supportingTotalHeight = supportingLines.length * supportingLineHeight

  // Scrim / Backdrop height for maximum contrast
  const scrimHeight = Math.min(
    Math.round(targetHeight * 0.42),
    supportingStartY + supportingTotalHeight + 40,
  )

  // Badges: Offer or Price Pill
  let offerBadgeSvg = ''
  if (offer || price) {
    const badgeText = offer || (price ? `${price}${oldPrice ? ` (Eski: ${oldPrice})` : ''}` : '')
    const badgeY = supportingStartY + supportingTotalHeight + 18
    offerBadgeSvg = `
      <g transform="translate(${sidePadding}, ${badgeY})">
        <rect width="${Math.min(targetWidth - sidePadding * 2, badgeText.length * 15 + 40)}" height="42" rx="21" fill="${escapeXml(accentColor)}" filter="url(#drop-shadow)"/>
        <text x="20" y="27" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="bold" fill="#ffffff">
          ${escapeXml(badgeText)}
        </text>
      </g>
    `
  }

  // CTA Pill at Bottom
  let ctaSvg = ''
  if (cta) {
    const ctaY = targetHeight - bottomPadding - 54
    const ctaTextWidth = cta.length * 14 + 50
    ctaSvg = `
      <g transform="translate(${sidePadding}, ${ctaY})">
        <rect width="${ctaTextWidth}" height="50" rx="25" fill="${escapeXml(primaryColor)}" filter="url(#drop-shadow)"/>
        <text x="24" y="32" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="18" font-weight="bold" fill="#ffffff">
          ${escapeXml(cta)} →
        </text>
      </g>
    `
  }

  // Date range note at bottom right if provided
  let dateRangeSvg = ''
  if (dateRange) {
    const dateY = targetHeight - bottomPadding - 24
    dateRangeSvg = `
      <text x="${targetWidth - sidePadding}" y="${dateY}" text-anchor="end" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="14" font-weight="500" fill="rgba(255, 255, 255, 0.85)" filter="url(#text-shadow)">
        ${escapeXml(dateRange)}
      </text>
    `
  }

  // SVG Overlay Document
  const svgOverlay = `
    <svg width="${targetWidth}" height="${targetHeight}" viewBox="0 0 ${targetWidth} ${targetHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <!-- Top Contrast Scrim: dark gradient for white text legibility -->
        <linearGradient id="top-scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.75" />
          <stop offset="65%" stop-color="#000000" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />
        </linearGradient>

        <!-- Bottom Scrim for CTA bar -->
        <linearGradient id="bottom-scrim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.0" />
          <stop offset="40%" stop-color="#000000" stop-opacity="0.45" />
          <stop offset="100%" stop-color="#000000" stop-opacity="0.75" />
        </linearGradient>

        <!-- Shadow filter -->
        <filter id="drop-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#000000" flood-opacity="0.25" />
        </filter>
        <filter id="text-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.6" />
        </filter>
      </defs>

      <!-- Scrims -->
      <rect x="0" y="0" width="${targetWidth}" height="${scrimHeight}" fill="url(#top-scrim)" />
      <rect x="0" y="${targetHeight - Math.round(targetHeight * 0.18)}" width="${targetWidth}" height="${Math.round(targetHeight * 0.18)}" fill="url(#bottom-scrim)" />

      <!-- Headline Lines -->
      <g filter="url(#text-shadow)">
        ${headlineLines
          .map(
            (line, idx) => `
          <text
            x="${sidePadding}"
            y="${headlineStartY + idx * headlineLineHeight}"
            font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            font-size="${headlineFontSize}"
            font-weight="800"
            letter-spacing="-0.5"
            fill="#ffffff"
          >${escapeXml(line)}</text>
        `,
          )
          .join('')}
      </g>

      <!-- Supporting Lines -->
      <g filter="url(#text-shadow)">
        ${supportingLines
          .map(
            (line, idx) => `
          <text
            x="${sidePadding}"
            y="${supportingStartY + idx * supportingLineHeight}"
            font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
            font-size="${supportingFontSize}"
            font-weight="500"
            fill="rgba(255, 255, 255, 0.95)"
          >${escapeXml(line)}</text>
        `,
          )
          .join('')}
      </g>

      <!-- Offer Badge & CTA -->
      ${offerBadgeSvg}
      ${ctaSvg}
      ${dateRangeSvg}
    </svg>
  `

  // 5. Composite Elements
  const compositeLayers: OverlayOptions[] = [
    {
      input: Buffer.from(svgOverlay),
      top: 0,
      left: 0,
    },
  ]

  // Add Logo layer if present
  if (processedLogoBuffer) {
    // If the logo has a transparent background, give it a subtle white backing capsule if on dark scrim
    const logoPillPadding = 10
    const logoPillWidth = logoWidth + logoPillPadding * 2
    const logoPillHeight = logoHeight + logoPillPadding * 2

    const logoCapsuleSvg = Buffer.from(`
      <svg width="${logoPillWidth}" height="${logoPillHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" rx="${Math.round(logoPillHeight / 2)}" fill="#ffffff" fill-opacity="0.95" />
      </svg>
    `)

    compositeLayers.push({
      input: logoCapsuleSvg,
      top: logoTop - logoPillPadding,
      left: logoLeft - logoPillPadding,
    })

    compositeLayers.push({
      input: processedLogoBuffer,
      top: logoTop,
      left: logoLeft,
    })
  }

  const compositedBuffer = await sharp(baseResized)
    .composite(compositeLayers)
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toBuffer()

  const finalSha256 = createHash('sha256').update(compositedBuffer).digest('hex')

  return {
    buffer: compositedBuffer,
    width: targetWidth,
    height: targetHeight,
    mimeType: 'image/jpeg',
    generationSha256,
    finalSha256,
  }
}
