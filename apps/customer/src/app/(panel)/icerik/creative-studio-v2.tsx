'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Card, Field, Input, Notice, Textarea } from '@/components/ui'
import { Stepper } from '@/components/stepper'
import { Icon } from '@/components/icon'
import { ProductionProgress } from '@/components/production-progress/production-progress'
import { AddProductModal } from './add-product-modal'
import { getSafeMediaUrl, resolvePreviewUrl } from '@/lib/media-url'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { startCreativeGeneration, type CreativeActionState } from './actions'
import {
  CAMPAIGN_OBJECTIVES,
  CREATIVE_STYLE_PRESETS,
  IMAGE_FORMATS_V2,
  VIDEO_FORMATS_V2,
  type CampaignObjective,
  type CreativePlanV2,
  type CreativeStylePreset,
  type ImageFormatV2,
  type MediaType,
  type StructuredCampaignCopy,
} from '@/lib/creative/v2/types'
import {
  TEMPLATE_FAMILIES,
  TEXT_DENSITIES,
  type TemplateFamily,
} from '@/lib/creative/types'
import { adaptLegacyDraftToV2, mapPresetToLegacyVideoFormat } from '@/lib/creative/v2/adapter'
import { resolveSubmissionIdentity } from '@/lib/creative/submission-identity'
import { campaignFactsError } from '@/lib/creative/campaign-facts'
import { ownsStudioDraft } from '@/lib/creative/draft-ownership'
import { BRAND_VIDEO_UNAVAILABLE, promotionMode as parsePromotionMode, offeringKind as parseOfferingKind, type PromotionMode, type OfferingKind } from '@/lib/creative/promotion-policy'
import {
  MAX_SPOKEN_WORDS,
  VIDEO_ENGINE_MODE,
  VIDEO_REQUESTED_PROVIDER,
  defaultFidelityContract,
} from '@/lib/video-wizard-contract'
import { buildVeoVoiceoverPromptBlock } from '@/lib/video-voiceover-contract'
import { videoFailureUserMessage } from '@/lib/creative/job-failure-message'
import type { JobUserViewModel, ProductCard, WizardBootstrap } from './wizard-types'

const STORAGE_KEY_PREFIX = 'wa.customer.creative-studio.v2'
export const AI_PLANNER_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_AI_PLANNER_TIMEOUT_MS) || 125000
export const VIDEO_PLANNER_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_VIDEO_PLANNER_TIMEOUT_MS) || 125000

export { generateDeterministicLocalCopy } from '@/lib/creative/v2/copy-generator'
import { generateDeterministicLocalCopy } from '@/lib/creative/v2/copy-generator'

type Step = 'product_goal' | 'creative_direction' | 'review_generate'


const STUDIO_STEPS: { id: Step; label: string }[] = [
  { id: 'product_goal', label: '1. Ne Tanıtmak İstiyorsunuz?' },
  { id: 'creative_direction', label: '2. Reklamınız Nasıl Görünsün?' },
  { id: 'review_generate', label: '3. Son Kontrol ve Üretim' },
]

export function CreativeStudioV2({
  data,
  initialMediaType = 'IMAGE',
  initialDerivedCreativeId,
  initialJobId,
  previewOnly = false,
}: {
  previewOnly?: boolean
  data: WizardBootstrap
  initialMediaType?: MediaType
  initialDerivedCreativeId?: string | null
  initialJobId?: string | null
}) {
  const router = useRouter()
  const orgKey = `${STORAGE_KEY_PREFIX}.${data.org.id}`
  const restoredDraftKeyRef = useRef<string | null>(null)
  const submissionLockRef = useRef(false)
  const submissionIdentityRef = useRef<{ fingerprint: string; id: string } | null>(null)
  const stableSubmissionId = (payload: Record<string, unknown>, kind: 'image' | 'video') => {
    let storage: Storage | null = null
    try { storage = window.localStorage } catch { /* use the retained in-memory identity */ }
    const record = resolveSubmissionIdentity({
      fingerprint: JSON.stringify({ kind, ...payload }), storageKey: `${orgKey}.submission.${kind}`,
      storage, previous: submissionIdentityRef.current, createId: () => crypto.randomUUID(),
    })
    submissionIdentityRef.current = record
    return record.id
  }

  // Step state
  const [step, setStep] = useState<Step>('product_goal')
  const [draftRestoreWarning, setDraftRestoreWarning] = useState<string | null>(null)
  const [draftHydrated, setDraftHydrated] = useState(false)

  // Step 1: Product & Goal
  const [mediaType, setMediaType] = useState<MediaType>(initialMediaType)
  const [promotionMode, setPromotionMode] = useState<PromotionMode>('offering')
  const [offeringKind, setOfferingKind] = useState<OfferingKind>('physical')
  const brandOnly = promotionMode === 'brand'
  const [heroProductId, setHeroProductId] = useState<string>(() => data.products[0]?.id || '')
  const [objective, setObjective] = useState<CampaignObjective>('PRODUCT_INTRO')
  const [campaignDetail, setCampaignDetail] = useState('')
  const [imageFormat, setImageFormat] = useState<ImageFormatV2>('SQUARE_1_1')
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [productsList, setProductsList] = useState<ProductCard[]>(data.products)

  // Step 2: Creative Direction & Copy
  const [stylePreset, setStylePreset] = useState<CreativeStylePreset>('AUTO')
  const [isPlanning, setIsPlanning] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [creativePlan, setCreativePlan] = useState<CreativePlanV2 | null>(null)

  // User-edited copy/voiceover
  const [headline, setHeadline] = useState('')
  const [supportingLine, setSupportingLine] = useState('')
  const [ctaText, setCtaText] = useState('Hemen İnceleyin')
  const [spokenVoiceover, setSpokenVoiceover] = useState('')
  const [visualScenePrompt, setVisualScenePrompt] = useState('')

  // Copy source tracking
  const [copySource, setCopySource] = useState<'AI' | 'DETERMINISTIC_FALLBACK' | 'USER_EDITED'>('DETERMINISTIC_FALLBACK')

  // Independent dirty tracking to prevent late AI responses from overwriting user edits
  const [headlineDirty, setHeadlineDirty] = useState(false)
  const [supportingLineDirty, setSupportingLineDirty] = useState(false)
  const [ctaDirty, setCtaDirty] = useState(false)
  const [voiceoverDirty, setVoiceoverDirty] = useState(false)
  const [scenePromptDirty, setScenePromptDirty] = useState(false)

  // Active AbortController ref to cancel obsolete in-flight requests (e.g. style change)
  const activePlanControllerRef = useRef<AbortController | null>(null)
  const copyEditsRef = useRef({ headline: 0, supporting: 0, cta: 0, voiceover: 0, scene: 0 })
  const copyDirtyRef = useRef({ headline: false, supporting: false, cta: false, voiceover: false, scene: false })

  const resetProductCopy = () => {
    activePlanControllerRef.current?.abort()
    activePlanControllerRef.current = null
    setIsPlanning(false)
    setCreativePlan(null)
    setPlanError(null)
    setHeadline('')
    setSupportingLine('')
    setCtaText('Hemen İnceleyin')
    setSpokenVoiceover('')
    setVisualScenePrompt('')
    setHeadlineDirty(false)
    setSupportingLineDirty(false)
    setCtaDirty(false)
    setVoiceoverDirty(false)
    setScenePromptDirty(false)
    copyDirtyRef.current = { headline: false, supporting: false, cta: false, voiceover: false, scene: false }
  }

  // Structured campaign details (under Advanced)
  const [price, setPrice] = useState('')
  const [oldPrice, setOldPrice] = useState('')
  const [offer, setOffer] = useState('')
  const [dateRange, setDateRange] = useState('')
  const [brandKitId, setBrandKitId] = useState<string>(
    () => data.kits.find((k) => k.isDefault)?.id || data.kits[0]?.id || '',
  )

  // Template Family & Commercial Data (Phase 2 & Phase 3)
  const [templateFamily, setTemplateFamily] = useState<TemplateFamily>('CAMPAIGN_POSTER')
  const [textDensity, setTextDensity] = useState<'low' | 'balanced' | 'detailed'>('balanced')
  const [sector, setSector] = useState('')
  const [deliveryInfo, setDeliveryInfo] = useState('')

  // Smart collapsible section states
  const [isPriceOpen, setIsPriceOpen] = useState(false)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  // Quality Mode: Internal AUTO_PROFESSIONAL policy (backward-compatible with STANDARD / DESIGNER drafts)
  const [qualityMode, setQualityMode] = useState<'AUTO_PROFESSIONAL' | 'STANDARD' | 'DESIGNER'>('AUTO_PROFESSIONAL')

  // Video Advanced Options
  const [environmentPreset, setEnvironmentPreset] = useState('auto')
  const [motionStyle, setMotionStyle] = useState('real_usage')
  const [subtitles, setSubtitles] = useState(true)
  const outro = true

  // Step 3: Production & Progress Tracking
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Video-specific job state
  const [activeJobId, setActiveJobId] = useState<string | null>(initialJobId || null)
  const [jobState, setJobState] = useState<JobUserViewModel['state'] | 'IDLE'>(initialJobId ? 'PENDING' : 'IDLE')
  const [jobViewModel, setJobViewModel] = useState<JobUserViewModel | null>(null)
  const [completedVideoUrl, setCompletedVideoUrl] = useState<string | null>(null)
  const [jobFailureMessage, setJobFailureMessage] = useState<string | null>(null)

  // The server supplies initialJobId on navigation and reload.

  // Authoritative active view model
  const activeViewModel: JobUserViewModel = useMemo(() => {
    if (jobViewModel && jobViewModel.job_id) {
      return jobViewModel
    }
    const safeState = (['PENDING', 'QUEUED', 'GENERATING', 'COMPLETED', 'NEEDS_REVIEW', 'FAILED'].includes(jobState)
      ? jobState
      : 'PENDING') as JobUserViewModel['state']

    return {
      job_id: activeJobId || '',
      org_id: data.org.id || '',
      state: safeState,
      raw_state: jobState,
      stage_key: 'REQUEST_ACCEPTED',
      stage_index: 1,
      stage_count: 7,
      display_state: 'REKLAM_TASLAGI_HAZIRLANIYOR',
      display_title: 'Reklam Videonuz Prodüksiyonda',
      display_message: 'Dikey sinematik reklam filminiz aşama aşama kurgulanıyor.',
      queue_ahead_count: null,
      eta_display_text: 'Süre tahmini oluşturuluyor...',
      can_cancel: false,
      can_leave_page: true,
    }
  }, [jobViewModel, activeJobId, jobState, data.org.id])

  const handleResetToNew = () => {
    setActiveJobId(null)
    setJobViewModel(null)
    setJobState('IDLE')
    setCompletedVideoUrl(null)
    setJobFailureMessage(null)
    setStep('product_goal')
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('job_id')
      window.history.pushState({}, '', url.toString())
    }
  }

  // Image-specific action state
  const [imageState, setImageState] = useState<CreativeActionState>(null)
  const [imagePending, setImagePending] = useState(false)

  // Authoritative Logo & Product Bridge
  const defaultKit = useMemo(
    () => data.kits.find((k) => k.id === brandKitId) || data.kits.find((k) => k.isDefault) || data.kits[0] || null,
    [data.kits, brandKitId],
  )
  const rawLogoPath = defaultKit?.samplePreview || data.org.logoPreview || ''
  const canonicalLogoUrl = resolvePreviewUrl(rawLogoPath, 'brand-assets') || ''
  const logoPreflightState: 'SELECTED' | 'RESOLVING' | 'READY' | 'INVALID' = !rawLogoPath
    ? 'INVALID'
    : (!canonicalLogoUrl ? 'INVALID' : 'READY')
  const hasLogo = logoPreflightState === 'READY'

  const selectedProduct = useMemo(
    () => brandOnly ? null : productsList.find((p) => p.id === heroProductId) || null,
    [productsList, heroProductId, brandOnly],
  )
  const rawProductImagePath = selectedProduct?.images?.[0]?.url || ''
  const productImageUrl = resolvePreviewUrl(rawProductImagePath, 'creatives') || ''
  const productPreflightState: 'SELECTED' | 'RESOLVING' | 'READY' | 'INVALID' = !selectedProduct
    ? 'SELECTED'
    : (!rawProductImagePath ? 'INVALID' : (!productImageUrl ? 'INVALID' : 'READY'))
  const hasProduct = productPreflightState === 'READY' && productImageUrl !== canonicalLogoUrl && !/^\/?(?:brand|logos)\//i.test(rawProductImagePath)
  const allAssetsReady = hasLogo && (brandOnly ? mediaType === 'IMAGE' : hasProduct)

  // Quota status
  const quotaUsed = data.org.monthlyVideoUsed ?? 0
  const quotaLimit = data.org.monthlyVideoQuota ?? 3
  const quotaAvailable = quotaLimit > 0 && quotaUsed < quotaLimit

  // Voiceover word count
  const voWords = useMemo(
    () => spokenVoiceover.trim().split(/\s+/).filter(Boolean).length,
    [spokenVoiceover],
  )

  // Restore draft or adapt legacy draft
  useEffect(() => {
    if (restoredDraftKeyRef.current === orgKey) return
    const hydrationFrame = requestAnimationFrame(() => {
    restoredDraftKeyRef.current = orgKey
    try {
      const raw = localStorage.getItem(orgKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return
        if (!ownsStudioDraft(parsed, data.org.id, productsList.map(product => product.id))) {
          setDraftRestoreWarning('Eski taslağın işletme ve ürün bilgileri doğrulanamadı. Lütfen reklam metnini yeniden hazırlayın.')
          return
        }
        const adapted = adaptLegacyDraftToV2(
          parsed,
          productsList.map((p) => p.id),
        )
        if (adapted.heroProductId && productsList.some((p) => p.id === adapted.heroProductId)) {
          setHeroProductId(adapted.heroProductId)
        }
        setMediaType(adapted.mediaType)
        setPromotionMode(parsePromotionMode(parsed.promotionMode))
        setOfferingKind(parseOfferingKind(parsed.offeringKind))
        if (parsed.promotionMode === 'brand') setHeroProductId('')
        setObjective(adapted.objective)
        setStylePreset(adapted.stylePreset)
        setCampaignDetail(adapted.campaignDetail)
        if (adapted.formatId !== 'STORY_9_16') setImageFormat(adapted.formatId)
        if (adapted.campaignCopy.price) setPrice(adapted.campaignCopy.price)
        if (adapted.campaignCopy.oldPrice) setOldPrice(adapted.campaignCopy.oldPrice)
        if (adapted.campaignCopy.offer) setOffer(adapted.campaignCopy.offer)
        if (adapted.campaignCopy.dateRange) setDateRange(adapted.campaignCopy.dateRange)
        if (adapted.campaignCopy.cta) setCtaText(adapted.campaignCopy.cta)
        if (data.kits.some(kit => kit.id === adapted.advanced.brandKitId)) setBrandKitId(adapted.advanced.brandKitId!)
        if (typeof adapted.advanced.environmentPreset === 'string') setEnvironmentPreset(adapted.advanced.environmentPreset)
        if (typeof adapted.advanced.motionStyle === 'string') setMotionStyle(adapted.advanced.motionStyle)
        setSubtitles(adapted.advanced.subtitles !== false)
        if (parsed.qualityMode === 'STANDARD' || parsed.qualityMode === 'DESIGNER') setQualityMode(parsed.qualityMode)
        if (TEMPLATE_FAMILIES.some(family => family.id === parsed.templateFamily)) setTemplateFamily(parsed.templateFamily)
        if (['low', 'balanced', 'detailed'].includes(parsed.textDensity)) setTextDensity(parsed.textDensity)
        if (typeof parsed.sector === 'string') setSector(parsed.sector)
        if (typeof parsed.deliveryInfo === 'string') setDeliveryInfo(parsed.deliveryInfo)
        if (typeof parsed.visualScenePrompt === 'string') setVisualScenePrompt(parsed.visualScenePrompt)
        else if (typeof parsed.instruction === 'string') setVisualScenePrompt(parsed.instruction)
        if (adapted.customHeadline) setHeadline(adapted.customHeadline)
        if (adapted.customSupporting) setSupportingLine(adapted.customSupporting)
        if (adapted.customVoiceover) setSpokenVoiceover(adapted.customVoiceover)
        const restoredCopy = {
          headline: Boolean(adapted.customHeadline), supporting: Boolean(adapted.customSupporting),
          cta: Boolean(adapted.campaignCopy.cta), voiceover: Boolean(adapted.customVoiceover),
          scene: Boolean(parsed.visualScenePrompt || parsed.instruction),
        }
        copyDirtyRef.current = restoredCopy
        setHeadlineDirty(restoredCopy.headline)
        setSupportingLineDirty(restoredCopy.supporting)
        setCtaDirty(restoredCopy.cta)
        setVoiceoverDirty(restoredCopy.voiceover)
        setScenePromptDirty(restoredCopy.scene)
      }
    } catch {
      /* ignore */
    } finally {
      setDraftHydrated(true)
    }
    })
    return () => cancelAnimationFrame(hydrationFrame)
  }, [orgKey, productsList, data.kits, data.org.id])

  // Save draft
  useEffect(() => {
    if (!draftHydrated) return
    try {
      const draft = {
        version: 2,
        orgId: data.org.id,
        mediaType,
        promotionMode, offeringKind,
        heroProductId: brandOnly ? '' : heroProductId,
        objective,
        stylePreset,
        campaignDetail,
        formatId: mediaType === 'VIDEO' ? 'STORY_9_16' : imageFormat,
        campaignCopy: { price, oldPrice, offer, dateRange, cta: ctaText },
        customHeadline: headline,
        customSupporting: supportingLine,
        customVoiceover: spokenVoiceover,
        visualScenePrompt,
        brandKitId,
        environmentPreset,
        motionStyle,
        subtitles,
        outro,
        qualityMode, templateFamily, textDensity, sector, deliveryInfo,
      }
      localStorage.setItem(orgKey, JSON.stringify(draft))
    } catch {
      /* ignore */
    }
  }, [
    draftHydrated,
    orgKey,
    data.org.id,
    mediaType,
    promotionMode, offeringKind, brandOnly,
    heroProductId,
    objective,
    stylePreset,
    campaignDetail,
    imageFormat,
    price,
    oldPrice,
    offer,
    dateRange,
    ctaText,
    headline,
    supportingLine,
    spokenVoiceover,
    visualScenePrompt,
    brandKitId,
    environmentPreset,
    motionStyle,
    subtitles,
    outro,
    qualityMode, templateFamily, textDensity, sector, deliveryInfo,
  ])

  // Keep the editor usable while the planner completes its bounded request.
  const requestCreativePlan = async (forceRefresh = false, requestedStyle = stylePreset) => {
    if (previewOnly) return
    if (!brandOnly && !selectedProduct) return

    // Cancel any previous in-flight planner request
    if (activePlanControllerRef.current) {
      activePlanControllerRef.current.abort()
    }
    const controller = new AbortController()
    activePlanControllerRef.current = controller
    const editsAtRequest = { ...copyEditsRef.current }

    setIsPlanning(true)
    setPlanError(null)

    // Allow the server's 110s provider deadline plus request/response overhead.
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, mediaType === 'VIDEO' ? VIDEO_PLANNER_TIMEOUT_MS : AI_PLANNER_TIMEOUT_MS)

    try {
      const res = await fetch('/api/ai-media/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          promotionMode: brandOnly ? 'brand' : 'offering',
          brandName: data.org.name || 'İşletmemiz',
          brandTone: defaultKit?.tone || null,
          productName: brandOnly ? data.org.name : selectedProduct?.name,
          productId: brandOnly ? null : selectedProduct?.id,
          productDescription: brandOnly ? (data.org.about || null) : (selectedProduct?.description || null),
          objective: brandOnly ? 'BRAND_AWARENESS' : objective,
          stylePreset: requestedStyle,
          mediaType,
          campaignDetail: campaignDetail || null,
          campaignCopy: { price, oldPrice, offer, dateRange, cta: ctaText },
        }),
      })

      const json = await res.json()
      if (!res.ok || !json.ok || !json.plan) {
        throw new Error(json.error || 'Yapay zeka reklam taslağını oluşturamadı.')
      }

      const plan: CreativePlanV2 = json.plan
      if (controller.signal.aborted || activePlanControllerRef.current !== controller) return
      setCreativePlan(plan)
      setCopySource(plan.source === 'AI' ? 'AI' : 'DETERMINISTIC_FALLBACK')

      // NEVER OVERWRITE USER EDITS: Only update untouched fields unless user explicitly clicked "Farklı Öner"
      if (copyEditsRef.current.headline === editsAtRequest.headline && (forceRefresh || !copyDirtyRef.current.headline)) {
        setHeadline(plan.copy.headline)
        if (forceRefresh) copyDirtyRef.current.headline = false
        if (forceRefresh) setHeadlineDirty(false)
      }
      if (copyEditsRef.current.supporting === editsAtRequest.supporting && (forceRefresh || !copyDirtyRef.current.supporting)) {
        setSupportingLine(plan.copy.supporting_line)
        if (forceRefresh) copyDirtyRef.current.supporting = false
        if (forceRefresh) setSupportingLineDirty(false)
      }
      if (copyEditsRef.current.cta === editsAtRequest.cta && (forceRefresh || !copyDirtyRef.current.cta)) {
        setCtaText(plan.copy.cta)
        if (forceRefresh) copyDirtyRef.current.cta = false
        if (forceRefresh) setCtaDirty(false)
      }
      if (mediaType === 'VIDEO' && copyEditsRef.current.voiceover === editsAtRequest.voiceover && (forceRefresh || !copyDirtyRef.current.voiceover) && plan.voiceover_text) {
        setSpokenVoiceover(plan.voiceover_text)
        if (forceRefresh) copyDirtyRef.current.voiceover = false
        if (forceRefresh) setVoiceoverDirty(false)
      }

      // Auto-populate AI Design Idea / Scene Prompt unless user edited it
      const suggestedScene = [plan.scene?.environment, plan.scene?.lighting, plan.scene?.composition]
        .filter(Boolean)
        .join('. ')
      if (suggestedScene && copyEditsRef.current.scene === editsAtRequest.scene && (forceRefresh || !copyDirtyRef.current.scene)) {
        setVisualScenePrompt(suggestedScene)
        if (forceRefresh) copyDirtyRef.current.scene = false
        if (forceRefresh) setScenePromptDirty(false)
      }
    } catch (err: unknown) {
      if (activePlanControllerRef.current !== controller) return
      if ((err instanceof Error && err.name === 'AbortError') || controller.signal.aborted) {
        console.warn('[CreativeStudioV2] Plan request timed out or cancelled')
        setPlanError('AI_TIMEOUT')
      } else {
        console.warn('[CreativeStudioV2] Plan error:', err)
        setPlanError(err instanceof Error ? err.message : 'AI_ERROR')
      }
    } finally {
      clearTimeout(timeoutId)
      if (activePlanControllerRef.current === controller) {
        activePlanControllerRef.current = null
        setIsPlanning(false)
      }
    }
  }

  // Generate Plan on entering Step 2 if not planned yet
  const handleGoToStep2 = () => {
    if (!allAssetsReady) return

    // Immediately provide deterministic local copy if fields are empty
    const local = generateDeterministicLocalCopy({
      productName: selectedProduct?.name || 'Ürünümüz',
      brandName: data.org.name || 'İşletmemiz',
      objective,
      campaignDetail,
      offer,
      mediaType,
    })
    if (brandOnly) {
      local.headline = data.org.name
      local.supportingLine = data.org.about || 'Markamız hakkında bilgi almak için bizimle iletişime geçin.'
      local.cta = 'Bizimle İletişime Geçin'
      local.scenePrompt = `Kurumsal ${data.org.name} marka vitrini, prestijli logo sunumu ve dengeli stüdyo aydınlatması.`
    }

    if (!headline && !headlineDirty) setHeadline(local.headline)
    if (!supportingLine && !supportingLineDirty) setSupportingLine(local.supportingLine)
    if (!ctaText && !ctaDirty) setCtaText(local.cta)
    if (mediaType === 'VIDEO' && !spokenVoiceover && !voiceoverDirty) {
      setSpokenVoiceover(local.voiceover)
    }
    if (!visualScenePrompt && !scenePromptDirty) {
      setVisualScenePrompt(local.scenePrompt)
    }

    // Smart collapsible: auto-open price for sales/campaign
    if (objective === 'SALES_OFFER' || objective === 'CAMPAIGN' || price || oldPrice || offer) {
      setIsPriceOpen(true)
    }

    setStep('creative_direction')
    void requestCreativePlan(false)
  }

  // Handle Video Supabase Realtime Job Watcher
  useEffect(() => {
    if (!activeJobId) return

    let isMounted = true
    let syncing = false
    let terminal = false
    const controller = new AbortController()

    const syncStatus = async () => {
      if (!isMounted || syncing || terminal) return
      syncing = true
      try {
        const res = await fetch(`/api/ai-media/jobs/${activeJobId}`, { signal: controller.signal })
        if (!res.ok) return
        const resData = await res.json()
        const vm = resData.job as JobUserViewModel
        if (!vm || !isMounted) return

        setJobViewModel(vm)
        setJobState(vm.state)
        setJobFailureMessage(vm.failure_user_message || null)
        terminal = vm.state === 'COMPLETED' || vm.state === 'NEEDS_REVIEW' || vm.state === 'FAILED'

        if ((vm.state === 'COMPLETED' || vm.state === 'NEEDS_REVIEW') && vm.playback_url) {
          setCompletedVideoUrl(vm.playback_url)
        }
      } catch (e) {
        if (!controller.signal.aborted) console.error('Job sync error:', e)
      } finally {
        syncing = false
      }
    }

    syncStatus()

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`studio-watch-${activeJobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_media_jobs', filter: `id=eq.${activeJobId}` },
        () => syncStatus(),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_media_events', filter: `job_id=eq.${activeJobId}` },
        () => syncStatus(),
      )
      .subscribe()

    const interval = setInterval(syncStatus, 3500)

    return () => {
      isMounted = false
      controller.abort()
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [activeJobId])

  // SUBMIT HANDLER: Image or Video
  const handleCreateCreative = async () => {
    if (previewOnly) { setSubmitError('Yerel arayüz testinde üretim ve kayıt işlemleri kapalıdır.'); return }
    if (submissionLockRef.current || !allAssetsReady || (!brandOnly && !selectedProduct)) return
    const factsError = campaignFactsError({ objective: brandOnly ? 'BRAND_AWARENESS' : objective, headline, cta: ctaText, price, oldPrice, offer })
    if (factsError) {
      setSubmitError(factsError)
      if (factsError.includes('fiyat') || factsError.includes('teklif') || factsError.includes('Fiyat') || factsError.includes('oran')) {
        setIsPriceOpen(true)
        setStep('creative_direction')
      }
      return
    }
    submissionLockRef.current = true

    setIsSubmitting(true)
    setSubmitError(null)

    if (mediaType === 'IMAGE') {
      setImagePending(true)
      try {
        const payloadDraft = {
          version: 2,
          promotionMode, offeringKind,
          requestKey: '',
          generationType: !brandOnly && initialDerivedCreativeId ? 'derived' : 'new',
          baseCreativeId: brandOnly ? null : initialDerivedCreativeId || null,
          brief: headline
            ? `${headline}. ${supportingLine}`
            : brandOnly ? `${data.org.name} marka tanıtımı` : `${data.org.name} için ${selectedProduct!.name} reklam görseli`,
          formatId: imageFormat,
          style: stylePreset.toLowerCase(),
          heroProductId: brandOnly ? null : selectedProduct!.id,
          productIds: brandOnly ? [] : [selectedProduct!.id],
          productExtras: brandOnly ? {} : {
            [selectedProduct!.id]: {
              imageUrl: productImageUrl,
              price: price || '',
              oldPrice: oldPrice || '',
              promo: offer || '',
              extra: campaignDetail || '',
              include: { name: true, image: true, description: true, boxContents: true, price: true, promo: true },
            },
          },
          phoneIds: data.phones.map(contact => contact.id),
          socialIds: data.socials.map(contact => contact.id),
          address: data.org.address,
          website: data.org.websiteHint,
          useLogo: true,
          brandKitId: defaultKit?.id || '',
          cta: ctaText,
          dateRange: dateRange || null,
          customHeadline: headline,
          customSupporting: supportingLine,
          stylePreset,
          objective: brandOnly ? 'BRAND_AWARENESS' : objective,
          creativePlan,
          qualityMode,
          instruction: visualScenePrompt.trim() || undefined,
          customText: visualScenePrompt.trim() || undefined,
          templateFamily,
          textDensity,
          sector: sector.trim() || undefined,
          deliveryInfo: deliveryInfo.trim() || undefined,
        }

        const form = new FormData()
        payloadDraft.requestKey = stableSubmissionId(payloadDraft, 'image')
        form.set('draft', JSON.stringify(payloadDraft))

        const res = await startCreativeGeneration(null, form)
        if (res?.error) {
          throw new Error(res.error)
        }
        if (res?.id) {
          submissionIdentityRef.current = null
          try { localStorage.removeItem(`${orgKey}.submission.image`) } catch { /* backend acceptance already confirmed */ }
          router.push(`/icerik/${res.id}`)
          return
        }
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : 'Görsel üretimi başlatılamadı.')
        setImagePending(false)
      } finally {
        submissionLockRef.current = false
        setIsSubmitting(false)
      }
    } else {
      // VIDEO PIPELINE
      if (brandOnly || !selectedProduct) {
        setSubmitError(BRAND_VIDEO_UNAVAILABLE)
        setIsSubmitting(false)
        submissionLockRef.current = false
        return
      }
      if (voWords === 0 || voWords > MAX_SPOKEN_WORDS) {
        setSubmitError(`Türkçe seslendirme metni 1–${MAX_SPOKEN_WORDS} kelime olmalıdır.`)
        setIsSubmitting(false)
        submissionLockRef.current = false
        return
      }

      try {
        const generationId = ''
        const videoAdFormat = mapPresetToLegacyVideoFormat(stylePreset)
        const fidelityContract = defaultFidelityContract(data.org.name || '', selectedProduct.name)
        const promptBlock = buildVeoVoiceoverPromptBlock(spokenVoiceover.trim())
        const sceneAtmosphere = visualScenePrompt.trim()
          ? `${environmentPreset || 'Doğal ticari aydınlatma ve temiz ürün arka planı'}. Özel sahne ve kompozisyon direktifi: ${visualScenePrompt.trim()}`
          : (environmentPreset || 'Doğal ticari aydınlatma ve temiz ürün arka planı')
        const fullVideoPrompt = [
          `[FORMAT]: 8.0-second vertical commercial video ad, 9:16 aspect ratio.`,
          `[SUBJECT]: Authentic photorealistic commercial for ${data.org.name || 'İşletme'} featuring ${selectedProduct.name}.`,
          `[CANONICAL HERO PRODUCT]: Preserve @HeroProduct geometry, material texture, and colors exactly as shown in authoritative reference assets.`,
          `[ENVIRONMENT]: ${sceneAtmosphere}.`,
          `[PHYSICAL CONSISTENCY & GEOMETRY LOCK]: Preserve exact product geometry, materials, and colors from canonical reference without warping or deformation.`,
          promptBlock,
          `[RAW DIFFUSION POLICY]: Clean commercial footage with zero floating text, zero synthetic overlays, zero burned-in titles.`,
        ].join('\n\n')

        const videoPayload = {
          generationId,
          generationRevision: 1,
          title: `${data.org.name || 'İşletme'} - ${selectedProduct.name} Reklam Filmi`,
          brief: headline || `${data.org.name} ${selectedProduct.name} reklamı`,
          adFormat: videoAdFormat,
          userStylePreference: videoAdFormat,
          environmentPreset,
          motionStyle,
          subtitles: subtitles ? 'auto' : 'off',
          outro: outro ? 'auto' : 'off',
          creativeEngineMode: VIDEO_ENGINE_MODE,
          requestedProvider: VIDEO_REQUESTED_PROVIDER,
          brandKitId: defaultKit?.id || '',
          campaignContext: {
            price, oldPrice, offer, dateRange, deliveryInfo, sector, headline, supportingLine,
            campaignDetail, objective, stylePreset, templateFamily, textDensity,
          },
          promotionType: 'existing_product',
          creativeIdea: headline || `${selectedProduct.name} Tanıtımı`,
          speechTimeline: [
            {
              start_sec: 0.5,
              end_sec: 5.25,
              exact_text: spokenVoiceover.trim(),
              speaker: 'Spiker',
              delivery_style: 'Doğal, akıcı kurumsal Türkçe seslendirme',
            },
          ],
          veoPrompt: fullVideoPrompt,
          authoritativeFacts: {
            brand_name: data.org.name || 'İşletmemiz',
            product_name: selectedProduct.name,
            product_id: selectedProduct.id,
            product_description: selectedProduct.description || undefined,
            offer: offer || undefined,
            offer_verified: Boolean(offer),
            price: price || undefined,
            old_price: oldPrice || undefined,
            campaign_date: dateRange || undefined,
            delivery: deliveryInfo || undefined,
            cta: ctaText || 'Detaylar için iletişime geçin',
            approved_spoken_line: spokenVoiceover.trim(),
            verified_claims: [selectedProduct.name],
            unverified_facts: [],
            product_fidelity_contract: fidelityContract,
            subtitles: subtitles ? 'auto' : 'off',
            outro: outro ? 'auto' : 'off',
          },
          logoAsset: {
            url: canonicalLogoUrl,
            name: 'brand_logo.png',
          },
          productAsset: {
            url: productImageUrl,
            name: selectedProduct.name,
            productId: selectedProduct.id,
          },
          referenceAssets: [],
        }

        videoPayload.generationId = stableSubmissionId(videoPayload, 'video')
        const res = await fetch('/api/ai-media/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(videoPayload),
        })

        const json = await res.json()
        if (!res.ok || json.error) {
          throw new Error(json.error || 'Video prodüksiyonu başlatılamadı.')
        }

        setActiveJobId(json.job_id)
        submissionIdentityRef.current = null
        try { localStorage.removeItem(`${orgKey}.submission.video`) } catch { /* backend acceptance already confirmed */ }
        setJobState('PENDING')
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set('job_id', json.job_id)
          window.history.pushState({}, '', url.toString())
        }
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : 'Video başlatılamadı.')
      } finally {
        submissionLockRef.current = false
        setIsSubmitting(false)
      }
    }
  }

  return (
    <Card className="wb-wa-wizard creative-studio-wizard overflow-visible">
      {draftRestoreWarning ? <Notice tone="warn">{draftRestoreWarning}</Notice> : null}
      {/* 1. Realtime Production Waiting View (Authoritative ProductionProgress V2) */}
      {jobState !== 'IDLE' && jobState !== 'COMPLETED' && jobState !== 'FAILED' && jobState !== 'NEEDS_REVIEW' ? (
        <div className="p-4 sm:p-6">
          <ProductionProgress
            viewModel={activeViewModel}
            kind="video"
            onNavigateLibrary={() => {}}
          />
        </div>
      ) : null}

      {/* 2. Terminal Failure or Review States (Never blank white screen!) */}
      {jobState === 'FAILED' || jobState === 'NEEDS_REVIEW' ? (
        <div className="mx-auto max-w-xl space-y-4 p-6">
          <div
            className={`rounded-xl border p-4 ${
              jobState === 'FAILED' ? 'border-rose-200 bg-rose-50' : 'border-amber-300 bg-amber-50'
            }`}
          >
            <p className={`text-[13.5px] font-bold ${jobState === 'FAILED' ? 'text-rose-800' : 'text-amber-900'}`}>
              {jobState === 'FAILED' ? 'Video Hazırlanamadı' : 'Video Kullanıma Hazır Değil'}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#667781]">
              {jobState === 'FAILED'
                ? videoFailureUserMessage(jobFailureMessage)
                : 'Videoda bir sorun tespit edildi veya dosya doğrulaması tamamlanamadı. Yeniden oluşturmayı deneyin.'}
            </p>
          </div>

          {/* Show the video preview even in NEEDS_REVIEW if playback URL exists */}
          {jobState === 'NEEDS_REVIEW' && completedVideoUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-amber-300 bg-black shadow-lg aspect-[9/16] max-h-[480px] mx-auto flex items-center justify-center">
              <video
                src={completedVideoUrl}
                controls
                playsInline
                className="h-full w-full object-contain"
              />
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              type="button"
              className="!bg-[#008069] hover:!bg-[#00a884] text-white text-[13px] font-semibold h-10 px-5 rounded-full shadow-sm"
              onClick={handleResetToNew}
            >
              Yeni Video Oluştur / Tekrar Dene
            </Button>
            <Link
              href="/icerik"
              className="inline-flex items-center justify-center rounded-full border border-hairline bg-white px-5 py-2 text-[13px] font-medium text-[#111b21] hover:bg-[#f0f2f5] transition-colors"
            >
              İçerik Kütüphanesine Git
            </Link>
          </div>
        </div>
      ) : null}

      {/* 3. Video Completed Player View */}
      {jobState === 'COMPLETED' ? (
        <div className="p-6 space-y-5 text-center max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-[#008069]">
            <span className="flex size-8 items-center justify-center rounded-full bg-[#e7f8f2] text-[#008069] font-bold text-[16px]">
              {completedVideoUrl ? '✓' : '…'}
            </span>
            <h3 className="text-[18px] font-bold text-[#111b21]">{completedVideoUrl ? 'Videonuz Yayına Hazır!' : 'Videonuzun Önizlemesi Hazırlanıyor'}</h3>
          </div>
          {completedVideoUrl ? (
            <div className="relative overflow-hidden rounded-xl border border-hairline bg-black shadow-lg aspect-[9/16] max-h-[500px] mx-auto flex items-center justify-center">
              <video src={completedVideoUrl} controls autoPlay loop playsInline className="h-full w-full object-contain" />
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-[#b7e4d5] bg-[#f1fbf7] p-8 text-center space-y-2">
              <div className="inline-flex size-3.5 rounded-full bg-[#008069] animate-ping" />
              <p className="text-[13px] font-semibold text-[#006b58]">Videonuz işlendi, önizleme hazırlanıyor...</p>
              <p className="text-[11.5px] text-[#667781]">Medya dosyası optimize ediliyor, birkaç saniye içinde açılacaktır.</p>
            </div>
          )}
          <div className="flex flex-col gap-2 pt-2">
            <Link
              href="/icerik"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#008069] px-6 py-2.5 text-[13.5px] font-semibold text-white hover:bg-[#00a884]"
            >
              Kütüphanede İzle
            </Link>
            <button
              type="button"
              onClick={handleResetToNew}
              className="text-[12.5px] font-medium text-[#667781] hover:text-[#111b21]"
            >
              Yeni Bir İçerik Oluştur
            </button>
          </div>
        </div>
      ) : null}

      {/* Main Studio 3-Step Wizard View */}
      {jobState === 'IDLE' && (
        <div className="flex flex-col">
          {/* Stepper Header */}
          <div className="wb-wa-wizard-steps">
            <Stepper
              label="Kreatif Stüdyo Adımları"
              steps={STUDIO_STEPS}
              current={step}
              onJump={(id) => {
                if (id === 'creative_direction' && step === 'product_goal') {
                  handleGoToStep2()
                  return
                }
                setStep(id as Step)
              }}
              className="wb-wa-steps"
            />
          </div>

          <div className="space-y-5 px-4 py-4 sm:px-6">
            {submitError && <Notice tone="danger">{submitError}</Notice>}

            {/* Organization & Canonical Identity Strip */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#b7e4d5] bg-[#f1fbf7] p-3 text-[12px]">
              <div className="flex items-center gap-2.5">
                {canonicalLogoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={canonicalLogoUrl}
                    alt="Kurumsal Logo"
                    className="size-8 rounded-md border border-emerald-200 bg-white object-contain p-0.5"
                  />
                ) : (
                  <span className="flex size-8 items-center justify-center rounded-md bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Logo Yok
                  </span>
                )}
                <div>
                  <p className="font-bold text-[#006b58]">{data.org.name || 'İşletmemiz'}</p>
                  <p className="text-[#667781] text-[11px]">
                    {hasLogo
                      ? 'Kurumsal logonuz ve marka kimliğiniz otomatik bağlanır'
                      : 'Lütfen Ayarlar > Marka Kiti sayfasından logonuzu ekleyin'}
                  </p>
                </div>
              </div>

              {mediaType === 'VIDEO' ? (
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${quotaAvailable ? 'bg-white text-[#008069]' : 'bg-white text-rose-700'}`}>
                  Bu ay {quotaUsed}/{quotaLimit} video hakkı ({Math.max(0, quotaLimit - quotaUsed)} kaldı)
                </span>
              ) : (
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-[#008069]">
                  Sınırsız Görsel Üretimi
                </span>
              )}
            </div>

            {/* STEP 1: PRODUCT & GOAL */}
            {step === 'product_goal' && (
              <div className="space-y-4">
                {/* Tanıtım Biçimi Segmented Control */}
                <fieldset className="rounded-xl border border-hairline bg-surface p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <legend className="text-[13px] font-bold text-[#111b21]">Tanıtım Biçimi</legend>
                    <span className="text-[11px] text-[#667781]">{brandOnly ? 'Yalnızca Logo & Marka' : 'Katalog Ürün/Hizmeti'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {([{id:'offering',label:'Ürün / Hizmet Tanıtımı',detail:'Katalogdaki ürününüzü veya hizmetinizi öne çıkarın.'},
                      {id:'brand',label:'Marka Tanıtımı',detail:'Yalnızca logonuz ve işletme bilgilerinizle tanıtım yapın.'}] as const).map(mode => (
                      <button type="button" key={mode.id} aria-pressed={promotionMode === mode.id}
                        className={`rounded-lg border py-2 px-3 text-left transition-all min-h-[44px] flex flex-col justify-center ${promotionMode === mode.id ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-bold ring-1 ring-[#008069]' : 'border-[#e9edef] bg-white text-[#111b21] hover:border-[#008069]/40'}`}
                        onClick={() => {
                          if (mode.id === promotionMode) return
                          resetProductCopy()
                          setPromotionMode(mode.id)
                          setHeroProductId(mode.id === 'brand' ? '' : productsList[0]?.id || '')
                          setObjective(mode.id === 'brand' ? 'BRAND_AWARENESS' : 'PRODUCT_INTRO')
                          setPrice(''); setOldPrice(''); setOffer('')
                        }}>
                        <span className="block text-[12.5px] font-bold">{mode.label}</span>
                        <span className="text-[10px] text-[#667781] truncate mt-0.5">{mode.detail}</span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {brandOnly && mediaType === 'VIDEO' ? <Notice tone="warn">{BRAND_VIDEO_UNAVAILABLE}</Notice> : null}

                {/* 1. Medya Türü & Boyut / Format (Kompakt 2 sütunlu grid) */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* Medya Türü */}
                  <div className="rounded-xl border border-hairline bg-surface p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#111b21]">1. Medya Türü</span>
                      <span className="text-[11px] text-[#667781]">{mediaType === 'IMAGE' ? 'Görsel Tasarım' : '9:16 Video'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMediaType('IMAGE')}
                        className={`flex items-center justify-center gap-2 rounded-lg border py-2 px-3 transition-all min-h-[44px] ${
                          mediaType === 'IMAGE'
                            ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-bold ring-1 ring-[#008069]'
                            : 'border-[#e9edef] bg-white text-[#111b21] hover:border-[#008069]/40'
                        }`}
                      >
                        <Icon name="image" className="size-4 shrink-0 text-[#008069]" />
                        <span className="text-[13px]">Görsel Reklam</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMediaType('VIDEO')}
                        className={`flex items-center justify-center gap-2 rounded-lg border py-2 px-3 transition-all min-h-[44px] ${
                          mediaType === 'VIDEO'
                            ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-bold ring-1 ring-[#008069]'
                            : 'border-[#e9edef] bg-white text-[#111b21] hover:border-[#008069]/40'
                        }`}
                      >
                        <Icon name="video" className="size-4 shrink-0 text-[#008069]" />
                        <span className="text-[13px]">Video Reklam</span>
                      </button>
                    </div>
                  </div>

                  {/* Format Seçimi (Görsel için) veya Video Bilgisi */}
                  <div className="rounded-xl border border-hairline bg-surface p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-bold text-[#111b21]">2. Boyut / Format</span>
                      <span className="text-[11px] text-[#667781]">{mediaType === 'IMAGE' ? 'En-boy oranı' : 'Sinematik Reels'}</span>
                    </div>
                    {mediaType === 'IMAGE' ? (
                      <div className="grid grid-cols-3 gap-1.5">
                        {IMAGE_FORMATS_V2.map((fmt) => (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => setImageFormat(fmt.id)}
                            className={`rounded-lg border px-2 py-2 text-center transition-all min-h-[44px] flex flex-col items-center justify-center ${
                              imageFormat === fmt.id
                                ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-bold ring-1 ring-[#008069]'
                                : 'border-[#e9edef] bg-white text-[#111b21] hover:border-[#008069]/30'
                            }`}
                          >
                            <span className="text-[12px] font-bold leading-tight">{fmt.label}</span>
                            <span className="text-[10px] text-[#667781] leading-tight mt-0.5">{fmt.hint.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[12px] text-[#667781] min-h-[44px]">
                        <span className="font-bold text-[#008069]">9:16 Dikey:</span>
                        <span>Reels, Hikâye & Durum için Türkçe seslendirmeli video</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Hero Ürün Seçimi */}
                {!brandOnly ? (
                  <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-bold text-[#111b21]">Tür:</span>
                        <select
                          aria-label="Tanıtılan ürün veya hizmet türü"
                          value={offeringKind}
                          onChange={event => setOfferingKind(parseOfferingKind(event.target.value))}
                          className="rounded-lg border border-hairline bg-white px-2.5 py-1 text-[12px] text-[#111b21] h-8"
                        >
                          <option value="physical">Fiziksel ürün</option>
                          <option value="software">Yazılım veya uygulama</option>
                          <option value="service">Hizmet veya işletme alanı</option>
                        </select>
                      </div>
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-7 text-[11.5px] font-semibold text-[#008069] hover:bg-[#e7f8f2] px-2.5 self-end sm:self-auto"
                        onClick={() => setAddProductOpen(true)}
                      >
                        + Yeni Ürün / Hizmet Ekle
                      </Button>
                    </div>

                    {productsList.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-[#d1d7db] p-5 text-center">
                        <p className="text-[12.5px] text-[#667781]">Henüz kayıtlı ürün veya hizmetiniz yok.</p>
                        <Button
                          type="button"
                          className="mt-2.5 !bg-[#008069] text-white text-[12px] h-8"
                          onClick={() => setAddProductOpen(true)}
                        >
                          + İlk Ürün / Hizmetinizi Ekleyin
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {productsList.map((p) => {
                          const isSelected = heroProductId === p.id
                          const img = getSafeMediaUrl(p.images?.[0]?.url || '')
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                if (p.id !== heroProductId) resetProductCopy()
                                setHeroProductId(p.id)
                              }}
                              className={`group relative flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                                isSelected
                                  ? 'border-[#008069] bg-[#e7f8f2]/60 ring-2 ring-[#008069] shadow-xs'
                                  : 'border-[#e9edef] hover:border-[#008069]/40 bg-white'
                              }`}
                            >
                              <div className="relative h-24 w-full bg-slate-50 overflow-hidden">
                                {img ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={img} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-[10.5px] text-gray-400">
                                    Görsel Yok
                                  </div>
                                )}
                                {isSelected && (
                                  <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-full bg-[#008069] text-white text-[11px] font-bold shadow-xs">
                                    ✓
                                  </span>
                                )}
                              </div>
                              <div className="p-2">
                                <p className="text-[12px] font-bold text-[#111b21] truncate">{p.name}</p>
                                <p className="text-[10.5px] text-[#667781] truncate">{p.description || 'Katalog ürünü'}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-hairline bg-surface p-3 text-[12px] text-[#667781]">
                    <span className="font-bold text-[#006b58]">Marka Tanıtımı Seçildi:</span> Ürün kataloğu kullanılmaz. Kurumsal logonuz ve işletme bilgileriniz bağlanır.
                  </div>
                )}

                {/* 4. Kampanya Amacı */}
                <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[13px] font-bold text-[#111b21]">4. Kampanya Amacı</h2>
                    <span className="text-[11px] text-[#667781]">Metin ve teklif odağı</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CAMPAIGN_OBJECTIVES.filter(obj => !brandOnly || obj.id === 'BRAND_AWARENESS').map((obj) => (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => setObjective(obj.id)}
                        className={`rounded-lg border p-2.5 text-left transition-all min-h-[44px] flex flex-col justify-center ${
                          objective === obj.id
                            ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-bold ring-1 ring-[#008069]'
                            : 'border-[#e9edef] hover:border-[#008069]/30 bg-white'
                        }`}
                      >
                        <span className="text-[12px] font-bold text-[#111b21]">{obj.label}</span>
                        <span className="text-[10px] text-[#667781] truncate mt-0.5">{obj.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Varsa Özel Kampanya Notu */}
                <div className="rounded-xl border border-hairline bg-surface p-3 space-y-1.5">
                  <label htmlFor="campaign-detail-input" className="text-[12.5px] font-bold text-[#111b21] block">
                    5. Kampanya Notu <span className="text-[#667781] font-normal text-[11px]">(İsteğe Bağlı)</span>
                  </label>
                  <Input
                    id="campaign-detail-input"
                    value={campaignDetail}
                    onChange={(e) => setCampaignDetail(e.target.value)}
                    placeholder="Örn: 5.000 adet ve üzeri siparişlerde şantiyeye teslim veya sınırlı stok indirimi."
                    className="text-[12.5px] h-9"
                  />
                </div>

                {/* Footer Nav */}
                <div className="flex flex-col gap-2 pt-2 border-t border-hairline sm:flex-row sm:items-center sm:justify-between">
                  {!allAssetsReady ? (
                    <p className="text-[11.5px] font-medium text-amber-700 bg-amber-50 rounded-lg p-2 border border-amber-200">
                      {brandOnly ? (mediaType === 'VIDEO' ? BRAND_VIDEO_UNAVAILABLE : 'Marka tanıtımı için işletme logosunu ekleyin.') : !hasLogo && !hasProduct
                        ? 'Devam etmek için önce işletme logonuzu ve en az bir ürününüzü ekleyin.'
                        : !hasLogo
                          ? 'Devam etmek için Ayarlar > Marka Kiti sayfasından işletme logonuzu ekleyin.'
                          : 'Devam etmek için en az bir katalog ürünü seçin veya yeni ürün ekleyin.'}
                    </p>
                  ) : <div />}
                  <Button
                    type="button"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-10 px-6 shadow-sm min-h-[44px] shrink-0"
                    disabled={!allAssetsReady}
                    onClick={handleGoToStep2}
                  >
                    Devam Et (Görsel ve Metin) →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: CREATIVE DIRECTION */}
            {step === 'creative_direction' && (
              <div className="space-y-4">
                {/* 1. Görsel Tarzı */}
                <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[13px] font-bold text-[#111b21]">1. Görsel Tarzı</h2>
                    <span className="text-[11px] text-[#667781]">Kompozisyon ve tasarım yaklaşımı</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {CREATIVE_STYLE_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => {
                          setStylePreset(preset.id)
                          void requestCreativePlan(false, preset.id)
                        }}
                        className={`rounded-lg border p-2.5 text-left transition-all min-h-[44px] flex flex-col justify-center ${
                          stylePreset === preset.id
                            ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
                            : 'border-[#e9edef] hover:border-[#008069]/30 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[12px] font-bold text-[#111b21]">{preset.label}</span>
                          {preset.tag && (
                            <span className="rounded bg-[#008069] px-1.5 py-0.2 text-[9px] font-bold text-white">
                              {preset.tag}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[#667781] mt-0.5 line-clamp-1">{brandOnly ? 'Logonuz ve kayıtlı marka bilgilerinizle bu görsel dili kullanın.' : preset.description}</p>
                      </button>
                    ))}
                  </div>

                  {mediaType === 'IMAGE' && (
                    <div className="flex items-center justify-between pt-2 border-t border-hairline/60">
                      <span className="text-[11.5px] font-semibold text-[#111b21]">Yazı Yoğunluğu:</span>
                      <div className="inline-flex rounded-lg border border-[#e9edef] p-0.5 bg-white">
                        {[
                          { id: 'low', label: 'Sade' },
                          { id: 'balanced', label: 'Dengeli' },
                          { id: 'detailed', label: 'Detaylı' },
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setTextDensity(d.id as any)}
                            className={`rounded-md px-2.5 py-1 text-[11px] transition-all min-h-[32px] ${
                              textDensity === d.id
                                ? 'bg-[#008069] text-white font-bold'
                                : 'text-[#667781] hover:text-[#111b21]'
                            }`}
                          >
                            {d.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Düzenlenebilir AI Tasarım Fikri / Sahne Tarifi (ASLA GİZLENMEYEN) */}
                <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[13px] font-bold text-[#111b21] flex items-center gap-1.5">
                        <Icon name="sparkles" className="size-3.5 text-[#008069]" />
                        <span>AI Tasarım Fikri & Sahne Tarifi</span>
                      </span>
                      <p className="text-[11px] text-[#667781]">
                        AI&apos;ın reklam kompozisyonunu yönlendirir. İsterseniz sahneyi, atmosferi veya arka planı düzenleyin.
                      </p>
                    </div>
                    {visualScenePrompt.trim() && (
                      <span className="rounded bg-[#e7f8f2] text-[#008069] px-2 py-0.5 text-[10px] font-bold shrink-0">
                        Özel Fikir Aktif
                      </span>
                    )}
                  </div>
                  <Textarea
                    rows={2}
                    value={visualScenePrompt}
                    onChange={(e) => {
                      copyEditsRef.current.scene += 1
                      copyDirtyRef.current.scene = true
                      setVisualScenePrompt(e.target.value)
                      setScenePromptDirty(true)
                    }}
                    placeholder="Örn: Zeytinlikte gün batımı ışığında ahşap zemin üzerinde ürün vitrini veya modern şantiyede paletli tuğla dizilimi."
                    className="text-[12.5px] leading-relaxed"
                  />
                </div>

                {/* 3. Reklam Metinleri (Kompakt Grid & Doğrudan Düzenlenebilir) */}
                <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-[#111b21]">
                        {mediaType === 'VIDEO' ? 'Türkçe Seslendirme Metni' : '3. Reklam Metinleri'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {isPlanning ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#008069]">
                            <span className="size-1.5 rounded-full bg-[#008069] animate-pulse" />
                            Metin ve sahne fikri hazırlanıyor…
                          </span>
                        ) : copySource === 'AI' ? (
                          <span className="text-[11px] font-semibold text-[#008069]">
                            ✓ AI önerisi hazır
                          </span>
                        ) : copySource === 'USER_EDITED' ? (
                          <span className="text-[11px] text-[#667781] font-medium">
                            Kendi metniniz geçerli
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-medium">
                            Otomatik taslak hazır
                          </span>
                        )}
                        {!isPlanning && planError === 'AI_TIMEOUT' && copySource !== 'AI' && (
                          <span className="text-[11px] text-amber-700 font-medium">
                            (AI zaman aşımı)
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="quiet"
                      className="h-7 text-[11.5px] font-semibold text-[#008069] border border-[#008069]/30 hover:bg-[#e7f8f2] px-2.5 min-h-[36px]"
                      disabled={isPlanning}
                      onClick={() => void requestCreativePlan(true)}
                    >
                      {isPlanning ? 'Hazırlanıyor…' : '↻ Başka Fikir Öner'}
                    </Button>
                  </div>

                  {planError && planError !== 'AI_TIMEOUT' && (
                    <Notice tone="warn">
                      Özel AI önerisi şu an oluşturulamadı, standart taslak ile devam edebilirsiniz.
                    </Notice>
                  )}

                  {mediaType === 'VIDEO' ? (
                    <div className="space-y-1.5">
                      <Textarea
                        rows={2}
                        value={spokenVoiceover}
                        onChange={(e) => {
                          copyEditsRef.current.voiceover += 1
                          copyDirtyRef.current.voiceover = true
                          setSpokenVoiceover(e.target.value)
                          setVoiceoverDirty(true)
                        }}
                        className="text-[13px] font-medium leading-relaxed"
                        placeholder="Türkçe seslendirme metni..."
                      />
                      <div className="flex justify-between items-center text-[11px]">
                        <span className={voWords === 0 || voWords > MAX_SPOKEN_WORDS ? 'text-rose-700 font-semibold' : 'text-[#667781]'}>
                          Uzunluk: <strong>{voWords} kelime</strong> (En fazla {MAX_SPOKEN_WORDS})
                        </span>
                        <span className="text-[#008069] font-medium">0.5–5.5 sn seslendirilir</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2.5 sm:grid-cols-12">
                      <div className="sm:col-span-5">
                        <Field label="Ana Başlık">
                          <Input
                            value={headline}
                            onChange={(e) => {
                              copyEditsRef.current.headline += 1
                              copyDirtyRef.current.headline = true
                              setHeadline(e.target.value)
                              setHeadlineDirty(true)
                              setCopySource('USER_EDITED')
                            }}
                            placeholder="Örn: Ayvazoğlu Tuğla ile Sağlam Yapılar"
                            className="text-[12.5px] h-9"
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-4">
                        <Field label="Kısa Açıklama">
                          <Input
                            value={supportingLine}
                            onChange={(e) => {
                              copyEditsRef.current.supporting += 1
                              copyDirtyRef.current.supporting = true
                              setSupportingLine(e.target.value)
                              setSupportingLineDirty(true)
                              setCopySource('USER_EDITED')
                            }}
                            placeholder="Örn: Şantiyenize doğrudan toptan teslimat"
                            className="text-[12.5px] h-9"
                          />
                        </Field>
                      </div>
                      <div className="sm:col-span-3">
                        <Field label="Buton Yazısı">
                          <Input
                            value={ctaText}
                            onChange={(e) => {
                              copyEditsRef.current.cta += 1
                              copyDirtyRef.current.cta = true
                              setCtaText(e.target.value)
                              setCtaDirty(true)
                              setCopySource('USER_EDITED')
                            }}
                            placeholder="Hemen İnceleyin"
                            className="text-[12.5px] h-9"
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>

                {/* 4. Fiyat & Kampanya Teklifi (AKILLI AÇILIR/KAPANIR) */}
                {mediaType === 'IMAGE' && !brandOnly && (
                  <div className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-2xs">
                    <button
                      type="button"
                      onClick={() => setIsPriceOpen(!isPriceOpen)}
                      className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 transition-colors min-h-[44px]"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[13px] font-bold text-[#111b21]">4. Fiyat & Kampanya Teklifi</span>
                        {(objective === 'SALES_OFFER' || objective === 'CAMPAIGN') ? (
                          <span className="rounded bg-[#e7f8f2] text-[#008069] px-2 py-0.5 text-[10px] font-bold">
                            Fiyat veya teklif zorunlu
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#667781]">(İsteğe Bağlı)</span>
                        )}
                        {!isPriceOpen && (price || oldPrice || offer) && (
                          <span className="rounded bg-slate-100 text-[#111b21] px-2 py-0.5 text-[11px] font-medium">
                            {[price, oldPrice && `(${oldPrice})`, offer].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#008069]">
                        <span>{isPriceOpen ? 'Daralt' : 'Düzenle'}</span>
                        <span className="text-[11px]">{isPriceOpen ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {isPriceOpen && (
                      <div className="p-3.5 pt-0 border-t border-hairline/60 space-y-2.5">
                        <div className="grid gap-2 sm:grid-cols-3 pt-2.5">
                          <Field label="Kampanya Fiyatı">
                            <Input
                              value={price}
                              onChange={(e) => setPrice(e.target.value)}
                              placeholder="Örn: 249 TL veya 450 TL/m²"
                              className="text-[12.5px] h-9"
                            />
                          </Field>
                          <Field label="Eski Fiyat (Üstü Çizili)">
                            <Input
                              value={oldPrice}
                              onChange={(e) => setOldPrice(e.target.value)}
                              placeholder="Örn: 320 TL veya 550 TL/m²"
                              className="text-[12.5px] h-9"
                            />
                          </Field>
                          <Field label="İndirim / Özel Teklif">
                            <Input
                              value={offer}
                              onChange={(e) => setOffer(e.target.value)}
                              placeholder="Örn: %20 İndirim veya 5 Palet Üstü"
                              className="text-[12.5px] h-9"
                            />
                          </Field>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Gelişmiş Ayarlar (Diğer Ayarlar - Akıllı Açılır/Kapanır) */}
                <div className="rounded-xl border border-hairline bg-surface overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    className="w-full flex items-center justify-between p-3.5 text-left hover:bg-slate-50 transition-colors min-h-[44px]"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-[#111b21]">5. Diğer Ayarlar</span>
                      <span className="text-[11px] text-[#667781]">(Teslimat, Sektör, Kampanya Tarihi)</span>
                      {!isAdvancedOpen && (deliveryInfo || sector || dateRange) && (
                        <span className="rounded bg-slate-100 text-[#111b21] px-2 py-0.5 text-[11px] font-medium">
                          {[deliveryInfo, sector, dateRange].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#008069]">
                      <span>{isAdvancedOpen ? 'Daralt' : 'Göster'}</span>
                      <span className="text-[11px]">{isAdvancedOpen ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {isAdvancedOpen && (
                    <div className="p-3.5 pt-0 border-t border-hairline/60 space-y-3">
                      <div className="grid gap-2 sm:grid-cols-3 pt-2.5">
                        <Field label="Teslimat / Fayda Bilgisi">
                          <Input
                            value={deliveryInfo}
                            onChange={(e) => setDeliveryInfo(e.target.value)}
                            placeholder="Örn: Şantiyeye teslim veya aynı gün kargo"
                            className="text-[12.5px] h-9"
                          />
                        </Field>
                        <Field label="Sektör">
                          <Input
                            value={sector}
                            onChange={(e) => setSector(e.target.value)}
                            placeholder="Örn: İnşaat, Tarım, Gıda"
                            className="text-[12.5px] h-9"
                          />
                        </Field>
                        <Field label="Kampanya Tarihi">
                          <Input
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            placeholder="Örn: 10–20 Ekim 2026"
                            className="text-[12.5px] h-9"
                          />
                        </Field>
                      </div>

                      {mediaType === 'VIDEO' && (
                        <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-hairline/60">
                          <Field label="Çekim Ortamı">
                            <select
                              value={environmentPreset}
                              onChange={(e) => setEnvironmentPreset(e.target.value)}
                              className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[12px] text-[#111b21] h-9"
                            >
                              <option value="auto">Otomatik (En uygun ortam)</option>
                              <option value="construction">İnşaat ve Yapı Sahası</option>
                              <option value="workshop">Atölye, Fabrika ve Sanayi</option>
                              <option value="garden">Doğal Açık Alan & Bahçe</option>
                              <option value="studio">Prestijli Reklam Stüdyosu</option>
                              <option value="kitchen">Mutfak, Gıda ve Kafe</option>
                              <option value="office">Modern Ofis ve İç Mekan</option>
                            </select>
                          </Field>
                          <Field label="Kamera Hareketi">
                            <select
                              value={motionStyle}
                              onChange={(e) => setMotionStyle(e.target.value)}
                              className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[12px] text-[#111b21] h-9"
                            >
                              <option value="real_usage">Doğal Kullanım ve Sahne Hareketi</option>
                              <option value="studio_orbit">Vitrin & 3/4 Açı (Şık ve Dengeli)</option>
                              <option value="macro_detail">Yakın Çekim & Detay Odaklı</option>
                            </select>
                          </Field>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer Nav */}
                <div className="flex items-center justify-between pt-2 border-t border-hairline">
                  <Button type="button" variant="quiet" onClick={() => setStep('product_goal')} className="min-h-[44px]">
                    ← Geri (Ürün & Format)
                  </Button>
                  <Button
                    type="button"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-10 px-6 shadow-sm min-h-[44px]"
                    disabled={mediaType === 'VIDEO' && (voWords === 0 || voWords > MAX_SPOKEN_WORDS)}
                    onClick={() => setStep('review_generate')}
                  >
                    Son Kontrol →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & GENERATE (KOMPAKT VE HIZLI DÜZENLENEBİLİR SON KONTROL) */}
            {step === 'review_generate' && (
              <div className="space-y-4">
                {/* Summary Card */}
                <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#667781]">Reklam Özeti</span>
                    <span className="rounded-full bg-[#e7f8f2] px-2.5 py-0.5 text-[11px] font-bold text-[#008069]">
                      {mediaType === 'VIDEO' ? '9:16 Sinematik Video' : ({ SQUARE_1_1: 'Kare Görsel · 1:1', STORY_9_16: 'Hikâye · 9:16', PORTRAIT_4_5: 'Gönderi · 4:5' }[imageFormat] || 'Kampanya Görseli')}
                    </span>
                  </div>

                  {/* Ürün & Stil Bilgi Satırı */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-[12px]">
                    <div className="rounded-lg border border-[#e9edef] bg-white p-2.5">
                      <span className="text-[#667781] block text-[11px]">İşletme / Marka</span>
                      <p className="font-bold text-[#111b21] truncate">{data.org.name}</p>
                    </div>
                    <div className="rounded-lg border border-[#e9edef] bg-white p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#667781] block text-[11px]">Tanıtım</span>
                        <button type="button" onClick={() => setStep('product_goal')} className="text-[10.5px] text-[#008069] font-bold hover:underline">
                          Değiştir
                        </button>
                      </div>
                      <p className="font-bold text-[#111b21] truncate">{brandOnly ? 'Marka Tanıtımı' : selectedProduct?.name}</p>
                    </div>
                    <div className="rounded-lg border border-[#e9edef] bg-white p-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[#667781] block text-[11px]">Görsel Stili</span>
                        <button type="button" onClick={() => setStep('creative_direction')} className="text-[10.5px] text-[#008069] font-bold hover:underline">
                          Değiştir
                        </button>
                      </div>
                      <p className="font-bold text-[#008069] truncate">
                        {CREATIVE_STYLE_PRESETS.find((p) => p.id === stylePreset)?.label}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[#e9edef] bg-white p-2.5">
                      <span className="text-[#667781] block text-[11px]">Marka Koruması</span>
                      <p className="font-bold text-[#008069] truncate">{brandOnly ? '✓ Logo & Bilgiler Bağlı' : '✓ Logo & Ürün Bağlı'}</p>
                    </div>
                  </div>

                  {/* AI Tasarım Fikri (Varsa) */}
                  {visualScenePrompt.trim() && (
                    <div className="rounded-lg border border-[#b7e4d5] bg-[#f1fbf7] p-2.5 text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-[#006b58] uppercase">AI Tasarım Fikri & Sahne</span>
                        <button type="button" onClick={() => setStep('creative_direction')} className="text-[10.5px] text-[#008069] font-bold hover:underline">
                          Düzenle
                        </button>
                      </div>
                      <p className="text-[#111b21] font-medium mt-0.5 line-clamp-2">{visualScenePrompt.trim()}</p>
                    </div>
                  )}

                  {/* Onaylanan Reklam Metni */}
                  <div className="rounded-lg border border-[#e9edef] bg-white p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#667781]">
                        {mediaType === 'VIDEO' ? 'Türkçe Seslendirme Metni:' : 'Görsel Üstü Başlık ve Çağrı:'}
                      </span>
                      <button type="button" onClick={() => setStep('creative_direction')} className="text-[10.5px] text-[#008069] font-bold hover:underline">
                        Düzenle
                      </button>
                    </div>
                    <p className="text-[13px] font-bold text-[#111b21]">
                      {mediaType === 'VIDEO' ? `“${spokenVoiceover}”` : `${headline || 'Başlık'} — ${supportingLine || 'Açıklama'}`}
                    </p>
                    {mediaType === 'IMAGE' && ctaText && (
                      <span className="inline-block rounded bg-[#e7f8f2] text-[#008069] px-2 py-0.5 text-[11px] font-bold mt-1">
                        Buton: {ctaText}
                      </span>
                    )}
                  </div>

                  {/* Varsa Fiyat & Kampanya Detayları */}
                  {(price || oldPrice || offer || dateRange || deliveryInfo) && (
                    <dl className="grid gap-2 rounded-lg border border-[#e9edef] bg-white p-3 text-[12px] sm:grid-cols-3">
                      {price && <div><dt className="text-[11px] text-[#667781]">Fiyat</dt><dd className="font-bold text-[#111b21]">{/(\d+)/.test(price) && !/(tl|₺|\$|€)/i.test(price) ? `${price} TL` : price}</dd></div>}
                      {oldPrice && <div><dt className="text-[11px] text-[#667781]">Eski Fiyat</dt><dd className="line-through text-[#667781]">{/(\d+)/.test(oldPrice) && !/(tl|₺|\$|€)/i.test(oldPrice) ? `${oldPrice} TL` : oldPrice}</dd></div>}
                      {offer && <div><dt className="text-[11px] text-[#667781]">Teklif / İndirim</dt><dd className="font-bold text-[#008069]">{offer}</dd></div>}
                      {dateRange && <div><dt className="text-[11px] text-[#667781]">Kampanya Tarihi</dt><dd>{dateRange}</dd></div>}
                      {deliveryInfo && <div><dt className="text-[11px] text-[#667781]">Teslimat</dt><dd>{deliveryInfo}</dd></div>}
                    </dl>
                  )}
                </div>

                {!allAssetsReady && (
                  <Notice tone="danger">
                    {brandOnly ? (mediaType === 'VIDEO' ? BRAND_VIDEO_UNAVAILABLE : 'Marka tanıtımı için işletme logosu hazır olmalıdır.') : 'İşletme logosu ve gerçek ürün, arayüz veya hizmet görseli hazır olmalıdır.'}
                  </Notice>
                )}

                {/* Footer Nav & Submit Button */}
                <div className="flex items-center justify-between pt-2 border-t border-hairline">
                  <Button type="button" variant="quiet" onClick={() => setStep('creative_direction')} className="min-h-[44px]">
                    ← Geri (Görsel ve Metin)
                  </Button>
                  <Button
                    type="button"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-10 px-8 shadow-sm min-h-[44px]"
                    disabled={isSubmitting || imagePending || !allAssetsReady || (mediaType === 'VIDEO' && (voWords === 0 || voWords > MAX_SPOKEN_WORDS))}
                    onClick={handleCreateCreative}
                  >
                    {isSubmitting || imagePending ? 'Üretim Başlatılıyor…' : mediaType === 'VIDEO' ? 'Reklam Videomu Oluştur' : 'Reklam Görselimi Oluştur'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <AddProductModal
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onSuccess={(product: ProductCard) => {
          resetProductCopy()
          setProductsList((prev) => [...prev, product])
          setHeroProductId(product.id)
          setAddProductOpen(false)
        }}
      />
    </Card>
  )
}
