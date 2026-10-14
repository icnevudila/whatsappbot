export type CreativeStyleMode =
  | 'professional'
  | 'campaign_bold'
  | 'grand_campaign'

export const STYLE_MODES = [
  {
    id: 'professional',
    label: 'Profesyonel',
    description: 'Sade, dengeli ve kurumsal güven veren temiz reklam düzeni.',
  },
  {
    id: 'campaign_bold',
    label: 'Dikkat Çekici Kampanya',
    description: 'Güçlü başlık, canlı marka renkleri, ürün arayüzü ve yüksek etkileşimli CTA.',
    badge: 'Varsayılan',
  },
  {
    id: 'grand_campaign',
    label: 'Gösterişli Kampanya',
    description: 'Boyutlu 3D tipografi, zengin sahne katmanları, dinamik rozetler ve çarpıcı görsel derinlik.',
  },
] as const

export function normalizeStyleMode(value: unknown): CreativeStyleMode {
  if (value === 'professional' || value === 'PREMIUM_SHOWCASE' || value === 'balanced_modern' || value === 'minimal' || value === 'showcase') {
    return 'professional'
  }
  if (value === 'grand_campaign' || value === 'SHOWSTOPPER_CAMPAIGN' || value === 'showy' || value === 'bold_spectacle') {
    return 'grand_campaign'
  }
  // Default is 'campaign_bold' (Dikkat Çekici Kampanya)
  return 'campaign_bold'
}

export function styleModeDirective(value: unknown): string {
  const mode = normalizeStyleMode(value)
  let direction = ''

  if (mode === 'professional') {
    direction = 'Clean Professional B2B Commercial Visual: Natural daylight, sophisticated minimalist composition, elegant typography, generous breathing room, trustworthy B2B corporate aesthetic without aggressive neon or excessive badge clutter. Balanced lighting with authentic workplace realism.'
  } else if (mode === 'grand_campaign') {
    direction = 'Grand Showstopper Commercial Spectacle: Commanding 3D sculpted typography, rich multi-layered commercial poster staging with deep background atmosphere and cinematic lighting contrast. Volumetric lighting and specular reflections. Make verified promotional pricing, offer details or key benefits unmistakably prominent. Include tasteful floating glass badges, glowing dimensional icon accents, or feature ribbons where applicable. Cohesive layout. Never produce flat clipart or supermarket coupon chaos; richness comes from dimensional typography, spatial depth, and high-impact commercial polish.'
  } else {
    // campaign_bold (default)
    direction = 'High-Impact Commercial Campaign Visual (Default): Dynamic, conversion-focused advertising hierarchy tailored to the brand identity. For software/tech: do NOT make it a plain, static hand holding a phone in a generic pose. Integrate dynamic communication energy: floating frosted-glass WhatsApp notification pills or incoming message bubbles showing customer interaction, glowing rim lighting with emerald brand aura, confident modern entrepreneur or dynamic workspace context, bold 3D gradient brand typography, and an unmistakable high-contrast CTA pill button. Generous breathing room, perfectly balanced visual weight, and mobile-first readability.'
  }

  return `${direction}\nThe explicit user design request takes precedence over this style direction. Brand color roles, canonical product/logo identity and factual integrity are mandatory in every style. Preserve supplied visible copy literally. Never print internal field names, JSON keys, style mode names, variation names, or prompt/scene direction notes on the artwork.`
}
