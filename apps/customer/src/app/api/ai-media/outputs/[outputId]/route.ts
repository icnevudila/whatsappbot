import { NextRequest, NextResponse } from 'next/server'
import { persistedVideoUrl, verifiedVideoResponse } from '@/lib/creative/video-delivery'
import { requireActiveOrg } from '@/lib/org'
import { checkIsAuthenticated } from '@/app/canli-takip/auth'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { createClient } from '@supabase/supabase-js'
import { isApprovedFinalVideoOutput, isReviewVideoOutput } from '@/lib/creative/video-output-approval'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const rawGateway = process.env.OMNISTUDIO_GATEWAY_URL || process.env.AI_GATEWAY_URL || ''
const GATEWAY_HOST =
  rawGateway && !rawGateway.includes('127.0.0.1') && !rawGateway.includes('localhost')
    ? rawGateway
    : 'https://media.167.233.201.31.nip.io'

/**
 * GET /api/ai-media/outputs/[outputId]
 * Delivers authorized, tenant-isolated media playback stream for completed video jobs.
 * Enforces strict fail-closed security:
 * 1. Requires authenticated session and active organization (or Super Admin session).
 * 2. Invariant: output.org_id === authenticated_org.id (bypassed for verified Super Admin).
 * 3. Publication requires approval; explicit private preview requires a validated owned NEEDS_REVIEW job.
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
      .select('id, job_id, org_id, file_path, storage_url, verified, is_approved, sha256, byte_size, duration_seconds, width, height, product_type')
      .eq('id', outputId)
      .single()

    if (error || !data) {
      const serviceClient = createSupabaseServiceClient()
      if (serviceClient && serviceClient !== supabase) {
        const { data: sData } = await serviceClient
          .from('ai_media_outputs')
          .select('id, job_id, org_id, file_path, storage_url, verified, is_approved, sha256, byte_size, duration_seconds, width, height, product_type')
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

    let reviewPreview = false
    if (req.nextUrl.searchParams.get('preview') === '1' && org && output.org_id === org.id) {
      // Use the authenticated client: a service helper can fall back to an
      // anonymous publishable key, which cannot read this tenant's job.
      const { data: reviewJob, error: reviewJobError } = await supabase
        .from('ai_media_jobs').select('id,org_id,state').eq('id', output.job_id).eq('org_id', org.id).single()
      reviewPreview = isReviewVideoOutput(output, reviewJob, org.id)
      if (!reviewPreview) console.warn('[ai-media-outputs] Review preview rejected', {
        output_id: output.id, job_id: output.job_id, lookup_error: reviewJobError?.code || null,
        job_state: reviewJob?.state || null, owned_job: reviewJob?.org_id === org.id,
        verified: output.verified, approved: output.is_approved, has_sha: typeof output.sha256 === 'string' && /^[a-f0-9]{64}$/i.test(output.sha256),
      })
    }

    // 2. Strict Tenant Isolation Gate (FAIL CLOSED for normal tenants, Super Admin bypasses)
    if (!isSuperAdmin) {
      if (!org || output.org_id !== org.id) {
        console.warn(`[SECURITY_ALERT] CROSS_ORG_CONTAMINATION attempt blocked: Org ${org?.id} tried to access output ${output.id} belonging to org ${output.org_id}`)
        return new NextResponse('Yetkisiz erişim: Bu medya işletmenize ait değil.', { status: 403 })
      }

      // 3. Verification Gate
      if (!isApprovedFinalVideoOutput(output) && !reviewPreview) {
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
        const hosts = Array.from(new Set([GATEWAY_HOST, 'http://167.233.201.31:3456', 'https://media.167.233.201.31.nip.io'].filter(Boolean)))
        for (const host of hosts) {
          const thumbUrl = `${host}/outputs/${tName}`
          try {
            const tRes = await fetch(thumbUrl, { cache: 'force-cache' })
            if (tRes.ok) {
              const image = await fetch(thumbUrl, { cache: 'no-store' })
              if (image.ok) return buildStreamResponse(image, tName, reviewPreview)
              return NextResponse.redirect(thumbUrl, 307)
            }
          } catch {
            // continue fallback
          }
        }
      }
      return new NextResponse('Thumbnail bulunamadı.', { status: 404 })
    }

    const mediaUrl = typeof output.storage_url === 'string' && output.storage_url.startsWith('https://')
      ? output.storage_url : persistedVideoUrl(filePath, GATEWAY_HOST)
    if (!mediaUrl) return new NextResponse('Kayıtlı video dosyası bulunamadı.', { status: 502 })
    const media = await fetch(mediaUrl, { cache: 'no-store', signal: AbortSignal.timeout(30000) })
    if (!media.ok) return new NextResponse('Kayıtlı video açılamadı.', { status: 502 })
    const bytes = new Uint8Array(await media.arrayBuffer())
    const delivered = verifiedVideoResponse(bytes, output, req.headers.get('range'))
    if (reviewPreview) delivered.headers.set('X-Media-Review-Required', 'true')
    return delivered
  } catch (err: any) {
    console.error('[ai-media-outputs] Stream error:', err)
    return new NextResponse('Sunucu hatası', { status: 500 })
  }
}

function buildStreamResponse(upstreamRes: Response, fileName: string, reviewPreview = false): NextResponse {
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
  resHeaders.set('Cache-Control', reviewPreview ? 'private, no-store' : 'private, max-age=3600')
  if (reviewPreview) resHeaders.set('X-Media-Review-Required', 'true')

  return new NextResponse(upstreamRes.body, {
    status: upstreamRes.status === 206 ? 206 : 200,
    headers: resHeaders,
  })
}
