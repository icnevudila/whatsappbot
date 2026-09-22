/**
 * Database Client for AI Media Control
 * 
 * Supports direct PostgreSQL connection via DATABASE_URL (super-admin access with BYPASSRLS)
 * or Supabase HTTP API via SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 * 
 * Exposes a Supabase-compatible query interface so the rest of the codebase
 * (state-machine, queue, orchestrator, routes) works seamlessly without modification.
 */

import pg from 'pg'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const { Pool } = pg

const DATABASE_URL = process.env.DATABASE_URL || ''
const SUPABASE_URL = process.env.SUPABASE_URL || ''
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

let pool: pg.Pool | null = null
let supabaseClient: SupabaseClient | null = null

if (DATABASE_URL) {
  console.log('[db] Initializing direct PostgreSQL pool via DATABASE_URL (superuser bypassrls)')
  pool = new Pool({
    connectionString: DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
  })
} else if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  console.log('[db] Initializing Supabase HTTP client')
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
} else {
  throw new Error('[db] FATAL: Neither DATABASE_URL nor SUPABASE_SERVICE_ROLE_KEY provided in environment. Refusing to run on unauthenticated fallback.')
}

/**
 * Lightweight Supabase-compatible query builder backed by direct PostgreSQL pool.
 */
class PgQueryBuilder {
  private table: string
  private action: 'select' | 'insert' | 'update' = 'select'
  private selectCols: string = '*'
  private isCount: boolean = false
  private isHead: boolean = false
  private isSingle: boolean = false
  private insertData: any[] = []
  private updateData: any = null
  private conditions: { col: string; op: string; val: any }[] = []
  private orderCol: string | null = null
  private orderAsc: boolean = true
  private limitCount: number | null = null

  constructor(table: string) {
    this.table = table
  }

  select(cols: string = '*', options?: { count?: 'exact'; head?: boolean }) {
    if (this.action !== 'insert' && this.action !== 'update') {
      this.action = 'select'
    }
    this.selectCols = cols
    if (options?.count === 'exact') this.isCount = true
    if (options?.head) this.isHead = true
    return this
  }

  insert(data: any | any[]) {
    this.action = 'insert'
    this.insertData = Array.isArray(data) ? data : [data]
    return this
  }

  update(data: any) {
    this.action = 'update'
    this.updateData = data
    return this
  }

  eq(col: string, val: any) {
    this.conditions.push({ col, op: '=', val })
    return this
  }

  in(col: string, vals: any[]) {
    this.conditions.push({ col, op: 'IN', val: vals })
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderCol = col
    this.orderAsc = opts?.ascending ?? true
    return this
  }

  limit(n: number) {
    this.limitCount = n
    return this
  }

  single() {
    this.isSingle = true
    this.limitCount = 1
    return this.execute().then(res => ({
      data: (res.data && res.data.length > 0) ? res.data[0] : null,
      error: res.error,
    }))
  }

  maybeSingle() {
    this.isSingle = true
    this.limitCount = 1
    return this.execute().then(res => ({
      data: (res.data && res.data.length > 0) ? res.data[0] : null,
      error: res.error,
    }))
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    if (!pool) {
      return { data: null, error: { message: 'Database pool not initialized' } }
    }

    try {
      const params: any[] = []
      let sql = ''

      if (this.action === 'select') {
        if (this.isCount && this.isHead) {
          sql = `SELECT COUNT(*)::int as count FROM ${this.table}`
        } else {
          sql = `SELECT ${this.selectCols.includes('organizations(name)') ? '*' : this.selectCols} FROM ${this.table}`
        }

        if (this.conditions.length > 0) {
          const whereClauses = this.conditions.map(c => {
            if (c.op === 'IN') {
              const inPlaceholders = c.val.map((v: any) => {
                params.push(v)
                return `$${params.length}`
              }).join(', ')
              return `${c.col} IN (${inPlaceholders})`
            } else {
              params.push(c.val)
              return `${c.col} ${c.op} $${params.length}`
            }
          })
          sql += ` WHERE ${whereClauses.join(' AND ')}`
        }

        if (this.orderCol) {
          sql += ` ORDER BY ${this.orderCol} ${this.orderAsc ? 'ASC' : 'DESC'}`
        }

        if (this.limitCount !== null) {
          sql += ` LIMIT ${this.limitCount}`
        }

        const result = await pool.query(sql, params)
        if (this.isCount && this.isHead) {
          return { data: null, count: result.rows[0]?.count || 0, error: null }
        }
        return { data: result.rows, error: null, count: result.rowCount || 0 }
      }

      if (this.action === 'insert') {
        if (this.insertData.length === 0) return { data: [], error: null }

        const cols = Object.keys(this.insertData[0])
        const valuesClauses: string[] = []

        for (const row of this.insertData) {
          const rowPlaceholders: string[] = []
          for (const col of cols) {
            params.push(row[col])
            rowPlaceholders.push(`$${params.length}`)
          }
          valuesClauses.push(`(${rowPlaceholders.join(', ')})`)
        }

        sql = `INSERT INTO ${this.table} (${cols.join(', ')}) VALUES ${valuesClauses.join(', ')} RETURNING *`
        const result = await pool.query(sql, params)
        return { data: result.rows, error: null }
      }

      if (this.action === 'update') {
        const updateCols = Object.keys(this.updateData)
        const setClauses = updateCols.map(col => {
          params.push(this.updateData[col])
          return `${col} = $${params.length}`
        })

        sql = `UPDATE ${this.table} SET ${setClauses.join(', ')}`

        if (this.conditions.length > 0) {
          const whereClauses = this.conditions.map(c => {
            params.push(c.val)
            return `${c.col} ${c.op} $${params.length}`
          })
          sql += ` WHERE ${whereClauses.join(' AND ')}`
        }

        sql += ' RETURNING *'
        const result = await pool.query(sql, params)
        return { data: result.rows, error: null }
      }

      return { data: null, error: null }
    } catch (err: any) {
      console.error(`[db] SQL Error on ${this.table}:`, err.message)
      return { data: null, error: err }
    }
  }

  // Promise-like then for await
  then(resolve: any, reject?: any) {
    return this.execute().then(resolve, reject)
  }
}

/**
 * Unified database interface:
 * If pool is active, returns PgQueryBuilder.
 * Otherwise proxies to SupabaseClient.
 */
export const db = {
  from(table: string) {
    if (pool) {
      return new PgQueryBuilder(table)
    }
    if (supabaseClient) {
      return supabaseClient.from(table)
    }
    throw new Error('Database client not initialized')
  },
  async query(sql: string, params?: any[]) {
    if (!pool) throw new Error('PostgreSQL pool not initialized')
    return pool.query(sql, params)
  }
}
