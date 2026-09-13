'use server'

import { revalidatePath } from 'next/cache'
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_HARD_LIMIT,
  parsePhoneList,
  toE164,
  type ImportedRow,
} from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'

export type ImportState = {
  error?: string
  ok?: string
  invalidSamples?: string[]
  listId?: string
  linked?: number
} | null

/** Supabase istegi basina satir siniri; buyuk listeler parcalara bolunur. */
const DB_CHUNK = 500

async function upsertContactChunk(options: {
  orgId: string
  userId: string
  listId: string
  chunk: ImportedRow[]
  supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
}): Promise<{ error?: string; linked: number }> {
  const { orgId, userId, listId, chunk, supabase } = options

  const { error: contactError } = await supabase.from('contacts').upsert(
    chunk.map((row) => ({
      org_id: orgId,
      created_by: userId,
      phone_e164: row.phone_e164,
      name: row.name,
      source: 'manual' as const,
    })),
    { onConflict: 'org_id,phone_e164', ignoreDuplicates: true },
  )
  if (contactError) return { error: contactError.message, linked: 0 }

  const phones = chunk.map((row) => row.phone_e164)
  const { data: resolved, error: resolveError } = await supabase
    .from('contacts')
    .select('id')
    .eq('org_id', orgId)
    .in('phone_e164', phones)

  if (resolveError) return { error: resolveError.message, linked: 0 }

  const contactIds = (resolved ?? []).map((contact) => contact.id)
  if (contactIds.length === 0) return { linked: 0 }

  const { error: memberError } = await supabase.from('contact_list_members').upsert(
    contactIds.map((contactId) => ({
      org_id: orgId,
      created_by: userId,
      list_id: listId,
      contact_id: contactId,
    })),
    { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
  )
  if (memberError) return { error: memberError.message, linked: 0 }

  return { linked: contactIds.length }
}

/**
 * Küçük listeler: tek istekte (geriye uyumlu form action).
 * Büyük listeler için createContactList + importContactChunk kullanın.
 */
export async function importContacts(
  _previous: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const name = String(formData.get('name') ?? '').trim()
  const raw = String(formData.get('numbers') ?? '')

  if (!name) return { error: 'Gruba bir ad verin.' }
  if (!raw.trim()) return { error: 'En az bir numara girin.' }

  const parsed = parsePhoneList(raw)
  if (parsed.valid.length === 0) {
    return {
      error: 'Geçerli numara bulunamadı. Örnek: 0532 123 45 67 veya +905321234567',
      invalidSamples: parsed.invalid.slice(0, 5),
    }
  }
  if (parsed.valid.length > IMPORT_HARD_LIMIT) {
    return {
      error: `Tek seferde en fazla ${IMPORT_HARD_LIMIT.toLocaleString('tr-TR')} numara yüklenebilir.`,
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
  for (let index = 0; index < parsed.valid.length; index += DB_CHUNK) {
    const chunk = parsed.valid.slice(index, index + DB_CHUNK)
    const result = await upsertContactChunk({
      orgId: org.id,
      userId,
      listId: list.id,
      chunk,
      supabase,
    })
    if (result.error) return { error: result.error }
    linked += result.linked
  }

  await supabase
    .from('contact_lists')
    .update({ contact_count: linked })
    .eq('id', list.id)
    .eq('org_id', org.id)

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
    listId: list.id,
    linked,
  }
}

/** Büyük import: önce boş grup oluştur. */
export async function createContactListForImport(
  name: string,
): Promise<{ error?: string; listId?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: 'Gruba bir ad verin.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { data: list, error } = await supabase
      .from('contact_lists')
      .insert({
        org_id: org.id,
        created_by: userId,
        name: trimmed,
        source: 'manual',
        contact_count: 0,
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    return { listId: list.id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
}

/**
 * Client chunk'lı import: JSON satırları (phone_e164, name?).
 * Her istekte en fazla IMPORT_CHUNK_SIZE.
 */
export async function importContactChunk(options: {
  listId: string
  rows: ImportedRow[]
  finalize?: boolean
}): Promise<{ error?: string; linked?: number; ok?: string }> {
  const listId = options.listId.trim()
  const rows = options.rows ?? []
  if (!listId) return { error: 'Grup bulunamadı.' }
  if (rows.length === 0) return { linked: 0 }
  if (rows.length > IMPORT_CHUNK_SIZE) {
    return { error: `Parça başına en fazla ${IMPORT_CHUNK_SIZE} satır.` }
  }

  const cleaned: ImportedRow[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const phone = toE164(String(row.phone_e164 ?? ''))
    if (!phone || seen.has(phone)) continue
    seen.add(phone)
    cleaned.push({
      phone_e164: phone,
      name: row.name?.trim() ? row.name.trim().slice(0, 120) : null,
    })
  }
  if (cleaned.length === 0) return { linked: 0 }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { data: list } = await supabase
      .from('contact_lists')
      .select('id, contact_count')
      .eq('id', listId)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!list) return { error: 'Grup bulunamadı.' }

    const currentCount = Number(list.contact_count ?? 0)
    if (currentCount + cleaned.length > IMPORT_HARD_LIMIT) {
      return {
        error: `Bu grupta en fazla ${IMPORT_HARD_LIMIT.toLocaleString('tr-TR')} numara olabilir (şu an ${currentCount.toLocaleString('tr-TR')}).`,
      }
    }

    let linked = 0
    for (let index = 0; index < cleaned.length; index += DB_CHUNK) {
      const chunk = cleaned.slice(index, index + DB_CHUNK)
      const result = await upsertContactChunk({
        orgId: org.id,
        userId,
        listId,
        chunk,
        supabase,
      })
      if (result.error) return { error: result.error }
      linked += result.linked
    }

    if (options.finalize) {
      const { count } = await supabase
        .from('contact_list_members')
        .select('contact_id', { count: 'exact', head: true })
        .eq('list_id', listId)
        .eq('org_id', org.id)

      await supabase
        .from('contact_lists')
        .update({ contact_count: count ?? 0 })
        .eq('id', listId)
        .eq('org_id', org.id)

      await enqueueJob({
        type: 'contacts.verify',
        payload: { list_id: listId },
        priority: 50,
      })

      revalidatePath('/kisiler')
      return {
        linked,
        ok: `İçe aktarma bitti · grupta ${count ?? linked} numara. Doğrulama kuyruğa alındı.`,
      }
    }

    return { linked }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
}

export async function verifyList(
  listId: string,
): Promise<{ error?: string; ok?: string; jobId?: string }> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { count: liveCount, error: liveError } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('status', 'connected')

  if (liveError) return { error: liveError.message }
  if (!liveCount) {
    return {
      error: 'Liste doğrulaması için bağlı bir WhatsApp hattı gerekli. Hatlar’dan bir hat bağlayın.',
    }
  }

  const { id, error } = await enqueueJob({
    type: 'contacts.verify',
    payload: { list_id: listId },
    priority: 50,
  })
  if (error || !id) return { error: error ?? 'Doğrulama işi oluşturulamadı.' }

  revalidatePath('/kisiler')
  revalidatePath(`/kisiler/${listId}`)
  return {
    jobId: id,
    ok: 'Doğrulama kuyruğa alındı. İş bitince alttaki özet güncellenir.',
  }
}

/** Org defterindeki kontrol edilmemis / bayat numaralari dogrular (liste bagimsiz). */
export async function verifyAllContacts(): Promise<{
  error?: string
  ok?: string
  jobId?: string
}> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { count: liveCount, error: liveError } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('status', 'connected')

  if (liveError) return { error: liveError.message }
  if (!liveCount) {
    return {
      error: 'Defter doğrulaması için bağlı bir WhatsApp hattı gerekli. Hatlar’dan bir hat bağlayın.',
    }
  }

  const { id, error } = await enqueueJob({
    type: 'contacts.verify',
    payload: {},
    priority: 40,
  })
  if (error || !id) return { error: error ?? 'Doğrulama işi oluşturulamadı.' }

  revalidatePath('/kisiler')
  return {
    jobId: id,
    ok: 'Doğrulama kuyruğa alındı. Sonuçlar listelerde ✓ / × olarak güncellenir; büyük defterlerde birkaç dakika sürebilir.',
  }
}

export async function deleteList(
  listId: string,
  opts?: { deleteContactsToo?: boolean },
): Promise<{ error?: string; ok?: string }> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  if (opts?.deleteContactsToo) {
    const { data: members } = await supabase
      .from('contact_list_members')
      .select('contact_id')
      .eq('list_id', listId)
      .eq('org_id', org.id)
    const ids = [...new Set((members ?? []).map((row) => row.contact_id))]
    if (ids.length > 0) {
      const del = await deleteContacts(ids)
      if (del.error) return del
    }
  }

  // Varsayılan: yalnız grup; kişiler defterde kalır (başka grupta olabilir).
  const { error } = await supabase
    .from('contact_lists')
    .delete()
    .eq('id', listId)
    .eq('org_id', org.id)
  if (error) return { error: error.message }

  revalidatePath('/kisiler')
  return { ok: opts?.deleteContactsToo ? 'Grup ve kişiler silindi.' : 'Grup silindi.' }
}

/** Defterden kişi siler (üyelikler cascade). WhatsApp import temizliği için. */
export async function deleteContacts(
  contactIds: string[],
): Promise<{ error?: string; ok?: string; deleted?: number }> {
  const ids = [...new Set(contactIds.filter(Boolean))]
  if (ids.length === 0) return { error: 'Silinecek kişi seçin.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  let deleted = 0
  for (let i = 0; i < ids.length; i += DB_CHUNK) {
    const chunk = ids.slice(i, i + DB_CHUNK)
    const { error, count } = await supabase
      .from('contacts')
      .delete({ count: 'exact' })
      .eq('org_id', org.id)
      .in('id', chunk)
    if (error) return { error: error.message }
    deleted += count ?? chunk.length
  }

  revalidatePath('/kisiler')
  return { ok: `${deleted} kişi silindi.`, deleted }
}

export async function deleteContactsBySource(
  source: 'whatsapp' | 'manual' | 'csv' | 'scraper' | 'maps',
): Promise<{ error?: string; ok?: string; deleted?: number }> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: rows, error: loadError } = await supabase
    .from('contacts')
    .select('id')
    .eq('org_id', org.id)
    .eq('source', source)
  if (loadError) return { error: loadError.message }
  const ids = (rows ?? []).map((row) => row.id)
  if (ids.length === 0) return { ok: 'Silinecek kayıt yok.', deleted: 0 }
  return deleteContacts(ids)
}

export async function addContactsToList(
  listId: string,
  contactIds: string[],
): Promise<{ error?: string; ok?: string }> {
  const ids = [...new Set(contactIds.filter(Boolean))]
  if (!listId) return { error: 'Grup seçin.' }
  if (ids.length === 0) return { error: 'Kişi seçin.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: list } = await supabase
    .from('contact_lists')
    .select('id')
    .eq('id', listId)
    .eq('org_id', org.id)
    .maybeSingle()
  if (!list) return { error: 'Grup bulunamadı.' }

  const { error } = await supabase.from('contact_list_members').upsert(
    ids.map((contactId) => ({
      org_id: org.id,
      list_id: listId,
      contact_id: contactId,
      created_by: userId,
    })),
    { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
  )
  if (error) return { error: error.message }

  const { count } = await supabase
    .from('contact_list_members')
    .select('contact_id', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('org_id', org.id)

  await supabase
    .from('contact_lists')
    .update({ contact_count: count ?? 0 })
    .eq('id', listId)
    .eq('org_id', org.id)

  revalidatePath('/kisiler')
  revalidatePath(`/kisiler/${listId}`)
  return { ok: `${ids.length} kişi gruba eklendi.` }
}

export async function removeContactsFromList(
  listId: string,
  contactIds: string[],
): Promise<{ error?: string; ok?: string }> {
  const ids = [...new Set(contactIds.filter(Boolean))]
  if (!listId) return { error: 'Grup seçin.' }
  if (ids.length === 0) return { error: 'Kişi seçin.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: list } = await supabase
    .from('contact_lists')
    .select('id')
    .eq('id', listId)
    .eq('org_id', org.id)
    .maybeSingle()
  if (!list) return { error: 'Grup bulunamadı.' }

  const { error } = await supabase
    .from('contact_list_members')
    .delete()
    .eq('list_id', listId)
    .eq('org_id', org.id)
    .in('contact_id', ids)

  if (error) return { error: error.message }

  const { count } = await supabase
    .from('contact_list_members')
    .select('contact_id', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('org_id', org.id)

  await supabase
    .from('contact_lists')
    .update({ contact_count: count ?? 0 })
    .eq('id', listId)
    .eq('org_id', org.id)

  revalidatePath('/kisiler')
  revalidatePath(`/kisiler/${listId}`)
  return { ok: `${ids.length} kişi gruptan çıkarıldı.` }
}

export async function renameList(
  listId: string,
  name: string,
): Promise<{ error?: string; ok?: string }> {
  const trimmed = name.trim()
  if (!listId) return { error: 'Grup bulunamadı.' }
  if (trimmed.length < 2) return { error: 'Grup adı en az 2 karakter.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { error } = await supabase
    .from('contact_lists')
    .update({ name: trimmed.slice(0, 120) })
    .eq('id', listId)
    .eq('org_id', org.id)

  if (error) return { error: error.message }
  revalidatePath('/kisiler')
  revalidatePath(`/kisiler/${listId}`)
  return { ok: 'Grup adı güncellendi.' }
}

export async function createEmptyList(
  name: string,
): Promise<{ error?: string; ok?: string; listId?: string }> {
  const trimmed = name.trim()
  if (trimmed.length < 2) return { error: 'Grup adı en az 2 karakter.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { data: list, error } = await supabase
      .from('contact_lists')
      .insert({
        org_id: org.id,
        created_by: userId,
        name: trimmed.slice(0, 120),
        source: 'manual',
        contact_count: 0,
      })
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/kisiler')
    return { ok: 'Boş grup oluşturuldu. Defterden kişi ekleyebilirsin.', listId: list.id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
}

export async function removeMember(
  listId: string,
  contactId: string,
): Promise<{ error?: string }> {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: list } = await supabase
    .from('contact_lists')
    .select('id')
    .eq('id', listId)
    .eq('org_id', org.id)
    .maybeSingle()

  if (!list) return { error: 'Liste bulunamadı.' }

  const { error } = await supabase
    .from('contact_list_members')
    .delete()
    .eq('list_id', listId)
    .eq('contact_id', contactId)
    .eq('org_id', org.id)

  if (error) return { error: error.message }

  const { count } = await supabase
    .from('contact_list_members')
    .select('contact_id', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('org_id', org.id)

  await supabase
    .from('contact_lists')
    .update({ contact_count: count ?? 0 })
    .eq('id', listId)
    .eq('org_id', org.id)

  revalidatePath(`/kisiler/${listId}`)
  revalidatePath('/kisiler')
  return {}
}

