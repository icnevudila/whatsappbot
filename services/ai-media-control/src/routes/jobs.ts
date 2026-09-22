/**
 * Jobs API Routes
 * Create, list, detail, retry, cancel AI media jobs.
 */

import { Router } from 'express'
import { supabase, gflowEngineUrl } from '../index.js'
import { JobState, transitionJob } from '../state-machine.js'

export const jobsRouter = Router()

// POST /api/v1/jobs — Create new AI media job
jobsRouter.post('/', async (req, res) => {
  try {
    const { org_id, title, prompt, model, aspect_ratio, duration_seconds, priority, assets, campaign_id, metadata } = req.body

    if (!org_id || !title || !prompt) {
      return res.status(400).json({ error: true, message: 'org_id, title, and prompt are required' })
    }

    const { data: job, error } = await supabase
      .from('ai_media_jobs')
      .insert({
        org_id,
        title,
        prompt,
        model: model || 'veo-fast',
        aspect_ratio: aspect_ratio || '9:16',
        duration_seconds: duration_seconds || 8,
        priority: priority || 0,
        campaign_id: campaign_id || null,
        expected_ingredient_count: (assets || []).length,
        metadata: metadata || {},
      })
      .select()
      .single()

    if (error) {
      return res.status(500).json({ error: true, message: error.message })
    }

    // Insert assets if provided
    if (assets && assets.length > 0) {
      const assetRows = assets.map((a: any) => ({
        job_id: job.id,
        org_id,
        role: a.role || 'reference',
        file_path: a.file_path,
        original_filename: a.original_filename || a.file_path.split('/').pop(),
        sha256: a.sha256 || '',
        mime_type: a.mime_type || 'image/png',
        byte_size: a.byte_size || 0,
      }))
      await supabase.from('ai_media_assets').insert(assetRows)
    }

    // Append creation event
    await supabase.from('ai_media_events').insert({
      job_id: job.id,
      org_id,
      event_type: 'JOB_CREATED',
      from_state: null,
      to_state: JobState.PENDING,
      message: `Job "${title}" created`,
      payload: { model, aspect_ratio, assets_count: (assets || []).length },
    })

    res.status(201).json(job)
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// GET /api/v1/jobs — List jobs with optional filters
jobsRouter.get('/', async (req, res) => {
  try {
    const { org_id, state, limit = '50' } = req.query as Record<string, string>
    let query = supabase.from('ai_media_jobs').select('*').order('created_at', { ascending: false }).limit(parseInt(limit))

    if (org_id) query = query.eq('org_id', org_id)
    if (state) query = query.eq('state', state)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: true, message: error.message })
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// GET /api/v1/jobs/:id — Job detail with events timeline
jobsRouter.get('/:id', async (req, res) => {
  try {
    const { data: job } = await supabase.from('ai_media_jobs').select('*').eq('id', req.params.id).single()
    if (!job) return res.status(404).json({ error: true, message: 'Job not found' })

    const { data: events } = await supabase.from('ai_media_events').select('*').eq('job_id', req.params.id).order('created_at', { ascending: true })
    const { data: assets } = await supabase.from('ai_media_assets').select('*').eq('job_id', req.params.id)
    const { data: outputs } = await supabase.from('ai_media_outputs').select('*').eq('job_id', req.params.id)
    const { data: attempts } = await supabase.from('ai_media_attempts').select('*').eq('job_id', req.params.id).order('attempt_number', { ascending: true })

    res.json({ ...job, events: events || [], assets: assets || [], outputs: outputs || [], attempts: attempts || [] })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// GET /api/v1/jobs/:id/events — Audit trail
jobsRouter.get('/:id/events', async (req, res) => {
  try {
    const { data, error } = await supabase.from('ai_media_events').select('*').eq('job_id', req.params.id).order('created_at', { ascending: true })
    if (error) return res.status(500).json({ error: true, message: error.message })
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// POST /api/v1/jobs/:id/retry — Retry a FAILED or NEEDS_REVIEW job
jobsRouter.post('/:id/retry', async (req, res) => {
  try {
    const { data: job } = await supabase.from('ai_media_jobs').select('*').eq('id', req.params.id).single()
    if (!job) return res.status(404).json({ error: true, message: 'Job not found' })

    if (job.state !== JobState.FAILED && job.state !== JobState.NEEDS_REVIEW) {
      return res.status(400).json({ error: true, message: `Cannot retry job in state ${job.state}` })
    }

    if (job.retry_count >= job.max_retries) {
      return res.status(400).json({ error: true, message: `Max retries (${job.max_retries}) reached` })
    }

    await supabase.from('ai_media_jobs').update({
      retry_count: job.retry_count + 1,
      error_message: null,
      error_code: null,
    }).eq('id', job.id)

    await transitionJob(supabase, job.id, job.org_id, job.state as JobState, JobState.QUEUED, 'Manual retry requested')

    res.json({ success: true, message: 'Job re-queued for retry' })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// POST /api/v1/jobs/:id/cancel — Cancel a running job
jobsRouter.post('/:id/cancel', async (req, res) => {
  try {
    const { data: job } = await supabase.from('ai_media_jobs').select('*').eq('id', req.params.id).single()
    if (!job) return res.status(404).json({ error: true, message: 'Job not found' })

    if (job.state === JobState.COMPLETED || job.state === JobState.FAILED) {
      return res.status(400).json({ error: true, message: `Cannot cancel job in terminal state ${job.state}` })
    }

    await transitionJob(supabase, job.id, job.org_id, job.state as JobState, JobState.FAILED, 'Manually cancelled by admin', { cancelled: true })

    res.json({ success: true, message: 'Job cancelled' })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// POST /api/v1/jobs/:id/transition — State transition via adapter
jobsRouter.post('/:id/transition', async (req, res) => {
  try {
    const { org_id, from_state, to_state, message, payload, attempt_id } = req.body
    await transitionJob(
      supabase,
      req.params.id,
      org_id,
      from_state as JobState,
      to_state as JobState,
      message || `Transitioned to ${to_state}`,
      payload || {},
      attempt_id
    )
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// POST /api/v1/jobs/:id/events — Log audit event via adapter
jobsRouter.post('/:id/events', async (req, res) => {
  try {
    const { org_id, event_type, message, payload } = req.body
    await supabase.from('ai_media_events').insert({
      job_id: req.params.id,
      org_id,
      event_type,
      message: message || '',
      payload: payload || {},
      created_at: new Date().toISOString(),
    })
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// PATCH /api/v1/jobs/:id/metadata — Update metadata via adapter
jobsRouter.patch('/:id/metadata', async (req, res) => {
  try {
    const { metadata } = req.body
    const { data: job } = await supabase.from('ai_media_jobs').select('metadata').eq('id', req.params.id).single()
    const existing = (job?.metadata as Record<string, unknown>) || {}
    await supabase
      .from('ai_media_jobs')
      .update({
        metadata: { ...existing, ...(metadata || {}) },
        updated_at: new Date().toISOString(),
      })
      .eq('id', req.params.id)
    res.json({ success: true })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

