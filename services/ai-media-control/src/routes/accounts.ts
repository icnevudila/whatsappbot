/**
 * Flow Accounts API — Read-only from DB
 */

import { Router } from 'express'
import { supabase } from '../index.js'

export const accountsRouter = Router()

// GET /api/v1/accounts
accountsRouter.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase.from('flow_accounts').select('*').order('id')
    if (error) return res.status(500).json({ error: true, message: error.message })
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})

// GET /api/v1/accounts/:id/events
accountsRouter.get('/:id/events', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('flow_account_events')
      .select('*')
      .eq('account_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return res.status(500).json({ error: true, message: error.message })
    res.json(data)
  } catch (e: any) {
    res.status(500).json({ error: true, message: e.message })
  }
})
