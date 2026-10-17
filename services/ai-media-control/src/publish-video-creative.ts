import type { SupabaseClient } from '@supabase/supabase-js'

type Publication = {
  jobId: string; orgId: string; outputId: string; approved: boolean
  selectedProvider: string; reviewDecision: string
}
type SqlClient = { query(sql: string, params: unknown[]): Promise<{ rowCount: number | null; rows?: any[] }> }

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
    if (result.rowCount !== 1) {
      const ownerRes = await db.query(
        'SELECT user_id FROM organization_members WHERE org_id = $1 LIMIT 1',
        [input.orgId]
      )
      const createdBy = ownerRes.rows?.[0]?.user_id || null
      const insertResult = await db.query(`INSERT INTO creatives (id, org_id, created_by, format, status, source, public_url, payload, created_at, updated_at)
        VALUES ($1, $2, $3, 'video', $4, 'ai', $5, $6::jsonb, $7, $7)
        ON CONFLICT (id) DO UPDATE SET format = EXCLUDED.format, status = EXCLUDED.status, source = EXCLUDED.source, public_url = EXCLUDED.public_url, payload = COALESCE(creatives.payload, '{}'::jsonb) || EXCLUDED.payload, updated_at = EXCLUDED.updated_at
        RETURNING id`,
      [input.jobId, input.orgId, createdBy, status, publicUrl, JSON.stringify(patch), new Date().toISOString()])
      if (insertResult.rowCount !== 1) throw new Error('VIDEO_CREATIVE_PUBLICATION_FAILED')
    }
    return
  }
  const { data: existing, error } = await db.from('creatives').select('payload,updated_at')
    .eq('id', input.jobId).eq('org_id', input.orgId).single()
  if (error || !existing) {
    const { data: member } = await db.from('organization_members').select('user_id').eq('org_id', input.orgId).limit(1).single()
    const { data: upserted, error: upsertErr } = await db.from('creatives').upsert({
      id: input.jobId, org_id: input.orgId, created_by: member?.user_id, format: 'video', status, source: 'ai', public_url: publicUrl,
      payload: patch, updated_at: new Date().toISOString(),
    }).select('id').single()
    if (upsertErr || !upserted) throw new Error('VIDEO_CREATIVE_PUBLICATION_FAILED')
    return
  }
  const { data: saved, error: saveError } = await db.from('creatives').update({
    format: 'video', status, source: 'ai', public_url: publicUrl,
    payload: { ...existing.payload, ...patch }, updated_at: new Date().toISOString(),
  }).eq('id', input.jobId).eq('org_id', input.orgId).eq('updated_at', existing.updated_at).select('id').single()
  if (saveError || saved?.id !== input.jobId) throw new Error('VIDEO_CREATIVE_PUBLICATION_FAILED')
}
