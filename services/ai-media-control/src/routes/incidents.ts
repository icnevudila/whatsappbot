/**
 * Flow Incidents API — Admin-only access to redacted incident bundles
 */

import { Router } from 'express'
import { supabase } from '../index.js'

export const incidentsRouter = Router()

// GET /api/v1/incidents — List all incidents (admin-only)
incidentsRouter.get('/', async (req, res) => {
  try {
    const { limit = '50', resolved } = req.query as Record<string, string>
    let query = supabase
      .from('flow_incidents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit))

    if (resolved === 'true') query = query.eq('resolved', true)
    if (resolved === 'false') query = query.eq('resolved', false)

    const { data, error } = await query
    if (error) return res.status(500).json({ error: true, message: error.message })

    // Ensure all returned incidents are marked as redacted
    const safeData = (data || []).map((inc: any) => ({
      ...inc,
      // Strip raw paths from client response — only expose metadata
      screenshot_path: inc.screenshot_path ? '[available]' : null,
      dom_dump_path: inc.dom_dump_path ? '[available]' : null,
      har_path: inc.har_path ? '[available]' : null,
      is_redacted: true,
    }))

    res.json(safeData)
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// GET /api/v1/incidents/:id — Single incident detail
incidentsRouter.get('/:id', async (req, res) => {
  try {
    const { data: incident, error } = await supabase
      .from('flow_incidents')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !incident) {
      return res.status(404).json({ error: true, message: 'Incident not found' })
    }

    res.json({
      ...incident,
      is_redacted: true,
    })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// POST /api/v1/incidents/:id/resolve — Mark incident as resolved
incidentsRouter.post('/:id/resolve', async (req, res) => {
  try {
    const { error } = await supabase
      .from('flow_incidents')
      .update({ resolved: true })
      .eq('id', req.params.id)

    if (error) return res.status(500).json({ error: true, message: error.message })
    res.json({ success: true, message: 'Incident marked as resolved' })
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})
