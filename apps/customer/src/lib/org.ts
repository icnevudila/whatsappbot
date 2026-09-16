import { cache } from 'react'
import { createSupabaseServerClient, getAuthIdentity } from '@/lib/supabase/server'
import { readActiveOrgCookie } from '@/lib/active-org-cookie'

export type ActiveOrg = {
  id: string
  name: string
  slug: string
  plan: string
  accounts_quota: number
  monthly_message_quota: number
  role: string
  webhook_url?: string | null
  suspended_at?: string | null
  suspend_reason?: string | null
  stripe_customer_id?: string | null
  stripe_subscription_id?: string | null
  send_window_start?: string | null
  send_window_end?: string | null
  ai_image_mode?: 'economic' | 'fast' | string | null
  auto_reply_enabled?: boolean
}

export function isOrgAdminRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

function platformAdminEmails(): Set<string> {
  const raw = process.env.PLATFORM_ADMIN_EMAILS ?? ''
  return new Set(
    raw
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  )
}

/** JWT app_metadata.platform_admin, profiles.is_platform_admin veya PLATFORM_ADMIN_EMAILS. */
export function resolveIsPlatformAdmin(options: {
  email: string | null | undefined
  jwtPlatformAdmin?: boolean
  profileFlag?: boolean | null
}): boolean {
  if (options.jwtPlatformAdmin) return true
  if (options.profileFlag) return true
  const email = options.email?.trim().toLowerCase()
  if (email && platformAdminEmails().has(email)) return true
  return false
}

async function membershipExists(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  orgId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('org_id', orgId)
    .eq('user_id', userId)
    .maybeSingle()
  return Boolean(data)
}

export const requireActiveOrg = cache(async (): Promise<{
  userId: string
  email: string | null
  org: ActiveOrg
  isPlatformAdmin: boolean
  isOnboarded: boolean
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}> => {
  const { supabase, userId, email, jwtPlatformAdmin } = await getAuthIdentity()
  if (!userId) throw new Error('Oturum bulunamadı.')

  const [{ data: profile }, cookieOrgId] = await Promise.all([
    supabase
      .from('profiles')
      .select('active_org_id, is_platform_admin, email, onboarded_at, onboarding_step')
      .eq('id', userId)
      .maybeSingle(),
    readActiveOrgCookie(),
  ])

  let orgId: string | null = null

  if (cookieOrgId && (await membershipExists(supabase, userId, cookieOrgId))) {
    orgId = cookieOrgId
  } else if (
    profile?.active_org_id &&
    (await membershipExists(supabase, userId, profile.active_org_id))
  ) {
    // Cookie yoksa profil yedek; cookie yazma Server Component'te yasak — switchOrg yazar.
    orgId = profile.active_org_id
  }

  if (!orgId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    orgId = membership?.org_id ?? null

    if (orgId && !profile?.active_org_id) {
      await supabase.from('profiles').update({ active_org_id: orgId }).eq('id', userId)
    }
  }

  // Self-provision: create_organization RPC (max 3 owner org). Yoksa /erisim-yok.
  if (!orgId) {
    throw new Error('NO_ORGANIZATION')
  }

  const [{ data: org, error: orgError }, { data: member }] = await Promise.all([
    supabase.from('organizations').select('*').eq('id', orgId).single(),
    supabase
      .from('organization_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle(),
  ])

  if (orgError || !org || !member) {
    throw new Error(orgError?.message ?? 'İşletme erişimi yok.')
  }

  const resolvedEmail = email ?? profile?.email ?? null

  const isPlatformAdmin = resolveIsPlatformAdmin({
    email: resolvedEmail,
    jwtPlatformAdmin,
    profileFlag: (profile as { is_platform_admin?: boolean } | null)?.is_platform_admin,
  })

  const isOnboarded =
    Boolean((profile as { onboarded_at?: string | null } | null)?.onboarded_at) ||
    (profile as { onboarding_step?: string | null } | null)?.onboarding_step === 'done'

  return {
    userId,
    email: resolvedEmail,
    isPlatformAdmin,
    isOnboarded,
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      accounts_quota: org.accounts_quota,
      monthly_message_quota: org.monthly_message_quota,
      role: member.role,
      webhook_url: (org as { webhook_url?: string | null }).webhook_url ?? null,
      suspended_at: (org as { suspended_at?: string | null }).suspended_at ?? null,
      suspend_reason: (org as { suspend_reason?: string | null }).suspend_reason ?? null,
      stripe_customer_id:
        (org as { stripe_customer_id?: string | null }).stripe_customer_id ?? null,
      stripe_subscription_id:
        (org as { stripe_subscription_id?: string | null }).stripe_subscription_id ?? null,
      send_window_start: (org as { send_window_start?: string | null }).send_window_start ?? '08:00:00',
      send_window_end: (org as { send_window_end?: string | null }).send_window_end ?? '18:00:00',
      ai_image_mode: (org as { ai_image_mode?: string | null }).ai_image_mode ?? 'economic',
      auto_reply_enabled: Boolean((org as { auto_reply_enabled?: boolean }).auto_reply_enabled),
    },
    supabase,
  }
})

export async function requirePlatformAdmin() {
  const ctx = await requireActiveOrg()
  if (!ctx.isPlatformAdmin) throw new Error('FORBIDDEN_PLATFORM_ADMIN')
  return ctx
}

/** Owner veya admin; aksi halde hata. */
export async function requireOrgAdmin() {
  const ctx = await requireActiveOrg()
  if (!isOrgAdminRole(ctx.org.role)) {
    throw new Error('FORBIDDEN_ORG_ADMIN')
  }
  return ctx
}

export const listUserOrgs = cache(async (): Promise<
  { id: string; name: string; slug: string; role: string }[]
> => {
  const { supabase, userId } = await getAuthIdentity()
  if (!userId) return []

  const { data } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, slug)')
    .eq('user_id', userId)

  return (data ?? [])
    .map((row) => {
      const org = row.organizations as unknown as {
        id: string
        name: string
        slug: string
      } | null
      if (!org) return null
      return { id: org.id, name: org.name, slug: org.slug, role: row.role }
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
})
