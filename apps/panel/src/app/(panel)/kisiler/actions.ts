'use server'

import { revalidatePath } from 'next/cache'
import { parsePhoneList } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
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

  // E.164 normalizasyonu ve tekilleme panelde yapiliyor: veritabanindaki
  // CHECK kisiti E.164 disi bir numarayi zaten reddeder, kullaniciya
  // anlasilir bir ozet vermek daha iyi.
  const parsed = parsePhoneList(raw)

  if (parsed.valid.length === 0) {
    return {
      error: 'Gecerli numara bulunamadi. Ornek: 0532 123 45 67 veya +905321234567',
      invalidSamples: parsed.invalid.slice(0, 5),
    }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadi.' }

  const { data: list, error: listError } = await supabase
    .from('contact_lists')
    .insert({ owner_id: user.id, name, source: 'manual' })
    .select('id')
    .single()

  if (listError) return { error: listError.message }

  let linked = 0

  for (let index = 0; index < parsed.valid.length; index += CHUNK) {
    const chunk = parsed.valid.slice(index, index + CHUNK)

    // Ayni numara daha once eklendiyse adi guncellenmez, kayit korunur.
    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        chunk.map((row) => ({
          owner_id: user.id,
          phone_e164: row.phone_e164,
          name: row.name,
          source: 'manual' as const,
        })),
        { onConflict: 'owner_id,phone_e164', ignoreDuplicates: false },
      )
      .select('id')

    if (contactError) return { error: contactError.message }

    const { error: memberError } = await supabase.from('contact_list_members').upsert(
      (contacts ?? []).map((contact) => ({
        owner_id: user.id,
        list_id: list.id,
        contact_id: contact.id,
      })),
      { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
    )

    if (memberError) return { error: memberError.message }
    linked += contacts?.length ?? 0
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
  if (parsed.duplicates > 0) parts.push(`${parsed.duplicates} tekrar atlandi`)
  if (parsed.invalid.length > 0) parts.push(`${parsed.invalid.length} gecersiz`)

  return {
    ok: `${parts.join(', ')}. WhatsApp dogrulamasi kuyruga alindi.`,
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
  return {}
}

export async function deleteList(listId: string): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient()

  // Kisiler silinmiyor, yalnizca liste ve uyelikleri.
  // Ayni numaralar baska listelerde kullanilmis olabilir.
  const { error } = await supabase.from('contact_lists').delete().eq('id', listId)
  if (error) return { error: error.message }

  revalidatePath('/kisiler')
  return {}
}
