'use server'

import { revalidatePath } from 'next/cache'
import { parsePhoneList } from '@wa/shared'
import { requireActiveOrg } from '@/lib/org'

export type BlacklistState = { error?: string; ok?: string } | null

export async function addToBlacklist(
  _previous: BlacklistState,
  formData: FormData,
): Promise<BlacklistState> {
  const raw = String(formData.get('numbers') ?? '')
  const reason = String(formData.get('reason') ?? '').trim() || null

  if (!raw.trim()) return { error: 'En az bir numara girin.' }

  const parsed = parsePhoneList(raw)
  if (parsed.valid.length === 0) {
    return {
      error: 'Geçerli numara bulunamadı. Örnek: 0532 123 45 67 veya +905321234567',
    }
  }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { error } = await supabase.from('blacklist').upsert(
    parsed.valid.map((row) => ({
      org_id: org.id,
      created_by: userId,
      phone_e164: row.phone_e164,
      reason,
    })),
    { onConflict: 'org_id,phone_e164', ignoreDuplicates: false },
  )

  if (error) return { error: error.message }

  revalidatePath('/kara-liste')
  revalidatePath('/kisiler')

  const parts = [`${parsed.valid.length} numara kara listeye eklendi`]
  if (parsed.duplicates > 0) parts.push(`${parsed.duplicates} tekrar atlandı`)
  if (parsed.invalid.length > 0) parts.push(`${parsed.invalid.length} geçersiz`)

  return { ok: parts.join(', ') + '.' }
}

export async function removeFromBlacklist(id: string): Promise<{ error?: string }> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt bulunamadı.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { error, count } = await supabase
    .from('blacklist')
    .delete({ count: 'exact' })
    .eq('id', trimmed)
    .eq('org_id', org.id)

  if (error) return { error: error.message }
  if (count === 0) return { error: 'Kayıt bulunamadı veya zaten kaldırılmış.' }

  revalidatePath('/kara-liste')
  return {}
}

export async function blacklistPhone(
  phoneE164: string,
  reason?: string,
): Promise<{ error?: string }> {
  const phone = phoneE164.trim()
  if (!phone) return { error: 'Numara gerekli.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { error } = await supabase.from('blacklist').upsert(
    {
      org_id: org.id,
      created_by: userId,
      phone_e164: phone,
      reason: reason?.trim() || 'Elle eklendi',
    },
    { onConflict: 'org_id,phone_e164' },
  )

  if (error) return { error: error.message }

  revalidatePath('/kara-liste')
  revalidatePath('/kisiler')
  return {}
}
