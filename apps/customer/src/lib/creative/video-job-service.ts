import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import type { requireActiveOrg } from '@/lib/org'
import { MAX_SPOKEN_WORDS, countWords } from '@/lib/video-wizard-contract'
import { createVideoGenerationIdentity, findVideoGeneration } from '@/lib/creative/video-generation-identity'
import { resolveAssetSource, type ResolvedAsset } from '@/lib/creative/asset-source-resolver'
import { requireDistinctVideoProduct, videoAssetTransportSource } from './video-asset-manifest'
import { loadVideoCatalogReferences, VideoCatalogError } from './video-catalog-references'

async function resolveVideoAssetSource(
  url: string | undefined | null,
  role: 'logo' | 'product' | 'reference',
  options: { tenantId?: string; supabase?: any },
): Promise<ResolvedAsset> {
  if (!url) {
    if (role === 'logo') throw new Error('LOGO_ASSET_NOT_READY')
    if (role === 'product') throw new Error('PRODUCT_ASSET_NOT_READY')
    throw new Error('REFERENCE_ASSET_NOT_READY')
  }
  const resolved = await resolveAssetSource(url, options)
  if (!resolved) {
    if (role === 'logo') throw new Error('LOGO_ASSET_DOWNLOAD_FAILED')
    if (role === 'product') throw new Error('PRODUCT_ASSET_DOWNLOAD_FAILED')
    throw new Error('REFERENCE_ASSET_DOWNLOAD_FAILED')
  }
  return resolved
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
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
export async function createVideoJob(req: NextRequest, context: Awaited<ReturnType<typeof requireActiveOrg>>) {
  try {
    const { userId, org, supabase } = context

    if (org.role !== 'owner' && org.role !== 'admin') {
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
      environmentPreset = 'auto',
      motionStyle = 'real_usage',
      subtitles,
      outro,
      promotionType,
      creativeIdea,
      speechTimeline,
      veoPrompt,
      authoritativeFacts,
      logoAsset,
      productAsset,
      referenceAssets,
      creativeEngineMode = 'SIMPLE_V5_HYBRID',
      requestedProvider,
    } = body

    const normalizedCreativeMode = String(creativeEngineMode).toUpperCase()
    if (!['CURRENT', 'SIMPLE_V5_HYBRID'].includes(normalizedCreativeMode)) {
      return NextResponse.json({ error: 'Geçersiz creativeEngineMode.' }, { status: 400 })
    }
    const normalizedRequestedProvider = String(
      requestedProvider || (normalizedCreativeMode === 'SIMPLE_V5_HYBRID' ? 'AUTO' : 'FLOW_VEO')
    ).toUpperCase()
    if (!['AUTO', 'GEMINI_NATIVE_VIDEO', 'FLOW_VEO'].includes(normalizedRequestedProvider)) {
      return NextResponse.json({ error: 'Geçersiz requestedProvider.' }, { status: 400 })
    }
    if (normalizedCreativeMode === 'CURRENT' && normalizedRequestedProvider !== 'FLOW_VEO') {
      return NextResponse.json(
        { error: 'CURRENT modu mevcut Flow davranışını korur; AUTO/Gemini yönlendirmesi SIMPLE_V5_HYBRID ile kullanılmalıdır.' },
        { status: 400 }
      )
    }

    if (!title || !speechTimeline || !Array.isArray(speechTimeline) || speechTimeline.length === 0) {
      return NextResponse.json({ error: 'Eksik veya geçersiz reklam taslağı verisi.' }, { status: 400 })
    }

    const approvedSpokenLine = String(
      authoritativeFacts?.approved_spoken_line || speechTimeline.map((item: any) => item?.exact_text || '').join(' ')
    ).replace(/\s+/g, ' ').trim()
    const spokenWordCount = countWords(approvedSpokenLine)
    if (!approvedSpokenLine || spokenWordCount > MAX_SPOKEN_WORDS) {
      return NextResponse.json(
        { error: `Onaylı Türkçe seslendirme 1–${MAX_SPOKEN_WORDS} kelime olmalıdır (şu an ${spokenWordCount}).` },
        { status: 400 }
      )
    }

    const productFidelityContract = authoritativeFacts?.product_fidelity_contract
    if (normalizedCreativeMode === 'SIMPLE_V5_HYBRID') {
      if (!authoritativeFacts?.product_id) {
        return NextResponse.json({ error: 'SIMPLE_V5 üretimi için katalog ürün kimliği zorunludur.' }, { status: 400 })
      }
      if (
        !productFidelityContract ||
        !Array.isArray(productFidelityContract.must_preserve) ||
        productFidelityContract.must_preserve.length === 0 ||
        !Array.isArray(productFidelityContract.forbidden_mutations) ||
        productFidelityContract.forbidden_mutations.length === 0
      ) {
        return NextResponse.json({ error: 'Ürün gerçekliği sözleşmesi eksik; üretim güvenli biçimde başlatılamaz.' }, { status: 400 })
      }
      if (authoritativeFacts?.offer && authoritativeFacts?.offer_verified !== true) {
        return NextResponse.json({ error: 'Teklif bilgisi doğrulanmadan videoda kullanılamaz.' }, { status: 400 })
      }
      if (['OFFER', 'OFFER_DRIVEN'].includes(String(adFormat).toUpperCase()) && !authoritativeFacts?.offer) {
        return NextResponse.json({ error: 'Kampanya formatı için doğrulanmış teklif bilgisi zorunludur.' }, { status: 400 })
      }
    }

    // 1. Video Kotası Kontrolü
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const [{ count: videoUsedCount, error: quotaCountError }, { data: quotaOrg, error: quotaOrgError }] = await Promise.all([
      (supabase as any)
        .from('ai_media_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .in('state', [
          'PENDING', 'VALIDATING_INPUTS', 'QUEUED', 'LEASED', 'PREPARING_ENV', 'OPENING_PROJECT',
          'ATTACHING_INGREDIENTS', 'INGREDIENTS_VERIFIED', 'GENERATING', 'POLLING_FLOW',
          'DOWNLOADING_MEDIA', 'MEDIA_DOWNLOADED', 'FFPROBE_INSPECTING', 'SHA256_VERIFYING',
          'VISUAL_QA_EVALUATING', 'COMPLETED', 'NEEDS_REVIEW',
        ])
        .gte('created_at', startOfMonth.toISOString()),
      (supabase as any)
        .from('organizations')
        .select('monthly_video_quota')
        .eq('id', org.id)
        .single(),
    ])

    if (quotaCountError || quotaOrgError) {
      console.error('[ai-media-jobs] Quota lookup failed:', quotaCountError || quotaOrgError)
      return NextResponse.json({ error: 'Video kotası doğrulanamadı; üretim güvenli biçimde başlatılmadı.' }, { status: 503 })
    }

    const used = videoUsedCount ?? 0
    const monthlyVideoQuota = Number(quotaOrg?.monthly_video_quota ?? 0)
    if (!Number.isFinite(monthlyVideoQuota) || monthlyVideoQuota <= 0) {
      return NextResponse.json({ error: 'İşletmenin geçerli video kotası bulunamadı.' }, { status: 503 })
    }

    // 2. Logo & Ürün Zorunluluk Kontrolü
    if (!logoAsset?.url) {
      return NextResponse.json({ error: 'LOGO_ASSET_NOT_READY' }, { status: 400 })
    }
    if (!productAsset?.url) {
      return NextResponse.json({ error: 'PRODUCT_ASSET_NOT_READY' }, { status: 400 })
    }

    const canonical = await loadVideoCatalogReferences(supabase, org.id, {
      productId: String(authoritativeFacts?.product_id || productAsset.productId || ''),
      logoUrl: logoAsset.url,
      productUrl: productAsset.url,
    })
    if ((authoritativeFacts?.product_name && authoritativeFacts.product_name !== canonical.product.name) ||
        (authoritativeFacts?.brand_name && authoritativeFacts.brand_name !== org.name)) {
      throw new VideoCatalogError('PRODUCT_FACTS_CHANGED', 'Ürün veya marka bilgisi değişmiş. Sayfayı yenileyip tekrar seçin.', 409)
    }
    // Writing a marketing claim in a voiceover is not evidence that it is true.
    const verifiedClaims = [canonical.product.name]
    if (authoritativeFacts) {
      authoritativeFacts.brand_name = org.name
      authoritativeFacts.product_name = canonical.product.name
      authoritativeFacts.product_description = canonical.product.description || undefined
      authoritativeFacts.verified_claims = verifiedClaims
    }

    // 3. Asset Manifest & SHA256 Sets
    const manifestAssets: Array<{
      role: 'logo' | 'product' | 'reference' | 'packaging' | 'environment' | 'presenter' | 'style'
      file_path: string
      storage_url: string
      original_filename: string
      sha256: string
      mime_type: string
      byte_size: number
    }> = []

    // Logo
    const resolvedLogo = await resolveVideoAssetSource(canonical.logoUrl, 'logo', { tenantId: org.id, supabase })
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://app.mesajify.com'
    const logoFilePath = videoAssetTransportSource(resolvedLogo, appOrigin)
    const logoSha = resolvedLogo.sha256
    if (isSha256(logoAsset.sha256) && logoAsset.sha256.toLowerCase() !== logoSha) throw new Error('ASSET_HASH_MISMATCH')

    manifestAssets.push({
      role: 'logo',
      file_path: logoFilePath,
      storage_url: resolvedLogo.resolvedUrl,
      original_filename: logoAsset.name || 'brand_logo.png',
      sha256: logoSha,
      mime_type: resolvedLogo.mimeType,
      byte_size: resolvedLogo.data.length,
    })

    // Product (if present)
    let productSha = ''
    if (productAsset?.url || productAsset?.filePath) {
      const resolvedProduct = await resolveVideoAssetSource(canonical.productUrl, 'product', { tenantId: org.id, supabase })
      requireDistinctVideoProduct(resolvedLogo, resolvedProduct)
      const prodFilePath = videoAssetTransportSource(resolvedProduct, appOrigin)
      productSha = resolvedProduct.sha256
      if (isSha256(productAsset.sha256) && productAsset.sha256.toLowerCase() !== productSha) throw new Error('ASSET_HASH_MISMATCH')
      manifestAssets.push({
        role: 'product',
        file_path: prodFilePath,
        storage_url: resolvedProduct.resolvedUrl,
        original_filename: productAsset.name || 'hero_product.jpg',
        sha256: productSha,
        mime_type: resolvedProduct.mimeType,
        byte_size: resolvedProduct.data.length,
      })
    }

    // References
    if (Array.isArray(referenceAssets)) {
      for (const [idx, ref] of referenceAssets.entries()) {
        if (!ref?.url) continue
        const resolvedRef = await resolveVideoAssetSource(ref.url, 'reference', { tenantId: org.id, supabase })
        const refSha = resolvedRef.sha256
        if (isSha256(ref.sha256) && ref.sha256.toLowerCase() !== refSha) throw new Error('ASSET_HASH_MISMATCH')
        const allowedReferenceRoles = ['reference', 'packaging', 'environment', 'presenter', 'style'] as const
        const referenceRole = allowedReferenceRoles.includes(ref.role) ? ref.role : 'reference'
        manifestAssets.push({
          role: referenceRole,
          file_path: videoAssetTransportSource(resolvedRef, appOrigin),
          storage_url: resolvedRef.resolvedUrl,
          original_filename: ref.name || `ref_${idx + 1}.jpg`,
          sha256: refSha,
          mime_type: resolvedRef.mimeType,
          byte_size: resolvedRef.data.length,
        })
      }
    }

    // 4. CreativeRevision DB Persistence (LOCKED_FOR_GENERATION)
    const lockedProviderPrompt = veoPrompt || brief || ''
    const generationId = String(body.generationId || '')
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(generationId)) {
      return NextResponse.json({ error: 'VIDEO_GENERATION_ID_REQUIRED' }, { status: 400 })
    }
    const identity = createVideoGenerationIdentity({ orgId: org.id, creativeId: generationId,
      generationRevision: body.generationRevision ?? 1, prompt: lockedProviderPrompt,
      assets: manifestAssets.map(asset => ({ role: asset.role, sha256: asset.sha256 })),
      model: body.model || 'veo-lite', aspectRatio: '9:16', duration: 8, mode: normalizedCreativeMode,
      approvedDialogue: approvedSpokenLine,
      options: { adFormat, userStylePreference, environmentPreset, motionStyle, subtitles, outro,
        promotionType, requestedProvider: normalizedRequestedProvider, authoritativeFacts },
    })
    const existing = await findVideoGeneration(supabase, org.id, identity)
    if (existing) return NextResponse.json({ job_id: existing.id, org_id: org.id,
      creative_revision_id: existing.metadata?.creative_revision_id, state: existing.state,
      idempotent: true, reconciliation_required: existing.metadata?.video_submission_ready === false }, { status: 200 })
    if (used >= monthlyVideoQuota) return NextResponse.json({ error: `Aylık video üretim kotanıza (${used}/${monthlyVideoQuota}) ulaştınız.` }, { status: 429 })
    const revisionPayload = {
      id: identity.revisionId,
      org_id: org.id,
      status: 'LOCKED_FOR_GENERATION',
      creative_idea: creativeIdea || title,
      selected_ad_format: adFormat || 'AUTO',
      speech_timeline: speechTimeline,
      veo_prompt: lockedProviderPrompt,
      campaign_facts: {
        ...(authoritativeFacts || {}),
        approved_spoken_line: approvedSpokenLine,
        verified_claims: verifiedClaims,
        product_fidelity_contract: productFidelityContract,
        subtitles: subtitles === 'off' ? 'off' : 'auto',
        outro: outro === 'off' ? 'off' : 'auto',
      },
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

    if (revError?.code === '23505') {
      for (let observation = 0; observation < 20; observation++) {
        const duplicate = await findVideoGeneration(supabase, org.id, identity)
        if (duplicate) return NextResponse.json({ job_id: duplicate.id, org_id: org.id, state: duplicate.state, idempotent: true }, { status: 200 })
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return NextResponse.json({ error: 'VIDEO_SUBMISSION_RECONCILIATION_REQUIRED' }, { status: 409 })
    }
    if (revError || !revision) {
      console.error('[ai-media-jobs] Revision insert failed:', revError)
      return NextResponse.json({ error: 'Reklam taslağı kaydedilemedi.' }, { status: 500 })
    }

    // 5. Authoritative ai_media_jobs Row Creation
    const { data: job, error: jobError } = await (supabase as any)
      .from('ai_media_jobs')
      .insert({
        id: identity.jobId,
        org_id: org.id,
        title: title || `${org.name || 'İşletme'} Reklam Videosu`,
        prompt: lockedProviderPrompt || 'Commercial Video Ad',
        model: (body.model && body.model !== 'veo-fast' && body.model !== 'omni-lite') ? body.model : 'veo-lite',
        aspect_ratio: '9:16',
        duration_seconds: 8,
        priority: 0,
        state: 'PENDING',
        creative_engine_mode: normalizedCreativeMode,
        requested_provider: normalizedRequestedProvider,
        expected_ingredient_count: manifestAssets.length,
        metadata: {
          video_submission_ready: false,
          video_submission_deadline_at: new Date(Date.now() + 120000).toISOString(),
          generation_id: generationId,
          generation_revision: body.generationRevision ?? 1,
          generation_request_hash: identity.requestHash,
          generation_idempotency_key: identity.idempotencyKey,
          video_submit_intent: { attempt_id: `${identity.jobId}:initial`, request_hash: identity.requestHash, created_at: new Date().toISOString() },
          use_creative_orchestrator: true,
          creative_engine_mode: normalizedCreativeMode,
          requested_provider: normalizedRequestedProvider,
          creative_revision_id: revision.id,
          brand_name: org.name || authoritativeFacts?.brand_name,
          offer: authoritativeFacts?.offer || null,
          cta: authoritativeFacts?.cta || null,
          promotion_type: promotionType,
          user_style_preference: userStylePreference || adFormat || 'AUTO',
          ad_format: adFormat || userStylePreference || 'AUTO',
          environment_preset: environmentPreset,
          motion_style: motionStyle,
          subtitles: subtitles ? (subtitles === 'off' ? 'off' : 'auto') : 'auto',
          outro: outro ? (outro === 'off' ? 'off' : 'auto') : 'auto',
          authoritative_facts: authoritativeFacts,
          catalog_product_id: authoritativeFacts?.product_id || null,
          product_fidelity_contract: productFidelityContract,
          verified_claims: verifiedClaims,
          language: 'tr-TR',
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
    const { data: linkedRevision, error: linkError } = await (supabase as any)
      .from('creative_revisions')
      .update({ job_id: job.id })
      .eq('id', revision.id)
      .eq('org_id', org.id).select('id').maybeSingle()
    if (linkError || linkedRevision?.id !== revision.id) throw new Error('VIDEO_REVISION_LINK_FAILED')

    // Sync to creatives table for Content Library (/icerik)
    try {
      const { data: mirror, error: mirrorError } = await (supabase as any).from('creatives').insert({
        id: job.id,
        org_id: org.id,
        created_by: userId,
        title: title || `${org.name || 'İşletme'} Reklam Videosu`,
        format: 'video',
        status: 'rendering',
        source: 'ai',
        payload: {
          job_id: job.id,
          aspect_ratio: '9:16',
          duration_seconds: 8,
          creative_revision_id: revision.id,
          creative_engine_mode: normalizedCreativeMode,
          requested_provider: normalizedRequestedProvider,
        },
      }).select('id').single()
      if (mirrorError || mirror?.id !== job.id) throw new Error('VIDEO_LIBRARY_MIRROR_PERSISTENCE_FAILED')
    } catch (crErr) {
      throw crErr
    }

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
      throw new Error('VIDEO_ASSET_PERSISTENCE_FAILED')
    }

    const { data: staged, error: stagingError } = await (supabase as any).from('ai_media_jobs')
      .select('id,metadata').eq('id', job.id).eq('org_id', org.id).eq('state', 'PENDING').single()
    if (stagingError || !staged || staged.metadata?.generation_request_hash !== identity.requestHash) throw new Error('VIDEO_SUBMISSION_RECONCILIATION_REQUIRED')
    const { data: published, error: publishError } = await (supabase as any).from('ai_media_jobs')
      .update({ metadata: { ...staged.metadata, video_submission_ready: true } })
      .eq('id', job.id).eq('org_id', org.id).eq('state', 'PENDING')
      .eq('metadata->>video_submission_ready', 'false')
      .eq('metadata->>generation_request_hash', identity.requestHash)
      .gt('metadata->>video_submission_deadline_at', new Date().toISOString())
      .select('id').maybeSingle()
    if (publishError || published?.id !== job.id) throw new Error('VIDEO_SUBMISSION_RECONCILIATION_REQUIRED')

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
        creative_engine_mode: normalizedCreativeMode,
        requested_provider: normalizedRequestedProvider,
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
        creative_engine_mode: normalizedCreativeMode,
        requested_provider: normalizedRequestedProvider,
        state: job.state,
      },
      { status: 201 }
    )
  } catch (error: any) {
    if (error instanceof VideoCatalogError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[ai-media-jobs] Unexpected error:', error)
    const message = String(error?.message || 'Beklenmedik bir hata oluştu.')
    const invalidProduct = message.startsWith('PRODUCT_REFERENCE_IS_LOGO')
    return NextResponse.json({ error: message, ...(invalidProduct ? { code: 'PRODUCT_REFERENCE_IS_LOGO' } : {}) },
      { status: invalidProduct ? 400 : message === 'VIDEO_GENERATION_IDENTITY_CONFLICT' ? 409 : 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { requireActiveOrg } = await import('@/lib/org')
    return await createVideoJob(req, await requireActiveOrg())
  }
  catch { return NextResponse.json({ error: 'Video üretimi için oturum ve işletme yetkisi doğrulanamadı.' }, { status: 403 }) }
}

/**
 * GET /api/ai-media/jobs
 * Active job recovery for the authenticated organization:
 * Returns any ongoing or recently finished job to support page refresh and leave-and-return recovery.
 */
export async function GET(req: NextRequest) {
  try {
    const { requireActiveOrg } = await import('@/lib/org')
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
      query = query
        .gte('created_at', twoHoursAgo)
        .not('state', 'in', '("COMPLETED","FAILED","NEEDS_REVIEW")')
        .limit(1)
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
