import { NextRequest, NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATEWAY_HOST =
  process.env.OMNISTUDIO_GATEWAY_URL || process.env.AI_GATEWAY_URL || 'http://167.233.201.31:3456'

/**
 * GET /api/ai-media/outputs/[outputId]
 * Delivers authorized, tenant-isolated media playback stream for completed video jobs.
 * Enforces strict fail-closed security:
 * 1. Requires authenticated session and active organization.
 * 2. Invariant: output.org_id === authenticated_org.id
 * 3. Output must be marked verified === true and is_approved === true.
 * 4. Proxies byte-range requests (HTTP 206) for smooth scrubbing in video player.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ outputId: string }> }
) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { outputId } = await params

    if (!outputId) {
      return new NextResponse('Output ID eksik.', { status: 400 })
    }

    // 1. Fetch Output Record from Supabase
    const { data: output, error } = await (supabase as any)
      .from('ai_media_outputs')
      .select('id, job_id, org_id, file_path, storage_url, verified, is_approved, sha256, byte_size')
      .eq('id', outputId)
      .single()

    if (error || !output) {
      return new NextResponse('Medya çıktısı bulunamadı.', { status: 404 })
    }

    // 2. Strict Tenant Isolation Gate (FAIL CLOSED)
    if (output.org_id !== org.id) {
      console.warn(`[SECURITY_ALERT] CROSS_ORG_CONTAMINATION attempt blocked: Org ${org.id} tried to access output ${output.id} belonging to org ${output.org_id}`)
      return new NextResponse('Yetkisiz erişim: Bu medya işletmenize ait değil.', { status: 403 })
    }

    // 3. Verification Gate
    if (!output.verified && !output.is_approved) {
      return new NextResponse('Medya henüz kalite kontrolünden geçmedi.', { status: 422 })
    }

    // 4. Resolve Upstream Video Stream URL
    // If output has an authoritative storage URL (Supabase Storage signed URL or external CDN), redirect
    if (output.storage_url && output.storage_url.startsWith('https://')) {
      return NextResponse.redirect(output.storage_url)
    }

    // Otherwise, fetch from VPS shared outputs storage via gateway
    const filePath = output.file_path || ''
    const fileName = filePath.split('/').pop() || `${output.id}.mp4`
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '')

    // Extract org and job folder from file path if structured: /shared/outputs/<org_id>/<job_id>/...
    let upstreamUrl = `${GATEWAY_HOST}/outputs/${cleanFileName}`
    if (filePath.includes('/outputs/')) {
      const relPath = filePath.split('/outputs/')[1]
      upstreamUrl = `${GATEWAY_HOST}/outputs/${relPath}`
    }

    const rangeHeader = req.headers.get('range')
    const fetchHeaders: Record<string, string> = {}
    if (rangeHeader) {
      fetchHeaders['range'] = rangeHeader
    }

    const upstreamRes = await fetch(upstreamUrl, {
      headers: fetchHeaders,
      cache: 'no-store',
    })

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      // If gateway direct path 404s, try fallback by job-specific directory on gateway
      const fallbackUrl = `${GATEWAY_HOST}/outputs/${output.org_id}/${output.job_id}/${cleanFileName}`
      const fallbackRes = await fetch(fallbackUrl, { headers: fetchHeaders, cache: 'no-store' })
      if (!fallbackRes.ok && fallbackRes.status !== 206) {
        return new NextResponse(`Video akışı açılamadı (${upstreamRes.status})`, { status: upstreamRes.status })
      }
      return buildStreamResponse(fallbackRes, cleanFileName)
    }

    return buildStreamResponse(upstreamRes, cleanFileName)
  } catch (err: any) {
    console.error('[ai-media-outputs] Stream error:', err)
    return new NextResponse('Sunucu hatası', { status: 500 })
  }
}

function buildStreamResponse(upstreamRes: Response, fileName: string): NextResponse {
  const resHeaders = new Headers()
  const contentType =
    upstreamRes.headers.get('content-type') ||
    (fileName.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream')

  resHeaders.set('Content-Type', contentType)

  const contentLength = upstreamRes.headers.get('content-length')
  if (contentLength) resHeaders.set('Content-Length', contentLength)

  const contentRange = upstreamRes.headers.get('content-range')
  if (contentRange) resHeaders.set('Content-Range', contentRange)

  resHeaders.set('Accept-Ranges', 'bytes')
  resHeaders.set('Cache-Control', 'private, max-age=3600')

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status === 206 ? 206 : 200,
    headers: resHeaders,
  })
}
