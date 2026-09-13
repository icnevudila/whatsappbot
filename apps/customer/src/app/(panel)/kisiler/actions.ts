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

export async function listContactGroups(): Promise<{ id: string; name: string }[]> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { data } = await supabase
      .from('contact_lists')
      .select('id, name')
      .eq('org_id', org.id)
      .neq('source', 'quick_send')
      .order('created_at', { ascending: false })
    return data ?? []
  } catch {
    return []
  }
}

export async function createManualContact(input: {
  name: string
  phone: string
  listId: string
}): Promise<{ error?: string; ok?: string }> {
  const name = String(input.name ?? '').trim().slice(0, 120)
  const listId = String(input.listId ?? '').trim()
  const phone = toE164(String(input.phone ?? ''))

  if (!name || name.length < 2) return { error: 'Kişiye bir ad verin.' }
  if (!phone) return { error: 'Geçerli bir cep numarası girin.' }
  if (!listId) return { error: 'Grup seçin.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    const { data: list } = await supabase
      .from('contact_lists')
      .select('id')
      .eq('id', listId)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!list) return { error: 'Grup bulunamadı.' }

    const { error: contactError } = await supabase.from('contacts').upsert(
      {
        org_id: org.id,
        created_by: userId,
        phone_e164: phone,
        name,
        source: 'manual' as const,
      },
      { onConflict: 'org_id,phone_e164' },
    )
    if (contactError) return { error: contactError.message }

    const { data: contact, error: resolveError } = await supabase
      .from('contacts')
      .select('id')
      .eq('org_id', org.id)
      .eq('phone_e164', phone)
      .maybeSingle()
    if (resolveError) return { error: resolveError.message }
    if (!contact) return { error: 'Kişi kaydedilemedi.' }

    const { error: memberError } = await supabase.from('contact_list_members').upsert(
      {
        org_id: org.id,
        created_by: userId,
        list_id: listId,
        contact_id: contact.id,
      },
      { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
    )
    if (memberError) return { error: memberError.message }

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
    revalidatePath(`/kisiler/${listId}`)
    return { ok: `${name} gruba eklendi.` }
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

const MAX_LIST_REQUEST_PLACES = 100

export async function listListRequests() {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { data, error } = await supabase
      .from('list_requests')
      .select('id, kind, status, category, address, locations, radius_km, nationwide, contact_count, created_at')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(80)
    if (error) return { error: error.message, items: [] }
    return { items: data ?? [] }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.', items: [] }
  }
}

function parsePlaces(raw: unknown) {
  if (!Array.isArray(raw)) return { error: 'İl veya ilçe seçin.' }
  if (raw.length < 1) return { error: 'En az bir il veya ilçe ekleyin.' }
  if (raw.length > MAX_LIST_REQUEST_PLACES) {
    return { error: `En fazla ${MAX_LIST_REQUEST_PLACES} il / ilçe seçebilirsiniz.` }
  }

  const seen = new Set()
  const places = []
  for (const row of raw as {
    type?: string
    province_id?: number
    province_name?: string
    district_id?: number
    district_name?: string
  }[]) {
    if (!row || (row.type !== 'province' && row.type !== 'district')) {
      return { error: 'Geçersiz yer seçimi.' }
    }
    const provinceId = Number(row.province_id)
    const provinceName = String(row.province_name ?? '').trim()
    if (!Number.isInteger(provinceId) || provinceId < 1 || !provinceName) {
      return { error: 'Geçersiz il seçimi.' }
    }
    if (row.type === 'province') {
      const key = `p:${provinceId}`
      if (seen.has(key)) continue
      seen.add(key)
      places.push({ type: 'province', province_id: provinceId, province_name: provinceName })
      continue
    }
    const districtId = Number(row.district_id)
    const districtName = String(row.district_name ?? '').trim()
    if (!Number.isInteger(districtId) || districtId < 1 || !districtName) {
      return { error: 'Geçersiz ilçe seçimi.' }
    }
    const key = `d:${districtId}`
    if (seen.has(key)) continue
    seen.add(key)
    places.push({
      type: 'district',
      province_id: provinceId,
      province_name: provinceName,
      district_id: districtId,
      district_name: districtName,
    })
  }
  if (places.length < 1) return { error: 'En az bir il veya ilçe ekleyin.' }
  return { places }
}

export async function createListRequest(input: {
  kind: string
  category?: string
  address?: string
  radiusKm?: number
  nationwide?: boolean
  locations?: unknown
}): Promise<{ error?: string; ok?: string; id?: string }> {
  const kind = input?.kind === 'nearby' ? 'nearby' : input?.kind === 'province_district' ? 'province_district' : ''
  if (!kind) return { error: 'Talep türü seçin.' }

  let orgId: string
  let userId: string
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org: { id: orgId }, userId, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const row: {
    org_id: string
    created_by: string
    kind: 'province_district' | 'nearby'
    category?: string | null
    address?: string | null
    radius_km?: number | null
    nationwide?: boolean
    locations?: ReturnType<typeof parsePlaces>['places']
  } = {
    org_id: orgId,
    created_by: userId,
    kind,
  }

  if (kind === 'province_district') {
    const category = String(input.category ?? '').trim()
    if (category.length < 2) return { error: 'Kategori yazın (ör. restoran, eczane).' }
    if (category.length > 160) return { error: 'Kategori en fazla 160 karakter.' }
    const nationwide = Boolean(input.nationwide)
    row.category = category
    row.address = null
    row.radius_km = null
    row.nationwide = nationwide
    if (nationwide) {
      row.locations = []
    } else {
      const parsed = parsePlaces(input.locations)
      if (parsed.error || !parsed.places) return { error: parsed.error ?? 'İl veya ilçe seçin.' }
      row.locations = parsed.places
    }
  } else {
    const address = String(input.address ?? '').trim()
    if (address.length < 8) return { error: 'Açık adresi yazın.' }
    if (address.length > 1000) return { error: 'Adres en fazla 1000 karakter.' }
    const radiusKm = Number(input.radiusKm)
    if (!Number.isInteger(radiusKm) || radiusKm < 1 || radiusKm > 5) {
      return { error: 'Çevre mesafesini 1–5 km seçin.' }
    }
    row.category = null
    row.address = address
    row.radius_km = radiusKm
    row.nationwide = false
    row.locations = []
  }

  const { data, error } = await supabase
    .from('list_requests')
    .insert(row)
    .select('id')
    .maybeSingle()

  if (error) return { error: error.message }
  revalidatePath('/kisiler')
  return { ok: 'Talep alındı.', id: data?.id }
}

