'use server'

import { revalidatePath } from 'next/cache'
import type { ContactsScrapeJobResult, JobStatus, ScrapedContact } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'

export type ScrapeImportState = {
  error?: string
  ok?: string
} | null

export type ScrapeJobSnapshot = {
  id: string
  status: JobStatus
  error: string | null
  result: ContactsScrapeJobResult | null
}

const CHUNK = 500

export async function startScrape(url: string): Promise<{ jobId?: string; error?: string }> {
  const trimmed = url.trim()
  if (!trimmed) return { error: 'Bir web adresi girin.' }

  const { id, error } = await enqueueJob({
    type: 'contacts.scrape',
    payload: { url: trimmed, max_pages: 15, mode: 'auto' },
    priority: 40,
  })

  if (error || !id) return { error: error ?? 'İş kuyruğa alınamadı.' }
  return { jobId: id }
}

export async function getScrapeJob(jobId: string): Promise<{
  job?: ScrapeJobSnapshot
  error?: string
}> {
  const id = jobId.trim()
  if (!id) return { error: 'İş kimliği eksik.' }

  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ supabase, org } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const numericId = Number(id)
  if (!Number.isFinite(numericId)) return { error: 'Geçersiz iş kimliği.' }

  const { data, error } = await supabase
    .from('jobs')
    .select('id, status, error, result')
    .eq('id', numericId)
    .eq('org_id', org.id)
    .eq('type', 'contacts.scrape')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Tarama işi bulunamadı.' }

  return {
    job: {
      id: String(data.id),
      status: data.status as JobStatus,
      error: data.error,
      result: (data.result as ContactsScrapeJobResult | null) ?? null,
    },
  }
}

export async function importScrapedContacts(
  _previous: ScrapeImportState,
  formData: FormData,
): Promise<ScrapeImportState> {
  const name = String(formData.get('name') ?? '').trim()
  const sourceRaw = String(formData.get('source') ?? 'scraper').trim()
  const source = sourceRaw === 'maps' ? 'maps' : 'scraper'
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
    .insert({
      org_id: org.id,
      created_by: userId,
      name,
      source,
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
        org_id: org.id,
        created_by: userId,
        phone_e164: row.phone_e164,
        name: row.name,
        source,
        extra: {
          ...(row.email ? { email: row.email } : {}),
          scraped_from: row.sourceUrl,
          scrape_seed: seedUrl || null,
          confidence: row.confidence,
        },
      })),
      { onConflict: 'org_id,phone_e164' },
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
