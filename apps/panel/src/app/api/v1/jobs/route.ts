import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { JobType } from '@wa/shared'
import { rateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/** Harici CRM ile güvenli job tipleri (hesap logout vb. yok). */
const PUBLIC_JOB_TYPES = [
  'message.send',
  'contacts.verify',
  'contacts.check_phone',
  'campaign.start',
  'campaign.pause',
  'campaign.resume',
  'campaign.stop',
] as const satisfies readonly JobType[]

type PublicJobType = (typeof PUBLIC_JOB_TYPES)[number]

function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function resolveOrgFromRequest(request: Request): Promise<
  | { ok: true; orgId: string; admin: SupabaseClient }
  | { ok: false; response: NextResponse }
> {
  const auth = request.headers.get('authorization') ?? ''
  const key = auth.replace(/^Bearer\s+/i, '').trim()
  if (!key.startsWith('filo_')) {
    return { ok: false, response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  }

  const rl = rateLimit(`api-key:${key.slice(0, 16)}`, { limit: 120, windowMs: 60_000 })
  if (!rl.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      ),
    }
  }

  const admin = serviceClient()
  if (!admin) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'server misconfigured' }, { status: 503 }),
    }
  }

  const { data: orgId, error: keyError } = await admin.rpc('resolve_org_api_key', {
    p_key: key,
  })
  if (keyError || !orgId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'invalid api key' }, { status: 401 }),
    }
  }

  return { ok: true, orgId: orgId as string, admin }
}

/**
 * Harici CRM: Authorization: Bearer filo_xxx
 * Body: { type, payload?, accountId?, campaignId?, priority? }
 */
export async function POST(request: Request) {
  const authz = await resolveOrgFromRequest(request)
  if (!authz.ok) return authz.response
  const { orgId, admin } = authz

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

  const type = body.type as PublicJobType | undefined
  if (!type || !(PUBLIC_JOB_TYPES as readonly string[]).includes(type)) {
    return NextResponse.json(
      { error: 'invalid job type', allowed: PUBLIC_JOB_TYPES },
      { status: 400 },
    )
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

  if (body.accountId) {
    const { data: account } = await admin
      .from('accounts')
      .select('id')
      .eq('id', body.accountId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!account) {
      return NextResponse.json({ error: 'account not in org' }, { status: 400 })
    }
  }

  if (body.campaignId) {
    const { data: campaign } = await admin
      .from('campaigns')
      .select('id')
      .eq('id', body.campaignId)
      .eq('org_id', orgId)
      .maybeSingle()
    if (!campaign) {
      return NextResponse.json({ error: 'campaign not in org' }, { status: 400 })
    }
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

/** GET /api/v1/jobs?id=123 — iş durumu */
export async function GET(request: Request) {
  const authz = await resolveOrgFromRequest(request)
  if (!authz.ok) return authz.response
  const { orgId, admin } = authz

  const idRaw = new URL(request.url).searchParams.get('id')
  const id = idRaw ? Number(idRaw) : NaN
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  const { data, error } = await admin
    .from('jobs')
    .select('id, type, status, error, result, created_at, updated_at, finished_at')
    .eq('id', id)
    .eq('org_id', orgId)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!data) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
