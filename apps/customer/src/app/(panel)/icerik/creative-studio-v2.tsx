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
export const AI_PLANNER_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_AI_PLANNER_TIMEOUT_MS) || 35000
export const VIDEO_PLANNER_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_VIDEO_PLANNER_TIMEOUT_MS) || 35000

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

  // Copy source tracking
  const [copySource, setCopySource] = useState<'AI' | 'DETERMINISTIC_FALLBACK' | 'USER_EDITED'>('DETERMINISTIC_FALLBACK')

  // Independent dirty tracking to prevent late AI responses from overwriting user edits
  const [headlineDirty, setHeadlineDirty] = useState(false)
  const [supportingLineDirty, setSupportingLineDirty] = useState(false)
  const [ctaDirty, setCtaDirty] = useState(false)
  const [voiceoverDirty, setVoiceoverDirty] = useState(false)

  // Active AbortController ref to cancel obsolete in-flight requests (e.g. style change)
  const activePlanControllerRef = useRef<AbortController | null>(null)
  const copyEditsRef = useRef({ headline: 0, supporting: 0, cta: 0, voiceover: 0 })
  const copyDirtyRef = useRef({ headline: false, supporting: false, cta: false, voiceover: false })

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
    setHeadlineDirty(false)
    setSupportingLineDirty(false)
    setCtaDirty(false)
    setVoiceoverDirty(false)
    copyDirtyRef.current = { headline: false, supporting: false, cta: false, voiceover: false }
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

  // Quality Mode: STANDARD (default production) vs DESIGNER (art-directed)
  const [qualityMode, setQualityMode] = useState<'STANDARD' | 'DESIGNER'>('STANDARD')

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
    () => productsList.find((p) => p.id === heroProductId) || null,
    [productsList, heroProductId],
  )
  const rawProductImagePath = selectedProduct?.images?.[0]?.url || ''
  const productImageUrl = resolvePreviewUrl(rawProductImagePath, 'creatives') || ''
  const productPreflightState: 'SELECTED' | 'RESOLVING' | 'READY' | 'INVALID' = !selectedProduct
    ? 'SELECTED'
    : (!rawProductImagePath ? 'INVALID' : (!productImageUrl ? 'INVALID' : 'READY'))
  const hasProduct = productPreflightState === 'READY'
  const allAssetsReady = hasLogo && hasProduct

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
        if (adapted.customHeadline) setHeadline(adapted.customHeadline)
        if (adapted.customSupporting) setSupportingLine(adapted.customSupporting)
        if (adapted.customVoiceover) setSpokenVoiceover(adapted.customVoiceover)
        const restoredCopy = {
          headline: Boolean(adapted.customHeadline), supporting: Boolean(adapted.customSupporting),
          cta: Boolean(adapted.campaignCopy.cta), voiceover: Boolean(adapted.customVoiceover),
        }
        copyDirtyRef.current = restoredCopy
        setHeadlineDirty(restoredCopy.headline)
        setSupportingLineDirty(restoredCopy.supporting)
        setCtaDirty(restoredCopy.cta)
        setVoiceoverDirty(restoredCopy.voiceover)
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
        heroProductId,
        objective,
        stylePreset,
        campaignDetail,
        formatId: mediaType === 'VIDEO' ? 'STORY_9_16' : imageFormat,
        campaignCopy: { price, oldPrice, offer, dateRange, cta: ctaText },
        customHeadline: headline,
        customSupporting: supportingLine,
        customVoiceover: spokenVoiceover,
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
    brandKitId,
    environmentPreset,
    motionStyle,
    subtitles,
    outro,
    qualityMode, templateFamily, textDensity, sector, deliveryInfo,
  ])

  // Call Custom AI Planner (non-blocking, advisory with 5s timeout)
  const requestCreativePlan = async (forceRefresh = false, requestedStyle = stylePreset) => {
    if (previewOnly) return
    if (!selectedProduct) return

    // Cancel any previous in-flight planner request
    if (activePlanControllerRef.current) {
      activePlanControllerRef.current.abort()
    }
    const controller = new AbortController()
    activePlanControllerRef.current = controller
    const editsAtRequest = { ...copyEditsRef.current }

    setIsPlanning(true)
    setPlanError(null)

    // Hard client-side timeout: 5 seconds maximum
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, mediaType === 'VIDEO' ? VIDEO_PLANNER_TIMEOUT_MS : AI_PLANNER_TIMEOUT_MS)

    try {
      const res = await fetch('/api/ai-media/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          brandName: data.org.name || 'İşletmemiz',
          brandTone: defaultKit?.tone || null,
          productName: selectedProduct.name,
          productId: selectedProduct.id,
          productDescription: selectedProduct.description || null,
          objective,
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
    } catch (err: unknown) {
      if (activePlanControllerRef.current !== controller) return
      if ((err instanceof Error && err.name === 'AbortError') || controller.signal.aborted) {
        console.warn('[CreativeStudioV2] Plan request timed out or cancelled (>5s budget)')
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
    if (!hasProduct || !hasLogo) return

    // Immediately provide deterministic local copy if fields are empty
    const local = generateDeterministicLocalCopy({
      productName: selectedProduct?.name || 'Ürünümüz',
      brandName: data.org.name || 'İşletmemiz',
      objective,
      campaignDetail,
      offer,
      mediaType,
    })

    if (!headline && !headlineDirty) setHeadline(local.headline)
    if (!supportingLine && !supportingLineDirty) setSupportingLine(local.supportingLine)
    if (!ctaText && !ctaDirty) setCtaText(local.cta)
    if (mediaType === 'VIDEO' && !spokenVoiceover && !voiceoverDirty) {
      setSpokenVoiceover(local.voiceover)
    }

    setStep('creative_direction')
    void requestCreativePlan(false)
  }

  // Handle Video Supabase Realtime Job Watcher
  useEffect(() => {
    if (!activeJobId) return

    let isMounted = true

    const syncStatus = async () => {
      try {
        const res = await fetch(`/api/ai-media/jobs/${activeJobId}`)
        if (!res.ok) return
        const resData = await res.json()
        const vm = resData.job as JobUserViewModel
        if (!vm || !isMounted) return

        setJobViewModel(vm)
        setJobState(vm.state)
        setJobFailureMessage(vm.failure_user_message || null)

        if ((vm.state === 'COMPLETED' || vm.state === 'NEEDS_REVIEW') && vm.playback_url) {
          setCompletedVideoUrl(vm.playback_url)
        }
      } catch (e) {
        console.error('Job sync error:', e)
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
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [activeJobId])

  // SUBMIT HANDLER: Image or Video
  const handleCreateCreative = async () => {
    if (previewOnly) { setSubmitError('Yerel arayüz testinde üretim ve kayıt işlemleri kapalıdır.'); return }
    if (submissionLockRef.current || !selectedProduct || !hasProduct || !hasLogo) return
    const factsError = campaignFactsError({ objective, headline, cta: ctaText, price, oldPrice, offer })
    if (factsError) { setSubmitError(factsError); return }
    submissionLockRef.current = true

    setIsSubmitting(true)
    setSubmitError(null)

    if (mediaType === 'IMAGE') {
      setImagePending(true)
      try {
        const payloadDraft = {
          version: 2,
          requestKey: '',
          generationType: initialDerivedCreativeId ? 'derived' : 'new',
          baseCreativeId: initialDerivedCreativeId || null,
          brief: headline
            ? `${headline}. ${supportingLine}`
            : `${data.org.name} için ${selectedProduct.name} reklam görseli`,
          formatId: imageFormat,
          style: stylePreset.toLowerCase(),
          heroProductId: selectedProduct.id,
          productIds: [selectedProduct.id],
          productExtras: {
            [selectedProduct.id]: {
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
          objective,
          creativePlan,
          qualityMode,
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
        const fullVideoPrompt = [
          `[FORMAT]: 8.0-second vertical commercial video ad, 9:16 aspect ratio.`,
          `[SUBJECT]: Authentic photorealistic commercial for ${data.org.name || 'İşletme'} featuring ${selectedProduct.name}.`,
          `[CANONICAL HERO PRODUCT]: Preserve @HeroProduct geometry, material texture, and colors exactly as shown in authoritative reference assets.`,
          `[ENVIRONMENT]: ${environmentPreset || 'Doğal ticari aydınlatma ve temiz ürün arka planı'}.`,
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
              {jobState === 'FAILED' ? 'Video Hazırlanamadı' : 'Video İnceleme Bekliyor'}
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-[#667781]">
              {jobState === 'FAILED'
                ? videoFailureUserMessage(jobFailureMessage)
                : 'Videonuz üretildi ancak otomatik kalite kontrolü inceleme gerektiriyor.'}
            </p>
            <p className="mt-2 break-all text-[11px] text-[#667781]">İş kimliği: {activeJobId}</p>
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
              <div className="space-y-6">
                {/* 1. Medya Türü Seçimi */}
                <div>
                  <h2 className="text-[15px] font-bold text-[#111b21]">1. Medya Türü</h2>
                  <p className="text-[12px] text-[#667781] mt-0.5">Üretmek istediğiniz içerik biçimini seçin.</p>
                  <div className="mt-2.5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMediaType('IMAGE')}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                        mediaType === 'IMAGE'
                          ? 'border-[#008069] bg-[#e7f8f2] ring-2 ring-[#008069]'
                          : 'border-[#e9edef] hover:border-[#008069]/40 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="image" className="size-4 text-[#008069]" />
                        <span className="text-[13.5px] font-bold text-[#111b21]">Kampanya Görseli</span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-[#667781]">Afiş, WhatsApp ve Instagram için yüksek kaliteli görsel.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMediaType('VIDEO')}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                        mediaType === 'VIDEO'
                          ? 'border-[#008069] bg-[#e7f8f2] ring-2 ring-[#008069]'
                          : 'border-[#e9edef] hover:border-[#008069]/40 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon name="video" className="size-4 text-[#008069]" />
                        <span className="text-[13.5px] font-bold text-[#111b21]">Kampanya Videosu</span>
                      </div>
                      <p className="mt-1 text-[11.5px] text-[#667781]">9:16 sinematik Reels/Durum reklam filmi (10 sn, Türkçe seslendirmeli ve markalı kapanış).</p>
                    </button>
                  </div>
                </div>

                {/* 2. Format / En-Boy Oranı */}
                {mediaType === 'IMAGE' ? (
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111b21]">2. Boyut / Format</h2>
                    <div className="mt-2.5 grid grid-cols-3 gap-2.5">
                      {IMAGE_FORMATS_V2.map((fmt) => (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setImageFormat(fmt.id)}
                          className={`rounded-xl border p-3 text-left transition-all ${
                            imageFormat === fmt.id
                              ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
                              : 'border-[#e9edef] hover:border-[#008069]/30 bg-white'
                          }`}
                        >
                          <span className="block text-[13px] font-bold text-[#111b21]">{fmt.label}</span>
                          <span className="block text-[11px] text-[#667781] mt-0.5 leading-snug">{fmt.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* 3. Hero Ürün Seçimi */}
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[15px] font-bold text-[#111b21]">3. Tanıtılacak Ürün</h2>
                      <p className="text-[12px] text-[#667781] mt-0.5">Reklamda öne çıkarılacak ana ürünü seçin.</p>
                    </div>
                    <Button
                      type="button"
                      variant="quiet"
                      className="h-8 text-[12px] font-semibold text-[#008069]"
                      onClick={() => setAddProductOpen(true)}
                    >
                      + Yeni Ürün Ekle
                    </Button>
                  </div>

                  {productsList.length === 0 ? (
                    <div className="mt-2.5 rounded-xl border border-dashed border-[#d1d7db] p-6 text-center">
                      <p className="text-[13px] text-[#667781]">Henüz kayıtlı ürününüz yok.</p>
                      <Button
                        type="button"
                        className="mt-3 !bg-[#008069] text-white text-[12.5px]"
                        onClick={() => setAddProductOpen(true)}
                      >
                        + İlk Ürününüzü Ekleyin
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-2.5 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                            className={`flex flex-col overflow-hidden rounded-xl border text-left transition-all ${
                              isSelected
                                ? 'border-[#008069] bg-[#e7f8f2]/50 ring-2 ring-[#008069]'
                                : 'border-[#e9edef] hover:border-[#008069]/40 bg-white'
                            }`}
                          >
                            {img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={img} alt={p.name} className="h-28 w-full object-cover" />
                            ) : (
                              <div className="flex h-28 w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                                Görsel Yok
                              </div>
                            )}
                            <div className="p-2.5">
                              <div className="flex items-center justify-between">
                                <p className="text-[12.5px] font-bold text-[#111b21] truncate">{p.name}</p>
                                {isSelected ? <span className="text-[#008069] text-[12px] font-bold">✓</span> : null}
                              </div>
                              <p className="text-[11px] text-[#667781] truncate">{p.description || 'Katalog ürünü'}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 4. Kampanya Amacı */}
                <div>
                  <h2 className="text-[15px] font-bold text-[#111b21]">4. Kampanya Amacı</h2>
                  <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                    {CAMPAIGN_OBJECTIVES.map((obj) => (
                      <button
                        key={obj.id}
                        type="button"
                        onClick={() => setObjective(obj.id)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          objective === obj.id
                            ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
                            : 'border-[#e9edef] hover:border-[#008069]/30 bg-white'
                        }`}
                      >
                        <span className="block text-[13px] font-bold text-[#111b21]">{obj.label}</span>
                        <span className="block text-[11px] text-[#667781] mt-0.5 leading-snug">{obj.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. Varsa Kampanya Detayı */}
                <div>
                  <h2 className="text-[15px] font-bold text-[#111b21]">5. Varsa Özel Kampanya Notu (İsteğe Bağlı)</h2>
                  <Textarea
                    rows={2}
                    value={campaignDetail}
                    onChange={(e) => setCampaignDetail(e.target.value)}
                    placeholder="Örn: 5.000 adet ve üzeri siparişlerde şantiyeye teslim avantajı veya sınırlı stok indirimi."
                    className="mt-1.5 text-[13px]"
                  />
                </div>

                {/* Footer Nav */}
                <div className="flex justify-end pt-3 border-t border-hairline">
                  <Button
                    type="button"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-11 px-7 shadow-sm"
                    disabled={!hasProduct || !hasLogo}
                    onClick={handleGoToStep2}
                  >
                    Devam Et (Görsel ve Reklam Metni) →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: CREATIVE DIRECTION */}
            {step === 'creative_direction' && (
              <div className="space-y-6">
                {mediaType === 'IMAGE' ? (
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-[15px] font-bold text-[#111b21]">Görsel Türü</h2>
                      <p className="text-[12px] text-[#667781] mt-0.5">İşletmenize ve kampanya hedefinize en uygun görsel düzenini seçin.</p>
                      <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                        {CREATIVE_STYLE_PRESETS.map((fam) => (
                          <button
                            key={fam.id}
                            type="button"
                            onClick={() => setStylePreset(fam.id)}
                            className={`rounded-xl border p-3.5 text-left transition-all ${
                              stylePreset === fam.id
                                ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
                                : 'border-[#e9edef] hover:border-[#008069]/30 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-bold text-[#111b21]">{fam.label}</span>
                              {fam.tag && (
                                <span className="rounded bg-[#008069] px-2 py-0.5 text-[10px] font-bold text-white">
                                  {fam.tag}
                                </span>
                              )}
                            </div>
                            <p className="text-[11.5px] text-[#667781] mt-1 leading-snug">{fam.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-hairline bg-surface p-3.5">
                      <p className="text-[13px] font-bold text-[#111b21]">Görselde Ne Kadar Yazı Olsun?</p>
                      <p className="text-[11px] text-[#667781] mt-0.5">Görsel üstündeki metin miktarını belirleyin.</p>
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {[
                          { id: 'low', label: 'Az Yazı', description: 'Kısa başlık; satış reklamında fiyat veya teklif ve çağrı korunur.' },
                          { id: 'balanced', label: 'Dengeli', description: 'Başlık ve kısa kampanya mesajı (önerilen).' },
                          { id: 'detailed', label: 'Kampanya Odaklı', description: 'Fiyat, kampanya detayı ve sipariş bilgisi.' },
                        ].map((d) => (
                          <button
                            key={d.id}
                            type="button"
                            onClick={() => setTextDensity(d.id as any)}
                            className={`rounded-lg border px-3 py-2 text-center transition-all ${
                              textDensity === d.id
                                ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-bold ring-1 ring-[#008069]'
                                : 'border-[#e9edef] bg-white text-[#111b21] hover:border-[#008069]/30'
                            }`}
                          >
                            <span className="block text-[12.5px] font-semibold">{d.label}</span>
                            <span className="block text-[10.5px] text-[#667781] mt-0.5">{d.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111b21]">Görsel Stili</h2>
                    <p className="text-[12px] text-[#667781] mt-0.5">Yapay zekanın görsel kompozisyon ve anlatım dilini seçin.</p>
                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2">
                      {CREATIVE_STYLE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setStylePreset(preset.id)
                            void requestCreativePlan(false, preset.id)
                          }}
                          className={`rounded-xl border p-3.5 text-left transition-all ${
                            stylePreset === preset.id
                              ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
                              : 'border-[#e9edef] hover:border-[#008069]/30 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13px] font-bold text-[#111b21]">{preset.label}</span>
                            {preset.tag && (
                              <span className="rounded bg-[#008069] px-2 py-0.5 text-[10px] font-bold text-white">
                                {preset.tag}
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-[#667781] mt-1 leading-snug">{preset.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quality Mode (Özel Tasarım vs Hızlı Tasarım) */}
                {mediaType === 'IMAGE' && (
                  <div className="rounded-xl border border-hairline bg-surface p-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-[#111b21] flex items-center gap-1.5">
                        <span>Tasarım Seçimi</span>
                        <span className="rounded bg-[#008069] text-white px-2 py-0.5 text-[10px] font-bold">
                          {qualityMode === 'DESIGNER' ? 'Özel Tasarım' : 'Sade Tasarım'}
                        </span>
                      </p>
                      <p className="text-[11px] text-[#667781] mt-0.5">
                        {qualityMode === 'DESIGNER'
                          ? 'Ürüne ve sektöre göre ek kompozisyon planı hazırlanır. Aynı görsel sağlayıcısı kullanılır; kalite ve süre garanti edilmez.'
                          : 'Mevcut sade reklam yönergeleri kullanılır. Aynı görsel sağlayıcısı ve tek üretim; süre veya kredi avantajı garanti edilmez.'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-canvas p-1 rounded-lg border border-hairline">
                      <button
                        type="button"
                        onClick={() => setQualityMode('DESIGNER')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                          qualityMode === 'DESIGNER'
                            ? 'bg-[#008069] text-white shadow-2xs'
                            : 'text-[#667781] hover:text-[#111b21]'
                        }`}
                      >
                        Özel Tasarım
                      </button>
                      <button
                        type="button"
                        onClick={() => setQualityMode('STANDARD')}
                        className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                          qualityMode === 'STANDARD'
                            ? 'bg-[#008069] text-white shadow-2xs'
                            : 'text-[#667781] hover:text-[#111b21]'
                        }`}
                      >
                        Sade Tasarım
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Plan Review Box */}
                <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-bold text-[#111b21]">
                        {mediaType === 'VIDEO' ? 'Türkçe Seslendirme Metni' : 'Reklam Metinleri'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {isPlanning ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#008069]">
                            <span className="size-1.5 rounded-full bg-[#008069] animate-pulse" />
                            Size uygun reklam metni hazırlanıyor…
                          </span>
                        ) : copySource === 'AI' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#008069]">
                            ✓ Size özel reklam metni hazırlandı
                          </span>
                        ) : copySource === 'USER_EDITED' ? (
                          <span className="text-[11px] text-[#667781] font-medium">
                            Kendi metniniz geçerli
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-700 font-medium">
                            Otomatik taslak metin hazır
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
                      className="h-8 text-[12px] font-semibold text-[#008069] border border-[#008069]/30 hover:bg-[#e7f8f2]"
                      disabled={isPlanning}
                      onClick={() => void requestCreativePlan(true)}
                    >
                      {isPlanning
                        ? 'Hazırlanıyor…'
                        : planError === 'AI_TIMEOUT'
                          ? '↻ AI önerisini tekrar dene'
                          : '↻ Farklı Öner'}
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
                        rows={3}
                        value={spokenVoiceover}
                        onChange={(e) => {
                            copyEditsRef.current.voiceover += 1
                            copyDirtyRef.current.voiceover = true
                          setSpokenVoiceover(e.target.value)
                          setVoiceoverDirty(true)
                        }}
                        className="text-[14px] font-medium leading-relaxed"
                        placeholder="Türkçe seslendirme metni..."
                      />
                      <div className="flex justify-between items-center text-[11.5px]">
                        <span className={voWords === 0 || voWords > MAX_SPOKEN_WORDS ? 'text-rose-700 font-semibold' : 'text-[#667781]'}>
                          Uzunluk: <strong>{voWords} kelime</strong> (Hedef: 8–14 kelime, en fazla {MAX_SPOKEN_WORDS})
                        </span>
                        <span className="text-[#008069] font-medium">Spiker 0.5–5.5 sn arasında okur</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
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
                        />
                      </Field>
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
                          placeholder="Örn: Şantiyenize doğrudan toptan teslimat ve garantili dayanıklılık."
                        />
                      </Field>
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
                        />
                      </Field>
                    </div>
                  )}
                </div>

                {/* Fiyat & Kampanya Teklifi (Satış ve Kampanya Odaklı - Doğrudan Erişilebilir) */}
                {mediaType === 'IMAGE' && (
                  <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-2.5 shadow-2xs">
                    <div>
                      <p className="text-[13px] font-bold text-[#111b21] flex items-center gap-1.5">
                        <span>Fiyat & Kampanya Teklifi</span>
                        {(objective === 'SALES_OFFER' || objective === 'CAMPAIGN') ? (
                          <span className="rounded bg-[#e7f8f2] text-[#008069] px-2 py-0.5 text-[10px] font-bold">
                            Fiyat veya teklif zorunlu
                          </span>
                        ) : (
                          <span className="text-[11px] text-[#667781] font-normal">(İsteğe Bağlı)</span>
                        )}
                      </p>
                      <p className="text-[11px] text-[#667781] mt-0.5">
                        Doğruladığınız fiyatı veya teklifi yazın. Satış reklamında ikisinden en az biri bulunmalı; diğer amaçlarda isteğe bağlıdır.
                      </p>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-3">
                      <Field label="Kampanya Fiyatı">
                        <Input
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="Örn: 249 TL veya 450 TL/m²"
                        />
                      </Field>
                      <Field label="Eski Fiyat (Üstü Çizili)">
                        <Input
                          value={oldPrice}
                          onChange={(e) => setOldPrice(e.target.value)}
                          placeholder="Örn: 320 TL veya 550 TL/m²"
                        />
                      </Field>
                      <Field label="İndirim / Özel Teklif">
                        <Input
                          value={offer}
                          onChange={(e) => setOffer(e.target.value)}
                          placeholder="Örn: %20 İndirim veya 5 Palet Üstü"
                        />
                      </Field>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2 pt-1">
                      <Field label="Teslimat / Fayda Bilgisi (İsteğe Bağlı)">
                        <Input
                          value={deliveryInfo}
                          onChange={(e) => setDeliveryInfo(e.target.value)}
                          placeholder="Örn: Şantiyeye teslim veya 3 gün içinde kargo"
                        />
                      </Field>
                      <Field label="Sektör (İsteğe Bağlı)">
                        <Input
                          value={sector}
                          onChange={(e) => setSector(e.target.value)}
                          placeholder="Örn: İnşaat, Tarım, Gıda, Çiçekçilik"
                        />
                      </Field>
                      <Field label="Kampanya Tarihi (İsteğe Bağlı)">
                        <Input value={dateRange} onChange={(e) => setDateRange(e.target.value)} placeholder="Örn: 10–20 Ekim 2026" />
                      </Field>
                    </div>
                  </div>
                )}

                {/* Video Gelişmiş Seçenekleri */}
                {mediaType === 'VIDEO' && (
                  <details className="text-[12px] text-[#667781]">
                    <summary className="cursor-pointer hover:text-[#111b21] font-semibold text-[#008069]">
                      Video Çekim ve Ortam Seçenekleri
                    </summary>
                    <div className="mt-3 space-y-3 rounded-xl border border-hairline bg-[#f8fafb] p-3.5">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Çekim Ortamı">
                          <select
                            value={environmentPreset}
                            onChange={(e) => setEnvironmentPreset(e.target.value)}
                            className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[12.5px] text-[#111b21]"
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
                            className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[12.5px] text-[#111b21]"
                          >
                            <option value="real_usage">Doğal Kullanım ve Sahne Hareketi</option>
                            <option value="studio_orbit">Vitrin & 3/4 Açı (Şık ve Dengeli)</option>
                            <option value="macro_detail">Yakın Çekim & Detay Odaklı</option>
                          </select>
                        </Field>
                      </div>
                      <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={subtitles}
                            onChange={(e) => setSubtitles(e.target.checked)}
                            className="rounded text-[#008069]"
                          />
                          <span>Dinamik Altyazı Ekle</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={outro}
                            disabled
                            className="rounded text-[#008069]"
                          />
                          <span>2 saniyelik markalı kapanış dahildir</span>
                        </label>
                      </div>
                    </div>
                  </details>
                )}

                {/* Footer Nav */}
                <div className="flex items-center justify-between pt-3 border-t border-hairline">
                  <Button type="button" variant="quiet" onClick={() => setStep('product_goal')}>
                    ← Geri (İşletme ve Ürün)
                  </Button>
                  <Button
                    type="button"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-11 px-7 shadow-sm"
                    disabled={mediaType === 'VIDEO' && (voWords === 0 || voWords > MAX_SPOKEN_WORDS)}
                    onClick={() => setStep('review_generate')}
                  >
                    Son Kontrol →
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: REVIEW & GENERATE */}
            {step === 'review_generate' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-[15px] font-bold text-[#111b21]">Son Kontrol ve Üretim</h2>
                  <p className="text-[12px] text-[#667781] mt-0.5">Tüm bilgiler hazırlandı. Tek tıkla reklamınızı üretin.</p>
                </div>

                {/* Summary Card */}
                <div className="rounded-xl border border-hairline bg-[#f8fafb] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-hairline pb-2.5">
                    <span className="text-[12px] font-bold uppercase tracking-wider text-[#667781]">Reklam Özeti</span>
                    <span className="rounded-full bg-[#e7f8f2] px-2.5 py-0.5 text-[11px] font-bold text-[#008069]">
                      {mediaType === 'VIDEO' ? '9:16 Sinematik Video' : ({ SQUARE_1_1: 'Kare Görsel · 1:1', STORY_9_16: 'Hikâye · 9:16', PORTRAIT_4_5: 'Gönderi · 4:5' }[imageFormat] || 'Kampanya Görseli')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#667781]">İşletme / Marka:</span>
                      <p className="font-semibold text-[#111b21]">{data.org.name}</p>
                    </div>
                    <div>
                      <span className="text-[#667781]">Ürün:</span>
                      <p className="font-semibold text-[#111b21]">{selectedProduct?.name}</p>
                    </div>
                    <div>
                      <span className="text-[#667781]">Reklam Tarzı:</span>
                      <p className="font-semibold text-[#008069]">
                        {CREATIVE_STYLE_PRESETS.find((p) => p.id === stylePreset)?.label}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#667781]">Marka Koruması:</span>
                      <p className="font-semibold text-[#008069]">Kanonik Logo + 1/1 Ürün (2/2 Ref Kilitli)</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-hairline">
                    <span className="text-[11px] font-semibold text-[#667781] uppercase">
                      {mediaType === 'VIDEO' ? 'Onaylanan Türkçe Seslendirme:' : 'Basılacak Başlık ve Metin:'}
                    </span>
                    <p className="mt-1 text-[13px] font-bold text-[#111b21] bg-white p-3 rounded-lg border border-[#e9edef]">
                      {mediaType === 'VIDEO' ? `“${spokenVoiceover}”` : `${headline} — ${supportingLine}`}
                    </p>
                  </div>

                  {/* Asset Preflight Health Check */}
                  <dl className="grid gap-2 rounded-lg border bg-white p-3 text-sm sm:grid-cols-2">
                    {price && <div><dt className="text-xs text-[#667781]">Fiyat</dt><dd className="font-semibold">{/(\d+)/.test(price) && !/(tl|₺|\$|€)/i.test(price) ? `${price} TL` : price}</dd></div>}
                    {oldPrice && <div><dt className="text-xs text-[#667781]">Eski fiyat</dt><dd className="line-through text-[#667781]">{/(\d+)/.test(oldPrice) && !/(tl|₺|\$|€)/i.test(oldPrice) ? `${oldPrice} TL` : oldPrice}</dd></div>}
                    {offer && <div><dt className="text-xs text-[#667781]">Teklif / indirim</dt><dd>{offer}</dd></div>}
                    <div><dt className="text-xs text-[#667781]">Çağrı</dt><dd className="font-semibold">{ctaText}</dd></div>
                    {dateRange && <div><dt className="text-xs text-[#667781]">Kampanya tarihi</dt><dd>{dateRange}</dd></div>}
                    {deliveryInfo && (
                      <div>
                        <dt className="text-xs text-[#667781]">
                          {/taksit|kredi\s*kart|kart|peşin|havale|ödeme/i.test(deliveryInfo) ? 'Ödeme / Taksit' : 'Teslimat'}
                        </dt>
                        <dd>{deliveryInfo}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="rounded-lg border border-[#e9edef] bg-white p-3 space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#667781]">Logo ve Ürün Kontrolü</span>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block size-2 rounded-full ${hasLogo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-[#667781]">Kurumsal Logo:</span>
                        <span className={`font-semibold ${hasLogo ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {hasLogo ? '✓ Bağlandı' : 'Eksik'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`inline-block size-2 rounded-full ${hasProduct ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span className="text-[#667781]">Ürün:</span>
                        <span className={`font-semibold ${hasProduct ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {hasProduct ? '✓ Seçildi' : 'Eksik'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {!allAssetsReady ? (
                  <Notice tone="danger">
                    Görsel veya video üretimi için işletme logosu ve seçilen ürünün kanonik referans görseli hazır olmalıdır.
                  </Notice>
                ) : null}

                {/* Footer Nav & Submit Button */}
                <div className="flex items-center justify-between pt-3 border-t border-hairline">
                  <Button type="button" variant="quiet" onClick={() => setStep('creative_direction')}>
                    ← Geri (Görsel ve Metin)
                  </Button>
                  <Button
                    type="button"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-11 px-8 shadow-sm"
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
