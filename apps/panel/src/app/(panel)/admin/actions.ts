'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requirePlatformAdmin } from '@/lib/org'

export type AdminActionState = { error?: string; ok?: string } | null

export async function updateOrgQuotas(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  try {
    const { supabase } = await requirePlatformAdmin()
    const orgId = String(formData.get('org_id') ?? '').trim()
    const plan = String(formData.get('plan') ?? '').trim() || null
    const accountsQuota = Number(formData.get('accounts_quota'))
    const monthlyQuota = Number(formData.get('monthly_message_quota'))

    if (!orgId) return { error: 'Org gerekli.' }

    const { error } = await supabase.rpc('admin_update_organization', {
      p_org_id: orgId,
      p_plan: plan,
      p_accounts_quota: Number.isFinite(accountsQuota) ? accountsQuota : null,
      p_monthly_message_quota: Number.isFinite(monthlyQuota) ? monthlyQuota : null,
    })
    if (error) return { error: error.message }

    revalidatePath('/admin')
    revalidatePath(`/admin/${orgId}`)
    return { ok: 'Paket / kota güncellendi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok.' }
  }
}

export async function enterOrganization(formData: FormData) {
  const orgId = String(formData.get('org_id') ?? '').trim()
  if (!orgId) redirect('/admin')

  try {
    const { supabase } = await requirePlatformAdmin()
    const { error } = await supabase.rpc('admin_enter_organization', {
      p_org_id: orgId,
    })
    if (error) {
      redirect(`/admin/${orgId}?hata=${encodeURIComponent(error.message)}`)
    }
  } catch {
    redirect('/admin')
  }

  revalidatePath('/ozet')
  redirect('/ozet')
}

export async function setOrgAutoReply(formData: FormData) {
  const orgId = String(formData.get('org_id') ?? '').trim()
  const enabled = String(formData.get('enabled') ?? '') === '1'
  if (!orgId) return

  try {
    const { supabase } = await requirePlatformAdmin()
    const { error } = await supabase.rpc('admin_set_org_auto_reply', {
      p_org_id: orgId,
      p_enabled: enabled,
    })
    if (error) console.warn('[admin] auto_reply', error.message)
  } catch {
    // ignore
  }

  revalidatePath(`/admin/${orgId}`)
}
