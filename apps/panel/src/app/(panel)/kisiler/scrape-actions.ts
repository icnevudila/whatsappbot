'use server'

import { revalidatePath } from 'next/cache'
import { enqueueJob } from '@/lib/jobs'
import {
  scrapeContactsFromUrl,
  type ScrapedContact,
  type ScrapeResult,
} from '@/lib/scraper/contacts'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ScrapePreviewState = {
  error?: string
  result?: ScrapeResult
} | null

export type ScrapeImportState = {
  error?: string
  ok?: string
} | null

const CHUNK = 500

export async function previewScrape(
  _previous: ScrapePreviewState,
  formData: FormData,
): Promise<ScrapePreviewState> {
  const url = String(formData.get('url') ?? '').trim()
  if (!url) return { error: 'Bir web adresi girin.' }

  try {
    const result = await scrapeContactsFromUrl(url, { maxPages: 10, timeoutMs: 12_000 })

    if (result.errors.length > 0 && result.contacts.length === 0 && result.emailsOnly.length === 0) {
      return {
        error: result.errors[0] ?? 'Sayfa okunamadı.',
        result,
      }
    }

    if (result.contacts.length === 0 && result.emailsOnly.length === 0) {
      return {
        error:
          'Telefon veya e-posta bulunamadı. İletişim sayfası URL’sini deneyin veya site JavaScript ile yükleniyor olabilir.',
        result,
      }
    }

    return { result }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Tarama başarısız'
    return { error: message }
  }
}

export async function importScrapedContacts(
  _previous: ScrapeImportState,
  formData: FormData,
): Promise<ScrapeImportState> {
  const name = String(formData.get('name') ?? '').trim()
  const seedUrl = String(formData.get('seedUrl') ?? '').trim()
  const payloadRaw = String(formData.get('contactsJson') ?? '')

  if (!name) return { error: 'Listeye bir ad verin.' }
  if (!payloadRaw) return { error: 'Aktarılacak kişi seçilmedi.' }

  let contacts: ScrapedContact[]
  try {
    contacts = JSON.parse(payloadRaw) as ScrapedContact[]
  } catch {
    return { error: 'Kişi verisi okunamadı. Önizlemeyi yenileyin.' }
  }

  if (!Array.isArray(contacts) || contacts.length === 0) {
    return { error: 'En az bir telefon seçin.' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı.' }

  const { data: list, error: listError } = await supabase
    .from('contact_lists')
    .insert({
      owner_id: user.id,
      name,
      source: 'scraper',
    })
    .select('id')
    .single()

  if (listError) {
    if (listError.code === '23505') {
      return { error: 'Bu isimde bir liste zaten var. Farklı bir ad deneyin.' }
    }
    return { error: listError.message }
  }

  let linked = 0

  for (let index = 0; index < contacts.length; index += CHUNK) {
    const chunk = contacts.slice(index, index + CHUNK)

    const { error: contactError } = await supabase.from('contacts').upsert(
      chunk.map((row) => ({
        owner_id: user.id,
        phone_e164: row.phone_e164,
        name: row.name,
        source: 'scraper' as const,
        extra: {
          ...(row.email ? { email: row.email } : {}),
          scraped_from: row.sourceUrl,
          scrape_seed: seedUrl || null,
          confidence: row.confidence,
        },
      })),
      { onConflict: 'owner_id,phone_e164' },
    )

    if (contactError) return { error: contactError.message }

    const phones = chunk.map((row) => row.phone_e164)
    const { data: resolved, error: resolveError } = await supabase
      .from('contacts')
      .select('id')
      .in('phone_e164', phones)

    if (resolveError) return { error: resolveError.message }

    const contactIds = (resolved ?? []).map((contact) => contact.id)

    const { error: memberError } = await supabase.from('contact_list_members').upsert(
      contactIds.map((contactId) => ({
        owner_id: user.id,
        list_id: list.id,
        contact_id: contactId,
      })),
      { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
    )

    if (memberError) return { error: memberError.message }
    linked += contactIds.length
  }

  await supabase.from('contact_lists').update({ contact_count: linked }).eq('id', list.id)

  await enqueueJob({
    type: 'contacts.verify',
    payload: { list_id: list.id },
    priority: 50,
  })

  revalidatePath('/kisiler')
  revalidatePath(`/kisiler/${list.id}`)

  return {
    ok: `${linked} numara listeye alındı. WhatsApp doğrulaması kuyruğa alındı.`,
  }
}
