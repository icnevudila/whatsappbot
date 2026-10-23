'use server'
import sharp from 'sharp'
import { promotionMode, offeringKind, promotionPolicyError, BRAND_VIDEO_UNAVAILABLE } from '@/lib/creative/promotion-policy'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { randomBytes, createHash } from 'node:crypto'

function uuidFromRequestKey(orgId: string, requestKey: string): string {
  const hash = createHash('sha256').update(`creative:${orgId}:${requestKey}`).digest('hex')
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
}
import { enqueueJob } from '@/lib/jobs'
import { campaignFactsError } from '@/lib/creative/campaign-facts'
import { isLibraryCreativeEligible } from '@/lib/creative/library-eligibility'
import { canReviewImage } from '@/lib/creative/image-review'
import { hasImageProvider } from '@/lib/ai/image'
import { readImageJob, type ImageJobReceipt } from '@/lib/ai/omnistudio-image-job'
import { processCreativeGeneration } from '@/lib/creative/process'
import { isUncertainImageFailure } from '@/lib/creative/detail-render-state'
import { isReadyImageSource } from '@/lib/creative/image-source'
import { normalizeStyleMode } from '@/lib/creative/style-mode'
import { inheritVariationContext, variationIdentityError } from '@/lib/creative/variation-context'
import { requiredImageAssets } from '@/lib/creative/required-image-assets'
import {
  titleFromBrief,
  type CreativePayload,
  type CreativeSnapshot,
  type ProductFieldKey,
  type TemplateFamily,
} from '@/lib/creative/types'
import { deriveVerifiedCampaignData } from '@/lib/creative/prompt'
import { generateCampaignWhatsAppMessage } from '@/lib/ai/campaign-message'
import { collectImageFiles, readImageFile } from '@/app/(panel)/ayarlar/upload-image'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'
import { DEFAULT_INCLUDE, formatFromId, type ProductCard, type SocialOption } from './wizard-types'
import { LIBRARY_PAGE_SIZE, type LibraryCreativeRow } from './library-shared'
import { loadVideoLibraryState } from '@/lib/creative/video-library-state'
import { createSupabaseServiceClient } from '@/lib/supabase/service'
import { retryVideoJob } from '@/lib/creative/retry-video-job'
import {
  generateVideoScenarios,
  type VideoScenarioOption,
  type VideoScenarioContext,
} from '@/lib/creative/video-scenario'
import {
  generateArtDirectionPlan,
  resolveArtDirectionPlanAtSubmission,
} from '@/lib/creative/director/creative-director'
import { recordCreativeMemory } from '@/lib/creative/director/creative-memory'
import { selectVisualDiversityPlan } from '@/lib/creative/visual-diversity'

export type CreativeActionState = { error?: string; ok?: string; id?: string; publicUrl?: string } | null

function revalidateLibrary(id?: string) {
  revalidatePath('/icerik')
  if (id) revalidatePath(`/icerik/${id}`)
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

function parseIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      return raw.split(',').map((part) => part.trim()).filter(Boolean)
    }
  }
  return []
}

async function kickGeneration(
  creativeId: string,
  authContext?: {
    userId: string
    org: { id: string; suspended_at?: string | null; role?: string }
    supabase: any
  },
) {
  // Tek sahip: kalıcı jobs kuyruğu. Aynı kaydı hem after() hem servis
  // çalıştırdığında biri Flow'u beklerken diğeri "busy" görüp denemelerini
  // tüketebiliyordu; uzun kuyruklarda kayıt rendering durumunda kalıyordu.
  const queued = await enqueueJob({
    type: 'creative.render',
    payload: {
      creative_id: creativeId,
      // Global bir worker sırrı ayarlanmamış ortamlarda da yalnız bu job'ın
      // tekrar çalıştırılmasına izin verir. Bu değer istemciye dönmez.
      callback_token: randomBytes(32).toString('base64url'),
    },
    priority: 40,
    authContext,
  })
  if (queued.error) {
    console.error('[creative.kick.job]', creativeId, queued.error)
    return queued.error
  }

  // Üretimi arkaplanda hemen başlat: Sekme değişse veya worker atlaması olsa bile
  // Next.js after() kancası ile görsel veya video üretimi güvenle tamamlanır.
  if (hasImageProvider()) {
    after(async () => {
      for (let attempt = 0; attempt < 24; attempt += 1) {
        try {
          const result = await processCreativeGeneration(creativeId, authContext?.supabase)
          if (result.ok && !result.pending) return
          if (!result.pending && !result.busy) {
            console.error('[creative.kick.bg]', creativeId, result.error)
            return
          }
          await new Promise((resolve) => setTimeout(resolve, result.retryAfterSeconds ? result.retryAfterSeconds * 1000 : 5_000))
        } catch (error) {
          console.error('[creative.kick.bg]', creativeId, error)
          return
        }
      }
      console.warn('[creative.kick.bg] Üretim takibi süre sınırına ulaştı:', creativeId)
    })
  }
  return null
}

export async function startCreativeGeneration(
  _previous: CreativeActionState,
  formData: FormData,
): Promise<CreativeActionState> {
  const t0 = Date.now()
  const raw = String(formData.get('draft') ?? '')
  let draft: Record<string, unknown>
  try {
    draft = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return { error: 'Form okunamadı. Sayfayı yenileyip tekrar deneyin.' }
  }
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) {
    return { error: 'Form okunamadı. Sayfayı yenileyip tekrar deneyin.' }
  }

  const requestKey = String(draft.requestKey ?? '').trim()
  let brief = String(draft.brief ?? '').trim()

  const tAuthStart = Date.now()
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
  const authMs = Date.now() - tAuthStart

  if (!isOrgAdminRole(org.role)) {
    return { error: 'Görsel üretmek için yönetici olmalısınız.' }
  }
  if (org.suspended_at) return { error: 'İşletme askıda.' }
  if (!hasImageProvider()) {
    return { error: 'Görsel üretimi kapalı. Sunucuda sağlayıcı anahtarı yok.' }
  }

  const authContext = { userId, org, supabase }
  const format = formatFromId(String(draft.formatId ?? 'wa'))
  if (promotionMode(draft.promotionMode) === 'brand' && format.format === 'video') return {error:BRAND_VIDEO_UNAVAILABLE}
  if (promotionMode(draft.promotionMode) === 'brand' && Array.isArray(draft.referenceImageUrls) && draft.referenceImageUrls.length) {
    return {error:'Marka tanıtımında yalnız işletme logosu kullanılır; ek ürün görseli bağlanmaz.'}
  }
  const kitId = String(draft.brandKitId ?? '').trim() || null
  const rawProductIds = parseIds(draft.productIds)
  const heroProductId = String(draft.heroProductId || '').trim()
  const baseCreativeId = String(draft.baseCreativeId ?? '').trim() || null
  const parentId = String(draft.parentId ?? '').trim() || baseCreativeId
  if (parentId && baseCreativeId && parentId !== baseCreativeId) return { error: 'Üst görsel ile kaynak görsel aynı kreatif olmalı.' }
  const effectiveParentId = parentId || baseCreativeId

  // If variation/revision without explicit productIds, pre-check parent payload products
  let inheritedParentProductId: string | null = null
  if (!heroProductId && rawProductIds.length === 0 && effectiveParentId) {
    try {
      const { data: earlyParent } = await supabase
        .from('creatives')
        .select('payload')
        .eq('id', effectiveParentId)
        .eq('org_id', org.id)
        .maybeSingle()
      const p = earlyParent?.payload as any
      if (p?.heroProductId) inheritedParentProductId = String(p.heroProductId).trim()
      else if (Array.isArray(p?.products) && p.products[0]?.id) inheritedParentProductId = String(p.products[0].id).trim()
    } catch {
      // Non-blocking parent preview
    }
  }

  const effectiveHeroProduct = heroProductId || inheritedParentProductId || ''
  const productIds = effectiveHeroProduct
    ? [effectiveHeroProduct]
    : rawProductIds.length > 0
      ? [rawProductIds[0]]
      : []
  const phoneIds = parseIds(draft.phoneIds)
  const socialIds = parseIds(draft.socialIds)
  const rawType = String(draft.generationType ?? '')
  const generationType =
    rawType === 'revision' || rawType === 'variation' || rawType === 'derived' || rawType === 'new'
      ? rawType
      : baseCreativeId
        ? 'derived'
        : 'new'

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  // PARALLEL READS: Collapse all independent DB lookups into a single Promise.all
  const tParallelStart = Date.now()
  const [
    existingRes,
    kitRes,
    orgRowRes,
    baseRes,
    parentRes,
    productRowsRes,
    imageRowsRes,
    phonesRes,
    socialsRes,
    videoCountRes,
    recentCreativesRes,
  ] = await Promise.all([
    requestKey
      ? supabase
          .from('creatives')
          .select('id, status')
          .eq('org_id', org.id)
          .contains('payload', { requestKey })
          .in('status', ['pending', 'rendering', 'ready'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    kitId && kitId !== 'none'
      ? supabase
          .from('brand_kits')
          .select('id, name, tone, colors, fonts, logo_path')
          .eq('org_id', org.id)
          .eq('id', kitId)
          .maybeSingle()
      : supabase
          .from('brand_kits')
          .select('id, name, tone, colors, fonts, logo_path')
          .eq('org_id', org.id)
          .order('is_default', { ascending: false })
          .limit(1)
          .maybeSingle(),
    supabase
      .from('organizations')
      .select('name, about, logo_path, monthly_video_quota')
      .eq('id', org.id)
      .maybeSingle(),
    baseCreativeId
      ? supabase
          .from('creatives')
          .select('id, format, status, public_url, storage_path')
          .eq('id', baseCreativeId)
          .eq('org_id', org.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    parentId
      ? supabase
          .from('creatives')
          .select('id, payload')
          .eq('id', parentId)
          .eq('org_id', org.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    productIds.length > 0
      ? supabase
          .from('org_products')
          .select('id, name, description, box_contents')
          .eq('org_id', org.id)
          .in('id', productIds)
      : Promise.resolve({ data: [], error: null }),
    productIds.length > 0
      ? supabase
          .from('org_product_images')
          .select('product_id, public_url, sort_order')
          .eq('org_id', org.id)
          .in('product_id', productIds)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    phoneIds.length > 0
      ? supabase
          .from('accounts')
          .select('id, label, phone_e164')
          .eq('org_id', org.id)
          .in('id', phoneIds)
      : Promise.resolve({ data: [], error: null }),
    socialIds.length > 0
      ? supabase
          .from('org_social_accounts')
          .select('id, platform, label, url')
          .eq('org_id', org.id)
          .in('id', socialIds)
      : Promise.resolve({ data: [], error: null }),
    format.format === 'video'
      ? supabase
          .from('creatives')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', org.id)
          .eq('format', 'video')
          .in('status', ['ready', 'processing', 'pending'])
          .gte('created_at', startOfMonth.toISOString())
      : Promise.resolve({ count: 0, error: null }),
    supabase
      .from('creatives')
      .select('id, payload, created_at')
      .eq('org_id', org.id)
      .not('payload', 'is', null)
      .not('format', 'eq', 'video')
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  const parallelReadsMs = Date.now() - tParallelStart

  if (recentCreativesRes?.data && Array.isArray(recentCreativesRes.data)) {
    for (const rec of [...recentCreativesRes.data].reverse()) {
      const p = rec.payload as any
      if (p?.artDirectionPlan?.creative_archetype) {
        recordCreativeMemory({
          orgId: org.id,
          creativeId: rec.id,
          archetype: p.artDirectionPlan.creative_archetype,
          environment: p.artDirectionPlan.art_direction?.background_treatment || '',
          compositionGrid: p.artDirectionPlan.composition?.grid || '',
          visualHook: p.artDirectionPlan.visual_hook || '',
          colorTreatment: p.artDirectionPlan.art_direction?.color_treatment || '',
          backgroundTreatment: p.artDirectionPlan.art_direction?.background_treatment || '',
          createdAt: rec.created_at,
        })
      }
    }
  }

  const existing = existingRes.data
  if (existing?.id) {
    if (existing.status === 'pending' || existing.status === 'rendering') {
      const queueError = await kickGeneration(existing.id, authContext)
      if (queueError) return { error: queueError }
    }
    revalidateLibrary(existing.id)
    return { id: existing.id, ok: 'Görsel üretimi devam ediyor.' }
  }

  if ([kitRes, orgRowRes, productRowsRes, imageRowsRes, phonesRes, socialsRes].some(result => result.error)) {
    return { error: 'Katalog ve firma bilgileri doğrulanamadı. Tekrar deneyin.' }
  }
  if (productIds.some(id => !(productRowsRes.data ?? []).some(product => product.id === id))) {
    return { error: 'Seçili ürün bu işletmeye ait değil. Ürünü yeniden seçin.' }
  }

  let kitRow: {
    id: string
    name: string
    tone: string | null
    colors: unknown
    fonts: unknown
    logo_path: string | null
  } | null = kitRes.data
  if (kitId && kitId !== 'none' && !kitRow) {
    return { error: 'Marka kiti bulunamadı.' }
  }

  if (!kitRow) return { error: 'Üretimden önce işletmenize ait marka kitini oluşturun.' }
  const orgRow = orgRowRes.data
  const orgLogoPath = orgRow?.logo_path ?? null

  if (baseCreativeId) {
    const base = baseRes.data
    if (!base) return { error: 'Kaynak görsel bu işletmeye ait değil.' }
    if (!isReadyImageSource(base)) return { error: 'Kaynak hazır bir görsel olmalı; video veya tamamlanmamış çıktı kullanılamaz.' }
  }

  let parentPayload: CreativePayload | null = null
  if (parentId) {
    const parent = parentRes.data
    if (!parent) return { error: 'Üst görsel bulunamadı.' }
    if (!parent.payload || typeof parent.payload !== 'object' || Array.isArray(parent.payload)) {
      return { error: 'Kaynak görselin üretim bilgileri okunamadı.' }
    }
    parentPayload = parent.payload as CreativePayload
    if (generationType === 'variation' || generationType === 'revision') {
      const identityError = variationIdentityError(productIds, kitId, parentPayload)
      if (identityError) return { error: identityError }
    }
    draft = inheritVariationContext(draft, parentPayload)
    if (generationType === 'revision') {
      const revisedCopy = [draft.customHeadline, draft.customSupporting]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map(value => value.trim())
      if (revisedCopy.length) brief = revisedCopy.join(' ')
    }
    if (brief.length < 8 && parentPayload?.brief) brief = parentPayload.brief.trim()
    if (parentPayload?.brandKit && !kitId) {
      kitRow = {
        id: parentPayload.brandKit.id,
        name: parentPayload.brandKit.name,
        tone: parentPayload.brandKit.tone,
        colors: parentPayload.brandKit.colors,
        fonts: parentPayload.brandKit.fonts,
        logo_path: parentPayload.brandKit.logoPath,
      }
    }
  }

  const extras = (draft.productExtras ?? {}) as Record<
    string,
    {
      imageUrl?: string
      price?: string
      oldPrice?: string
      promo?: string
      extra?: string
      include?: Partial<Record<ProductFieldKey, boolean>>
    }
  >

  const products: CreativeSnapshot['products'] = []
  if (productIds.length > 0) {
    const productRows = productRowsRes.data ?? []
    const imageRows = imageRowsRes.data ?? []

    const firstImage = new Map<string, string>()
    for (const image of imageRows) {
      if (!firstImage.has(image.product_id)) firstImage.set(image.product_id, image.public_url)
    }

    const byId = new Map(productRows.map((row) => [row.id, row]))
    for (const id of productIds) {
      const product = byId.get(id)
      if (!product) continue
      const extra = extras[id] ?? {}
      const include = { ...DEFAULT_INCLUDE, ...(extra.include ?? {}) }
      const chosenImage = extra.imageUrl?.trim() || firstImage.get(id) || null
      if (chosenImage && !imageRows.some((image) => image.product_id === id && image.public_url === chosenImage)) {
        return { error: 'CROSS_ORG_CONTAMINATION: Seçilen ürün görseli bu işletmenin ürün kaydına ait değil.' }
      }
      products.push({
        id: product.id,
        name: product.name,
        description: product.description,
        boxContents: product.box_contents,
        imageUrl: chosenImage,
        price: extra.price?.trim() || null,
        oldPrice: extra.oldPrice?.trim() || null,
        promo: extra.promo?.trim() || null,
        extra: extra.extra?.trim() || null,
        include,
      })
    }
  }

  const phones: CreativeSnapshot['phones'] = []
  for (const row of phonesRes.data ?? []) {
    if (!row.phone_e164) continue
    phones.push({ id: row.id, label: row.label, phone: row.phone_e164 })
  }

  const socials: CreativeSnapshot['socials'] = []
  for (const row of socialsRes.data ?? []) {
    socials.push({ id: row.id, platform: row.platform, label: row.label, url: row.url })
  }

  if (brief.length < 8) return { error: 'Görselde ne anlatmak istediğinizi bir cümleyle yazın.' }

  if (format.format === 'video') {
    const videoQuota = orgRow?.monthly_video_quota ?? 5
    const used = videoCountRes.count ?? 0
    if (used >= videoQuota) {
      return {
        error: `Bu ayki video üretim kotanıza (${used}/${videoQuota}) ulaştınız. Limit artırımı için lütfen platform yöneticinizle iletişime geçin.`,
      }
    }

    const effectiveLogo = kitRow?.logo_path || orgLogoPath
    if (!effectiveLogo) {
      return {
        error:
          'Video üretimi için kurumsal Logo ve Marka Kiti zorunludur. Yapay zekanın uydurma logo ve semboller üretmemesi için lütfen logonuzu yükleyin veya Ayarlar > Marka Kiti bölümünden tanımlayın.',
      }
    }
    if (products.length === 0 || !products.some((p) => p.imageUrl)) {
      return {
        error:
          'Video üretimi için gerçek bir Ürün Görseli (fotoğraf) seçilmesi veya yüklenmesi zorunludur. Yapay zekanın alakasız cihazlar türetmemesi için gerçek ürün fotoğrafı şarttır.',
      }
    }
  }

  const tValidationStart = Date.now()
  const labels = parseIds(draft.labels).map((label) => label.slice(0, 48)).slice(0, 8)
  if (parentPayload) {
    if (products.length === 0 && parentPayload.products?.length) products.push(...parentPayload.products)
    if (phones.length === 0 && parentPayload.phones?.length) phones.push(...parentPayload.phones)
    if (socials.length === 0 && parentPayload.socials?.length) socials.push(...parentPayload.socials)
    if (labels.length === 0 && parentPayload.labels?.length) labels.push(...parentPayload.labels)
  }
  const title = titleFromBrief(String(draft.customHeadline ?? '').trim() || brief)
  const logoSource = String(kitRow?.logo_path || orgLogoPath || '').trim()
  const subjectMode = promotionMode(draft.promotionMode)
  // Brand-only is explicit, never inferred from an objective or missing product.
  if (subjectMode === 'brand' || draft.promotionMode === 'offering') {
    const subjectError = promotionPolicyError({ mode: subjectMode, video: format.format === 'video',
      hasLogo: Boolean(logoSource) && draft.useLogo !== false,
      hasOfferingReference: products.some(product => product.include.image && Boolean(product.imageUrl)),
      hasOfferingSelection: products.length > 0 || rawProductIds.length > 0 || Boolean(heroProductId),
      hasBase: Boolean(baseCreativeId) })
    if (subjectError) return { error: subjectError }
  }
  if (products.some(product => !product.include.image || !product.imageUrl || product.imageUrl.trim() === logoSource || /^\/?(?:brand|logos)\//i.test(product.imageUrl))) {
    return { error: 'Seçilen her ürün için gerçek ürün veya arayüz görseli ekleyin. İşletme logosu ürün referansı yerine kullanılamaz.' }
  }
  const imageAssetGate = requiredImageAssets({
    promotionMode: subjectMode,
    useLogo: draft.useLogo !== false, hasLogo: Boolean(kitRow?.logo_path || orgLogoPath),
    hasProductReference: products.some((product) => product.include.image && Boolean(product.imageUrl)),
    hasValidBase: Boolean(baseCreativeId),
  })
  if (!imageAssetGate.ready) return { error: imageAssetGate.message || 'IMAGE_ASSETS_REQUIRED' }
  const assetValidationMs = Date.now() - tValidationStart

  const qualityMode = (draft.qualityMode as 'STANDARD' | 'DESIGNER') || 'STANDARD'
  let artDirectionPlan = (draft.artDirectionPlan as any) || null
  let artDirectionSource: 'AI_PRECOMPUTED' | 'DETERMINISTIC_FALLBACK' | 'STANDARD_NOT_REQUIRED' = 'STANDARD_NOT_REQUIRED'

  const rawStylePreset = String(draft.stylePreset ?? draft.style ?? 'AUTO').trim().toUpperCase()
  const normalizedStylePreset = ['PRODUCT_HERO', 'REAL_USAGE', 'PREMIUM', 'DYNAMIC_OFFER', 'AUTO'].includes(rawStylePreset)
    ? rawStylePreset
    : 'AUTO'

  // Non-blocking art direction resolution: precomputed AI plan or immediate deterministic Designer fallback
  if (format.format !== 'video') {
    const resolved = resolveArtDirectionPlanAtSubmission({
      input: {
        orgId: org.id,
        brandName: kitRow?.name || org.name || 'İşletmemiz',
        brandTone: kitRow?.tone || null,
        productName: products[0]?.name || 'Ürün',
        productDescription: products[0]?.description || null,
        objective: (draft.objective as string) || 'PRODUCT_INTRO',
        stylePreset: normalizedStylePreset,
        format: format.id,
        headline: (draft.customHeadline as string) || brief,
        offer: products[0]?.promo || null,
        cta: (draft.cta as string) || null,
        campaignDetail: (draft.campaignDetail as string) || null,
        qualityMode,
        forcedArchetype: (draft.forcedArchetype as string) || null,
      },
      precomputedPlan: artDirectionPlan,
    })
    artDirectionPlan = resolved.plan
    artDirectionSource = resolved.source
  }

  const tInsertStart = Date.now()
  const snapshot: CreativePayload = {
    promotionMode: subjectMode,
    offeringKind: offeringKind(draft.offeringKind),
    brief,
    style: String(draft.style ?? 'auto'),
    formatId: format.id,
    aspect: format.aspect,
    companyName: orgRow?.name || org.name,
    companyAbout: orgRow?.about || null,
    textDensity: (['low', 'balanced', 'detailed'].includes(String(draft.textDensity))
      ? draft.textDensity
      : 'balanced') as CreativeSnapshot['textDensity'],
    useLogo: Boolean(orgLogoPath || kitRow?.logo_path) && draft.useLogo !== false,
    labels,
    cta: String(draft.cta ?? '').trim() || null,
    address: String(draft.address ?? '').trim() || null,
    website: String(draft.website ?? '').trim() || null,
    dateRange: String(draft.dateRange ?? '').trim() || null,
    customText: String(draft.customText ?? '').trim() || null,
    phones,
    socials,
    brandKit: kitRow
      ? {
          id: kitRow.id,
          name: kitRow.name,
          tone: kitRow.tone,
          colors: asRecord(kitRow.colors),
          fonts: asRecord(kitRow.fonts),
          logoPath: kitRow.logo_path || orgLogoPath,
        }
      : null,
    products,
    baseCreativeId,
    instruction: String(draft.instruction ?? '').trim() || null,
    variationPreset: String(draft.variationPreset ?? '').trim() || null,
    videoSpeech: draft.videoSpeech !== false && draft.videoSpeech !== '0',
    subtitles: draft.subtitles !== false && draft.subtitles !== '0' && draft.subtitles !== 'false',
    videoScenarioPrompt: String(draft.videoScenarioPrompt ?? '').trim() || null,
    videoScenarioTitle: String(draft.videoScenarioTitle ?? '').trim() || null,
    customVoiceover: String(draft.customVoiceover ?? '').trim() || null,
    voiceoverScript: String(draft.customVoiceover ?? '').trim() || null,
    referenceImageUrls: Array.isArray(draft.referenceImageUrls)
      ? draft.referenceImageUrls.map(String).filter((u) => u.startsWith('http')).slice(0, 5)
      : [],
    title,
    requestKey: requestKey || undefined,
    cost: { imageCount: 1 },
    creativePlan: (draft.creativePlan as any) || null,
    customHeadline: (draft.customHeadline as string) || null,
    customSupporting: (draft.customSupporting as string) || null,
    heroProductId: heroProductId || (products[0]?.id as string) || null,
    generationType,
    lockCopyOverlay: Boolean(draft.lockCopyOverlay || (generationType === 'revision' && effectiveParentId && draft.keepBaseScene)),
    keepBaseScene: Boolean(draft.keepBaseScene),
    variationMode: (draft.variationMode as any) || (draft.variationPreset as any) || null,
    visualDiversityPlan: format.format === 'video' ? null : selectVisualDiversityPlan({
      requestKey: requestKey || randomBytes(16).toString('hex'),
      subject: subjectMode === 'brand' ? 'brand' : offeringKind(draft.offeringKind),
      styleMode: normalizeStyleMode(draft.styleMode),
      generationType,
      variationMode: (draft.variationMode as any) || (draft.variationPreset as any) || null,
      parent: parentPayload?.visualDiversityPlan,
      recent: (Array.isArray(recentCreativesRes.data) ? recentCreativesRes.data : [])
        .map(row => (row.payload as CreativePayload | null)?.visualDiversityPlan),
    }),
    styleMode: normalizeStyleMode(draft.styleMode),
    stylePreset: normalizedStylePreset,
    objective: subjectMode === 'brand' ? 'BRAND_AWARENESS' : (draft.objective as string) || null,
    artDirectionPlan: artDirectionPlan || null,
    art_direction_source: artDirectionSource,
    submissionMetrics: {
      submit_total_ms: 0,
      auth_ms: authMs,
      idempotency_lookup_ms: parallelReadsMs,
      parallel_reads_ms: parallelReadsMs,
      asset_validation_ms: assetValidationMs,
      creative_insert_ms: 0,
      enqueue_ms: 0,
      redirect_ready_ms: 0,
      art_direction_source: artDirectionSource,
    },
    qualityMode,
    templateFamily: (draft.templateFamily as TemplateFamily) || null,
    sector: String(draft.sector ?? '').trim() || null,
    deliveryInfo: String(draft.deliveryInfo ?? '').trim() || null,
    stockInfo: String(draft.stockInfo ?? '').trim() || null,
    urgencyInfo: String(draft.urgencyInfo ?? '').trim() || null,
    primaryBenefits: parseIds(draft.primaryBenefits),
  }

  const factsError = campaignFactsError({ objective: snapshot.objective,
    headline: snapshot.customHeadline || snapshot.brief, cta: snapshot.cta,
    price: snapshot.products?.[0]?.price, oldPrice: snapshot.products?.[0]?.oldPrice,
    offer: snapshot.products?.[0]?.promo })
  if (factsError) return { error: factsError }

  snapshot.brandName = org.name
  if (process.env.CREATIVE_DIRECTOR_VERSION === 'V3') snapshot.creativeDirectorVersion = 'V3'

  // Generate accompanying WhatsApp campaign message pairing
  try {
    const verifiedData = deriveVerifiedCampaignData(snapshot)
    snapshot.campaignMessage = generateCampaignWhatsAppMessage(verifiedData)
  } catch (msgErr) {
    console.warn('[startCreativeGeneration] campaignMessage generation skipped:', msgErr)
  }

  const deterministicCreativeId = requestKey
    ? uuidFromRequestKey(org.id, requestKey)
    : undefined

  const { data: inserted, error } = await supabase
    .from('creatives')
    .insert({
      ...(deterministicCreativeId ? { id: deterministicCreativeId } : {}),
      org_id: org.id,
      created_by: userId,
      brand_kit_id: kitRow?.id ?? null,
      parent_id: parentId || baseCreativeId,
      title,
      source: 'ai',
      generation_type: generationType,
      template: 'ai_library',
      format: format.format,
      payload: snapshot,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error) {
    if (
      deterministicCreativeId &&
      (error.code === '23505' ||
        error.message?.includes('duplicate key') ||
        error.message?.includes('creatives_pkey'))
    ) {
      const { data: existing, error: existingError } = await supabase.from('creatives')
        .select('id, status, payload').eq('org_id', org.id).eq('id', deterministicCreativeId).maybeSingle()
      if (existingError || !existing || (existing.payload as any)?.requestKey !== requestKey)
        return { error: 'Mevcut üretim kimliği doğrulanamadı; yeni üretim başlatılmadı.' }
      // Also recover a crash between creative INSERT and queue INSERT. The
      // database index allows exactly one active queue row under concurrency.
      if (existing.status === 'pending') {
        const queueError = await kickGeneration(existing.id, authContext)
        if (queueError) return { error: queueError }
      }
      revalidateLibrary(deterministicCreativeId)
      return { id: deterministicCreativeId, ok: 'Mevcut üretim kaydı açıldı.' }
    }
    return { error: error.message ?? 'Kayıt açılamadı.' }
  }
  if (!inserted) return { error: 'Kayıt açılamadı.' }
  const creativeInsertMs = Date.now() - tInsertStart

  // Creative copy is campaign-scoped input, never trusted catalog knowledge.
  // Do not promote it into reply_product_knowledge, including for real tenants.
  // Trusted knowledge ingestion belongs to the separate catalog workflow.

  const tEnqueueStart = Date.now()
  const queueError = await kickGeneration(inserted.id, authContext)
  if (queueError) return { error: queueError }
  const enqueueMs = Date.now() - tEnqueueStart

  const finalTotalMs = Date.now() - t0
  if (snapshot.submissionMetrics) {
    snapshot.submissionMetrics.creative_insert_ms = creativeInsertMs
    snapshot.submissionMetrics.enqueue_ms = enqueueMs
    snapshot.submissionMetrics.submit_total_ms = finalTotalMs
    snapshot.submissionMetrics.redirect_ready_ms = finalTotalMs
  }

  revalidateLibrary(inserted.id)
  return { id: inserted.id, ok: 'Görsel üretimi başlatıldı.' }
}

export async function retryCreative(id: string): Promise<CreativeActionState> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt yok.' }
  try {
    const { userId, org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }
    const { data } = await supabase
      .from('creatives')
      .select('id, status, source, format, error, payload')
      .eq('id', trimmed)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!data) return { error: 'Görsel bulunamadı.' }
    if (data.source !== 'ai') return { error: 'Yalnızca AI üretimleri yenilenebilir.' }
    if (data.status !== 'failed') return { error: 'Bu üretim korunuyor. Yeni bir tasarım için ayrı bir üretim oluşturun.' }
    const previousPayload = (data.payload || {}) as Record<string, unknown>
    if (data.format === 'video') {
      const jobId = typeof previousPayload.job_id === 'string' ? previousPayload.job_id : trimmed
      const retryError = await retryVideoJob(supabase, org.id, jobId)
      if (retryError) return { error: retryError }
      // The orchestrator owns generation; polling will reconcile this projection.
      await supabase.from('creatives').update({ status: 'pending', error: null })
        .eq('id', trimmed).eq('org_id', org.id).eq('status', 'failed')
      revalidateLibrary(trimmed)
      return { ok: 'Video yeniden kuyruğa alındı.' }
    }
    if (data.format !== 'video' && data.status === 'failed' && isUncertainImageFailure(data.error)) {
      return { error: 'Önceki bağlantı/zaman aşımı üretimin iptal edildiğini kanıtlamıyor. Mevcut iş uzlaştırılmadan ikinci ücretli üretim başlatılmadı.' }
    }
    if (previousPayload.imageSubmissionUncertain || previousPayload.imageReconciliationRequired || previousPayload.imageDirectIntent) {
      return { error: 'Önce mevcut üretimin sonucu doğrulanmalı; belirsiz iş için ikinci ücretli üretim başlatılmadı.' }
    }
    const { data: retried, error: retryError } = await supabase
      .from('creatives')
      .update({ status: 'pending', error: null, payload: { ...((data.payload || {}) as Record<string, unknown>), imageJob: null, imageSubmitIntent: null, imageSubmissionUncertain: false, imageAttempt: randomBytes(16).toString('hex'), imageAttemptStartedAt: new Date().toISOString() } })
      .eq('id', trimmed)
      .eq('org_id', org.id)
      .eq('status', data.status)
      .select('id')
      .maybeSingle()
    if (retryError) return { error: retryError.message }
    if (!retried) return { error: 'İşin durumu değişti; ikinci üretim başlatılmadı.' }
    const queueError = await kickGeneration(trimmed, { userId, org, supabase })
    if (queueError) return { error: queueError }
    revalidateLibrary(trimmed)
    return { ok: 'Üretim yeniden başlatıldı.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

export async function reconcileCreative(id: string): Promise<CreativeActionState> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt yok.' }
  try {
    const { org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }
    const { data } = await supabase
      .from('creatives')
      .select('id, status, source, format, error, payload')
      .eq('id', trimmed)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!data) return { error: 'Görsel bulunamadı.' }
    const payload = (data.payload || {}) as Record<string, unknown>
    const lastJob = (payload.lastImageJob || payload.imageJob) as ImageJobReceipt | undefined

    if (lastJob?.id && lastJob?.gatewayUrl) {
      try {
        const verifiedImage = await readImageJob(lastJob, org.id)
        if (verifiedImage) {
            // Restore active imageJob in payload so processCreativeGeneration can complete authentic reconciliation
            const { data: restored, error: restoreError } = await supabase
              .from('creatives')
              .update({
                status: 'rendering',
                payload: {
                  ...payload,
                  imageJob: lastJob,
                  imageReconciliationRequired: false,
                },
              })
              .eq('id', trimmed)
              .eq('org_id', org.id)
              .eq('status', data.status)
              .select('id')
              .maybeSingle()
            if (restoreError || !restored) return { error: 'İşin durumu değişti; sayfayı yenileyip mevcut sonucu kontrol edin.' }

            const processRes = await processCreativeGeneration(trimmed, supabase)
            if (processRes.ready || processRes.needsReview) {
              revalidateLibrary(trimmed)
              return { ok: 'Üretim tamamlanmış olarak kurtarıldı.' }
            }
        }
      } catch {
        return { error: 'Mevcut çıktı henüz doğrulanamadı. İş korunuyor; yeni üretim başlatılmadı.' }
      }
    }

    revalidateLibrary(trimmed)
    return { error: 'Mevcut üretimin sonucu henüz doğrulanamadı. İş korunuyor; yeni üretim başlatılmadı.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

export async function approveReviewedImage(formData: FormData): Promise<CreativeActionState> {
  if (formData.get('identity') !== 'on' || formData.get('commerce') !== 'on')
    return {error:'Ürün/marka ve ticari bilgileri görselde kontrol ettiğinizi doğrulayın.'}
  const {org,userId,supabase}=await requireActiveOrg()
  if (!isOrgAdminRole(org.role)) return {error:'Onay yetkiniz yok.'}
  const id=String(formData.get('id') || '')
  const {data:row,error:readError}=await supabase.from('creatives').select('id,format,status,payload,storage_path,updated_at')
    .eq('org_id',org.id).eq('id',id).maybeSingle()
  const payload=row?.payload as CreativePayload | undefined
  if (readError || !row || row.format==='video' || row.status!=='needs_review' || payload?.creativeDirectorVersion!=='V3' ||
    !canReviewImage({orgId:org.id,creativeId:id,receipt:payload.imageOutputReceipt,storagePath:row.storage_path}))
    return {error:'Görsel sahipliği ve teknik dosya kanıtı doğrulanamadı.'}
  const {data:stored,error:storageError}=await supabase.storage.from('creatives').download(row.storage_path!)
  if (storageError || !stored || stored.size!==payload.imageOutputReceipt!.size ||
    createHash('sha256').update(Buffer.from(await stored.arrayBuffer())).digest('hex')!==payload.imageOutputReceipt!.sha256)
    return {error:'İncelenen görsel dosyası kayıtlı kanıtla uyuşmuyor.'}
  const {data:approved,error}=await supabase.from('creatives').update({status:'ready',payload:{...payload,
    imageHumanReview:{reviewerId:userId,reviewedAt:new Date().toISOString(),sha256:payload.imageOutputReceipt!.sha256,
      identityConfirmed:true,commerceConfirmed:true,source:'CUSTOMER_EXPLICIT_REVIEW'}} as never})
    .eq('org_id',org.id).eq('id',id).eq('status','needs_review').eq('updated_at',row.updated_at).select('id').maybeSingle()
  if (error || !approved) return {error:'Kayıt değişti; yeniden inceleyin.'}
  revalidateLibrary(id)
  return {ok:'Görsel inceleme onayınız kaydedildi.'}
}

export async function renameCreative(formData: FormData): Promise<CreativeActionState> {
  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim().slice(0, 180)
  if (!id || !title) return { error: 'Başlık yazın.' }
  try {
    const { org, supabase } = await requireActiveOrg()
    const { error } = await supabase
      .from('creatives')
      .update({ title })
      .eq('id', id)
      .eq('org_id', org.id)
    if (error) return { error: error.message }
    revalidateLibrary(id)
    return { ok: 'Ad güncellendi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

export async function deleteCreative(id: string): Promise<CreativeActionState> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt yok.' }
  try {
    const { org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }
    const { data } = await supabase
      .from('creatives')
      .select('id, storage_path')
      .eq('id', trimmed)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!data) return { error: 'Görsel bulunamadı.' }
    if (data.storage_path) {
      await supabase.storage.from('creatives').remove([data.storage_path])
    }
    const { error } = await supabase.from('creatives').delete().eq('id', trimmed).eq('org_id', org.id)
    if (error) return { error: error.message }
    revalidateLibrary()
    return { ok: 'Silindi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

export async function listLibraryCreatives({
  query = '',
  sort = 'new',
  offset = 0,
  limit = LIBRARY_PAGE_SIZE,
}: {
  query?: string
  sort?: 'new' | 'old'
  offset?: number
  limit?: number
}): Promise<{ items: LibraryCreativeRow[]; hasMore: boolean; nextOffset?: number; error?: string }> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const start = Math.max(0, offset)
    const size = Math.min(120, Math.max(1, limit))
    let request = supabase
      .from('creatives')
      .select('id, org_id, storage_path, title, public_url, status, source, generation_type, created_at, error, parent_id, format, payload')
      .eq('org_id', org.id)
      .neq('source', 'upload')
      .in('status', ['ready', 'needs_review'])
      .not('public_url', 'is', null)
      .order('created_at', { ascending: sort === 'old' })
      .order('id', { ascending: sort === 'old' })
      .range(start, start + size - 1)
    const term = query.trim()
    if (term) request = request.ilike('title', `%${term}%`)
    const { data, error } = await request
    if (error) return { items: [], hasMore: false, error: error.message }
    const videoStates = await loadVideoLibraryState(createSupabaseServiceClient() || supabase, org.id, data ?? [])
    const items = (data ?? [])
      .filter(row => isLibraryCreativeEligible(row, org.id, videoStates.get(row.id)))
      .map((row) => {
        const payload = (row.payload ?? {}) as Record<string, unknown>
        const isVideo = row.format === 'video' || Boolean(row.public_url?.endsWith('.mp4')) || Boolean(row.public_url?.includes('/api/ai-media/outputs/'))
        const isReview = (videoStates.get(row.id)?.status || row.status) === 'needs_review'
        const rawUrl = row.public_url || ''
        const effectivePublicUrl = isVideo && isReview && rawUrl && !rawUrl.includes('preview=')
          ? `${rawUrl}${rawUrl.includes('?') ? '&' : '?'}preview=1`
          : row.public_url
        let thumb =
          typeof payload.thumbnailUrl === 'string' && payload.thumbnailUrl && !payload.thumbnailUrl.includes('?thumb=1')
            ? payload.thumbnailUrl
            : isVideo
              ? null
              : effectivePublicUrl
        return {
          id: row.id,
          title: row.title,
          publicUrl: effectivePublicUrl,
          thumbnailUrl: thumb,
          format: row.format,
          status: isVideo ? (videoStates.get(row.id)?.status || row.status) : row.status,
          durationSeconds: videoStates.get(row.id)?.durationSeconds ?? null,
          source: row.source,
          generationType: row.generation_type,
          createdAt: row.created_at,
          error: null,
          parentId: row.parent_id,
        }
      })
    return { items, hasMore: (data ?? []).length === size, nextOffset: start + (data ?? []).length }
  } catch (error) {
    return {
      items: [],
      hasMore: false,
      error: error instanceof Error ? error.message : 'Oturum yok.',
    }
  }
}

export async function getActiveGeneratingCreative(): Promise<{
  id: string
  title: string
  status: string
  format: string
  createdAt: string
} | null> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { data } = await supabase
      .from('creatives')
      .select('id, title, status, format, created_at')
      .eq('org_id', org.id)
      .in('status', ['pending', 'rendering'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!data) return null
    return {
      id: data.id,
      title: data.title || 'Yeni reklam üretimi',
      status: data.status,
      format: data.format,
      createdAt: data.created_at,
    }
  } catch {
    return null
  }
}

export async function uploadLibraryImage(formData: FormData): Promise<CreativeActionState> {
  const files = collectImageFiles(formData, 'file')
  const file = files[0]
  if (!file) return { error: 'PNG, JPG veya WEBP seçin (en fazla 5 MB).' }
  const parsed = await readImageFile(file)
  if ('error' in parsed && parsed.error) return { error: parsed.error }
  if (!('buffer' in parsed)) return { error: 'Dosya okunamadı.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }
    const path = `${org.id}/${crypto.randomUUID()}.${parsed.ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    })
    if (upError) return { error: upError.message }
    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    const title = file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Yüklenen görsel'
    const { data, error } = await supabase
      .from('creatives')
      .insert({
        org_id: org.id,
        created_by: userId,
        title,
        source: 'upload',
        generation_type: 'upload',
        template: 'upload',
        format: 'square',
        status: 'ready',
        storage_path: path,
        public_url: publicUrl.publicUrl,
        payload: { title, source: 'upload' },
      })
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'Kayıt açılamadı.' }
    revalidateLibrary(data.id)
    return { ok: 'Görsel yüklendi.', id: data.id, publicUrl: publicUrl.publicUrl }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

/** Yalnızca materyal yükler (Logo, ürün fotoğrafı, referans görsel). Creatives tablosuna kayıt ATMAZ, kütüphaneyi kirletmez. */
export async function uploadAssetOnly(
  formData: FormData,
  folder: 'logos' | 'products' | 'references' = 'products',
): Promise<{ error?: string; publicUrl?: string }> {
  const files = collectImageFiles(formData, 'file')
  const file = files[0]
  if (!file) return { error: 'PNG, JPG veya WEBP seçin (en fazla 5 MB).' }
  const parsed = await readImageFile(file)
  if ('error' in parsed && parsed.error) return { error: parsed.error }
  if (!('buffer' in parsed)) return { error: 'Dosya okunamadı.' }

  try {
    const { org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }
    const path = `${org.id}/${folder}/${crypto.randomUUID()}.${parsed.ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    })
    if (upError) return { error: upError.message }
    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    return { publicUrl: publicUrl.publicUrl }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

/** Attach a validated reference to this tenant's existing product only. */
export async function uploadProductReference(formData: FormData): Promise<{error?:string;image?:{id:string;url:string}}> {
  let ctx: Awaited<ReturnType<typeof requireActiveOrg>>
  try { ctx = await requireActiveOrg() } catch { return {error:'Oturum bulunamadı.'} }
  const {org,supabase} = ctx
  if (!isOrgAdminRole(org.role) || org.suspended_at) return {error:'Ürün görseli ekleme yetkiniz yok.'}
  const productId = String(formData.get('productId') || '')
  const {data:product} = await supabase.from('org_products').select('id').eq('id',productId).eq('org_id',org.id).maybeSingle()
  if (!product) return {error:'Bu işletmeye ait ürün bulunamadı.'}
  const file = collectImageFiles(formData,'file')[0]
  if (!file) return {error:'Ürün görseli zorunludur.'}
  const parsed = await readImageFile(file)
  if (!('buffer' in parsed) || !parsed.buffer) return {error:parsed.error || 'Görsel okunamıyor.'}
  try {
    const image = sharp(parsed.buffer,{limitInputPixels:25000000,failOn:'warning'})
    const metadata = await image.metadata()
    if (!['png','jpeg','webp'].includes(metadata.format || '')) return {error:'PNG, JPG veya WEBP yükleyin.'}
    await image.raw().toBuffer()
  } catch { return {error:'Görsel bozuk veya okunamıyor.'} }
  const id = crypto.randomUUID()
  const storagePath = `${org.id}/products/${productId}/${id}.${parsed.ext}`
  const {error:uploadError} = await supabase.storage.from('creatives').upload(storagePath,parsed.buffer,{contentType:parsed.mime,upsert:false})
  if (uploadError) return {error:'Görsel yüklenemedi. Tekrar deneyin.'}
  const {data:publicUrl} = supabase.storage.from('creatives').getPublicUrl(storagePath)
  const {error:recordError} = await supabase.from('org_product_images').insert({id,org_id:org.id,product_id:productId,storage_path:storagePath,public_url:publicUrl.publicUrl,sort_order:0})
  if (recordError) return {error:'Görsel ürün kaydına bağlanamadı. Tekrar deneyin.'}
  return {image:{id,url:publicUrl.publicUrl}}
}

/** Kampanya görsel sihirbazından ayrılmadan hızlı ürün ekleme */
export async function quickCreateProduct(
  formData: FormData,
): Promise<{ error?: string; product?: ProductCard }> {
  let ctx: Awaited<ReturnType<typeof requireActiveOrg>>
  try {
    ctx = await requireActiveOrg()
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
  const { org, supabase, userId } = ctx
  if (!isOrgAdminRole(org.role)) {
    return { error: 'Yalnızca sahip veya yönetici ürün ekleyebilir.' }
  }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Ürün adı zorunludur.' }

  const files = collectImageFiles(formData, 'images')
  if (!files.length) return { error: 'Ürün referans görseli zorunludur.' }
  if (files.length > 8) return { error: 'En fazla 8 ürün görseli ekleyin.' }
  for (const file of files) {
    const parsed = await readImageFile(file)
    if ('error' in parsed && parsed.error) return { error: parsed.error }
    if (!('buffer' in parsed)) return { error: 'Geçerli bir ürün görseli yükleyin.' }
    try {
      const decoded = sharp(parsed.buffer,{limitInputPixels:25000000,failOn:'warning'})
      const metadata = await decoded.metadata()
      if (!['png','jpeg','webp'].includes(metadata.format || '')) return {error:'PNG, JPG veya WEBP yükleyin.'}
      await decoded.raw().toBuffer()
    } catch { return {error:'Ürün görseli bozuk veya okunamıyor. Başka bir görsel yükleyin.'} }
  }

  const description = String(formData.get('description') ?? '').trim()
  const boxContents = String(formData.get('box_contents') ?? '').trim()
  const productId = crypto.randomUUID()

  const { error: insertError } = await supabase.from('org_products').insert({
    id: productId,
    org_id: org.id,
    created_by: userId,
    name: name.slice(0, 160),
    description: description || null,
    box_contents: boxContents || null,
    is_active: false,
  })

  if (insertError) return { error: insertError.message }

  const images: { id: string; url: string }[] = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const parsed = await readImageFile(file)
    if ('error' in parsed && parsed.error) continue
    if (!('buffer' in parsed)) continue
    const path = `${org.id}/products/${productId}/${crypto.randomUUID()}.${parsed.ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    })
    if (upError) continue
    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    const imgId = crypto.randomUUID()
    const { error: imgError } = await supabase.from('org_product_images').insert({
      id: imgId,
      org_id: org.id,
      product_id: productId,
      storage_path: path,
      public_url: publicUrl.publicUrl,
      sort_order: index,
    })
    if (!imgError) {
      images.push({ id: imgId, url: publicUrl.publicUrl })
    }
  }

  if (!images.length) return { error: 'Ürün görseli kaydedilemedi. Görselsiz ürün seçime açılmadı; yeniden yükleyin.' }
  const { error: activateError } = await supabase.from('org_products').update({is_active:true}).eq('id',productId).eq('org_id',org.id)
  if (activateError) return { error: 'Ürün kaydı tamamlanamadı. Görsel yüklemesini tekrar deneyin.' }

  revalidatePath('/icerik/yeni')
  revalidatePath('/ayarlar/urunler')

  return {
    product: {
      id: productId,
      name,
      description: description || null,
      boxContents: boxContents || null,
      images,
    },
  }
}

const SOCIAL_PLATFORMS = new Set([
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'x',
  'linkedin',
  'website',
  'other',
])

function normalizeSocialUrl(raw: string) {
  const value = raw.trim()
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `https://${value}`
}

/** Kampanya görsel sihirbazından ayrılmadan hızlı sosyal hesap ekleme */
export async function quickCreateSocialAccount(
  formData: FormData,
): Promise<{ error?: string; social?: SocialOption }> {
  let ctx: Awaited<ReturnType<typeof requireActiveOrg>>
  try {
    ctx = await requireActiveOrg()
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
  const { org, supabase, userId } = ctx
  if (!isOrgAdminRole(org.role)) {
    return { error: 'Yalnızca sahip veya yönetici hesap ekleyebilir.' }
  }

  const platform = String(formData.get('platform') ?? '').trim()
  const label = String(formData.get('label') ?? '').trim().slice(0, 80) || null
  const url = normalizeSocialUrl(String(formData.get('url') ?? ''))

  if (!SOCIAL_PLATFORMS.has(platform)) return { error: 'Geçerli bir platform seçin.' }
  if (url.length < 8) return { error: 'Geçerli bir bağlantı yazın.' }

  const { data, error } = await supabase
    .from('org_social_accounts')
    .insert({
      org_id: org.id,
      created_by: userId,
      platform,
      label,
      url: url.slice(0, 500),
    })
    .select('id, platform, label, url')
    .single()

  if (error || !data) return { error: error?.message ?? 'Hesap eklenemedi.' }

  revalidatePath('/icerik/yeni')
  revalidatePath('/ayarlar/sosyal')

  return {
    social: {
      id: data.id,
      platform: data.platform,
      label: data.label,
      url: data.url,
    },
  }
}

export async function fetchVideoScenariosAction(
  draft: Record<string, unknown>,
): Promise<{
  ok: boolean
  scenarios?: VideoScenarioOption[]
  error?: string
}> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { data: orgData } = await supabase
      .from('organizations')
      .select('name, about')
      .eq('id', org.id)
      .maybeSingle()

    const productIds = parseIds(draft.productIds)
    const products: VideoScenarioContext['products'] = []
    if (productIds.length > 0) {
      const { data: productRows } = await supabase
        .from('org_products')
        .select('id, name')
        .eq('org_id', org.id)
        .in('id', productIds)

      const extras = (draft.productExtras ?? {}) as Record<
        string,
        { price?: string; promo?: string; extra?: string }
      >

      for (const row of productRows ?? []) {
        const extra = extras[row.id] ?? {}
        products.push({
          name: row.name,
          price: extra.price,
          promo: extra.promo,
          extra: extra.extra,
        })
      }
    }

    const scenarios = await generateVideoScenarios({
      brandName: orgData?.name || 'Mesajify',
      about: orgData?.about,
      brief: String(draft.brief ?? '').trim() || 'WhatsApp ile dijital broşür ve kampanya siparişleri',
      customText: String(draft.customText ?? '').trim() || null,
      dateRange: String(draft.dateRange ?? '').trim() || null,
      cta: String(draft.cta ?? '').trim() || null,
      videoSpeech: draft.videoSpeech !== false && draft.videoSpeech !== '0',
      products,
    })

    return { ok: true, scenarios }
  } catch (err) {
    console.error('[fetchVideoScenariosAction]', err)
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Senaryo üretilemedi.',
    }
  }
}
