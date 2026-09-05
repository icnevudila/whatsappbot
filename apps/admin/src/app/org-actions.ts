'use server'

import { revalidatePath } from 'next/cache'
import { requirePlatformAdmin } from '@/lib/platform'

export type OrgEditState = { error?: string; ok?: string } | null

export async function updateOrganizationQuotas(
  _prev: OrgEditState,
  formData: FormData,
): Promise<OrgEditState> {
  const orgId = String(formData.get('org_id') ?? '').trim()
  const plan = String(formData.get('plan') ?? '').trim()
  const accountsQuota = Number(formData.get('accounts_quota') ?? '')
  const messageQuota = Number(formData.get('monthly_message_quota') ?? '')

  if (!orgId) return { error: 'org_id gerekli' }

  try {
    const { supabase } = await requirePlatformAdmin()
    const { data, error } = await supabase.rpc('admin_update_organization' as never, {
      p_org_id: orgId,
      p_plan: plan || null,
      p_accounts_quota: Number.isFinite(accountsQuota) ? accountsQuota : null,
      p_monthly_message_quota: Number.isFinite(messageQuota) ? messageQuota : null,
    } as never)

    if (error) return { error: error.message }
    revalidatePath('/')
    const row = data as { name?: string } | null
    return { ok: `${row?.name ?? 'İşletme'} güncellendi` }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok' }
  }
}
