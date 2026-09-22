/**
 * AI Media Control — Main Express Server
 * 
 * Port: 3460
 * Role: SINGLE write authority for all ai_media_* and flow_* tables.
 *       Orchestrates jobs, validates outputs, emits audit events.
 *       Calls gflow-engine (internal HTTP) for actual generation.
 */

import express from 'express'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { jobsRouter } from './routes/jobs.js'
import { dashboardRouter } from './routes/dashboard.js'
import { accountsRouter } from './routes/accounts.js'
import { incidentsRouter } from './routes/incidents.js'
import { startOrchestrator } from './orchestrator.js'

import { db } from './db.js'

const PORT = parseInt(process.env.PORT || '3460', 10)
const GFLOW_ENGINE_URL = process.env.GFLOW_ENGINE_URL || 'http://gflow-engine:3461'

// Export unified db interface as supabase (for zero code changes across routes/orchestrator)
export const supabase: any = db
export const gflowEngineUrl = GFLOW_ENGINE_URL

const app = express()
app.use(express.json({ limit: '10mb' }))

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ai-media-control',
    uptime: process.uptime(),
    gflow_engine_url: GFLOW_ENGINE_URL,
  })
})

import { hostResourceGuard } from './resource-guard.js'

// API routes
app.use('/api/v1/jobs', jobsRouter)
app.use('/api/v1/dashboard', dashboardRouter)
app.use('/api/v1/accounts', accountsRouter)
app.use('/api/v1/incidents', incidentsRouter)

// Telemetry & Resource Guard routes
app.get('/api/v1/telemetry/resources', async (_req, res) => {
  const status = await hostResourceGuard.checkHostResources(supabase)
  res.json({
    status,
    alarm_counters: hostResourceGuard.getAlarmCounters(),
  })
})

app.post('/api/v1/telemetry/alarms/reset', (_req, res) => {
  hostResourceGuard.resetAlarmCounters()
  res.json({
    success: true,
    alarm_counters: hostResourceGuard.getAlarmCounters(),
  })
})

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: true, message: err.message || 'Internal server error' })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[ai-media-control] Listening on port ${PORT}`)
  console.log(`[ai-media-control] GFlow Engine: ${GFLOW_ENGINE_URL}`)
  console.log(`[ai-media-control] DB: ${process.env.DATABASE_URL ? 'Direct PostgreSQL Pool' : (process.env.SUPABASE_URL || 'PostgreSQL')}`)
  startOrchestrator(5000)
})
