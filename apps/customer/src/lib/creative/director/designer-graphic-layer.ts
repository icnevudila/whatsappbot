/**
 * MESAJIFY CREATIVE STUDIO — DESIGNER GRAPHIC ACCENT LAYER
 *
 * Lightweight SVG/Sharp accent compositor for DESIGNER mode.
 * Evaluates graphic grammar (hairline frames, editorial marks, datum lines,
 * subtle translucent panels) to apply controlled, bespoke graphic polish
 * without obscuring the generated commercial hero image.
 *
 * Design grammar, NOT static Canva cards.
 */

import sharp, { type OverlayOptions } from 'sharp'
import type { ArtDirectionPlan } from './creative-director'

export interface DesignerGraphicOptions {
  width: number
  height: number
  plan?: ArtDirectionPlan | null
  brandPrimaryColor?: string | null
  brandAccentColor?: string | null
  enableEditorialFrame?: boolean
  enableAccentLines?: boolean
}

/**
 * Generates an SVG overlay containing subtle, non-intrusive graphic design accents
 * matching the archetype's graphic language.
 */
export function buildDesignerGraphicSvg(options: DesignerGraphicOptions): string | null {
  const { width, height, plan } = options
  if (!plan) return null

  const primary = options.brandPrimaryColor || '#008069'
  const accent = options.brandAccentColor || '#00a884'
  const archetype = plan.creative_archetype

  const elements: string[] = []

  // 1. EDITORIAL_LUXURY / MAGAZINE_COVER / ARCHITECTURAL_PRESTIGE: Razor hairline frame with corner notches
  if (
    archetype === 'EDITORIAL_LUXURY' ||
    archetype === 'MAGAZINE_COVER' ||
    archetype === 'ARCHITECTURAL_PRESTIGE' ||
    archetype === 'STUDIO_PEDESTAL'
  ) {
    const margin = Math.round(width * 0.035) // 38px on 1080
    const w = width - margin * 2
    const h = height - margin * 2
    const notch = 12

    elements.push(`
      <!-- Subtle Luxury Editorial Hairline Frame -->
      <rect x="${margin}" y="${margin}" width="${w}" height="${h}"
        fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="1" />
      <!-- Corner Coordinates / Registration Crosshairs -->
      <line x1="${margin - notch}" y1="${margin}" x2="${margin + notch}" y2="${margin}" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
      <line x1="${margin}" y1="${margin - notch}" x2="${margin}" y2="${margin + notch}" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
      <line x1="${width - margin - notch}" y1="${margin}" x2="${width - margin + notch}" y2="${margin}" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
      <line x1="${width - margin}" y1="${margin - notch}" x2="${width - margin}" y2="${margin + notch}" stroke="rgba(255,255,255,0.4)" stroke-width="1" />
    `)
  }

  // 2. INDUSTRIAL_POWER / HIGH_ENERGY_PERFORMANCE: Technical corner brackets & datum line
  if (archetype === 'INDUSTRIAL_POWER' || archetype === 'HIGH_ENERGY_PERFORMANCE') {
    const margin = Math.round(width * 0.03)
    const bracketSize = 24

    elements.push(`
      <!-- Technical Industrial Corner Brackets -->
      <path d="M ${margin + bracketSize} ${margin} L ${margin} ${margin} L ${margin} ${margin + bracketSize}"
        fill="none" stroke="${accent}" stroke-width="2.5" />
      <path d="M ${width - margin - bracketSize} ${height - margin} L ${width - margin} ${height - margin} L ${width - margin} ${height - margin - bracketSize}"
        fill="none" stroke="${accent}" stroke-width="2.5" />
    `)
  }

  // 3. MODERN_TECH_GLASS / FUTURISTIC_DATA: Subtle optical datum line & telemetry mark
  if (archetype === 'MODERN_TECH_GLASS' || archetype === 'FUTURISTIC_DATA') {
    const yTop = Math.round(height * 0.12)
    elements.push(`
      <!-- High-Tech Optical Datum Line -->
      <line x1="40" y1="${yTop}" x2="160" y2="${yTop}" stroke="${accent}" stroke-width="1.5" stroke-linecap="round" />
      <circle cx="168" cy="${yTop}" r="2" fill="${accent}" />
    `)
  }

  if (elements.length === 0) return null

  return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
      ${elements.join('\n')}
    </svg>
  `.trim()
}

/**
 * Conditionally applies designer graphic accents onto a base image buffer
 */
export async function applyDesignerGraphicAccents(
  imageBuffer: Buffer,
  options: DesignerGraphicOptions,
): Promise<Buffer> {
  const svg = buildDesignerGraphicSvg(options)
  if (!svg) return imageBuffer

  const overlay: OverlayOptions = {
    input: Buffer.from(svg),
    top: 0,
    left: 0,
  }

  return sharp(imageBuffer)
    .composite([overlay])
    .jpeg({ quality: 95 })
    .toBuffer()
}
