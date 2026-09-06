import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

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
}

export function isOrgAdminRole(role: string | null | undefined): boolean {
  return role === 'owner' || role === 'admin'
}

/**
 * Aktif işletme: profiles.active_org_id, yoksa kullanıcının ilk üyeliği.
 * Panel sorguları ve insert'ler bu org_id ile scoped olmalı.
 * Ayni RSC isteginde layout + sayfa tek sefer ceker (React cache).
 */
export const requireActiveOrg = cache(async (): Promise<{
  userId: string
  email: string | null
  org: ActiveOrg
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}> => {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Oturum bulunamadı.')

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_org_id')
    .eq('id', user.id)
    .maybeSingle()

  let orgId = profile?.active_org_id ?? null

  if (!orgId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    orgId = membership?.org_id ?? null

    if (orgId) {
      await supabase.from('profiles').update({ active_org_id: orgId }).eq('id', user.id)
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
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  if (orgError || !org || !member) {
    throw new Error(orgError?.message ?? 'İşletme erişimi yok.')
  }

  return {
    userId: user.id,
    email: user.email ?? null,
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
    },
    supabase,
  }
})

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
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('organization_members')
    .select('role, organizations(id, name, slug)')
    .eq('user_id', user.id)

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
