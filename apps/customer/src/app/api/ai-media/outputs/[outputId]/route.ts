import { NextRequest, NextResponse } from 'next/server'
import { requireActiveOrg } from '@/lib/org'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const rawGateway = process.env.OMNISTUDIO_GATEWAY_URL || process.env.AI_GATEWAY_URL || ''
const GATEWAY_HOST =
  rawGateway && !rawGateway.includes('127.0.0.1') && !rawGateway.includes('localhost')
    ? rawGateway
    : 'http://167.233.201.31:3456'

/**
 * GET /api/ai-media/outputs/[outputId]
 * Delivers authorized, tenant-isolated media playback stream for completed video jobs.
 * Enforces strict fail-closed security:
 * 1. Requires authenticated session and active organization (or Super Admin session).
 * 2. Invariant: output.org_id === authenticated_org.id (bypassed for verified Super Admin).
 * 3. Output must be marked verified === true and is_approved === true (bypassed for Super Admin QA).
 * 4. Proxies byte-range requests (HTTP 206) for smooth scrubbing in video player.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ outputId: string }> }
) {
  try {
    const { outputId } = await params

    if (!outputId) {
      return new NextResponse('Output ID eksik.', { status: 400 })
    }

    const isCanliTakipAdmin = await checkIsAuthenticated().catch(() => false)
    let isSuperAdmin = isCanliTakipAdmin
    let org: any = null
    let supabase: any = null

    const activeRes = await requireActiveOrg().catch(() => null)
    if (activeRes) {
      org = activeRes.org
      supabase = activeRes.supabase
      if (activeRes.isPlatformAdmin) {
        isSuperAdmin = true
      }
    }

    if (!isSuperAdmin && !org) {
      return new NextResponse('Yetkisiz: Giriş yapılmadı.', { status: 401 })
    }

    if (!supabase) {
      const serviceClient = createSupabaseServiceClient()
      supabase = serviceClient || createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rnkrjmblgcdqlyslbhob.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_S2-QnqQVsshYjQ7PR5lOxg_pYeS9gzB'
      )
    }

    // 1. Fetch Output Record from Supabase
    let output: any = null
    const { data, error } = await (supabase as any)
      .from('ai_media_outputs')
      .select('id, job_id, org_id, file_path, storage_url, verified, is_approved, sha256, byte_size')
      .eq('id', outputId)
      .single()

    if (error || !data) {
      const serviceClient = createSupabaseServiceClient()
      if (serviceClient && serviceClient !== supabase) {
        const { data: sData } = await serviceClient
          .from('ai_media_outputs')
          .select('id, job_id, org_id, file_path, storage_url, verified, is_approved, sha256, byte_size')
          .eq('id', outputId)
          .single()
        output = sData
      }
    } else {
      output = data
    }

    if (!output) {
      return new NextResponse('Medya çıktısı bulunamadı.', { status: 404 })
    }

    // 2. Strict Tenant Isolation Gate (FAIL CLOSED for normal tenants, Super Admin bypasses)
    if (!isSuperAdmin) {
      if (!org || output.org_id !== org.id) {
        console.warn(`[SECURITY_ALERT] CROSS_ORG_CONTAMINATION attempt blocked: Org ${org?.id} tried to access output ${output.id} belonging to org ${output.org_id}`)
        return new NextResponse('Yetkisiz erişim: Bu medya işletmenize ait değil.', { status: 403 })
      }

      // 3. Verification Gate
      if (!output.verified && !output.is_approved) {
        return new NextResponse('Medya henüz kalite kontrolünden geçmedi.', { status: 422 })
      }
    }

    // 4. Resolve Upstream Video or Thumbnail
    const filePath = output.file_path || ''
    const fileName = filePath.split('/').pop() || `${output.id}.mp4`
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9_\-\.]/g, '')
    const baseName = cleanFileName.replace(/\.mp4$/i, '')
    const isThumb = req.nextUrl.searchParams.get('thumb') === '1'

    // If thumbnail requested, resolve corresponding cover JPEG
    if (isThumb) {
      const thumbCandidates = Array.from(
        new Set(
          [
            output.job_id ? `${output.job_id}_thumb.jpg` : null,
            output.id ? `${output.id}_thumb.jpg` : null,
            output.job_id ? `${output.job_id}.jpg` : null,
            output.id ? `${output.id}.jpg` : null,
            `${baseName}_thumb.jpg`,
            `${baseName.replace(/_finished$/, '')}_thumb.jpg`,
            `${cleanFileName}.jpg`,
          ].filter(Boolean) as string[]
        )
      )

      for (const tName of thumbCandidates) {
        const thumbUrl = `${GATEWAY_HOST}/outputs/${tName}`
        try {
          const tRes = await fetch(thumbUrl, { cache: 'force-cache' })
          if (tRes.ok) {
            const tHeaders = new Headers()
            tHeaders.set('Content-Type', 'image/jpeg')
            tHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
            const cl = tRes.headers.get('content-length')
            if (cl) tHeaders.set('Content-Length', cl)
            return new NextResponse(tRes.body, { status: 200, headers: tHeaders })
          }
        } catch {
          // continue fallback
        }
      }
      return new NextResponse('Thumbnail bulunamadı.', { status: 404 })
    }

    // If output has an authoritative storage URL (Supabase Storage signed URL or external CDN), redirect
    if (output.storage_url && output.storage_url.startsWith('https://')) {
      return NextResponse.redirect(output.storage_url)
    }

    // Otherwise, stream from VPS gateway
    const rangeHeader = req.headers.get('range')
    const fetchHeaders: Record<string, string> = {}
    if (rangeHeader) {
      fetchHeaders['range'] = rangeHeader
    }

    const videoCandidates = Array.from(
      new Set(
        [
          cleanFileName,
          fileName,
          output.job_id ? `${output.job_id}.mp4` : null,
          output.id ? `${output.id}.mp4` : null,
          output.job_id ? `${output.job_id}_finished.mp4` : null,
          output.id ? `${output.id}_finished.mp4` : null,
        ].filter(Boolean) as string[]
      )
    )

    let upstreamRes: Response | null = null

    for (const vName of videoCandidates) {
      const vUrl = `${GATEWAY_HOST}/outputs/${vName}`
      try {
        const res = await fetch(vUrl, {
          headers: fetchHeaders,
          cache: 'no-store',
        })
        if (res.ok || res.status === 206) {
          upstreamRes = res
          break
        }
      } catch {
        // try next candidate
      }
    }

    // If not found, try structured relative path
    if ((!upstreamRes || (!upstreamRes.ok && upstreamRes.status !== 206)) && filePath.includes('/outputs/')) {
      const relPath = filePath.split('/outputs/')[1]
      try {
        const res = await fetch(`${GATEWAY_HOST}/outputs/${relPath}`, {
          headers: fetchHeaders,
          cache: 'no-store',
        })
        if (res.ok || res.status === 206) {
          upstreamRes = res
        }
      } catch {}
    }

    // Fallback: job-specific subfolder
    if (!upstreamRes || (!upstreamRes.ok && upstreamRes.status !== 206)) {
      const fallbackUrl = `${GATEWAY_HOST}/outputs/${output.org_id}/${output.job_id}/${cleanFileName}`
      try {
        const fallbackRes = await fetch(fallbackUrl, { headers: fetchHeaders, cache: 'no-store' })
        if (fallbackRes.ok || fallbackRes.status === 206) {
          upstreamRes = fallbackRes
        }
      } catch {}
    }

    if (!upstreamRes || (!upstreamRes.ok && upstreamRes.status !== 206)) {
      const status = upstreamRes ? upstreamRes.status : 502
      return new NextResponse(`Video akışı açılamadı (${status})`, { status })
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
