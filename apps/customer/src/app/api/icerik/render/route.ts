import { NextResponse } from 'next/server'
import { processCreativeGeneration } from '@/lib/creative/process'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'
export const maxDuration = 180

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
    .select('id, status, source, format, payload, error')
    .eq('id', id)
    .eq('org_id', org.id)
    .maybeSingle()

  if (!data) return NextResponse.json({ error: 'Görsel bulunamadı.' }, { status: 404 })
  if (data.source !== 'ai') {
    return NextResponse.json({ error: 'Yalnızca AI üretimleri.' }, { status: 400 })
  }
  const payload = (data.payload ?? {}) as Record<string, unknown>
  if (data.format !== 'video' && data.status === 'failed' && !payload.imageJob && !payload.imageSubmitIntent && !payload.imageDirectIntent) {
    // A polling request is observation, not permission to retry a paid failed job.
    return NextResponse.json({ error: data.error || 'Görsel üretimi başarısız oldu.' }, { status: 502 })
  }
  if (data.status === 'ready') {
    const { data: full } = await supabase
      .from('creatives')
      .select('public_url, payload')
      .eq('id', id)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!full?.public_url) return NextResponse.json({ ok: true, pending: true, retryAfterSeconds: 5,
      evidenceRequired: 'MISSING_OUTPUT_URL' }, { status: 202 })
    const p = (full?.payload ?? {}) as Record<string, unknown>
    return NextResponse.json({
      ok: true,
      ready: true,
      skipped: true,
      publicUrl: full?.public_url || null,
      thumbnailUrl: (p.thumbnailUrl as string) || (full?.public_url ? `${full.public_url}?thumb=1` : null),
    })
  }

  // Video jobs are orchestrated via ai_media_jobs; do not route to legacy snapshot processor
  const jobId = (((data.payload as any)?.job_id || id) as string).trim()
  if (data.format === 'video') {
    const { data: mediaJob } = await (supabase as any)
      .from('ai_media_jobs')
      .select('id, state, error_message')
      .eq('id', jobId)
      .eq('org_id', org.id)
      .maybeSingle()

    if (mediaJob) {
      if (mediaJob.state === 'COMPLETED') {
        const { data: out } = await (supabase as any)
          .from('ai_media_outputs')
          .select('id, verified, file_path, storage_url, sha256')
          .eq('job_id', jobId)
          .eq('org_id', org.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (!out?.id || !out.verified || !(out.file_path || out.storage_url) || !/^[a-f0-9]{64}$/i.test(out.sha256 || '')) {
          return NextResponse.json({ ok: true, pending: true, retryAfterSeconds: 5,
            evidenceRequired: 'MISSING_VERIFIED_OUTPUT' }, { status: 202 })
        }
        const pUrl = `/api/ai-media/outputs/${out.id}`
        const tUrl = `/api/ai-media/outputs/${out.id}?thumb=1`
        const saved = await (supabase as any)
          .from('creatives')
          .update({
            status: 'ready',
            public_url: pUrl,
            payload: { ...(data.payload as any), thumbnailUrl: tUrl },
          })
          .eq('id', id)
          .eq('org_id', org.id).eq('status', data.status).select('id').maybeSingle()
        if (saved.error || !saved.data?.id) return NextResponse.json({ ok: true, pending: true, retryAfterSeconds: 5 }, { status: 202 })

        return NextResponse.json({
          ok: true,
          ready: true,
          publicUrl: pUrl,
          thumbnailUrl: tUrl,
        })
      } else if (mediaJob.state === 'FAILED') {
        const errMsg = mediaJob.error_message || 'Video üretimi başarısız oldu.'
        await (supabase as any)
          .from('creatives')
          .update({ status: 'failed', error: errMsg })
          .eq('id', id)
          .eq('org_id', org.id).eq('status', data.status)
        return NextResponse.json({ error: errMsg }, { status: 502 })
      } else {
        return NextResponse.json(
          {
            ok: true,
            pending: true,
            retryAfterSeconds: 4,
          },
          { status: 202 },
        )
      }
    }
  }

  const result = await processCreativeGeneration(id, supabase)
  if (result.pending || result.busy) {
    // busy da pending olarak dön — poll loop devam etsin, spinner durmasın.
    return NextResponse.json(
      {
        ok: true,
        pending: true,
        retryAfterSeconds: result.retryAfterSeconds ?? 3,
        progressInfo: result.progressInfo ?? null,
      },
      { status: 202 },
    )
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
  if (!(result.ready && result.publicUrl)) return NextResponse.json({ ok: true, pending: true, retryAfterSeconds: 5 }, { status: 202 })
  return NextResponse.json({
    ok: true,
    ready: true,
    skipped: result.skipped ?? false,
    publicUrl: result.publicUrl ?? null,
    thumbnailUrl: result.thumbnailUrl ?? null,
  })
}
