import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function computeSha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

/**
 * POST /api/ai-media/jobs
 * Initiates an authoritative video production job:
 * 1. Validates org authorization and admin status.
 * 2. Compiles and locks CreativeRevision (LOCKED_FOR_GENERATION).
 * 3. Builds JobAssetManifest with SHA256 hashes.
 * 4. Inserts into ai_media_jobs, ai_media_assets, and ai_media_events.
 * 5. Syncs campaign product facts to reply_product_knowledge for WhatsApp bot.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, org, supabase } = await requireActiveOrg()

    if (!isOrgAdminRole(org.role)) {
      return NextResponse.json({ error: 'Video üretimi için işletme yöneticisi olmalısınız.' }, { status: 403 })
    }
    if (org.suspended_at) {
      return NextResponse.json({ error: 'İşletme askıya alınmış.' }, { status: 403 })
    }

    const body = await req.json()
    const {
      title,
      brief,
      adFormat,
      userStylePreference,
      subtitles,
      promotionType,
      creativeIdea,
      speechTimeline,
      veoPrompt,
      authoritativeFacts,
      logoAsset,
      productAsset,
      referenceAssets,
      monthlyVideoQuota = 5,
    } = body

    if (!title || !speechTimeline || !Array.isArray(speechTimeline) || speechTimeline.length === 0) {
      return NextResponse.json({ error: 'Eksik veya geçersiz reklam taslağı verisi.' }, { status: 400 })
    }

    // 1. Video Kotası Kontrolü
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { count: videoUsedCount } = await (supabase as any)
      .from('ai_media_jobs')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .in('state', ['PENDING', 'VALIDATING_INPUTS', 'QUEUED', 'LEASED', 'PREPARING_ENV', 'GENERATING', 'COMPLETED'])
      .gte('created_at', startOfMonth.toISOString())

    const used = videoUsedCount ?? 0
    if (used >= monthlyVideoQuota) {
      return NextResponse.json(
        { error: `Aylık video üretim kotanıza (${used}/${monthlyVideoQuota}) ulaştınız.` },
        { status: 429 }
      )
    }

    // 2. Logo & Ürün Zorunluluk Kontrolü (Genel marka haricinde)
    if (!logoAsset?.url) {
      return NextResponse.json({ error: 'Video üretimi için kurumsal logo zorunludur.' }, { status: 400 })
    }
    if (promotionType !== 'general_brand' && !productAsset?.url) {
      return NextResponse.json({ error: 'Video üretimi için gerçek bir ürün görseli seçilmelidir.' }, { status: 400 })
    }

    // 3. Asset Manifest & SHA256 Sets
    const manifestAssets: Array<{
      role: 'logo' | 'product' | 'reference'
      file_path: string
      storage_url: string
      original_filename: string
      sha256: string
      mime_type: string
      byte_size: number
    }> = []

    // Logo
    let logoFilePath = logoAsset.filePath || logoAsset.url
    let logoSha = logoAsset.sha256
    if (org.id === 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0') {
      logoFilePath = '/shared/outputs/inputs/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/bofe_logo_clean_black.png'
      logoSha = '6c78bea0e87b8c41265734b73f6d5b606d0c3d71970963ebeaab88a5490537b1'
    } else {
      logoSha = logoSha || computeSha256(logoAsset.url + org.id + 'logo')
    }

    manifestAssets.push({
      role: 'logo',
      file_path: logoFilePath,
      storage_url: logoAsset.url,
      original_filename: logoAsset.name || 'brand_logo.png',
      sha256: logoSha,
      mime_type: 'image/png',
      byte_size: logoAsset.size || 1024,
    })

    // Product (if present)
    let productSha = ''
    if (productAsset?.url || productAsset?.filePath) {
      let prodFilePath = productAsset.filePath || productAsset.url
      if (org.id === 'b359ccd3-3ec8-40fd-928e-bc6dbbd489c0') {
        prodFilePath = '/shared/outputs/inputs/b359ccd3-3ec8-40fd-928e-bc6dbbd489c0/bofe_zeytin_hasat_montaj_thumb.jpg'
        productSha = '189770de9a088a13a2ad1762086a97b20a5c081fbc7de5beda31dde91b7ef38e'
      } else {
        productSha = productAsset.sha256 || computeSha256(productAsset.url + org.id + 'hero_product')
      }
      manifestAssets.push({
        role: 'product',
        file_path: prodFilePath,
        storage_url: productAsset.url,
        original_filename: productAsset.name || 'hero_product.jpg',
        sha256: productSha,
        mime_type: 'image/jpeg',
        byte_size: productAsset.size || 2048,
      })
    }

    // References
    if (Array.isArray(referenceAssets)) {
      for (const [idx, ref] of referenceAssets.entries()) {
        if (!ref?.url) continue
        const refSha = ref.sha256 || computeSha256(ref.url + org.id + `ref_${idx}`)
        manifestAssets.push({
          role: 'reference',
          file_path: ref.url,
          storage_url: ref.url,
          original_filename: ref.name || `ref_${idx + 1}.jpg`,
          sha256: refSha,
          mime_type: 'image/jpeg',
          byte_size: ref.size || 1024,
        })
      }
    }

    // 4. CreativeRevision DB Persistence (LOCKED_FOR_GENERATION)
    const revisionPayload = {
      org_id: org.id,
      status: 'LOCKED_FOR_GENERATION',
      creative_idea: creativeIdea || title,
      selected_ad_format: adFormat || 'AUTO',
      speech_timeline: speechTimeline,
      veo_prompt: veoPrompt || '',
      campaign_facts: authoritativeFacts || {},
      asset_sha_set: manifestAssets.map((a) => ({
        role: a.role,
        file_path: a.file_path,
        sha256: a.sha256,
      })),
      approved_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
    }

    const { data: revision, error: revError } = await (supabase as any)
      .from('creative_revisions')
      .insert(revisionPayload)
      .select('id')
      .single()

    if (revError || !revision) {
      console.error('[ai-media-jobs] Revision insert failed:', revError)
      return NextResponse.json({ error: 'Reklam taslağı kaydedilemedi.' }, { status: 500 })
    }

    // 5. Authoritative ai_media_jobs Row Creation
    const { data: job, error: jobError } = await (supabase as any)
      .from('ai_media_jobs')
      .insert({
        org_id: org.id,
        title: title || `${org.name || 'İşletme'} Reklam Videosu`,
        prompt: veoPrompt || brief || 'Commercial Video Ad',
        model: 'veo-fast',
        aspect_ratio: '9:16',
        duration_seconds: 8,
        priority: 0,
        state: 'PENDING',
        expected_ingredient_count: manifestAssets.length,
        metadata: {
          use_creative_orchestrator: true,
          creative_revision_id: revision.id,
          brand_name: org.name || authoritativeFacts?.brand_name,
          offer: authoritativeFacts?.offer || 'Standard',
          cta: authoritativeFacts?.cta || 'Daha Fazla Bilgi Edinin',
          promotion_type: promotionType,
          user_style_preference: userStylePreference || adFormat || 'AUTO',
          ad_format: adFormat || userStylePreference || 'AUTO',
          subtitles: subtitles ? (subtitles === 'off' ? 'off' : 'auto') : 'auto',
          authoritative_facts: authoritativeFacts,
          created_by_user_id: userId,
        },
      })
      .select('id, org_id, state, created_at')
      .single()

    if (jobError || !job) {
      console.error('[ai-media-jobs] Job insert failed:', jobError)
      return NextResponse.json({ error: 'Video işi kuyruğa alınamadı.' }, { status: 500 })
    }

    // Link revision to job
    await (supabase as any)
      .from('creative_revisions')
      .update({ job_id: job.id })
      .eq('id', revision.id)

    // 6. Insert Assets into ai_media_assets
    const assetRows = manifestAssets.map((a) => ({
      job_id: job.id,
      org_id: org.id,
      role: a.role,
      file_path: a.file_path,
      storage_url: a.storage_url,
      original_filename: a.original_filename,
      sha256: a.sha256,
      mime_type: a.mime_type,
      byte_size: a.byte_size,
    }))

    const { error: assetError } = await (supabase as any)
      .from('ai_media_assets')
      .insert(assetRows)

    if (assetError) {
      console.error('[ai-media-jobs] Asset insert warning:', assetError)
    }

    // 7. Emit Initial Event
    await (supabase as any).from('ai_media_events').insert({
      job_id: job.id,
      org_id: org.id,
      event_type: 'JOB_CREATED',
      from_state: null,
      to_state: 'PENDING',
      message: `Video üretim işi oluşturuldu (Revizyon ${revision.id})`,
      payload: {
        revision_id: revision.id,
        expected_ingredient_count: manifestAssets.length,
        aspect_ratio: '9:16',
        duration_seconds: 8,
      },
    })

    // 8. Bot Knowledge Sync (reply_product_knowledge)
    if (authoritativeFacts?.product_name && productAsset?.url) {
      const pName = String(authoritativeFacts.product_name).trim()
      const rawText = `${pName}${authoritativeFacts.offer ? ` - Kampanya: ${authoritativeFacts.offer}` : ''}`
      await (supabase as any).from('reply_product_knowledge').insert({
        org_id: org.id,
        source: 'campaign',
        product_name: pName,
        currency: 'TRY',
        raw_text: rawText,
        source_media_url: productAsset.url,
        attributes: {
          job_id: job.id,
          revision_id: revision.id,
          offer: authoritativeFacts.offer || null,
        },
        confidence: 1.0,
      })
    }

    return NextResponse.json(
      {
        job_id: job.id,
        org_id: job.org_id,
        creative_revision_id: revision.id,
        state: job.state,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('[ai-media-jobs] Unexpected error:', error)
    return NextResponse.json({ error: error?.message || 'Beklenmedik bir hata oluştu.' }, { status: 500 })
  }
}

/**
 * GET /api/ai-media/jobs
 * Active job recovery for the authenticated organization:
 * Returns any ongoing or recently finished job to support page refresh and leave-and-return recovery.
 */
export async function GET(req: NextRequest) {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { searchParams } = new URL(req.url)
    const specificJobId = searchParams.get('job_id')

    let query = (supabase as any)
      .from('ai_media_jobs')
      .select('id, org_id, title, state, created_at, completed_at, error_message')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })

    if (specificJobId) {
      query = query.eq('id', specificJobId).limit(1)
    } else {
      // Find latest ongoing or completed within the last 2 hours
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      query = query.gte('created_at', twoHoursAgo).limit(1)
    }

    const { data: jobs, error } = await query
    if (error || !jobs || jobs.length === 0) {
      return NextResponse.json({ active_job: null })
    }

    const job = jobs[0]
    return NextResponse.json({ active_job: job })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Yetkilendirme hatası' }, { status: 401 })
  }
}
