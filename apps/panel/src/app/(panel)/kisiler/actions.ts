'use server'

import { revalidatePath } from 'next/cache'
import { parsePhoneList, toE164 } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ImportState = {
  error?: string
  ok?: string
  invalidSamples?: string[]
} | null

/** Supabase istegi basina satir siniri; buyuk listeler parcalara bolunur. */
const CHUNK = 500

export async function importContacts(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const name = String(formData.get('name') ?? '').trim()
  const raw = String(formData.get('numbers') ?? '')

  if (!name) return { error: 'Listeye bir ad verin.' }
  if (!raw.trim()) return { error: 'En az bir numara girin.' }

  const parsed = parsePhoneList(raw)

  if (parsed.valid.length === 0) {
    return {
      error: 'Geçerli numara bulunamadı. Örnek: 0532 123 45 67 veya +905321234567',
      invalidSamples: parsed.invalid.slice(0, 5),
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

  const { data: list, error: listError } = await supabase
    .from('contact_lists')
    .insert({ org_id: org.id, created_by: userId, name, source: 'manual' })
    .select('id')
    .single()

  if (listError) return { error: listError.message }

  let linked = 0

  for (let index = 0; index < parsed.valid.length; index += CHUNK) {
    const chunk = parsed.valid.slice(index, index + CHUNK)

    // Ayni numara daha once eklendiyse adi guncellenmez, kayit korunur.
    const { error: contactError } = await supabase.from('contacts').upsert(
      chunk.map((row) => ({
        org_id: org.id,
        created_by: userId,
        phone_e164: row.phone_e164,
        name: row.name,
        source: 'manual' as const,
      })),
      { onConflict: 'org_id,phone_e164', ignoreDuplicates: true },
    )

    if (contactError) return { error: contactError.message }

    const phones = chunk.map((row) => row.phone_e164)
    const { data: resolved, error: resolveError } = await supabase
      .from('contacts')
      .select('id')
      .eq('org_id', org.id)
      .in('phone_e164', phones)

    if (resolveError) return { error: resolveError.message }

    const contactIds = (resolved ?? []).map((contact) => contact.id)

    const { error: memberError } = await supabase.from('contact_list_members').upsert(
      contactIds.map((contactId) => ({
        org_id: org.id,
        created_by: userId,
        list_id: list.id,
        contact_id: contactId,
      })),
      { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
    )

    if (memberError) return { error: memberError.message }
    linked += contactIds.length
  }

  await supabase.from('contact_lists').update({ contact_count: linked }).eq('id', list.id)

  // Dogrulama kuyruga alinir: gonderim oncesi onWhatsApp kontrolu zorunlu,
  // kayitli olmayan numaraya mesaj denemek hesap kisitlanmasina yol aciyor.
  await enqueueJob({
    type: 'contacts.verify',
    payload: { list_id: list.id },
    priority: 50,
  })

  revalidatePath('/kisiler')

  const parts = [`${linked} numara eklendi`]
  if (parsed.duplicates > 0) parts.push(`${parsed.duplicates} tekrar atlandı`)
  if (parsed.invalid.length > 0) parts.push(`${parsed.invalid.length} geçersiz`)

  return {
    ok: `${parts.join(', ')}. WhatsApp doğrulaması kuyruğa alındı.`,
    invalidSamples: parsed.invalid.slice(0, 5),
  }
}

export async function verifyList(listId: string): Promise<{ error?: string }> {
  const { error } = await enqueueJob({
    type: 'contacts.verify',
    payload: { list_id: listId },
    priority: 50,
  })
  if (error) return { error }

  revalidatePath('/kisiler')
  revalidatePath(`/kisiler/${listId}`)
  return {}
}

/** Org defterindeki kontrol edilmemis / bayat numaralari dogrular (liste bagimsiz). */
export async function verifyAllContacts(): Promise<{ error?: string; ok?: string }> {
  const { error } = await enqueueJob({
    type: 'contacts.verify',
    payload: {},
    priority: 40,
  })
  if (error) return { error }

  revalidatePath('/kisiler')
  return { ok: 'WhatsApp doğrulaması kuyruğa alındı. Bağlı hat gerekir; sonuçlar listelerde ✓ / × olarak görünür.' }
}

export async function deleteList(listId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()

  // Kişiler silinmiyor, yalnızca liste ve üyelikleri.
  // Aynı numaralar başka listelerde kullanılmış olabilir.
  const { error } = await supabase.from('contact_lists').delete().eq('id', listId)
  if (error) return { error: error.message }

  revalidatePath('/kisiler')
  return {}
}

export async function removeMember(
  listId: string,
  contactId: string,
): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()

  const { error } = await supabase
    .from('contact_list_members')
    .delete()
    .eq('list_id', listId)
    .eq('contact_id', contactId)

  if (error) return { error: error.message }

  const { count } = await supabase
    .from('contact_list_members')
    .select('contact_id', { count: 'exact', head: true })
    .eq('list_id', listId)

  await supabase
    .from('contact_lists')
    .update({ contact_count: count ?? 0 })
    .eq('id', listId)

  revalidatePath(`/kisiler/${listId}`)
  revalidatePath('/kisiler')
  return {}
}

export type PhoneCheckResult = {
  error?: string
  phone_e164?: string
  exists?: boolean
}

/**
 * Tek numara WhatsApp kontrolu: isi kuyruga yazar, worker onWhatsApp sonucunu bekler.
 * Listeye zorla eklemez; defterde varsa wa_status guncellenir.
 */
export async function checkWhatsAppPhone(rawPhone: string): Promise<PhoneCheckResult> {
  const phone = toE164(rawPhone.trim())
  if (!phone) {
    return { error: 'Geçerli numara girin. Örnek: 0532 123 45 67 veya +905321234567' }
  }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { count: liveCount } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('status', 'connected')

  if (!liveCount) {
    return { error: 'Kontrol için bağlı bir WhatsApp hattı gerekli.' }
  }

  const { id, error } = await enqueueJob({
    type: 'contacts.check_phone',
    payload: { phone_e164: phone },
    priority: 10,
  })
  if (error || !id) {
    return { error: error ?? 'Kontrol işi oluşturulamadı.' }
  }

  const deadline = Date.now() + 25_000
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 400))

    const { data: job } = await supabase
      .from('jobs')
      .select('status, result, error')
      .eq('id', Number(id))
      .maybeSingle()

    if (!job) continue

    if (job.status === 'failed' || job.status === 'cancelled') {
      return { error: job.error ?? 'Kontrol başarısız.', phone_e164: phone }
    }

    if (job.status === 'done') {
      const result = (job.result ?? {}) as { exists?: boolean; phone_e164?: string }
      revalidatePath('/kisiler')
      return {
        phone_e164: result.phone_e164 ?? phone,
        exists: result.exists === true,
      }
    }
  }

  return {
    error: 'Kontrol zaman aşımına uğradı. Birkaç saniye sonra tekrar deneyin.',
    phone_e164: phone,
  }
}

