'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/org'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseServiceClient, siteOriginFromEnv } from '@/lib/supabase/service'
import { cancelStripeSubscription } from '@/lib/stripe-cancel'

export type OrgActionState = {
  error?: string
  ok?: string
  /** Üye ekleme: Auth’ta kullanıcı yok — Filo iletişimi göster */
  contactSupport?: boolean
} | null

export async function switchOrg(orgId: string): Promise<OrgActionState> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı.' }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('org_id', orgId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership) return { error: 'Bu işletmeye erişiminiz yok.' }

  const { error } = await supabase
    .from('profiles')
    .update({ active_org_id: orgId })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  return { ok: 'İşletme değiştirildi.' }
}

export async function createOrg(
  _previous: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 2) return { error: 'İşletme adı en az 2 karakter olmalı.' }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı.' }

  const { data: orgId, error } = await supabase.rpc('create_organization', {
    p_name: name,
  })

  if (error) {
    if (error.message.includes('org limit reached')) {
      return { error: 'En fazla 3 işletme sahibi olabilirsiniz.' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { ok: `İşletme oluşturuldu (${String(orgId).slice(0, 8)}…).` }
}

export async function updateOrgName(
  _previous: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 2) return { error: 'İşletme adı en az 2 karakter olmalı.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  if (org.role !== 'owner' && org.role !== 'admin') {
    return { error: 'İşletme adını yalnızca yönetici değiştirebilir.' }
  }

  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', org.id)

  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  revalidatePath('/', 'layout')
  return { ok: 'İşletme adı güncellendi.' }
}

export async function updateOrgWebhook(
  _previous: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const webhookUrl = String(formData.get('webhook_url') ?? '').trim()
  const webhookSecret = String(formData.get('webhook_secret') ?? '').trim()

  if (webhookUrl) {
    try {
      const u = new URL(webhookUrl)
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        return { error: 'Webhook http(s) olmalı.' }
      }
    } catch {
      return { error: 'Geçersiz webhook URL.' }
    }
  }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  if (org.role !== 'owner' && org.role !== 'admin') {
    return { error: 'Yalnızca yönetici webhook ayarlayabilir.' }
  }

  const clearSecret = String(formData.get('clear_secret') ?? '') === '1'
  const { error } = await supabase.rpc('set_organization_webhook', {
    p_org_id: org.id,
    p_webhook_url: webhookUrl,
    p_webhook_secret: webhookSecret || null,
    p_clear_secret: clearSecret,
  })

  if (error) return { error: error.message }
  revalidatePath('/ayarlar')
  return { ok: 'Webhook kaydedildi.' }
}

function normalizeMemberRole(raw: string): 'admin' | 'member' | null {
  const role = raw.trim().toLowerCase() || 'member'
  if (role === 'admin' || role === 'member') return role
  return null
}

async function resolveInviteRedirect(devamPath: string): Promise<string> {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  const proto = h.get('x-forwarded-proto') ?? 'https'
  const fromRequest = host ? `${proto}://${host}` : undefined
  const origin = siteOriginFromEnv(fromRequest)
  return `${origin || 'https://filo.app'}/auth/confirm?devam=${encodeURIComponent(devamPath)}`
}

function newInviteToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function addOrgMember(
  _previous: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const role = normalizeMemberRole(String(formData.get('role') ?? 'member'))
  const wantInvite = String(formData.get('invite_if_missing') ?? '') === '1'

  if (!email) return { error: 'E-posta girin.' }
  if (!role) return { error: 'Geçersiz rol.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  let userId: string
  try {
    ;({ org, supabase, userId } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  if (org.role !== 'owner' && org.role !== 'admin') {
    return { error: 'Üye eklemek için yönetici olmalısınız.' }
  }

  const { error } = await supabase.rpc('add_organization_member', {
    p_org_id: org.id,
    p_email: email,
    p_role: role,
  })

  if (!error) {
    revalidatePath('/ayarlar')
    return { ok: 'Üye eklendi.' }
  }

  if (!error.message.includes('user not found')) {
    if (error.message.includes('not org admin')) {
      return { error: 'Üye eklemek için yönetici olmalısınız.' }
    }
    return { error: error.message }
  }

  if (!wantInvite) {
    return {
      error:
        'Bu e-posta ile Filo hesabı yok. Davet gönderin veya Filo’dan hesap açılmasını isteyin.',
      contactSupport: true,
    }
  }

  const admin = createSupabaseServiceClient()
  if (!admin) {
    return {
      error:
        'Davet şu an sunucuda yapılandırılmamış. Hesap açılması için Filo’ya yazın.',
      contactSupport: true,
    }
  }

  const token = newInviteToken()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const { error: inviteRowError } = await supabase.from('org_invites').insert({
    org_id: org.id,
    email,
    role,
    token,
    invited_by: userId,
    expires_at: expiresAt,
  } as never)

  if (inviteRowError) {
    return { error: `Davet kaydı oluşturulamadı: ${inviteRowError.message}` }
  }

  const redirectTo = await resolveInviteRedirect(`/davet/${token}`)
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo,
  })

  if (inviteError) {
    const msg = inviteError.message.toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      const { error: retry } = await supabase.rpc('add_organization_member', {
        p_org_id: org.id,
        p_email: email,
        p_role: role,
      })
      if (!retry) {
        revalidatePath('/ayarlar')
        return { ok: 'Üye eklendi (hesap zaten vardı).' }
      }
      revalidatePath('/ayarlar')
      return {
        ok: `Davet kaydı oluşturuldu. Kullanıcı giriş yapıp davet linkini açmalı (${email}).`,
      }
    }
    return {
      error: `Davet gönderilemedi: ${inviteError.message}`,
      contactSupport: true,
    }
  }

  revalidatePath('/ayarlar')
  return { ok: `Davet e-postası gönderildi: ${email}` }
}

export async function updateOrgMemberRole(
  userId: string,
  role: string,
): Promise<OrgActionState> {
  const normalized = normalizeMemberRole(role)
  if (!normalized) return { error: 'Geçersiz rol.' }

  try {
    const { userId: me, org, supabase } = await requireActiveOrg()
    if (org.role !== 'owner' && org.role !== 'admin') {
      return { error: 'Yetki yok.' }
    }
    if (userId === me) return { error: 'Kendi rolünüzü değiştiremezsiniz.' }

    const { error } = await supabase.rpc('set_organization_member_role' as never, {
      p_org_id: org.id,
      p_user_id: userId,
      p_role: normalized,
    } as never)

    if (error) {
      if (error.message.includes('cannot change owner')) {
        return { error: 'Sahip rolü değiştirilemez.' }
      }
      if (error.message.includes('not org admin')) {
        return { error: 'Yetki yok.' }
      }
      return { error: error.message }
    }

    revalidatePath('/ayarlar')
    return { ok: 'Rol güncellendi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}

export async function removeOrgMember(userId: string): Promise<OrgActionState> {
  try {
    const { userId: me, org, supabase } = await requireActiveOrg()
    if (org.role !== 'owner' && org.role !== 'admin') {
      return { error: 'Yetki yok.' }
    }
    if (userId === me) return { error: 'Kendinizi çıkaramazsınız.' }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('org_id', org.id)
      .eq('user_id', userId)
      .neq('role', 'owner')

    if (error) return { error: error.message }
    revalidatePath('/ayarlar')
    return { ok: 'Üye çıkarıldı.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}

export async function deleteOrganization(
  _previous: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const confirmName = String(formData.get('confirmName') ?? '').trim()
  if (!confirmName) return { error: 'İşletme adını yazarak onaylayın.' }

  try {
    const { org, supabase } = await requireActiveOrg()
    if (org.role !== 'owner') {
      return { error: 'Yalnızca sahip işletmeyi silebilir.' }
    }

    const subId = org.stripe_subscription_id?.trim()
    if (subId) {
      const cancelled = await cancelStripeSubscription(subId)
      if (!cancelled.ok) {
        console.warn('[deleteOrganization] stripe cancel failed', cancelled.error)
      }
    }

    const { error } = await supabase.rpc('delete_organization', {
      p_org_id: org.id,
      p_confirm_name: confirmName,
    })

    if (error) {
      if (error.message.includes('confirm name mismatch')) {
        return { error: 'Onay adı işletme adıyla birebir aynı olmalı.' }
      }
      if (error.message.includes('only owner')) {
        return { error: 'Yalnızca sahip işletmeyi silebilir.' }
      }
      return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/erisim-yok')
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as { digest?: string }).digest === 'string' &&
      (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
    ) {
      throw error
    }
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}
