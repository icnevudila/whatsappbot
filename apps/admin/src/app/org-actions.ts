'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { PLAN_QUOTAS, isPlanId } from '@wa/shared'
import { requirePlatformAdmin } from '@/lib/platform'
import {
  createSupabaseServiceClient,
  siteOriginFromEnv,
} from '@/lib/supabase/service'

export type OrgEditState = { error?: string; ok?: string } | null
export type UnlockState = { error?: string; ok?: string } | null
export type ProvisionState = { error?: string; ok?: string } | null
export type SuspendState = { error?: string; ok?: string } | null

export async function setOrgSuspended(
  _prev: SuspendState,
  formData: FormData,
): Promise<SuspendState> {
  const orgId = String(formData.get('org_id') ?? '').trim()
  const suspend = String(formData.get('suspend') ?? '') === '1'
  const reason = String(formData.get('reason') ?? '').trim()

  if (!orgId) return { error: 'org_id gerekli' }

  try {
    const { supabase } = await requirePlatformAdmin()
    const { data, error } = await supabase.rpc('admin_set_org_suspended' as never, {
      p_org_id: orgId,
      p_suspend: suspend,
      p_reason: reason || null,
    } as never)

    if (error) return { error: error.message }
    revalidatePath('/')
    const row = data as { name?: string } | null
    return {
      ok: suspend
        ? `${row?.name ?? 'İşletme'} askıya alındı`
        : `${row?.name ?? 'İşletme'} askı kaldırıldı`,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok' }
  }
}

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

export async function unlockAccount(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const accountId = String(formData.get('account_id') ?? '').trim()
  if (!accountId) return { error: 'account_id gerekli' }

  try {
    const { supabase } = await requirePlatformAdmin()
    const { data, error } = await supabase.rpc('admin_unlock_account' as never, {
      p_account_id: accountId,
    } as never)

    if (error) return { error: error.message }
    revalidatePath('/')
    const row = data as { label?: string | null; job_id?: number } | null
    return {
      ok: `${row?.label || 'Hat'} kilidi açıldı · connect #${row?.job_id ?? '—'}`,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok' }
  }
}

/** Yeni müşteri: Auth daveti + işletme + owner. */
export async function provisionCustomer(
  _prev: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  const orgName = String(formData.get('org_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const planRaw = String(formData.get('plan') ?? 'starter').trim().toLowerCase()
  const plan = isPlanId(planRaw) ? planRaw : 'starter'

  if (orgName.length < 2) return { error: 'İşletme adı en az 2 karakter.' }
  if (!email || !email.includes('@')) return { error: 'Geçerli e-posta girin.' }

  try {
    const { supabase } = await requirePlatformAdmin()
    const service = createSupabaseServiceClient()
    if (!service) {
      return {
        error:
          'SUPABASE_SERVICE_ROLE_KEY yok — müşteri daveti için admin env’ine ekleyin.',
      }
    }

    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'https'
    const origin = siteOriginFromEnv(host ? `${proto}://${host}` : undefined)
    const panelOrigin =
      process.env.NEXT_PUBLIC_PANEL_URL?.trim().replace(/\/$/, '') ||
      process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ||
      origin ||
      'https://filo.app'
    const redirectTo = `${panelOrigin}/auth/callback?devam=${encodeURIComponent('/kurulum')}`

    let ownerId: string | null = null

    const { data: existing } = await service
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existing?.id) {
      ownerId = existing.id
    } else {
      const { data: invited, error: inviteError } = await service.auth.admin.inviteUserByEmail(
        email,
        { redirectTo },
      )
      if (inviteError) {
        const msg = inviteError.message.toLowerCase()
        if (msg.includes('already') || msg.includes('registered')) {
          const { data: listed } = await service.auth.admin.listUsers({ page: 1, perPage: 200 })
          const hit = listed.users.find((u) => u.email?.toLowerCase() === email)
          if (hit) ownerId = hit.id
          else return { error: `Davet/ kullanıcı: ${inviteError.message}` }
        } else {
          return { error: `Davet gönderilemedi: ${inviteError.message}` }
        }
      } else {
        ownerId = invited.user?.id ?? null
      }
    }

    if (!ownerId) return { error: 'Sahip kullanıcı kimliği alınamadı.' }

    await service
      .from('profiles')
      .upsert({ id: ownerId, email } as never, { onConflict: 'id' })

    const quotas = PLAN_QUOTAS[plan]
    const { data: orgId, error: provisionError } = await supabase.rpc(
      'admin_provision_organization' as never,
      {
        p_name: orgName,
        p_owner_user_id: ownerId,
        p_plan: plan,
        p_accounts_quota: quotas.accounts,
        p_monthly_message_quota: quotas.messages,
      } as never,
    )

    if (provisionError) return { error: provisionError.message }

    revalidatePath('/')
    return {
      ok: `Açıldı: ${orgName} · ${email} (plan ${plan}) · org ${String(orgId).slice(0, 8)}…`,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok' }
  }
}
