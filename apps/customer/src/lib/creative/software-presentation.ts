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
      : 'Without an explicit device request, present the supplied interface directly as a clean flat panel at its original aspect ratio. A screenshot is interface content, not a photograph of hardware. Do not automatically wrap it in a laptop or phone.',
    'If the user explicitly requests hardware, keep standard real-world device geometry: a landscape laptop display (typically 16:10 or 16:9), matched-width keyboard base, connected hinge and consistent perspective. Never elongate the lid or turn a laptop display into a portrait tablet to fit the screenshot.',
    'Fit the complete screenshot proportionally inside the display with neutral padding where needed. Never stretch, squeeze, redraw, duplicate or invent interface content. The advertisement canvas aspect ratio must not change the screenshot or hardware proportions.',
    'Use one coherent presentation. No nested devices, extra screens, decorative branded props or impossible reflections. Any person must physically face the visible working side of the screen with credible gaze and posture.',
    'Keep canonical logo, approved copy and actual interface identity unchanged. These physical and reference-fidelity constraints apply even when no extra user instruction is supplied.',
  ].join('\n')
}
