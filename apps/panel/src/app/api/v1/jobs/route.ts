import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { JOB_TYPES, type JobType } from '@wa/shared'

export const runtime = 'nodejs'

/**
 * Harici CRM: Authorization: Bearer filo_xxx
 * Body: { type, payload?, accountId?, campaignId? }
 */
export async function POST(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const key = auth.replace(/^Bearer\s+/i, '').trim()
  if (!key.startsWith('filo_')) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'server misconfigured' }, { status: 503 })
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: orgId, error: keyError } = await admin.rpc('resolve_org_api_key', {
    p_key: key,
  })
  if (keyError || !orgId) {
    return NextResponse.json({ error: 'invalid api key' }, { status: 401 })
  }

  let body: {
    type?: string
    payload?: Record<string, unknown>
    accountId?: string
    campaignId?: string
    priority?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const type = body.type as JobType | undefined
  if (!type || !(JOB_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json({ error: 'invalid job type' }, { status: 400 })
  }

  const { data: owner } = await admin
    .from('organization_members')
    .select('user_id')
    .eq('org_id', orgId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()

  if (!owner?.user_id) {
    return NextResponse.json({ error: 'org owner missing' }, { status: 500 })
  }

  const { data, error } = await admin
    .from('jobs')
    .insert({
      org_id: orgId,
      created_by: owner.user_id,
      type,
      payload: body.payload ?? {},
      account_id: body.accountId ?? null,
      campaign_id: body.campaignId ?? null,
      priority: body.priority ?? 100,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: data.id, status: 'pending' }, { status: 201 })
}

export function hashApiKey(raw: string): { prefix: string; hash: string } {
  return {
    prefix: raw.slice(0, 8),
    hash: createHash('sha256').update(raw).digest('hex'),
  }
}

export function generateApiKey(): string {
  return `filo_${randomBytes(24).toString('base64url')}`
}
