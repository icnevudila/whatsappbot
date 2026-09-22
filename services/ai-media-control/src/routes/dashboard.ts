/**
 * Dashboard API — KPI, Alarms, Queue State
 */

import { Router } from 'express'
import { supabase } from '../index.js'

export const dashboardRouter = Router()

// GET /api/v1/dashboard/overview
dashboardRouter.get('/overview', async (_req, res) => {
  try {
    const activeStates = ['LEASED','PREPARING_ENV','OPENING_PROJECT','ATTACHING_INGREDIENTS','INGREDIENTS_VERIFIED','GENERATING','POLLING_FLOW','DOWNLOADING_MEDIA','MEDIA_DOWNLOADED','FFPROBE_INSPECTING','SHA256_VERIFYING','VISUAL_QA_EVALUATING']

    const [
      { count: totalJobs },
      { count: activeJobs },
      { count: queuedJobs },
      { count: completedJobs },
      { count: failedJobs },
    ] = await Promise.all([
      supabase.from('ai_media_jobs').select('*', { count: 'exact', head: true }),
      supabase.from('ai_media_jobs').select('*', { count: 'exact', head: true }).in('state', activeStates),
      supabase.from('ai_media_jobs').select('*', { count: 'exact', head: true }).eq('state', 'QUEUED'),
      supabase.from('ai_media_jobs').select('*', { count: 'exact', head: true }).eq('state', 'COMPLETED'),
      supabase.from('ai_media_jobs').select('*', { count: 'exact', head: true }).eq('state', 'FAILED'),
    ])

    const total = (completedJobs || 0) + (failedJobs || 0)
    const successRate = total > 0 ? Math.round(((completedJobs || 0) / total) * 100) : 0

    res.json({
      total_jobs: totalJobs || 0,
      active_jobs: activeJobs || 0,
      queued_jobs: queuedJobs || 0,
      completed_jobs: completedJobs || 0,
      failed_jobs: failedJobs || 0,
      success_rate: successRate,
      alarms: {
        cross_org_contamination: 0,
        wrong_output_delivery: 0,
        validation_bypass: 0,
      },
    })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// GET /api/v1/dashboard/queue
dashboardRouter.get('/queue', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('ai_media_jobs')
      .select('id, title, org_id, priority, created_at')
      .eq('state', 'QUEUED')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) return res.status(500).json({ error: true, message: error.message })
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})
