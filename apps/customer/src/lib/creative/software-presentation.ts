import type { OfferingKind } from './promotion-policy'

export function softwarePresentationDirective(input: {
  offeringKind?: OfferingKind
  promotionMode?: string
  context?: string
  preserveScene?: boolean
}): string {
  if (input.promotionMode === 'brand' || (input.offeringKind && input.offeringKind !== 'software')) return ''
  if (input.offeringKind !== 'software' && !/yazılım|software|saas|uygulama|interface|dashboard|mesajify/i.test(input.context || '')) return ''
  return [
    'SOFTWARE SCREEN PRESENTATION — overrides generic device, office and style staging suggestions:',
    input.preserveScene
      ? 'COPY-ONLY REVISION: preserve the parent scene, existing device and framing. Do not replace hardware with a flat panel or silently repair scene geometry during a text-only edit; scene correction requires a scene revision.'
      : 'SCENE & COLLABORATION: Present the digital platform in an authentic, sunlit modern tech workspace or bright open office. Feature 1-2 smiling young professional colleagues naturally seated or standing beside the desk, reviewing the screen together with genuine engagement and relaxed, ergonomic posture.',
    'AUTHENTIC LAPTOP HARDWARE & 3/4 PERSPECTIVE: The laptop MUST be an authentic, recognizable modern metallic laptop (Apple MacBook Pro 16-inch in Space Gray aesthetic) with genuine CNC aluminum unibody, thin uniform display bezel, black Magic Keyboard with function row, large glass trackpad, and clean cylindrical hinge. Always capture the laptop from a natural 30-35 degree three-quarter commercial perspective (3/4 angle) resting naturally on the desk surface. NEVER place the laptop dead-center flat against the camera lens, and NEVER make the screen lid tall, square, or vertical.',
    'COMPACT WIDESCREEN LID & DESKTOP SAAS LAYOUT: Strictly a slim, low-profile WIDESCREEN 16:10 landscape display. The screen lid is visibly wide and physically compact in vertical height (lid height is strictly only ~50-55% of width, tilted backward naturally at 115-120 degrees so the top edge stays low and does not block people or tower upward). The screen presents the software in an authentic DESKTOP layout: a sleek dark/emerald vertical navigation sidebar on the LEFT (with menu items: Ana Sayfa, Kampanyalar, Kişiler, Mesajlar, Ayarlar) and a wide main canvas on the RIGHT showing the live dashboard cards and charts. NEVER render mobile bottom tabs or a vertical square screen on the laptop.',
    'HIGH-CONVERTING COMMERCIAL COMPOSITION: Clean, spacious commercial desk composition with realistic depth. Natural workspace props (such as a clean ceramic coffee mug with Mesajify branding, or a smartphone resting flat on the desk). No nested devices, extra screens, or impossible reflections. Any person must physically face the visible working side of the screen with credible gaze and posture.',
    'Keep canonical logo, approved copy and actual interface identity unchanged. These physical and reference-fidelity constraints apply even when no extra user instruction is supplied.',
  ].join('\n')
}
