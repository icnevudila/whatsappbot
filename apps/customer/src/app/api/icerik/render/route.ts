import { NextResponse } from 'next/server'
import { processCreativeGeneration } from '@/lib/creative/process'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'
export const maxDuration = 120

/** Oturumlu panel — worker sırası takılsa bile üretim bu istekte biter. */
export async function POST(request: Request) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    return NextResponse.json({ error: 'Oturum yok.' }, { status: 401 })
  }
  if (!isOrgAdminRole(org.role)) {
    return NextResponse.json({ error: 'Yetki yok.' }, { status: 403 })
  }

  let body: { id?: string }
  try {
    body = (await request.json()) as { id?: string }
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const id = String(body.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'id gerekli.' }, { status: 400 })

  const { data } = await supabase
    .from('creatives')
    .select('id, status, source')
    .eq('id', id)
    .eq('org_id', org.id)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'Görsel bulunamadı.' }, { status: 404 })
  if (data.source !== 'ai') {
    return NextResponse.json({ error: 'Yalnızca AI üretimleri.' }, { status: 400 })
  }
  if (data.status === 'ready') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const result = await processCreativeGeneration(id, supabase)
  if (result.busy) {
    return NextResponse.json({ ok: true, busy: true })
  }
  if (!result.ok) {
    const message = result.error ?? 'Üretim başarısız.'
    const { error: writeError } = await supabase
      .from('creatives')
      .update({ status: 'failed', error: message.slice(0, 400) })
      .eq('id', id)
      .eq('org_id', org.id)
      .in('status', ['pending', 'rendering', 'failed'])
    if (writeError) {
      console.error('[creative.render] failed yazılamadı', id, writeError.message)
    }
    return NextResponse.json({ error: message }, { status: 502 })
  }
  return NextResponse.json({ ok: true, skipped: result.skipped ?? false })
}
