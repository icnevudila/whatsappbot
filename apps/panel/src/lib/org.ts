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
}

/**
 * Aktif işletme: profiles.active_org_id, yoksa kullanıcının ilk üyeliği.
 * Panel sorguları ve insert'ler bu org_id ile scoped olmalı.
 */
export async function requireActiveOrg(): Promise<{
  userId: string
  org: ActiveOrg
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}> {
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

  if (!orgId) {
    const { data: created, error } = await supabase.rpc('create_organization', {
      p_name: user.email?.split('@')[0] || 'İşletme',
    })
    if (error || !created) throw new Error(error?.message ?? 'İşletme oluşturulamadı.')
    orgId = created
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
    org: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan,
      accounts_quota: org.accounts_quota,
      monthly_message_quota: org.monthly_message_quota,
      role: member.role,
      webhook_url: (org as { webhook_url?: string | null }).webhook_url ?? null,
    },
    supabase,
  }
}

export async function listUserOrgs(): Promise<
  { id: string; name: string; slug: string; role: string }[]
> {
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
}
