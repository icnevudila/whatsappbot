'use server'

import { revalidatePath } from 'next/cache'
import { requireActiveOrg } from '@/lib/org'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type OrgActionState = { error?: string; ok?: string } | null

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

  if (error || !orgId) {
    return { error: error?.message ?? 'İşletme oluşturulamadı.' }
  }

  revalidatePath('/', 'layout')
  return { ok: 'İşletme oluşturuldu.' }
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

  const { error } = await supabase
    .from('organizations')
    .update({
      webhook_url: webhookUrl || null,
      webhook_secret: webhookSecret || null,
    } as never)
    .eq('id', org.id)

  if (error) return { error: error.message }
  revalidatePath('/ayarlar')
  return { ok: 'Webhook kaydedildi.' }
}

export async function addOrgMember(
  _previous: OrgActionState,
  formData: FormData,
): Promise<OrgActionState> {
  const email = String(formData.get('email') ?? '').trim()
  const role = String(formData.get('role') ?? 'member').trim() || 'member'

  if (!email) return { error: 'E-posta girin.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
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

  if (error) {
    if (error.message.includes('user not found')) {
      return { error: 'Bu e-posta ile kayıtlı kullanıcı bulunamadı.' }
    }
    if (error.message.includes('not org admin')) {
      return { error: 'Üye eklemek için yönetici olmalısınız.' }
    }
    return { error: error.message }
  }

  revalidatePath('/ayarlar')
  return { ok: 'Üye eklendi.' }
}
