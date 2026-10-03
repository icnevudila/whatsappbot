import { createHash } from 'node:crypto'
import { isUncertainImageFailure } from './detail-render-state'

export function quickImageIdentity(input: { brief: string; brand?: string; style?: string; brandKitId?: string | null }) {
  return createHash('sha256').update(JSON.stringify([
    input.brief.trim(), (input.brand || '').trim(), (input.style || 'duyuru').trim(), input.brandKitId || null,
  ])).digest('hex')
}

export function ownsQuickImage(row: any, orgId: string, userId: string, identity: string): boolean {
  return row?.org_id === orgId && row.created_by === userId && row.source === 'ai'
    && row.template === 'ai_send' && row.format === 'square' && row.payload?.quickSendIdentity === identity
}

/** The insert must be awaited; a PostgREST query object alone does not execute. */
export async function ensureQuickImageRecord(db: any, record: any, identity: string) {
  const load = () => db.from('creatives').select('id,org_id,created_by,source,template,format,status,payload,public_url,error')
    .eq('id', record.id).eq('org_id', record.org_id).maybeSingle()
  const first = await load()
  if (first.error) throw new Error('QUICK_IMAGE_RECORD_UNCERTAIN')
  if (first.data) {
    if (!ownsQuickImage(first.data, record.org_id, record.created_by, identity)) throw new Error('QUICK_IMAGE_IDENTITY_CONFLICT')
    return first.data
  }
  const inserted = await db.from('creatives').insert(record).select('id').maybeSingle()
  if (!inserted.error && inserted.data?.id === record.id) return record
  // A simultaneous request may have inserted the same ID. Never replace it.
  const raced = await load()
  if (raced.error || !raced.data) throw new Error('QUICK_IMAGE_RECORD_UNCERTAIN')
  if (!ownsQuickImage(raced.data, record.org_id, record.created_by, identity)) throw new Error('QUICK_IMAGE_IDENTITY_CONFLICT')
  return raced.data
}

export async function continueQuickImageJob(db: any, id: string, orgId: string, process: () => Promise<any>) {
  const result = await process()
  if (!result.ok && !result.pending && !result.busy) {
    let canRetryNew = false
    if (db.from) {
      const failed = await db.from('creatives').select('status,error,payload').eq('id', id).eq('org_id', orgId).maybeSingle()
      const payload = failed.data?.payload || {}
      const terminal = payload.imageTerminalFailure
      const noIntent = !payload.imageJob && !payload.imageSubmitIntent && !payload.imageDirectIntent
      const confirmedTerminal = terminal?.jobId && terminal.jobId === payload.imageJob?.id
        && terminal.kind === 'PROVIDER_FAILED' && terminal.gatewayUrl === payload.imageJob?.gatewayUrl
      canRetryNew = !failed.error && failed.data?.status === 'failed' && Boolean(failed.data.error) && !isUncertainImageFailure(failed.data.error)
        && !payload.imageSubmissionUncertain && !payload.imageReconciliationRequired && !payload.imageDirectIntent
        && Boolean(noIntent || confirmedTerminal)
    }
    return { status: 502, body: { error: result.error || 'Üretim sonucu kontrol edilmeli.', creativeId: id, canRetryNew } }
  }
  if (result.ready && result.publicUrl) {
    const saved = await db.from('creatives').select('payload,brand_kit_id,public_url')
      .eq('id', id).eq('org_id', orgId).maybeSingle()
    if (!saved.error && saved.data?.public_url) return { status: 200,
      body: { url: saved.data.public_url, provider: saved.data.payload?.provider, brandKitId: saved.data.brand_kit_id } }
  }
  return { status: 202, body: { creativeId: id, pending: true, retryAfterSeconds: result.retryAfterSeconds || 5 } }
}
