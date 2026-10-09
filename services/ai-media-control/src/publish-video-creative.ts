import type { SupabaseClient } from '@supabase/supabase-js'

type Publication = {
  jobId: string; orgId: string; outputId: string; approved: boolean
  selectedProvider: string; reviewDecision: string
}
type SqlClient = { query(sql: string, params: unknown[]): Promise<{ rowCount: number | null }> }

/** Publish onto the existing tenant mirror atomically; never discard the wizard snapshot. */
export async function publishVideoCreative(db: SupabaseClient & Partial<SqlClient>, input: Publication): Promise<void> {
  const patch = {
    job_id: input.jobId, creative_engine_mode: 'SIMPLE_V5_HYBRID', selected_provider: input.selectedProvider,
    review_required: !input.approved, review_decision: input.reviewDecision,
    thumbnailUrl: `/api/ai-media/outputs/${input.outputId}?thumb=1`,
  }
  const publicUrl = `/api/ai-media/outputs/${input.outputId}`
  const status = input.approved ? 'ready' : 'needs_review'
  if (db.query) {
    const result = await db.query(`UPDATE creatives SET format = 'video', status = $3, source = 'ai',
      public_url = $4, payload = COALESCE(payload, '{}'::jsonb) || $5::jsonb, updated_at = $6
      WHERE id = $1 AND org_id = $2 RETURNING id`,
    [input.jobId, input.orgId, status, publicUrl, JSON.stringify(patch), new Date().toISOString()])
    if (result.rowCount !== 1) throw new Error('VIDEO_CREATIVE_PUBLICATION_FAILED')
    return
  }
  const { data: existing, error } = await db.from('creatives').select('payload,updated_at')
    .eq('id', input.jobId).eq('org_id', input.orgId).single()
  if (error || !existing) throw new Error('VIDEO_CREATIVE_PUBLICATION_FAILED')
  const { data: saved, error: saveError } = await db.from('creatives').update({
    format: 'video', status, source: 'ai', public_url: publicUrl,
    payload: { ...existing.payload, ...patch }, updated_at: new Date().toISOString(),
  }).eq('id', input.jobId).eq('org_id', input.orgId).eq('updated_at', existing.updated_at).select('id').single()
  if (saveError || saved?.id !== input.jobId) throw new Error('VIDEO_CREATIVE_PUBLICATION_FAILED')
}
