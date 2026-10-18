import type { OfferingKind } from './promotion-policy'

export function softwarePresentationDirective(input: {
  offeringKind?: OfferingKind
  promotionMode?: string
  context?: string
  preserveScene?: boolean
  styleMode?: string
}): string {
  if (input.promotionMode === 'brand' || (input.offeringKind && input.offeringKind !== 'software')) return ''
  if (input.offeringKind !== 'software' && !/yazılım|software|saas|uygulama|interface|dashboard|mesajify/i.test(input.context || '')) return ''

  let sceneStaging = 'SCENE & COLLABORATION: Present the digital platform in an authentic, sunlit modern tech workspace or bright open office with original aspect ratio as a flat, front-facing panel or sleek device with neutral padding. Never elongate the lid.'

  if (input.preserveScene) {
    sceneStaging = 'COPY-ONLY REVISION: preserve the parent scene, existing device and framing. Do not replace hardware with a flat panel or silently repair scene geometry during a text-only edit; scene correction requires a scene revision.'
  } else if (input.styleMode === 'SHOWSTOPPER_CAMPAIGN') {
    sceneStaging = 'SCENE & STAGING: Grand commercial keynote and monumental ad presentation. Showcase the software platform communicative power and dynamic messaging reach with bold typographic architecture, high-impact composition, and realistic depth. Avoid dark neon clichés or artificial plastic glow; prioritize authentic lighting, crisp readability, dynamic campaign flow action cards, and prominent primary CTA. No forced office desks, no repetitive laptops, no random seated colleagues.'
  } else if (input.styleMode === 'PREMIUM_SHOWCASE') {
    sceneStaging = 'SCENE & STAGING: Architectural studio quiet luxury. Feature the digital software platform presented on an ultra-thin borderless glass slate or floating minimalist panel in an architectural studio setting under natural directional sunlight and elegant architectural shadows. Generous negative space and pristine typography. No repetitive office desks, no people, no generic basalt podium.'
  } else if (input.styleMode === 'SMART_CAMPAIGN') {
    sceneStaging = 'SCENE & STAGING: Clean, conversion-focused SaaS commercial presentation. Feature the verified software interface as a crisp, floating glassmorphic UI card or modern slim tablet with soft drop shadow against a clean, uncluttered background with original aspect ratio. 1-2 verified workflow feature pills, high-contrast headline, and clear CTA. No forced office desk or awkward stock colleagues.'
  } else if (input.styleMode === 'REAL_LIFE_CAMPAIGN') {
    sceneStaging = 'SCENE & COLLABORATION: Present the digital platform in an authentic real-world business environment (sunlit cafe, boutique store, or modern workspace). Feature an authentic business founder or manager naturally holding a smartphone or modern tablet reviewing live WhatsApp campaigns with genuine smile and relaxed ergonomic posture.'
  }

  return [
    'SOFTWARE SCREEN PRESENTATION — overrides generic device, office and style staging suggestions:',
    sceneStaging,
    'AUTHENTIC HARDWARE & SCREEN FIDELITY: When a laptop or physical device is shown, it MUST be an authentic, recognizable modern metallic device (Apple MacBook Pro in Space Gray aesthetic or slim modern tablet) with genuine CNC aluminum unibody, thin uniform display bezel, and natural three-quarter commercial perspective resting naturally. NEVER place the device dead-center flat against the camera lens, NEVER make the screen lid tall, square, or vertical. Never elongate the lid. Preserve original aspect ratio with neutral padding; canvas aspect ratio must not change.',
    'COMPACT WIDESCREEN & DESKTOP SAAS LAYOUT: Strictly a slim, low-profile WIDESCREEN 16:10 landscape display when rendered as a desktop. The screen lid is visibly wide and physically compact in vertical height (lid height is strictly only ~50-55% of width, tilted backward naturally at 115-120 degrees so the top edge stays low and does not block people or tower upward). The screen presents the software in an authentic DESKTOP layout: a sleek dark/emerald vertical navigation sidebar on the LEFT (with menu items: Ana Sayfa, Kampanyalar, Kişiler, Mesajlar, Ayarlar) and a wide main canvas on the RIGHT showing the live dashboard cards and charts. NEVER render mobile bottom tabs or a vertical square screen on a laptop.',
    'HIGH-CONVERTING COMMERCIAL COMPOSITION: Clean, spacious commercial composition with realistic depth. No nested devices, extra screens, or impossible reflections. Any person featured must physically interact with the device with credible gaze and posture.',
    'Keep canonical logo, approved copy and actual interface identity unchanged. These physical and reference-fidelity constraints apply even when no extra user instruction is supplied.',
  ].join('\n')
}
