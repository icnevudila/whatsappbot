'use server'

import type { ContactsDiscoverJobResult, JobStatus, ScrapedContact } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'
import { importScrapedContacts, type ScrapeImportState } from './scrape-actions'

/** Org başına günlük keşif üst sınırı — Places kotasını korur. */
const DISCOVER_DAILY_CAP = 15
/** Places sayfa başı 20; worker sayfalayarak bu kadar toplar. */
const DISCOVER_MAX_RESULTS = 60

export type DiscoverJobSnapshot = {
  id: string
  status: JobStatus
  error: string | null
  result: ContactsDiscoverJobResult | null
}

export async function startDiscover(query: string): Promise<{ jobId?: string; error?: string }> {
  const trimmed = query.trim()
  if (trimmed.length < 3) {
    return { error: 'Örnek: Bursa kuaför, İstanbul diş kliniği, Ankara oto yıkama' }
  }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)

  const { count, error: countError } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)
    .eq('type', 'contacts.discover')
    .gte('created_at', dayStart.toISOString())

  if (countError) return { error: countError.message }
  if ((count ?? 0) >= DISCOVER_DAILY_CAP) {
    return {
      error: `Günlük keşif limiti (${DISCOVER_DAILY_CAP}). Google Places kotasını korumak için yarın tekrar deneyin.`,
    }
  }

  const { id, error } = await enqueueJob({
    type: 'contacts.discover',
    payload: { query: trimmed, max_results: DISCOVER_MAX_RESULTS },
    priority: 35,
  })

  if (error || !id) return { error: error ?? 'İş kuyruğa alınamadı.' }
  return { jobId: id }
}

export async function getDiscoverJob(jobId: string): Promise<{
  job?: DiscoverJobSnapshot
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
    .eq('type', 'contacts.discover')
    .maybeSingle()

  if (error) return { error: error.message }
  if (!data) return { error: 'Arama işi bulunamadı.' }

  return {
    job: {
      id: String(data.id),
      status: data.status as JobStatus,
      error: data.error,
      result: (data.result as ContactsDiscoverJobResult | null) ?? null,
    },
  }
}

export { importScrapedContacts }
export type { ScrapeImportState, ScrapedContact }
