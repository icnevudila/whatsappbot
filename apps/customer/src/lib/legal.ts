/**
 * Yasal metinlerde görünen işletmeci ve platform adı.
 * Vercel’de NEXT_PUBLIC_LEGAL_ENTITY_NAME ile şirket unvanı özelleştirilebilir.
 */
export function legalEntityName(): string {
  const fromEnv = process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim()
  if (fromEnv) return fromEnv
  return 'Mesajify'
}

export const LEGAL_CONTACT = {
  kvkk: 'kvkk@mesajify.com',
  support: 'destek@mesajify.com',
} as const
