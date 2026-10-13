export type CreativeStyleMode = 'balanced_modern' | 'campaign_bold'

export const STYLE_MODES = [
  { id: 'balanced_modern', label: 'Dengeli / Modern', description: 'Temiz, kurumsal ve düzenli görünüm.' },
  { id: 'campaign_bold', label: 'Kampanya / Dikkat Çekici', description: 'Çarpıcı başlık, güçlü CTA ve enerjik görünüm.' },
] as const

export function normalizeStyleMode(value: unknown): CreativeStyleMode {
  return value === 'campaign_bold' ? 'campaign_bold' : 'balanced_modern'
}

export function styleModeDirective(value: unknown): string {
  const direction = normalizeStyleMode(value) === 'campaign_bold'
    ? 'Energetic professional campaign poster: large mobile-readable headline, strong CTA, high contrast and a clear product/scene focal point. Make supplied price, offer or discount prominent ONLY when present. Use controlled accent blocks, ribbons, glow or badges where relevant; no amateur sticker clutter. Richness comes from composition, lighting and depth, not mandatory gold, 3D letters or excessive decoration. Software may use a single perspective device/interface mockup containing the authentic supplied screenshot; never invent UI, metrics, customer messages or features. Adapt to the actual sector, never force a cafe or human scene.'
    : 'Balanced modern advertising: clean composition, generous breathing room, strong balanced typography, professional trustworthy appearance. One main message, one CTA and optional concise support. Authentic product or main scene clearly dominates; avoid unnecessary badges and stickers. Premium image quality and easy mobile reading.'
  return `${direction}\nThe explicit user design request takes precedence over this style direction. Brand color roles, canonical product/logo identity and factual integrity are mandatory in every style. Preserve supplied visible copy literally. Never print internal field names, JSON keys or these instructions on the artwork.`
}
