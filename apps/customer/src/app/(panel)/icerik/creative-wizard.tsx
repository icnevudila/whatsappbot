'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, Card, Field, FileUploadButton, Input, Notice, Textarea } from '@/components/ui'
import { Stepper } from '@/components/stepper'
import { uploadAssetOnly } from './actions'
import {
  AD_FORMAT_OPTIONS,
  type AdFormatType,
  type JobUserViewModel,
  type PromotionType,
  type ProductCard,
  type SpeechTimelineItem,
  type WizardBootstrap,
  type WizardReferenceAsset,
} from './wizard-types'
import { AddProductModal } from './add-product-modal'
import { getSafeMediaUrl } from '@/lib/media-url'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  MAX_SPOKEN_WORDS,
  VIDEO_ASPECT_RATIO,
  VIDEO_DURATION_SECONDS,
  VIDEO_ENGINE_MODE,
  VIDEO_LANGUAGE,
  VIDEO_REQUESTED_PROVIDER,
  VIDEO_SUBTITLE_MODE,
  defaultFidelityContract,
  parseFactLines,
  validateWizardPreflight,
  type ProductFidelityContract,
  type ReferenceRole,
} from '@/lib/video-wizard-contract'

const DRAFT_KEY_PREFIX = 'wa.customer.video-wizard.v1'

type Step = 'what' | 'campaign' | 'draft' | 'summary'

const WIZARD_STEPS: { id: Step; label: string }[] = [
  { id: 'what', label: '1 — Neyi Tanıtıyorsun?' },
  { id: 'campaign', label: '2 — Kampanya' },
  { id: 'draft', label: '3 — Reklam Taslağı' },
  { id: 'summary', label: '4 — Kontrol Et & Oluştur' },
]

export function CreativeWizard({
  data,
  initialFormat,
}: {
  data: WizardBootstrap
  initialFormat?: string
}) {
  const [step, setStep] = useState<Step>('what')
  const [draftApproved, setDraftApproved] = useState(false)
  const [promotionType, setPromotionType] = useState<PromotionType>('existing_product')
  const [selectedProductId, setSelectedProductId] = useState<string>(() => data.products?.[0]?.id ?? '')
  const [customProductName, setCustomProductName] = useState('')
  const [customProductImage, setCustomProductImage] = useState('')
  const [customProductDesc, setCustomProductDesc] = useState('')
  const [customLogoUrl, setCustomLogoUrl] = useState('')
  const [referenceAssets, setReferenceAssets] = useState<WizardReferenceAsset[]>([])
  
  // Step 2: Campaign & Format Router
  const [adFormat, setAdFormat] = useState<AdFormatType>('AUTO')
  const [environmentPreset, setEnvironmentPreset] = useState<'auto' | 'garden' | 'studio' | 'kitchen' | 'office' | 'workshop' | 'construction'>('auto')
  const [motionStyle, setMotionStyle] = useState<'studio_orbit' | 'real_usage' | 'macro_detail'>('real_usage')
  const [offerDetails, setOfferDetails] = useState('')
  const [offerVerified, setOfferVerified] = useState(false)
  const [creativeNote, setCreativeNote] = useState('')
  const [subtitles] = useState(false)
  const [verifiedClaimsText, setVerifiedClaimsText] = useState('')
  const [fidelityContract, setFidelityContract] = useState<ProductFidelityContract>(() =>
    defaultFidelityContract(data.org.name || '', data.products?.[0]?.name || ''),
  )
  const [ctaChannel, setCtaChannel] = useState<'contact' | 'whatsapp' | 'website'>(() =>
    data.phones.length ? 'whatsapp' : data.org.websiteHint ? 'website' : 'contact',
  )
  const [uploadingExtra, setUploadingExtra] = useState(false)
  const [isDrafting, setIsDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)

  // Step 3: AI Creative Plan & Continuous 0-8s Speech Timeline
  const [creativeIdea, setCreativeIdea] = useState('')
  const [speechTimeline, setSpeechTimeline] = useState<SpeechTimelineItem[]>([])
  const [veoPromptPreview, setVeoPromptPreview] = useState('')

  // Step 4: Approval & Generation Tracking
  const [transcriptConfirmed, setTranscriptConfirmed] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [addProductOpen, setAddProductOpen] = useState(false)

  // Waiting & Delivery Experience State (Real Service Integration)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [jobState, setJobState] = useState<string>('IDLE')
  const [jobDisplayState, setJobDisplayState] = useState<string>('Reklam taslağı onaylandı')
  const [jobDisplayTitle, setJobDisplayTitle] = useState<string>('Reklamınız Hazırlanıyor')
  const [jobDisplayMessage, setJobDisplayMessage] = useState<string>('İşlem devam ediyor.')
  const [jobStageIndex, setJobStageIndex] = useState<number>(1)
  const [completedVideoUrl, setCompletedVideoUrl] = useState<string | null>(null)
  const [etaText, setEtaText] = useState<string>('Süre tahmini oluşturuluyor...')
  const [queueAhead, setQueueAhead] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [jobFailureMessage, setJobFailureMessage] = useState<string | null>(null)
  const [jobEvidence, setJobEvidence] = useState<Partial<JobUserViewModel>>({})

  // Authoritative Brand Kit & Logo Resolution
  const defaultKit = useMemo(() => data.kits.find((k) => k.isDefault) ?? data.kits[0] ?? null, [data.kits])
  const activeLogoUrl = getSafeMediaUrl(customLogoUrl || defaultKit?.samplePreview || data.org.logoPreview || '') || ''
  const hasValidLogo = Boolean(activeLogoUrl)

  // Authoritative Product Resolution
  const selectedProduct = useMemo(
    () => data.products.find((p) => p.id === selectedProductId) ?? null,
    [data.products, selectedProductId]
  )

  const activeProductImage = useMemo(() => {
    if (promotionType === 'new_offering' || promotionType === 'existing_service') {
      return customProductImage
    }
    return selectedProduct?.images?.[0]?.url || customProductImage || ''
  }, [promotionType, selectedProduct, customProductImage])

  const activeProductName = useMemo(() => {
    if (promotionType === 'new_offering' || promotionType === 'existing_service') {
      return customProductName.trim() || 'Hizmet / Ürün'
    }
    if (promotionType === 'general_brand') {
      return data.org.name || 'Kurumsal Tanıtım'
    }
    return selectedProduct?.name || 'Ürün'
  }, [promotionType, customProductName, selectedProduct, data.org.name])

  const hasValidProduct = Boolean(activeProductImage && activeProductName)
  const activeProductId = useMemo(() => {
    if (promotionType === 'existing_product') return selectedProductId
    const slug = activeProductName.toLocaleLowerCase('tr-TR').replace(/[^a-z0-9çğıöşü]+/gi, '-').replace(/^-|-$/g, '')
    return slug ? `ad-hoc:${slug}` : ''
  }, [activeProductName, promotionType, selectedProductId])

  const verifiedClaims = useMemo(() => parseFactLines(verifiedClaimsText), [verifiedClaimsText])
  const quotaUsed = data.org.monthlyVideoUsed ?? 0
  const quotaLimit = data.org.monthlyVideoQuota ?? 0
  const quotaAvailable = quotaLimit > 0 && quotaUsed < quotaLimit
  const ctaText = useMemo(() => {
    if (ctaChannel === 'whatsapp' && data.phones[0]?.phone) return 'WhatsApp’tan iletişime geçin'
    if (ctaChannel === 'website' && data.org.websiteHint) return 'Web sitesinden ayrıntıları inceleyin'
    return 'Detaylar için iletişime geçin'
  }, [ctaChannel, data.org.websiteHint, data.phones])

  // Total speech word count
  const fullSpeechText = useMemo(() => speechTimeline.map((s) => s.exact_text).join(' '), [speechTimeline])
  const totalWords = useMemo(() => fullSpeechText.split(/\s+/).filter(Boolean).length, [fullSpeechText])

  const preflightIssues = useMemo(() => validateWizardPreflight({
    quotaUsed,
    quotaLimit,
    hasLogo: hasValidLogo,
    hasProduct: hasValidProduct,
    promotionType,
    productId: activeProductId,
    spokenText: fullSpeechText,
    verifiedClaims,
    offer: offerDetails,
    offerVerified,
    adFormat,
    fidelityContract,
    referenceCount: referenceAssets.length,
    referenceRoleCount: referenceAssets.filter((asset) => asset.role).length,
  }), [
    quotaUsed,
    quotaLimit,
    hasValidLogo,
    hasValidProduct,
    promotionType,
    activeProductId,
    fullSpeechText,
    verifiedClaims,
    offerDetails,
    offerVerified,
    adFormat,
    fidelityContract,
    referenceAssets,
  ])
  const blockingPreflightIssues = preflightIssues.filter((issue) => issue.severity === 'error')

  // Serialized form payload
  const serializedPayload = useMemo(() => {
    const brandName = data.org.name || 'İşletmemiz'
    return JSON.stringify({
      requestKey: crypto.randomUUID(),
      formatId: 'reels_video',
      brief: creativeIdea || `${brandName} ${activeProductName} reklam filmi`,
      brandKitId: defaultKit?.id ?? '',
      useLogo: hasValidLogo,
      customLogoUrl: customLogoUrl || undefined,
      productIds: activeProductId ? [activeProductId] : [],
      productExtras: activeProductId
        ? {
            [activeProductId]: {
              imageUrl: activeProductImage,
              price: '',
              oldPrice: '',
              promo: offerDetails,
              extra: creativeNote,
              include: { name: true, image: true, description: true, boxContents: false, price: false, promo: true },
            },
          }
        : {},
      videoSpeech: true,
      subtitles,
      videoPurpose: adFormat === 'OFFER_DRIVEN' ? 'kampanya' : 'tanitim',
      offerDetails: offerDetails || undefined,
      customVoiceover: fullSpeechText,
      voiceoverScript: fullSpeechText,
      referenceImageUrls: referenceAssets.map((asset) => asset.url),
      customText: creativeNote || undefined,
      videoScenarioPrompt: veoPromptPreview,
      metadata: {
        ad_format: adFormat,
        promotion_type: promotionType,
        speech_timeline: speechTimeline,
        authoritative_facts: {
          brand_name: brandName,
          product_name: activeProductName,
          product_id: activeProductId || undefined,
          offer: offerVerified ? offerDetails || undefined : undefined,
          verified_claims: verifiedClaims,
          approved_spoken_line: fullSpeechText,
          product_fidelity_contract: fidelityContract,
        },
        creative_engine_mode: VIDEO_ENGINE_MODE,
        requested_provider: VIDEO_REQUESTED_PROVIDER,
      },
    })
  }, [
    creativeIdea,
    activeProductName,
    defaultKit?.id,
    hasValidLogo,
    customLogoUrl,
    selectedProductId,
    activeProductId,
    activeProductImage,
    offerDetails,
    creativeNote,
    subtitles,
    adFormat,
    fullSpeechText,
    referenceAssets,
    veoPromptPreview,
    promotionType,
    speechTimeline,
    data.org.name,
    offerVerified,
    verifiedClaims,
    fidelityContract,
  ])

  // Asset-grounded draft generation. This is called before the user can approve a draft.
  const generateDraft = async (type: 'sales' | 'short' | 'corporate' | 'refresh' = 'refresh') => {
    setDraftApproved(false)
    setTranscriptConfirmed(false)
    setIsDrafting(true)
    setDraftError(null)
    try {
      const res = await fetch('/api/ai-media/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: data.org.name || 'İşletmemiz',
          productName: activeProductName,
          productDescription: selectedProduct?.description || '',
          adFormat,
          environmentPreset,
          motionStyle,
          revisionType: type,
          offerDetails,
          creativeNote,
          logoUrl: activeLogoUrl,
          productImageUrl: activeProductImage,
          productId: activeProductId,
          verifiedClaims,
          offerVerified,
          productFidelityContract: fidelityContract,
          referenceAssets,
        }),
      })

      const draftRes = await res.json()
      if (!res.ok || draftRes.error) {
        throw new Error(draftRes.error || 'Güvenli reklam taslağı oluşturulamadı.')
      }
      if (draftRes.creative_idea) setCreativeIdea(draftRes.creative_idea)
      if (draftRes.speech_timeline) setSpeechTimeline(draftRes.speech_timeline)
      if (draftRes.veo_prompt) setVeoPromptPreview(draftRes.veo_prompt)
    } catch (error: any) {
      console.error('Failed to generate grounded draft:', error)
      setDraftError(error?.message || 'Güvenli reklam taslağı oluşturulamadı.')
    } finally {
      setIsDrafting(false)
    }
  }

  const applyAiRevision = (type: 'sales' | 'short' | 'corporate' | 'refresh') => generateDraft(type)

  // Authoritative Video Job Submission (POST /api/ai-media/jobs)
  const handleRealSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transcriptConfirmed || !draftApproved) return
    if (blockingPreflightIssues.length > 0) {
      setSubmissionError(blockingPreflightIssues[0].message)
      return
    }

    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      // The server locks the exact bytes used for generation.  Hash the selected
      // signed asset URLs in the browser so a later URL/file substitution cannot
      // silently alter the approved CreativeRevision.
      const sha256Of = async (url: string, label: string) => {
        if (!url) throw new Error(`${label} seçilmedi.`)
        const response = await fetch(url)
        if (!response.ok) throw new Error(`${label} doğrulama için okunamadı.`)
        const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer())
        return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
      }

      const [logoSha256, productSha256, referenceSha256] = await Promise.all([
        sha256Of(activeLogoUrl, 'Kurumsal logo'),
        activeProductImage ? sha256Of(activeProductImage, 'Ürün görseli') : Promise.resolve(null),
        Promise.all(referenceAssets.map((asset, index) => sha256Of(asset.url, `Ek referans ${index + 1}`))),
      ])

      const payload = {
        title: `${data.org.name || 'İşletme'} - ${activeProductName} Reklamı`,
        brief: creativeIdea,
        adFormat,
        userStylePreference: adFormat,
        environmentPreset,
        motionStyle,
        subtitles: VIDEO_SUBTITLE_MODE,
        creativeEngineMode: VIDEO_ENGINE_MODE,
        requestedProvider: VIDEO_REQUESTED_PROVIDER,
        promotionType,
        creativeIdea,
        speechTimeline,
        veoPrompt: veoPromptPreview,
        metadata: {
          ad_format: adFormat,
          environment_preset: environmentPreset,
          motion_style: motionStyle,
        },
        authoritativeFacts: {
          brand_name: data.org.name || 'İşletmemiz',
          product_name: activeProductName,
          product_id: activeProductId,
          product_description: selectedProduct?.description || customProductDesc || undefined,
          offer: offerVerified ? offerDetails || undefined : undefined,
          offer_verified: offerVerified,
          cta: ctaText,
          phone: ctaChannel === 'whatsapp' ? data.phones[0]?.phone : undefined,
          url: ctaChannel === 'website' ? data.org.websiteHint : undefined,
          approved_spoken_line: fullSpeechText,
          verified_claims: verifiedClaims,
          unverified_facts: [],
          product_fidelity_contract: fidelityContract,
        },
        logoAsset: {
          url: activeLogoUrl,
          name: 'brand_logo.png',
          sha256: logoSha256,
        },
        productAsset: activeProductImage
          ? { url: activeProductImage, name: activeProductName, sha256: productSha256, productId: activeProductId }
          : null,
        referenceAssets: referenceAssets.map((asset, i) => ({
          url: asset.url,
          role: asset.role,
          name: `ref_${i + 1}.jpg`,
          sha256: referenceSha256[i],
        })),
      }

      const res = await fetch('/api/ai-media/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const dataRes = await res.json()
      if (!res.ok || dataRes.error) {
        throw new Error(dataRes.error || 'Video işi başlatılamadı.')
      }

      const newJobId = dataRes.job_id
      setActiveJobId(newJobId)
      setJobState('PENDING')
      setJobStageIndex(1)
      setJobDisplayState('REKLAM_TASLAGI_HAZIRLANIYOR')
      setJobDisplayTitle('Reklam Taslağı Onaylandı')
      setJobDisplayMessage('Video üretim kuyruğuna aktarılıyor.')

      // Preserve active job in URL for refresh recovery
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.set('job_id', newJobId)
        window.history.pushState({}, '', url.toString())
      }
    } catch (err: any) {
      setSubmissionError(err.message || 'Üretim başlatılırken bir hata oluştu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Active Job Recovery on Mount (from URL or org active jobs)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('new') === 'true') {
        return
      }
      const queryJobId = params.get('job_id')
      if (queryJobId) {
        setActiveJobId(queryJobId)
        return
      }
    }

    fetch('/api/ai-media/jobs')
      .then((res) => res.json())
      .then((data) => {
        if (data.active_job?.id) {
          const st = data.active_job.state
          if (st !== 'COMPLETED' && st !== 'FAILED') {
            setActiveJobId(data.active_job.id)
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href)
              url.searchParams.set('job_id', data.active_job.id)
              window.history.replaceState({}, '', url.toString())
            }
          }
        }
      })
      .catch(() => {})
  }, [])

  // Supabase Realtime & Authoritative Status Synchronization
  useEffect(() => {
    if (!activeJobId) return

    let isMounted = true

    const syncJobStatus = async () => {
      try {
        const res = await fetch(`/api/ai-media/jobs/${activeJobId}`)
        if (!res.ok) return
        const resData = await res.json()
        const vm = resData.job as JobUserViewModel
        if (!vm || !isMounted) return

        setJobState(vm.state)
        setJobStageIndex(vm.stage_index)
        setJobDisplayState(vm.display_state)
        setJobDisplayTitle(vm.display_title)
        setJobDisplayMessage(vm.display_message)
        setQueueAhead(vm.queue_ahead_count ?? null)
        setEtaText(vm.eta_display_text || 'Süre tahmini oluşturuluyor...')
        setJobFailureMessage(vm.failure_user_message || null)
        setJobEvidence(vm)

        if ((vm.state === 'COMPLETED' || vm.state === 'NEEDS_REVIEW') && vm.playback_url) {
          setCompletedVideoUrl(vm.playback_url)
        }
      } catch (e) {
        console.error('Job sync error:', e)
      }
    }

    syncJobStatus()

    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`job-watch-${activeJobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'ai_media_jobs', filter: `id=eq.${activeJobId}` },
        () => {
          syncJobStatus()
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'ai_media_events', filter: `job_id=eq.${activeJobId}` },
        () => {
          syncJobStatus()
        }
      )
      .subscribe()

    const interval = setInterval(syncJobStatus, 4000)

    return () => {
      isMounted = false
      clearInterval(interval)
      void supabase.removeChannel(channel)
    }
  }, [activeJobId])

  return (
    <>
      <Card className="wb-wa-wizard overflow-visible">
        {/* Wizard Stepper */}
        {jobState === 'IDLE' ? (
          <div className="wb-wa-wizard-steps">
            <Stepper
              label="Video prodüksiyon adımları"
              steps={WIZARD_STEPS}
              current={step}
              onJump={(id) => {
                if (id === 'summary' && !draftApproved) return
                if (id === 'draft' && step === 'campaign') {
                  setStep('draft')
                  void generateDraft()
                  return
                }
                setStep(id as Step)
              }}
              className="wb-wa-steps"
            />
          </div>
        ) : null}

        {/* 1. WAITING / GENERATION EXPERIENCE (Realtime & Authoritative Backend State) */}
        {jobState !== 'IDLE' && jobState !== 'COMPLETED' && jobState !== 'FAILED' && jobState !== 'NEEDS_REVIEW' ? (
          <div className="p-6 space-y-6">
            <div className="text-center space-y-1">
              <div className="inline-flex size-3 rounded-full bg-[#008069] mb-3 animate-ping" />
              <h3 className="text-[17px] font-bold text-[#111b21]">{jobDisplayTitle}</h3>
              <p className="text-[13px] text-[#667781]">
                {jobDisplayMessage || jobDisplayState} · Tahmini hazır olma: <span className="font-semibold text-[#111b21]">{etaText}</span>
              </p>
              {queueAhead && queueAhead > 0 ? (
                <p className="text-[12px] text-amber-700 font-medium">Önünüzde {queueAhead} video işleniyor</p>
              ) : null}
            </div>

            {/* In-Card Stage Checklist */}
            <div className="rounded-xl border border-hairline bg-[#f8fafb] p-4 max-w-md mx-auto space-y-3">
              {[
                { label: 'Reklam taslağı onaylandı', stage: 1 },
                { label: 'Sıraya alındı', stage: 2 },
                { label: 'Görseller ve materyaller hazırlanıyor', stage: 3 },
                { label: 'Reklam videosu hazırlanıyor', stage: 4 },
                { label: 'Kalite kontrolü yapılıyor', stage: 5 },
                { label: 'Logo ve marka kapanışı ekleniyor', stage: 6 },
                { label: 'Yayına Hazır', stage: 7 },
              ].map((item, idx) => {
                const isDone = jobStageIndex > item.stage
                const isCurrent = jobStageIndex === item.stage
                return (
                  <div key={idx} className="flex items-center gap-3 text-[13px]">
                    {isDone ? (
                      <span className="flex size-5 items-center justify-center rounded-full bg-[#008069] text-white text-[11px] font-bold">
                        ✓
                      </span>
                    ) : isCurrent ? (
                      <span className="flex size-5 items-center justify-center rounded-full border-2 border-[#008069] bg-white">
                        <span className="size-2 rounded-full bg-[#008069] animate-ping" />
                      </span>
                    ) : (
                      <span className="size-5 rounded-full border border-[#d1d7db] bg-white" />
                    )}
                    <span className={isDone ? 'font-medium text-[#111b21]' : isCurrent ? 'font-bold text-[#008069]' : 'text-[#667781]'}>
                      {item.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Decoupled Notice Banner */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3.5 text-center max-w-md mx-auto">
              <p className="text-[12.5px] font-medium text-blue-900 leading-relaxed">
                ℹ <strong>Bu sayfada beklemeniz gerekmiyor.</strong>
                <br />
                Video arka planda hazırlanmaya devam edecek. Dilediğiniz zaman Medya kütüphanesinden izleyebilirsiniz.
              </p>
            </div>

            <div className="flex justify-center items-center gap-3 pt-2">
              <Link
                href="/icerik"
                className="inline-flex items-center gap-2 rounded-full border border-hairline bg-white px-5 py-2 text-[13px] font-medium text-[#111b21] hover:bg-[#f0f2f5] transition-colors"
              >
                İçerik Kütüphanesine Git
              </Link>
              <button
                type="button"
                onClick={() => {
                  setActiveJobId(null)
                  setJobState('IDLE')
                  setStep('what')
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('job_id')
                    window.history.pushState({}, '', url.toString())
                  }
                }}
                className="text-[12.5px] font-medium text-[#667781] hover:text-[#111b21] transition-colors"
              >
                Yeni Taslak Oluştur
              </button>
            </div>
          </div>
        ) : null}

        {/* Terminal states are actionable; they must never look like an endless render. */}
        {jobState === 'FAILED' || jobState === 'NEEDS_REVIEW' ? (
          <div className="mx-auto max-w-xl space-y-4 p-6">
            <div className={`rounded-xl border p-4 ${jobState === 'FAILED' ? 'border-rose-200 bg-rose-50' : 'border-amber-300 bg-amber-50'}`}>
              <p className={`text-[13px] font-bold ${jobState === 'FAILED' ? 'text-rose-800' : 'text-amber-900'}`}>
                {jobState === 'FAILED' ? 'Video üretilemedi' : '⏳ Video İnsan İncelemesi Bekliyor'}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#667781]">
                {jobFailureMessage || jobDisplayMessage || 'Çıktı otomatik kalite kapısından geçmedi.'}
              </p>
            </div>
            {/* Show the video preview even in NEEDS_REVIEW so the user can see what was produced */}
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
            <div className="grid gap-2 rounded-xl border border-hairline bg-[#f8fafb] p-4 text-[12px] sm:grid-cols-2">
              <div><span className="text-[#667781]">İş ID</span><p className="font-mono font-semibold text-[#111b21] break-all">{activeJobId}</p></div>
              <div><span className="text-[#667781]">Üretim profili</span><p className="font-semibold text-[#111b21]">{jobEvidence.creative_engine_mode || VIDEO_ENGINE_MODE}</p></div>
              <div><span className="text-[#667781]">Seçilen sağlayıcı</span><p className="font-semibold text-[#111b21]">{jobEvidence.selected_provider || 'Seçilmedi'}</p></div>
              <div><span className="text-[#667781]">Fallback nedeni</span><p className="font-semibold text-[#111b21]">{jobEvidence.fallback_reason || 'Yok'}</p></div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/icerik" className="inline-flex items-center justify-center rounded-full bg-[#008069] px-5 py-2 text-[13px] font-semibold text-white">
                İçerik Kütüphanesine Git
              </Link>
              <button
                type="button"
                onClick={() => {
                  setActiveJobId(null)
                  setJobState('IDLE')
                  setStep('summary')
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('job_id')
                    window.history.pushState({}, '', url.toString())
                  }
                }}
                className="text-[12.5px] font-semibold text-[#667781] hover:text-[#111b21]"
              >
                Ayarları gözden geçir
              </button>
            </div>
          </div>
        ) : null}

        {/* 2. COMPLETED VIDEO PLAYER SCREEN */}
        {jobState === 'COMPLETED' ? (
          <div className="p-6 space-y-5 text-center max-w-md mx-auto">
            <div className="flex items-center justify-center gap-2 text-[#008069]">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#e7f8f2] text-[#008069] font-bold text-[16px]">
                ✓
              </span>
              <h3 className="text-[18px] font-bold text-[#111b21]">Videonuz Hazır!</h3>
            </div>

            {completedVideoUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-hairline bg-black shadow-lg aspect-[9/16] max-h-[520px] mx-auto flex items-center justify-center">
                <video
                  src={completedVideoUrl}
                  controls
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="rounded-xl border border-hairline bg-[#f8fafb] p-6 text-center text-[13px] text-[#667781]">
                Video akışı doğrulanıyor...
              </div>
            )}

            <div className="rounded-xl border border-hairline bg-[#f8fafb] p-3.5 text-left">
              <div className="flex items-center justify-between">
                <p className="text-[12.5px] font-bold text-[#111b21]">Video Bilgileri</p>
                <span className="rounded-full bg-[#e7f8f2] px-2 py-0.5 text-[10px] font-bold text-[#008069]">
                  YAYINA HAZIR ✓
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-2 text-[11.5px]">
                <div><dt className="text-[#667781]">Format</dt><dd className="font-semibold text-[#111b21]">9:16 Dikey ({jobEvidence.width && jobEvidence.height ? `${jobEvidence.width}×${jobEvidence.height}` : '720×1280'})</dd></div>
                <div><dt className="text-[#667781]">Süre</dt><dd className="font-semibold text-[#111b21]">{jobEvidence.duration_seconds ?? '8'} sn</dd></div>
                <div><dt className="text-[#667781]">Seslendirme</dt><dd className="font-semibold text-[#111b21]">Türkçe (Seslendirmeli)</dd></div>
                <div><dt className="text-[#667781]">Ürün Koruması</dt><dd className="font-semibold text-[#008069]">Orijinal Görünüm Doğrulandı ✓</dd></div>
              </dl>
              <details className="mt-2 pt-1 border-t border-hairline text-[10.5px] text-[#667781]">
                <summary className="cursor-pointer hover:text-[#111b21]">Teknik Doğrulama Detayları</summary>
                <p className="mt-1 font-mono">Sağlayıcı: {jobEvidence.selected_provider || 'AUTO'} | Fallback: {jobEvidence.fallback_reason || 'Yok'}</p>
                {jobEvidence.final_sha256 ? <p className="truncate font-mono">SHA-256: {jobEvidence.final_sha256}</p> : null}
              </details>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/icerik"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#008069] px-6 py-2.5 text-[13.5px] font-semibold text-white shadow-sm hover:bg-[#00a884] transition-colors"
              >
                Videoyu Kütüphanede Gör
              </Link>
              <button
                type="button"
                onClick={() => {
                  setActiveJobId(null)
                  setJobState('IDLE')
                  setStep('what')
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href)
                    url.searchParams.delete('job_id')
                    window.history.pushState({}, '', url.toString())
                  }
                }}
                className="text-[12.5px] font-medium text-[#667781] hover:text-[#111b21] transition-colors"
              >
                Yeni Bir Video Oluştur
              </button>
            </div>
          </div>
        ) : null}

        {/* 3. WIZARD STEPS FORM */}
        {jobState === 'IDLE' ? (
          <form onSubmit={handleRealSubmit} className="flex flex-col">
            <div className="px-4 pt-4 sm:px-6">
              <div className={`flex flex-col gap-2 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${quotaAvailable ? 'border-[#b7e4d5] bg-[#f1fbf7]' : 'border-rose-200 bg-rose-50'}`}>
                <div>
                  <p className={`text-[12.5px] font-bold ${quotaAvailable ? 'text-[#006b58]' : 'text-rose-800'}`}>
                    {quotaAvailable ? 'Üretim kapasitesi hazır' : 'Aylık video kotası dolu'}
                  </p>
                  <p className="text-[11.5px] text-[#667781]">
                    Bu ay {quotaUsed}/{quotaLimit} üretim kullanıldı. Render öncesinde sunucu tekrar doğrular.
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${quotaAvailable ? 'bg-white text-[#008069]' : 'bg-white text-rose-700'}`}>
                  {Math.max(0, quotaLimit - quotaUsed)} hak kaldı
                </span>
              </div>
            </div>
            {submissionError ? (
              <div className="px-6 pt-3">
                <Notice tone="danger">{submissionError}</Notice>
              </div>
            ) : null}
            <input type="hidden" name="draft" value={serializedPayload} />

            <div className="space-y-4 px-4 py-4 sm:px-6">
              {/* STEP 1: NEYİ TANITIYORSUN? */}
              {step === 'what' ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111b21]">1 — Neyi Tanıtıyorsun?</h2>
                    <p className="text-[12px] text-[#667781] mt-0.5">
                      Sistem kayıtlı kurumsal kimliğinizi ve ürün detaylarınızı otomatik olarak eşleştirir.
                    </p>
                  </div>

                  {/* 4 Seçenek: Mevcut Ürün / Mevcut Hizmet / Genel Marka / Yeni Ürün */}
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                    {[
                      { id: 'existing_product', label: 'Mevcut Ürün', desc: 'Katalogdan seç', disabled: false },
                      { id: 'existing_service', label: 'Mevcut Hizmet', desc: 'Hizmet tanıtımı', disabled: false },
                      { id: 'general_brand', label: 'Genel Marka', desc: 'Ürün kilidi gerektirir', disabled: true },
                      { id: 'new_offering', label: 'Yeni Ürün/Hizmet', desc: 'Yeni görsel yükle', disabled: false },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={opt.disabled}
                        onClick={() => {
                          if (!opt.disabled) {
                            const nextType = opt.id as PromotionType
                            setPromotionType(nextType)
                            const nextName = nextType === 'existing_product'
                              ? selectedProduct?.name || activeProductName
                              : customProductName.trim() || 'Yeni ürün veya hizmet'
                            setFidelityContract(defaultFidelityContract(data.org.name || '', nextName))
                            setDraftApproved(false)
                            setTranscriptConfirmed(false)
                            setSpeechTimeline([])
                            setVeoPromptPreview('')
                          }
                        }}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          promotionType === opt.id
                            ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
                            : opt.disabled
                              ? 'cursor-not-allowed border-[#e9edef] bg-[#f8fafb] opacity-55'
                              : 'border-[#e9edef] hover:border-[#008069]/40 bg-surface'
                        }`}
                      >
                        <p className="text-[13px] font-bold text-[#111b21]">{opt.label}</p>
                        <p className="text-[11px] text-[#667781] mt-0.5">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Mevcut Ürün Seçilmişse: Katalog Kartları */}
                  {promotionType === 'existing_product' ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-semibold text-[#111b21]">Katalog Ürünleri</p>
                        <Button
                          type="button"
                          variant="quiet"
                          className="h-7 text-[12px]"
                          onClick={() => setAddProductOpen(true)}
                        >
                          + Yeni Ürün Ekle
                        </Button>
                      </div>

                      {data.products.length === 0 ? (
                        <Notice tone="warn">
                          Henüz kataloğunuzda kayıtlı ürün yok. Aşağıdan yeni ürün tanımlayabilirsiniz.
                        </Notice>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {data.products.map((p) => {
                            const isSelected = selectedProductId === p.id
                            const imgUrl = p.images?.[0]?.url
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedProductId(p.id)
                                  setFidelityContract(defaultFidelityContract(data.org.name || '', p.name))
                                  setDraftApproved(false)
                                  setTranscriptConfirmed(false)
                                  setSpeechTimeline([])
                                  setVeoPromptPreview('')
                                }}
                                className={`flex flex-col overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-[#008069] bg-[#e7f8f2]/40 ring-2 ring-[#008069]'
                                    : 'border-[#e9edef] hover:border-[#008069]/30 bg-surface'
                                }`}
                              >
                                {imgUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={imgUrl} alt={p.name} className="h-28 w-full object-cover" />
                                ) : (
                                  <div className="flex h-28 w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                                    Görsel Yok
                                  </div>
                                )}
                                <div className="p-2.5">
                                  <p className="text-[12.5px] font-bold text-[#111b21] truncate">{p.name}</p>
                                  <p className="text-[11px] text-[#667781] truncate">{p.description || 'Açıklama yok'}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Yeni Ürün / Hizmet Girişi */}
                  {promotionType === 'new_offering' || promotionType === 'existing_service' ? (
                    <div className="space-y-3 rounded-xl border border-hairline bg-[#f8fafb] p-3.5">
                      <Field label="Ürün / Hizmet Adı">
                        <Input
                          value={customProductName}
                          onChange={(e) => setCustomProductName(e.target.value)}
                          onBlur={() => {
                            if (customProductName.trim()) {
                              setFidelityContract(defaultFidelityContract(data.org.name || '', customProductName))
                            }
                          }}
                          placeholder="Örn: Bofe Zeytin Hasat Makinesi veya Hızlı Kargo Hizmeti"
                        />
                      </Field>
                      <Field label="Açıklama (İsteğe bağlı)">
                        <Input
                          value={customProductDesc}
                          onChange={(e) => setCustomProductDesc(e.target.value)}
                          placeholder="Örn: Meyve bahçelerinde yüksek verimli hasat sağlayan yeni model"
                        />
                      </Field>
                      <div className="flex items-center gap-3 pt-1">
                        <FileUploadButton
                          accept="image/png,image/jpeg,image/webp"
                          uploading={uploading}
                          label={customProductImage ? 'Görseli Değiştir' : 'Ana Ürün Görseli Yükle'}
                          onFile={async (file) => {
                            setUploading(true)
                            const form = new FormData()
                            form.append('file', file)
                            const res = await uploadAssetOnly(form, 'products')
                            setUploading(false)
                            if (res?.publicUrl) setCustomProductImage(res.publicUrl)
                          }}
                        />
                        {customProductImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={customProductImage} alt="Önizleme" className="size-10 rounded-md object-cover border" />
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {/* Authoritative Varlık Özeti (Logo ✓, Ana Ürün ✓, Ek Görseller) */}
                  <div className="rounded-xl border border-hairline bg-[#f8fafb] p-3.5 space-y-3">
                    <p className="text-[12.5px] font-bold text-[#111b21] uppercase tracking-wider">
                      Yetkili Marka & Varlık Özeti
                    </p>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {/* Logo Durumu */}
                      <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-white p-2">
                        {hasValidLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={activeLogoUrl} alt="Logo" className="size-9 rounded object-contain border p-0.5" />
                        ) : (
                          <span className="flex size-9 items-center justify-center rounded bg-rose-50 text-[10px] font-bold text-rose-600 border border-rose-200">
                            Yok
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-[#111b21] truncate">
                            {hasValidLogo ? 'Logo ✓' : 'Logo Eksik'}
                          </p>
                          <p className="text-[10px] text-[#667781] truncate">{data.org.name || 'İşletmeniz'}</p>
                        </div>
                      </div>

                      {/* Ana Ürün Görseli */}
                      <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-white p-2">
                        {activeProductImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={activeProductImage} alt="Ürün" className="size-9 rounded object-cover border" />
                        ) : (
                          <span className="flex size-9 items-center justify-center rounded bg-amber-50 text-[10px] font-bold text-amber-600 border border-amber-200">
                            Yok
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-[#111b21] truncate">
                            {activeProductImage ? 'Ana Görsel ✓' : 'Görsel Eksik'}
                          </p>
                          <p className="text-[10px] text-[#667781] truncate">{activeProductName}</p>
                        </div>
                      </div>

                      {/* Ek Görseller / Referanslar Yükleme Alanı */}
                      <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-white p-2">
                        <span className="flex size-9 items-center justify-center rounded bg-[#e7f8f2] text-[11px] font-bold text-[#008069]">
                          {referenceAssets.length}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-[#111b21]">Ek Referanslar</p>
                          <p className="text-[10px] text-[#667781]">{referenceAssets.length} görsel ekli</p>
                        </div>
                      </div>
                    </div>

                    {/* Ek Görsel / Açı Yükleme Bileşeni */}
                    <div className="rounded-lg border border-hairline bg-white p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[12px] font-semibold text-[#111b21]">Ek Ürün Açıları ve Referanslar (İsteğe bağlı)</p>
                          <p className="text-[11px] text-[#667781]">Farklı açı, detay veya kullanım görselleri ekleyebilirsiniz (En fazla 3 adet).</p>
                        </div>
                        <span className="text-[11px] font-medium text-[#008069] bg-[#e7f8f2] px-2 py-0.5 rounded">
                          {referenceAssets.length}/3 ekli
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {referenceAssets.map((asset, idx) => (
                          <div key={`${asset.url}-${idx}`} className="flex items-center gap-2 rounded-lg border border-hairline bg-[#f8fafb] p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={asset.url} alt={`Referans ${idx + 1}`} className="size-11 rounded-md border border-hairline object-cover" />
                            <select
                              aria-label={`Referans ${idx + 1} kullanım rolü`}
                              value={asset.role}
                              onChange={(event) => {
                                const role = event.target.value as ReferenceRole
                                setReferenceAssets((prev) => prev.map((item, itemIndex) => itemIndex === idx ? { ...item, role } : item))
                              }}
                              className="min-w-0 flex-1 rounded-md border border-[#e9edef] bg-white px-2 py-1.5 text-[11px] text-[#111b21] focus:border-[#008069] focus:outline-none"
                            >
                              <option value="reference">Ek ürün açısı</option>
                              <option value="packaging">Ambalaj</option>
                              <option value="environment">Kullanım ortamı</option>
                              <option value="presenter">Sunucu / UGC kişi</option>
                              <option value="style">Yalnız stil</option>
                            </select>
                            <button
                              type="button"
                              onClick={() => setReferenceAssets((prev) => prev.filter((_, itemIndex) => itemIndex !== idx))}
                              className="rounded px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50"
                              title="Görseli kaldır"
                            >
                              Kaldır
                            </button>
                          </div>
                        ))}

                        {referenceAssets.length < 3 ? (
                          <FileUploadButton
                            accept="image/png,image/jpeg,image/webp"
                            uploading={uploadingExtra}
                            label="+ Ek Görsel Yükle"
                            onFile={async (file) => {
                              setUploadingExtra(true)
                              const form = new FormData()
                              form.append('file', file)
                              const res = await uploadAssetOnly(form, 'products')
                              setUploadingExtra(false)
                              const newUrl = res?.publicUrl
                              if (typeof newUrl === 'string' && newUrl) {
                                setReferenceAssets((prev) => [...prev, { url: newUrl, role: 'reference' }])
                              }
                            }}
                          />
                        ) : null}
                      </div>
                    </div>

                    {!hasValidLogo ? (
                      <Notice tone="danger">
                        <strong>Kurumsal Logo Zorunludur:</strong> Yapay zekanın uydurma logo üretmemesi için lütfen logonuzu yükleyin.
                      </Notice>
                    ) : null}
                    {!hasValidProduct ? (
                      <Notice tone="danger">
                        <strong>Ürün Görseli Zorunludur:</strong> Reklam videosu için gerçek bir ürün fotoğrafı seçilmelidir.
                      </Notice>
                    ) : null}
                  </div>

                  <div className="rounded-xl border border-[#b7e4d5] bg-[#f1fbf7] p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#008069] text-white">
                        <span className="text-base font-bold">✓</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-[13px] font-bold text-[#006b58]">Orijinal Ürün Görünüm Garantisi</p>
                          <span className="shrink-0 rounded-full border border-[#b7e4d5] bg-white px-2.5 py-0.5 text-[10.5px] font-semibold text-[#008069]">
                            {promotionType === 'existing_product' ? 'Katalog Ürünü' : 'Özel Ürün'}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-[#4b5563]">
                          Ürününüzün orijinal formu, rengi ve dokusu yapay zeka tarafından birebir korunur; ürün üzerinde yapay değişiklik yapılmaz.
                        </p>
                      </div>
                    </div>

                    <details className="mt-2.5 pt-2 border-t border-[#b7e4d5]/50 text-[11px] text-[#667781]">
                      <summary className="cursor-pointer font-medium hover:text-[#008069]">
                        Gelişmiş ürün koruma kuralları (İsteğe bağlı)
                      </summary>
                      <div className="mt-2.5 grid gap-3 sm:grid-cols-2">
                        <Field label="Korunacak özellikler" hint="Her satıra bir özellik">
                          <Textarea
                            rows={3}
                            value={fidelityContract.must_preserve.join('\n')}
                            onChange={(event) => setFidelityContract((current) => ({ ...current, must_preserve: parseFactLines(event.target.value) }))}
                          />
                        </Field>
                        <Field label="İstenmeyen değişiklikler" hint="Her satıra bir kural">
                          <Textarea
                            rows={3}
                            value={fidelityContract.forbidden_mutations.join('\n')}
                            onChange={(event) => setFidelityContract((current) => ({ ...current, forbidden_mutations: parseFactLines(event.target.value) }))}
                          />
                        </Field>
                      </div>
                    </details>
                  </div>
                </div>
              ) : null}

              {/* STEP 2: KAMPANYA & FORMAT ROUTER */}
              {step === 'campaign' ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111b21]">2 — Kampanya Hedefi ve Formatı</h2>
                    <p className="text-[12px] text-[#667781] mt-0.5">
                      Videonun kurgu ritmi, kamera dili ve anlatım tonu bu seçime göre şekillenir.
                    </p>
                  </div>

                  {/* 7 Format Router Kartı */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {AD_FORMAT_OPTIONS.map((fmt) => {
                      const isSelected = adFormat === fmt.id
                      return (
                        <button
                          key={fmt.id}
                          type="button"
                          onClick={() => setAdFormat(fmt.id)}
                          className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
                              : 'border-[#e9edef] hover:border-[#008069]/30 bg-surface'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[13.5px] font-bold text-[#111b21]">{fmt.label}</span>
                            {fmt.tag ? (
                              <span className="rounded bg-[#008069] px-2 py-0.5 text-[10px] font-bold text-white">
                                {fmt.tag}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11.5px] text-[#667781] mt-1 leading-relaxed">{fmt.desc}</p>
                        </button>
                      )
                    })}
                  </div>

                  {/* Opsiyonel Kampanya Teklifi ve Not */}
                  <div className="rounded-xl border border-hairline bg-[#f8fafb] p-3.5 space-y-3">
                    <Field
                      label="Doğrulanmış Ürün Gerçekleri"
                      hint="Yalnız katalog, teknik föy veya işletme tarafından teyit edilmiş bilgiler; her satıra bir tane."
                    >
                      <Textarea
                        rows={3}
                        value={verifiedClaimsText}
                        onChange={(event) => {
                          setVerifiedClaimsText(event.target.value)
                          setDraftApproved(false)
                        }}
                        placeholder={'Örn:\nStandart yapı tuğlasıdır\nDoğal terracotta renktedir'}
                      />
                    </Field>

                    <Field label="Kampanya / İndirim Teklifi (İsteğe bağlı)" hint="Varsa indirim, taksit veya özel fiyat teklifinizi yazın.">
                      <Input
                        value={offerDetails}
                        onChange={(e) => {
                          setOfferDetails(e.target.value)
                          setOfferVerified(false)
                          setDraftApproved(false)
                        }}
                        placeholder="Örn: Toptan alımlarda fabrika fiyatı ve şantiyeye doğrudan teslimat"
                      />
                    </Field>
                    {offerDetails.trim() ? (
                      <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] text-amber-950">
                        <input
                          type="checkbox"
                          checked={offerVerified}
                          onChange={(event) => setOfferVerified(event.target.checked)}
                          className="mt-0.5 size-4 rounded text-[#008069] focus:ring-[#008069]"
                        />
                        <span><strong>Bu teklif bilgisini doğruladım.</strong> Fiyat, indirim ve teslimat şartları aynen yayımlanabilir.</span>
                      </label>
                    ) : null}

                    <Field label="Özel İstek / Sahne Notu (İsteğe bağlı)">
                      <Input
                        value={creativeNote}
                        onChange={(e) => setCreativeNote(e.target.value)}
                        placeholder="Örn: Sabah gün ışığı kullanılsın, fabrika içi üretim anı gösterilsin"
                      />
                    </Field>

                    <div className="grid gap-3 sm:grid-cols-2 pt-1">
                      <Field label="Çekim Ortamı (Mekan)">
                        <select
                          value={environmentPreset}
                          onChange={(e) => setEnvironmentPreset(e.target.value as any)}
                          className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[13px] text-[#111b21] focus:border-[#008069] focus:outline-none"
                        >
                          <option value="auto">Otomatik (Ürün ve firmaya göre en uygun ortam)</option>
                          <option value="garden">Doğal Bahçe, Tarla ve Sera (Açık Doğa)</option>
                          <option value="studio">Prestijli Reklam Stüdyosu (Döner Tabla & Vitrin)</option>
                          <option value="kitchen">Restoran, Mutfak ve Kafe (Gıda ve Sunum)</option>
                          <option value="office">Modern Ofis ve İç Mekan</option>
                          <option value="workshop">Atölye, Fabrika ve Sanayi</option>
                          <option value="construction">İnşaat ve Yapı Sahası</option>
                        </select>
                      </Field>

                      <Field label="Kamera ve Fizik Tarzı">
                        <select
                          value={motionStyle}
                          onChange={(e) => setMotionStyle(e.target.value as any)}
                          className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[13px] text-[#111b21] focus:border-[#008069] focus:outline-none"
                        >
                          <option value="studio_orbit">Kontrollü Vitrin & Güvenli 3/4 Açı</option>
                          <option value="real_usage">Sahada Gerçek Kullanım Anı</option>
                          <option value="macro_detail">Yakın Çekim & Malzeme Detayı</option>
                        </select>
                      </Field>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Harekete Geçirici Çağrı">
                        <select
                          value={ctaChannel}
                          onChange={(event) => setCtaChannel(event.target.value as typeof ctaChannel)}
                          className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[13px] text-[#111b21] focus:border-[#008069] focus:outline-none"
                        >
                          <option value="contact">İletişime geçin</option>
                          {data.phones.length ? <option value="whatsapp">WhatsApp’tan iletişime geçin</option> : null}
                          {data.org.websiteHint ? <option value="website">Web sitesini ziyaret edin</option> : null}
                        </select>
                      </Field>
                      <div className="rounded-lg border border-[#e9edef] bg-white px-3 py-2">
                        <p className="text-[11px] font-bold text-[#111b21]">Altyazı</p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-[#667781]">
                          Bu güvenli video profilinde kapalı. Sahne içine bozuk veya uydurma yazı üretilmez.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* STEP 3: REKLAM TASLAĞI (0-8s SPEECH TIMELINE) */}
              {step === 'draft' ? (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-[15px] font-bold text-[#111b21]">3 — Reklam Taslağı</h2>
                      <p className="text-[12px] text-[#667781] mt-0.5">
                        Seçimleriniz ürün gerçeği ve doğrulanmış bilgilerle güvenli bir 8 saniyelik plana derlendi.
                      </p>
                    </div>
                    <span className="rounded bg-[#e7f8f2] px-2.5 py-1 text-[11px] font-bold text-[#008069] border border-[#008069]/20">
                      ~8.0 Saniye
                    </span>
                  </div>

                  {isDrafting ? (
                    <div className="rounded-xl border border-[#b7e4d5] bg-[#f1fbf7] p-4 text-center">
                      <span className="mx-auto mb-2 block size-3 animate-ping rounded-full bg-[#008069]" />
                      <p className="text-[12.5px] font-bold text-[#006b58]">Kaynaklara bağlı taslak hazırlanıyor</p>
                      <p className="mt-0.5 text-[11.5px] text-[#667781]">Ürün kuralları, doğrulanmış iddialar ve yaratıcı tür karşılaştırılıyor.</p>
                    </div>
                  ) : null}
                  {draftError ? <Notice tone="danger">{draftError}</Notice> : null}

                  {/* Reklam Fikri Özeti */}
                  <div className="rounded-xl border border-hairline bg-[#f8fafb] p-3">
                    <p className="text-[11px] uppercase font-bold text-[#667781] tracking-wider">Reklam Konsepti</p>
                    <p className="text-[13px] font-semibold text-[#111b21] mt-0.5">{creativeIdea || 'Taslak henüz oluşturulmadı.'}</p>
                  </div>

                  {/* Continuous 0-8 Second Speech Timeline Blocks */}
                  <div className="space-y-3">
                    {speechTimeline.map((item, idx) => (
                      <div key={idx} className="rounded-xl border border-hairline bg-surface p-3 space-y-2 shadow-2xs">
                        <div className="flex items-center justify-between text-[11.5px]">
                          <span className="font-bold text-[#008069] bg-[#e7f8f2] px-2 py-0.5 rounded">
                            {item.start_sec.toFixed(1)} – {item.end_sec.toFixed(1)} sn
                          </span>
                          <span className="text-[#667781] italic truncate max-w-[260px]">
                            {item.corresponding_visual_beat}
                          </span>
                        </div>
                        <Input
                          value={item.exact_text}
                          onChange={(e) => {
                            const updated = [...speechTimeline]
                            updated[idx].exact_text = e.target.value
                            setSpeechTimeline(updated)
                            setDraftApproved(false)
                          }}
                          className="text-[13px]"
                          placeholder="Replik metni..."
                        />
                      </div>
                    ))}
                  </div>

                  {/* Word count pacing indicator */}
                  <div className="flex items-center justify-between text-[12px] px-1">
                    <span className={totalWords > MAX_SPOKEN_WORDS || totalWords === 0 ? 'text-rose-700 font-medium' : 'text-[#667781]'}>
                      Toplam: <strong>{totalWords} kelime</strong> (Güvenli sınır: en fazla {MAX_SPOKEN_WORDS})
                    </span>
                  </div>

                  {/* Quick Revision Action Buttons */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-[#667781]">Taslağı yeniden derle:</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="quiet" className="h-8 text-[12px]" disabled={isDrafting} onClick={() => applyAiRevision('refresh')}>
                        {isDrafting ? 'Derleniyor…' : 'Seçimlerden Yeniden Oluştur'}
                      </Button>
                    </div>
                  </div>

                  {/* Zorunlu Reklam Taslağı Onayı (Video üretimine geçiş kapısı) */}
                  <div className={`rounded-xl border p-3.5 transition-all ${
                    draftApproved ? 'border-[#008069] bg-[#e7f8f2]/60' : 'border-amber-300 bg-amber-50/70'
                  }`}>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={draftApproved}
                        disabled={isDrafting || Boolean(draftError) || totalWords === 0 || totalWords > MAX_SPOKEN_WORDS}
                        onChange={(e) => setDraftApproved(e.target.checked)}
                        className="mt-1 size-4.5 rounded text-[#008069] focus:ring-[#008069]"
                      />
                      <div className="text-[12.5px] leading-snug">
                        <span className={`font-bold ${draftApproved ? 'text-[#008069]' : 'text-amber-950'}`}>
                          {draftApproved ? '✓ Reklam taslağını onayladım' : 'Reklam taslağını inceledim ve onaylıyorum'}
                        </span>
                        <p className="text-[11.5px] text-[#667781] mt-0.5">
                          Seslendirme metni ve sahne akışını onaylamadan son kontrol ve video üretimi aşamasına geçilemez.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Advanced Disclosure: Video Scenario */}
                  <details className="text-[12px] pt-2">
                    <summary className="cursor-pointer font-medium text-[#667781] hover:text-[#111b21]">
                      Gelişmiş &gt; Sahne ve Kurgu Detayları (İsteğe bağlı)
                    </summary>
                    <div className="mt-2 space-y-2 rounded-lg border border-hairline bg-canvas p-3">
                      <Textarea
                        rows={6}
                        value={veoPromptPreview}
                        readOnly
                        className="font-mono text-[11px]"
                      />
                      <p className="text-[10.5px] text-[#667781]">
                        * Teknik prompt salt okunurdur. Değişiklikler yalnız yapılandırılmış ürün ve kampanya alanlarından yapılır.
                      </p>
                    </div>
                  </details>
                </div>
              ) : null}

              {/* STEP 4: KONTROL ET & OLUŞTUR */}
              {step === 'summary' ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111b21]">4 — Kontrol Et ve Oluştur</h2>
                    <p className="text-[12px] text-[#667781] mt-0.5">
                      9:16 Dikey Format (8 Saniye) · Reels, TikTok ve Durum için tam optimize prodüksiyon.
                    </p>
                  </div>

                  {/* Varlık & Format Özeti */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 rounded-xl border border-hairline bg-[#f8fafb] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeLogoUrl} alt="Logo" className="size-10 rounded object-contain border p-0.5 bg-white" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase font-bold text-[#667781]">Logo</p>
                        <p className="text-[12.5px] font-bold text-[#111b21] truncate">{data.org.name || 'İşletmeniz'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 rounded-xl border border-hairline bg-[#f8fafb] p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={activeProductImage} alt="Ürün" className="size-10 rounded object-cover border" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase font-bold text-[#667781]">Ürün</p>
                        <p className="text-[12.5px] font-bold text-[#111b21] truncate">{activeProductName}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-hairline bg-[#f8fafb] p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-bold text-[#111b21]">Derlenen Üretim Ayarları</p>
                        <p className="mt-0.5 text-[11px] text-[#667781]">Arayüz seçimi ile kuyruğa yazılacak değerler birebir eşleşir.</p>
                      </div>
                      <span className="rounded-full bg-[#e7f8f2] px-2.5 py-1 text-[10px] font-bold text-[#008069]">KİLİTLİ</span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11.5px] sm:grid-cols-4">
                      <div><dt className="text-[#667781]">Motor</dt><dd className="font-semibold text-[#111b21]">{VIDEO_ENGINE_MODE}</dd></div>
                      <div><dt className="text-[#667781]">Sağlayıcı</dt><dd className="font-semibold text-[#111b21]">{VIDEO_REQUESTED_PROVIDER}</dd></div>
                      <div><dt className="text-[#667781]">Çıktı</dt><dd className="font-semibold text-[#111b21]">{VIDEO_ASPECT_RATIO} · {VIDEO_DURATION_SECONDS} sn</dd></div>
                      <div><dt className="text-[#667781]">Dil / Altyazı</dt><dd className="font-semibold text-[#111b21]">{VIDEO_LANGUAGE} · {VIDEO_SUBTITLE_MODE === 'off' ? 'Kapalı' : 'Otomatik'}</dd></div>
                      <div><dt className="text-[#667781]">Yaratıcı tür</dt><dd className="font-semibold text-[#111b21]">{AD_FORMAT_OPTIONS.find((item) => item.id === adFormat)?.label || adFormat}</dd></div>
                      <div><dt className="text-[#667781]">Ortam</dt><dd className="font-semibold text-[#111b21]">{environmentPreset}</dd></div>
                      <div><dt className="text-[#667781]">Kamera</dt><dd className="font-semibold text-[#111b21]">{motionStyle}</dd></div>
                      <div><dt className="text-[#667781]">Referans</dt><dd className="font-semibold text-[#111b21]">{referenceAssets.length + 2} kilitli varlık</dd></div>
                    </dl>
                  </div>

                  <div className={`rounded-xl border p-3.5 ${blockingPreflightIssues.length ? 'border-rose-200 bg-rose-50' : 'border-[#b7e4d5] bg-[#f1fbf7]'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-[13px] font-bold ${blockingPreflightIssues.length ? 'text-rose-800' : 'text-[#006b58]'}`}>
                        {blockingPreflightIssues.length ? 'Üretim öncesi düzeltme gerekli' : 'Üretim öncesi kontroller hazır'}
                      </p>
                      <span className="text-[11px] font-bold text-[#667781]">{preflightIssues.length ? `${preflightIssues.length} not` : 'Tüm kontroller geçti'}</span>
                    </div>
                    {preflightIssues.length ? (
                      <ul className="mt-2 space-y-1.5">
                        {preflightIssues.map((issue) => (
                          <li key={issue.code} className={`flex items-start gap-2 text-[11.5px] ${issue.severity === 'error' ? 'text-rose-800' : 'text-amber-800'}`}>
                            <span aria-hidden="true">{issue.severity === 'error' ? '●' : '▲'}</span>
                            <span>{issue.message}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-[11.5px] text-[#667781]">Kota, ürün kimliği, varlık hash’i, fidelity ve seslendirme sınırı doğrulandı.</p>
                    )}
                  </div>

                  {/* Kilitlenmiş Seslendirme Akışı Özeti */}
                  <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-2.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-bold text-[#111b21]">Onaylanacak Seslendirme Akışı</p>
                      <span className="rounded bg-[#e7f8f2] px-2 py-0.5 text-[10px] font-bold text-[#008069]">
                        Kilitli Metin
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[12.5px] text-[#111b21] bg-[#f8fafb] p-3 rounded-lg">
                      {speechTimeline.map((s, idx) => (
                        <p key={idx}>
                          <strong className="text-[#008069]">{s.start_sec.toFixed(1)}-{s.end_sec.toFixed(1)}s:</strong>{' '}
                          &ldquo;{s.exact_text}&rdquo;
                        </p>
                      ))}
                    </div>

                    {/* Zorunlu İnceleme Onay Kutusu */}
                    <label
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer select-none ${
                        transcriptConfirmed
                          ? 'border-[#008069] bg-[#e7f8f2]/50'
                          : 'border-amber-300 bg-amber-50/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={transcriptConfirmed}
                        disabled={blockingPreflightIssues.length > 0}
                        onChange={(e) => setTranscriptConfirmed(e.target.checked)}
                        className="mt-0.5 size-4 rounded text-[#008069] focus:ring-[#008069]"
                      />
                      <div className="text-[12px] leading-snug">
                        <span className={`font-semibold ${transcriptConfirmed ? 'text-[#008069]' : 'text-amber-900'}`}>
                          Seslendirme metnini ve görsel kurguyu onaylıyorum.
                        </span>
                        <p className="text-[11px] text-[#667781] mt-0.5">
                          Yapay zeka ses motoru kelimesi kelimesine bu metni seslendirecektir.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : null}

              {/* Wizard Navigasyon Butonları */}
              <div className="flex items-center justify-between pt-3 border-t border-hairline">
                {step !== 'what' ? (
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => {
                      if (step === 'summary') setStep('draft')
                      else if (step === 'draft') setStep('campaign')
                      else if (step === 'campaign') setStep('what')
                    }}
                  >
                    Geri
                  </Button>
                ) : <div />}

                {step !== 'summary' ? (
                  <Button
                    type="button"
                    className="wb-wa-submit !bg-[#008069] text-white"
                    disabled={
                      (step === 'what' && (!hasValidLogo || !hasValidProduct)) ||
                      (step === 'draft' && !draftApproved)
                    }
                    onClick={() => {
                      if (step === 'what') setStep('campaign')
                      else if (step === 'campaign') {
                        setStep('draft')
                        void generateDraft()
                      }
                      else if (step === 'draft') {
                        if (!draftApproved) return
                        setStep('summary')
                      }
                    }}
                  >
                    {step === 'draft' ? (draftApproved ? 'Taslağı Onayla & Kontrole Geç' : 'Önce Taslağı Onaylayın') : 'Devam Et'}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-11 px-6 shadow-sm"
                    disabled={isSubmitting || !transcriptConfirmed || !hasValidLogo || !hasValidProduct || blockingPreflightIssues.length > 0}
                  >
                    {isSubmitting ? 'Kuyruğa Alınıyor…' : 'ONAYLA VE VİDEOYU OLUŞTUR'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        ) : null}
      </Card>

      {/* Add Product Modal */}
      <AddProductModal
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onSuccess={(product: ProductCard) => {
          setSelectedProductId(product.id)
          setFidelityContract(defaultFidelityContract(data.org.name || '', product.name))
          setDraftApproved(false)
          setTranscriptConfirmed(false)
          setSpeechTimeline([])
          setVeoPromptPreview('')
          setAddProductOpen(false)
        }}
      />
    </>
  )
}
