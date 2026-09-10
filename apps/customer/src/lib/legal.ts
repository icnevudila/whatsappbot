/**
 * Yasal metinlerde görünen işletmeci ünvanı.
 * Vercel’de NEXT_PUBLIC_LEGAL_ENTITY_NAME ile gerçek şirket ünvanını verin.
 */
export function legalEntityName(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim()
  if (fromEnv) return fromEnv
  return 'Filo'
}

export const LEGAL_CONTACT = {
  kvkk: 'kvkk@filo.app',
  support: 'destek@filo.app',
} as const
