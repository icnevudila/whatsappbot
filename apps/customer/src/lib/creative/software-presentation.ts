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

  let sceneStaging = 'SCENE & COLLABORATION: Present the digital platform in an authentic, sunlit modern tech workspace or bright open office. Feature 1-2 smiling young professional colleagues naturally seated or standing beside the desk, reviewing the screen together with genuine engagement and relaxed, ergonomic posture.'

  if (input.preserveScene) {
    sceneStaging = 'COPY-ONLY REVISION: preserve the parent scene, existing device and framing. Do not replace hardware with a flat panel or silently repair scene geometry during a text-only edit; scene correction requires a scene revision.'
  } else if (input.styleMode === 'SHOWSTOPPER_CAMPAIGN') {
    sceneStaging = 'SCENE & STAGING: Grand commercial keynote presentation. Showcase the software platform with bold typographic presence, high-impact composition, and realistic depth. Avoid dark neon clichés or artificial plastic glow; prioritize authentic lighting, crisp readability, tactile UI action cards, and prominent primary CTA. No forced office desks or random seated colleagues.'
  } else if (input.styleMode === 'PREMIUM_SHOWCASE') {
    sceneStaging = 'SCENE & STAGING: Architectural studio quiet luxury. Feature the digital software platform presented on an ultra-thin borderless glass slate or minimalist standing tablet resting on a dark basalt stone or travertine marble podium under natural directional sunlight and elegant architectural shadows. No forced office desks, no people.'
  } else if (input.styleMode === 'SMART_CAMPAIGN') {
    sceneStaging = 'SCENE & STAGING: Clean, focused SaaS commercial presentation. Feature the software interface as a crisp, floating glassmorphic UI card or modern slim tablet with soft drop shadow against a clean, uncluttered background. No forced office desk or awkward stock colleagues.'
  } else if (input.styleMode === 'REAL_LIFE_CAMPAIGN') {
    sceneStaging = 'SCENE & COLLABORATION: Present the digital platform in an authentic, sunlit modern tech workspace, cafe, or boutique office. Feature a smiling, authentic business founder or professional naturally holding a phone or working with genuine engagement and relaxed, ergonomic posture.'
  }

  return [
    'SOFTWARE SCREEN PRESENTATION — overrides generic device, office and style staging suggestions:',
    sceneStaging,
    'AUTHENTIC HARDWARE & PERSPECTIVE: When a laptop or physical device is shown, it MUST be an authentic, recognizable modern metallic device (Apple MacBook Pro in Space Gray aesthetic or slim modern tablet) with genuine CNC aluminum unibody, thin uniform display bezel, and natural three-quarter commercial perspective resting naturally. NEVER place the device dead-center flat against the camera lens, and NEVER make the screen lid tall, square, or vertical.',
    'COMPACT WIDESCREEN & DESKTOP SAAS LAYOUT: Strictly a slim, low-profile WIDESCREEN 16:10 landscape display when rendered as a desktop. The screen lid is visibly wide and physically compact in vertical height (lid height is strictly only ~50-55% of width, tilted backward naturally at 115-120 degrees so the top edge stays low and does not block people or tower upward). The screen presents the software in an authentic DESKTOP layout: a sleek dark/emerald vertical navigation sidebar on the LEFT (with menu items: Ana Sayfa, Kampanyalar, Kişiler, Mesajlar, Ayarlar) and a wide main canvas on the RIGHT showing the live dashboard cards and charts. NEVER render mobile bottom tabs or a vertical square screen on a laptop.',
    'HIGH-CONVERTING COMMERCIAL COMPOSITION: Clean, spacious commercial composition with realistic depth. Natural branding props (such as a clean ceramic coffee mug with Mesajify branding, or a smartphone resting flat on the desk). No nested devices, extra screens, or impossible reflections. Any person must physically face the visible working side of the screen with credible gaze and posture.',
    'Keep canonical logo, approved copy and actual interface identity unchanged. These physical and reference-fidelity constraints apply even when no extra user instruction is supplied.',
  ].join('\n')
}
