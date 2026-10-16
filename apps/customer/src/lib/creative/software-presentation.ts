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
      : 'SCENE & COLLABORATION: Present the digital platform in an authentic, modern tech workspace or bright open office. Feature 2-3 collaborative, smiling young professional team members or colleagues naturally gathered around a modern landscape laptop, looking at the screen with genuine engagement and relaxed, ergonomic posture.',
    'DEVICE GEOMETRY & PROPORTIONS: The laptop MUST have a realistic physical landscape chassis (standard 16:10 or 16:9 widescreen ratio) with a matching horizontal keyboard base resting flat and stable on the wooden or office desk. Connected hinge and natural perspective. Never elongate the lid, never turn a laptop display into a portrait tablet or vertical screen to fit the screenshot, and never warp or bend the chassis.',
    'SCREEN FIDELITY: Present the supplied interface directly at its original aspect ratio inside the landscape display with neutral padding where needed. Never stretch, squeeze, redraw, duplicate or invent interface content. The advertisement canvas aspect ratio must not change the screenshot or hardware proportions.',
    'HIGH-CONVERTING COMMERCIAL COMPOSITION: Subtle, elegant glassmorphic floating UI feature badges/cards (such as status, campaign ready, metrics) and natural workspace props (such as a clean ceramic coffee mug with Mesajify branding, or a smartphone resting flat on the desk) provide realistic depth and commercial punch. No nested devices, extra screens, or impossible reflections. Any person must physically face the visible working side of the screen with credible gaze and posture.',
    'Keep canonical logo, approved copy and actual interface identity unchanged. These physical and reference-fidelity constraints apply even when no extra user instruction is supplied.',
  ].join('\n')
}
