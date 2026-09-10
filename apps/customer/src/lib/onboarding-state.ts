import { cache } from 'react'
import type { Json } from '@wa/shared'
import { getAuthIdentity } from '@/lib/supabase/server'
import {
  computeFurthestStep,
  isCustomerOnboardingProfileStep,
  PROFILE_TO_STEP,
  stepIndex,
  type OnboardingAccount,
  type OnboardingBrand,
  type OnboardingFlags,
  type OnboardingOrg,
  type OnboardingStep,
} from '@/lib/onboarding'

export type OnboardingSnapshot = {
  userId: string
  email: string
  complete: boolean
  furthest: OnboardingStep
  org: OnboardingOrg | null
  account: OnboardingAccount | null
  brand: OnboardingBrand | null
  accountConnected: boolean
}

function asFlags(raw: Json | null | undefined): OnboardingFlags {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const obj = raw as Record<string, unknown>
  return {
    brand_analyzed: obj.brand_analyzed === true,
    skipped_contacts: obj.skipped_contacts === true,
    contacts_imported: obj.contacts_imported === true,
    contacts_imported_count: (() => {
      const n = Number(obj.contacts_imported_count)
      return Number.isFinite(n) ? n : undefined
    })(),
  }
}

export const loadOnboardingSnapshot = cache(async (): Promise<OnboardingSnapshot | null> => {
  const { supabase, userId, email } = await getAuthIdentity()
  if (!userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_step, onboarded_at, active_org_id')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.onboarded_at || profile?.onboarding_step === 'done') {
    return {
      userId,
      email: email ?? '',
      complete: true,
      furthest: 'marka',
      org: null,
      account: null,
      brand: null,
      accountConnected: false,
    }
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const orgId = membership?.org_id ?? profile?.active_org_id ?? null

  let org: OnboardingOrg | null = null
  let account: OnboardingAccount | null = null
  let brand: OnboardingBrand | null = null
  let campaignCount = 0
  let contactCount = 0

  if (orgId) {
    const [orgRes, accountRes, brandRes, campaignRes, contactRes] = await Promise.all([
      supabase
        .from('organizations')
        .select('id, name, address, about, phone_e164, onboarding')
        .eq('id', orgId)
        .maybeSingle(),
      supabase
        .from('accounts')
        .select('id, status, phone_e164, pairing_code, pairing_expires_at')
        .eq('org_id', orgId)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('brand_kits')
        .select('name, colors, fonts, tone, logo_path')
        .eq('org_id', orgId)
        .eq('is_default', true)
        .maybeSingle(),
      supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId),
    ])

    if (orgRes.data) {
      org = {
        id: orgRes.data.id,
        name: orgRes.data.name,
        address: orgRes.data.address,
        about: orgRes.data.about,
        phone_e164: orgRes.data.phone_e164,
        onboarding: asFlags(orgRes.data.onboarding),
      }
    }

    if (accountRes.data) {
      account = {
        id: accountRes.data.id,
        status: accountRes.data.status,
        phone_e164: accountRes.data.phone_e164,
        pairing_code: accountRes.data.pairing_code,
        pairing_expires_at: accountRes.data.pairing_expires_at,
      }
    }

    if (brandRes.data) {
      const colors =
        brandRes.data.colors && typeof brandRes.data.colors === 'object'
          ? (brandRes.data.colors as Record<string, string>)
          : {}
      const fonts =
        brandRes.data.fonts && typeof brandRes.data.fonts === 'object'
          ? (brandRes.data.fonts as Record<string, string>)
          : {}
      brand = {
        name: brandRes.data.name,
        colors,
        fonts,
        tone: brandRes.data.tone,
        logo_path: brandRes.data.logo_path,
      }
    }

    campaignCount = campaignRes.count ?? 0
    contactCount = contactRes.count ?? 0
  }

  const accountConnected = account?.status === 'connected'
  const brandReady = Boolean(brand && (brand.tone || org?.onboarding.brand_analyzed))
  const inCustomerFlow = isCustomerOnboardingProfileStep(profile?.onboarding_step)

  const legacyReady =
    !inCustomerFlow &&
    Boolean(org) &&
    (accountConnected || campaignCount > 0 || contactCount > 0 || Boolean(brand))

  const complete = Boolean(profile?.onboarded_at) || profile?.onboarding_step === 'done' || legacyReady

  const furthestFromData = complete
    ? 'marka'
    : computeFurthestStep({ org, accountConnected, brandReady })
  const fromProfile = PROFILE_TO_STEP[profile?.onboarding_step ?? '']
  const furthest: OnboardingStep =
    fromProfile && stepIndex(fromProfile) > stepIndex(furthestFromData)
      ? fromProfile
      : furthestFromData

  return {
    userId,
    email: email ?? '',
    complete,
    furthest,
    org,
    account,
    brand,
    accountConnected,
  }
})
