export const ONBOARDING_STEPS = [
  'hosgeldin',
  'isletme',
  'adres',
  'hat',
  'rehber',
  'tanitim',
  'marka',
] as const

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number]

export const STEP_TO_PROFILE: Record<OnboardingStep, string> = {
  hosgeldin: 'c_welcome',
  isletme: 'c_isletme',
  adres: 'c_adres',
  hat: 'c_hat',
  rehber: 'c_rehber',
  tanitim: 'c_tanitim',
  marka: 'c_marka',
}

export const PROFILE_TO_STEP: Record<string, OnboardingStep> = {
  c_welcome: 'hosgeldin',
  c_isletme: 'isletme',
  c_adres: 'adres',
  c_hat: 'hat',
  c_rehber: 'rehber',
  c_tanitim: 'tanitim',
  c_marka: 'marka',
}

export type OnboardingFlags = {
  brand_analyzed?: boolean
  skipped_contacts?: boolean
  contacts_imported?: boolean
  contacts_imported_count?: number
}

export type OnboardingOrg = {
  id: string
  name: string
  address: string | null
  about: string | null
  phone_e164: string | null
  onboarding: OnboardingFlags
}

export type OnboardingAccount = {
  id: string
  status: string
  phone_e164: string | null
  pairing_code: string | null
  pairing_expires_at: string | null
}

export type OnboardingBrand = {
  name: string
  colors: Record<string, string>
  fonts: Record<string, string>
  tone: string | null
  logo_path: string | null
}

export function parseStep(raw: string | null | undefined): OnboardingStep | null {
  if (!raw) return null
  return (ONBOARDING_STEPS as readonly string[]).includes(raw) ? (raw as OnboardingStep) : null
}

export function stepIndex(step: OnboardingStep): number {
  return ONBOARDING_STEPS.indexOf(step)
}

export function isCustomerOnboardingProfileStep(step: string | null | undefined): boolean {
  return Boolean(step && step.startsWith('c_'))
}

export function computeFurthestStep(input: {
  org: OnboardingOrg | null
  accountConnected: boolean
  brandReady: boolean
}): OnboardingStep {
  const { org, accountConnected, brandReady } = input
  const flags = org?.onboarding ?? {}
  if (brandReady || flags.brand_analyzed) return 'marka'
  if (org?.about?.trim()) return 'marka'
  if (flags.skipped_contacts || flags.contacts_imported) return 'tanitim'
  if (accountConnected) return 'rehber'
  if (org?.address?.trim()) return 'hat'
  if (org) return 'adres'
  return 'hosgeldin'
}

export function clampStep(requested: OnboardingStep, furthest: OnboardingStep): OnboardingStep {
  return stepIndex(requested) > stepIndex(furthest) ? furthest : requested
}

export function formatTrMobileMask(raw: string): string {
  let digits = raw.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits[0] !== '0') digits = `0${digits}`.slice(0, 11)
  if (digits.length === 1) return '0'
  if (digits[1] !== '5') digits = `05${digits.slice(2)}`.slice(0, 11)

  const a = digits.slice(0, 4)
  const b = digits.slice(4, 7)
  const c = digits.slice(7, 9)
  const d = digits.slice(9, 11)
  return [a, b, c, d].filter(Boolean).join(' ')
}

export const TR_MOBILE_MASK = /^05[0-9]{2} [0-9]{3} [0-9]{2} [0-9]{2}$/

export function isTrMobileMasked(value: string): boolean {
  return TR_MOBILE_MASK.test(value)
}

export function e164ToMaskedTr(e164: string | null | undefined): string {
  if (!e164) return ''
  const digits = e164.replace(/\D/g, '')
  const local = digits.startsWith('90') ? `0${digits.slice(2)}` : digits.startsWith('0') ? digits : ''
  if (!local.startsWith('05')) return ''
  return formatTrMobileMask(local.slice(0, 11))
}
