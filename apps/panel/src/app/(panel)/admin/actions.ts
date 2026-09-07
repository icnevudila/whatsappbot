'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { PLAN_QUOTAS, isPlanId } from '@wa/shared'
import { requirePlatformAdmin } from '@/lib/org'
import { createSupabaseServiceClient } from '@/lib/supabase/service'

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
      p_plan: plan ?? undefined,
      p_accounts_quota: Number.isFinite(accountsQuota) ? accountsQuota : undefined,
      p_monthly_message_quota: Number.isFinite(monthlyQuota) ? monthlyQuota : undefined,
    })
    if (error) return { error: error.message }

    revalidatePath('/admin')
    revalidatePath(`/admin/${orgId}`)
    return { ok: 'Paket / kota güncellendi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok.' }
  }
}

export async function setOrgSuspended(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const orgId = String(formData.get('org_id') ?? '').trim()
  const suspend = String(formData.get('suspend') ?? '') === '1'
  const reason = String(formData.get('reason') ?? '').trim()
  if (!orgId) return { error: 'Org gerekli.' }

  try {
    const { supabase } = await requirePlatformAdmin()
    const { data, error } = await supabase.rpc('admin_set_org_suspended' as never, {
      p_org_id: orgId,
      p_suspend: suspend,
      p_reason: reason || null,
    } as never)
    if (error) return { error: error.message }
    revalidatePath('/admin')
    revalidatePath(`/admin/${orgId}`)
    const row = data as { name?: string } | null
    return {
      ok: suspend
        ? `${row?.name ?? 'İşletme'} askıya alındı`
        : `${row?.name ?? 'İşletme'} askısı kaldırıldı`,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok.' }
  }
}

export async function unlockAccount(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const accountId = String(formData.get('account_id') ?? '').trim()
  if (!accountId) return { error: 'Hat gerekli.' }

  try {
    const { supabase } = await requirePlatformAdmin()
    const { data, error } = await supabase.rpc('admin_unlock_account' as never, {
      p_account_id: accountId,
    } as never)
    if (error) return { error: error.message }
    const row = data as { label?: string | null; job_id?: number } | null
    revalidatePath('/admin')
    return {
      ok: `${row?.label || 'Hat'} kilidi açıldı · job #${row?.job_id ?? '—'}`,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok.' }
  }
}

export async function provisionCustomer(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
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
      return { error: 'SUPABASE_SERVICE_ROLE_KEY yok — müşteri daveti için gerekli.' }
    }

    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'https'
    const panelOrigin =
      process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '') ||
      (host ? `${proto}://${host}` : 'https://filo.app')
    const redirectTo = `${panelOrigin}/auth/callback?devam=${encodeURIComponent('/ozet')}`

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
          else return { error: `Davet: ${inviteError.message}` }
        } else {
          return { error: `Davet gönderilemedi: ${inviteError.message}` }
        }
      } else {
        ownerId = invited.user?.id ?? null
      }
    }

    if (!ownerId) return { error: 'Sahip kullanıcı kimliği alınamadı.' }

    await service.from('profiles').upsert({ id: ownerId, email } as never, { onConflict: 'id' })

    const quotas = PLAN_QUOTAS[plan]
    const { data: orgId, error: provisionError } = await supabase.rpc(
      'admin_provision_organization',
      {
        p_name: orgName,
        p_owner_user_id: ownerId,
        p_plan: plan,
        p_accounts_quota: quotas.accounts,
        p_monthly_message_quota: quotas.messages,
      },
    )
    if (provisionError) return { error: provisionError.message }

    revalidatePath('/admin')
    return {
      ok: `Açıldı: ${orgName} · ${email} · plan ${plan} · ${String(orgId).slice(0, 8)}…`,
    }
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

export async function setAccountEnabled(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const accountId = String(formData.get('account_id') ?? '').trim()
  const enabled = String(formData.get('enabled') ?? '') === '1'
  if (!accountId) return { error: 'Hat gerekli.' }

  try {
    const { supabase } = await requirePlatformAdmin()
    const { data: account, error: findError } = await supabase
      .from('accounts')
      .select('id, org_id, label')
      .eq('id', accountId)
      .maybeSingle()
    if (findError) return { error: findError.message }
    if (!account) return { error: 'Hat bulunamadı.' }

    const service = createSupabaseServiceClient()
    const db = service ?? supabase
    const { error } = await db
      .from('accounts')
      .update({ enabled })
      .eq('id', accountId)
    if (error) return { error: error.message }

    revalidatePath('/admin')
    revalidatePath(`/admin/${account.org_id}`)
    return {
      ok: `${account.label || 'Hat'} ${enabled ? 'açıldı' : 'kapatıldı'}.`,
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok.' }
  }
}

export async function adminEnqueueAccountJob(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const accountId = String(formData.get('account_id') ?? '').trim()
  const type = String(formData.get('type') ?? '').trim() as
    | 'account.connect'
    | 'account.disconnect'
    | 'account.logout'
  if (!accountId) return { error: 'Hat gerekli.' }
  if (!['account.connect', 'account.disconnect', 'account.logout'].includes(type)) {
    return { error: 'Geçersiz komut.' }
  }

  try {
    const { userId, supabase } = await requirePlatformAdmin()
    const { data: account, error: findError } = await supabase
      .from('accounts')
      .select('id, org_id, label')
      .eq('id', accountId)
      .maybeSingle()
    if (findError) return { error: findError.message }
    if (!account) return { error: 'Hat bulunamadı.' }

    const service = createSupabaseServiceClient()
    const db = service ?? supabase
    const { error } = await db.from('jobs').insert({
      org_id: account.org_id,
      created_by: userId,
      type,
      account_id: accountId,
      status: 'pending',
      priority: 10,
      payload: {},
    })
    if (error) {
      return {
        error: service
          ? error.message
          : `${error.message} (service role yoksa önce işletmeye gir)`,
      }
    }

    revalidatePath(`/admin/${account.org_id}`)
    return { ok: `${account.label || 'Hat'} · ${type} kuyruğa alındı.` }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok.' }
  }
}

export async function cancelOrgPendingJobs(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const orgId = String(formData.get('org_id') ?? '').trim()
  if (!orgId) return { error: 'Org gerekli.' }

  try {
    const { supabase } = await requirePlatformAdmin()
    const service = createSupabaseServiceClient()
    const db = service ?? supabase
    const { data, error } = await db
      .from('jobs')
      .update({
        status: 'cancelled',
        error: 'Admin iptal',
        finished_at: new Date().toISOString(),
      })
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .select('id')

    if (error) return { error: error.message }
    revalidatePath(`/admin/${orgId}`)
    revalidatePath('/admin')
    return { ok: `${data?.length ?? 0} bekleyen iş iptal edildi.` }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Yetki yok.' }
  }
}
