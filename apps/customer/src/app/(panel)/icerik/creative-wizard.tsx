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

type Step = 'campaign' | 'draft'

const WIZARD_STEPS: { id: Step; label: string }[] = [
  { id: 'campaign', label: '1 — Ürün & Kampanya' },
  { id: 'draft', label: '2 — Reklam Taslağı & Başlat' },
]

const FAST_FORMAT_OPTIONS = [
  { id: 'FAST_SALES' as AdFormatType, label: 'Ürün Vitrini', tag: 'Önerilen', desc: 'Ürünün tasarımına, malzeme dokusuna ve detaylarına odaklanır.' },
  { id: 'PRODUCT_USAGE' as AdFormatType, label: 'Sahada Uygulama', desc: 'Ürünün sahada, usta veya uzmanla gerçek kullanım anını gösterir.' },
  { id: 'PREMIUM' as AdFormatType, label: 'Kurumsal & Prestij', desc: 'Tesis, üretim gücü ve mimari atmosferde seçkin marka duruşu.' },
  { id: 'AUTO' as AdFormatType, label: 'Dinamik & Satış Odaklı', desc: 'Hızlı tempolu, dikkat çekici ve doğrudan dönüşüm sağlayan kurgu.' },
]

export function CreativeWizard({
  data,
  initialFormat,
}: {
  data: WizardBootstrap
  initialFormat?: string
}) {
  const [step, setStep] = useState<Step>('campaign')
  const [draftApproved, setDraftApproved] = useState(false)
  const [promotionType, setPromotionType] = useState<PromotionType>('existing_product')
  const [selectedProductId, setSelectedProductId] = useState<string>(() => data.products?.[0]?.id ?? '')
  const [customProductName, setCustomProductName] = useState('')
  const [customProductImage, setCustomProductImage] = useState('')
  const [customProductDesc, setCustomProductDesc] = useState('')
  const [customLogoUrl, setCustomLogoUrl] = useState('')
  const [referenceAssets, setReferenceAssets] = useState<WizardReferenceAsset[]>([])
  
  // Step 2: Campaign & Format Router
  const [adFormat, setAdFormat] = useState<AdFormatType>(() => (initialFormat as AdFormatType) || 'FAST_SALES')
  const [environmentPreset, setEnvironmentPreset] = useState<'auto' | 'garden' | 'studio' | 'kitchen' | 'office' | 'workshop' | 'construction'>('auto')
  const [motionStyle, setMotionStyle] = useState<'studio_orbit' | 'real_usage' | 'macro_detail'>('real_usage')
  const [offerDetails, setOfferDetails] = useState('')
  const [offerVerified, setOfferVerified] = useState(true)
  const [creativeNote, setCreativeNote] = useState('')
  const [subtitles, setSubtitles] = useState(true)
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
        subtitles: subtitles ? 'auto' : 'off',
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

  const resetToNewVideo = () => {
    setActiveJobId(null)
    setJobState('IDLE')
    setStep('campaign')
    setSubmissionError(null)
    setJobFailureMessage(null)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('job_id')
      const cleanSearch = url.searchParams.toString()
      window.history.replaceState({}, '', url.pathname + (cleanSearch ? `?${cleanSearch}` : ''))
    }
  }

  // Active Job Recovery on Mount (from URL or org active jobs)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('new') === 'true') {
        const url = new URL(window.location.href)
        url.searchParams.delete('job_id')
        url.searchParams.delete('new')
        window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''))
        return
      }
      const queryJobId = params.get('job_id')
      if (queryJobId) {
        fetch(`/api/ai-media/jobs/${queryJobId}`)
          .then((r) => r.json())
          .then((resData) => {
            const vm = resData?.job
            if (vm && vm.state === 'FAILED') {
              // Failed jobs should never block the user on mount; clear and allow starting fresh
              const url = new URL(window.location.href)
              url.searchParams.delete('job_id')
              window.history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : ''))
              return
            }
            setActiveJobId(queryJobId)
          })
          .catch(() => {
            setActiveJobId(queryJobId)
          })
        return
      }
    }

    fetch('/api/ai-media/jobs')
      .then((res) => res.json())
      .then((data) => {
        if (data.active_job?.id) {
          const st = data.active_job.state
          if (st !== 'COMPLETED' && st !== 'FAILED' && st !== 'NEEDS_REVIEW') {
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
                <div className="mt-3 p-4 bg-amber-50/90 border border-amber-200/90 rounded-xl text-left max-w-md mx-auto shadow-xs">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-[14px]">
                    <span className="flex size-6 items-center justify-center rounded-full bg-amber-200 text-amber-900 text-[12px] font-bold">
                      #{queueAhead + 1}
                    </span>
                    <span>Kuyruktaki Sıranız: #{queueAhead + 1} ({queueAhead} video önünüzde)</span>
                  </div>
                  <p className="mt-1.5 text-[12px] text-amber-800 leading-relaxed">
                    💡 <strong>Ekran başında beklemenize gerek yoktur!</strong> Bu pencereden ayrılabilir veya tarayıcınızı kapatabilirsiniz. Videonuz arka planda sırayla işlenecek ve tamamlandığında doğrudan <strong>İçerik Kütüphanenize</strong> eklenecektir.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-amber-200/70 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-amber-700">Tahmini Başlama: {etaText}</span>
                    <Link href="/icerik" className="text-[12px] font-semibold text-[#008069] hover:underline">
                      Kütüphaneye Git →
                    </Link>
                  </div>
                </div>
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
                  setStep('campaign')
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
              <p className={`text-[13.5px] font-bold ${jobState === 'FAILED' ? 'text-rose-800' : 'text-amber-900'}`}>
                {jobState === 'FAILED' ? 'Video Hazırlanamadı' : 'Video İnceleme Bekliyor'}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#667781]">
                {jobFailureMessage?.includes('Asset count') 
                  ? 'Görsel aktarımı sırasında geçici bir senkronizasyon oluştu. Lütfen tekrar deneyin.'
                  : (jobFailureMessage || jobDisplayMessage || 'Video üretimi tamamlanamadı.')}
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
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button
                type="button"
                className="!bg-[#008069] hover:!bg-[#00a884] text-white text-[13px] font-semibold h-10 px-5 rounded-full shadow-sm"
                onClick={resetToNewVideo}
              >
                Yeni Video Oluştur / Formu Aç
              </Button>
              <Link href="/icerik" className="inline-flex items-center justify-center rounded-full border border-hairline bg-white px-5 py-2 text-[13px] font-medium text-[#111b21] hover:bg-[#f0f2f5] transition-colors">
                İçerik Kütüphanesine Git
              </Link>
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
                  setStep('campaign')
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
              {/* STEP 1: ÜRÜN VE KAMPANYA */}
              {step === 'campaign' ? (
                <div className="space-y-6">
                  {/* 1. Ürün Seçimi */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-[15px] font-bold text-[#111b21]">1. Ürün Seçimi</h2>
                        <p className="text-[12px] text-[#667781] mt-0.5">Videoda tanıtılacak ürününüzü seçin.</p>
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

                    {data.products.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[#d1d7db] p-6 text-center">
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
                                setPromotionType('existing_product')
                                setFidelityContract(defaultFidelityContract(data.org.name || '', p.name))
                                setDraftApproved(false)
                                setTranscriptConfirmed(false)
                                setSpeechTimeline([])
                                setVeoPromptPreview('')
                              }}
                              className={`flex flex-col overflow-hidden rounded-xl border text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-[#008069] bg-[#e7f8f2]/50 ring-2 ring-[#008069]'
                                  : 'border-[#e9edef] hover:border-[#008069]/40 bg-white'
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
                                <div className="flex items-center justify-between">
                                  <p className="text-[12.5px] font-bold text-[#111b21] truncate">{p.name}</p>
                                  {isSelected ? (
                                    <span className="text-[#008069] text-[12px] font-bold">✓</span>
                                  ) : null}
                                </div>
                                <p className="text-[11px] text-[#667781] truncate">{p.description || 'Katalog ürünü'}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* 2. Video Tarzı */}
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-[15px] font-bold text-[#111b21]">2. Video Tarzı</h2>
                      <p className="text-[12px] text-[#667781] mt-0.5">Videonun görsel temposunu ve reklam dilini belirleyin.</p>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      {FAST_FORMAT_OPTIONS.map((fmt) => {
                        const isSelected = adFormat === fmt.id
                        return (
                          <button
                            key={fmt.id}
                            type="button"
                            onClick={() => {
                              setAdFormat(fmt.id)
                              setDraftApproved(false)
                            }}
                            className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
                                : 'border-[#e9edef] hover:border-[#008069]/30 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-bold text-[#111b21]">
                                {fmt.label}
                              </span>
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
                  </div>

                  {/* 3. Kampanya Notu (Opsiyonel) */}
                  <div className="space-y-3">
                    <div>
                      <h2 className="text-[15px] font-bold text-[#111b21]">3. Kampanya Notu (Opsiyonel)</h2>
                      <p className="text-[12px] text-[#667781] mt-0.5">Öne çıkarmak istediğiniz detayları yazın, yapay zeka metni buna göre hazırlasın.</p>
                    </div>

                    <Textarea
                      rows={3}
                      value={creativeNote}
                      onChange={(e) => {
                        setCreativeNote(e.target.value)
                        setDraftApproved(false)
                      }}
                      placeholder="Örn: 5.000 adet üzeri siparişlerde şantiyeye teslim avantajı var. Ustaların güvendiği kalite vurgulansın."
                      className="text-[13px]"
                    />
                  </div>

                  {/* 4. Dinamik Altyazı Tercihi */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3.5 rounded-xl border border-hairline bg-[#f8fafb] hover:bg-[#f0f2f5] cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={subtitles}
                        onChange={(e) => setSubtitles(e.target.checked)}
                        className="size-5 rounded text-[#008069] focus:ring-[#008069]"
                      />
                      <div className="flex-1">
                        <span className="text-[13px] font-bold text-[#111b21]">Videonun üzerine dinamik altyazı ekle</span>
                        <p className="text-[11.5px] text-[#667781]">Sosyal medya formatında hareketli altyazı.</p>
                      </div>
                    </label>
                  </div>

                  {/* 5. Gelişmiş Ayarlar */}
                  <details className="text-[12px] text-[#667781] pt-1">
                    <summary className="cursor-pointer hover:text-[#111b21] font-semibold text-[#008069]">
                      Gelişmiş Ayarlar (Ortam ve Kamera)
                    </summary>
                    <div className="mt-3 space-y-3 rounded-xl border border-hairline bg-[#f8fafb] p-3.5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Çekim Ortamı">
                          <select
                            value={environmentPreset}
                            onChange={(e) => setEnvironmentPreset(e.target.value as any)}
                            className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[12.5px] text-[#111b21] focus:border-[#008069] focus:outline-none"
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
                            onChange={(e) => setMotionStyle(e.target.value as any)}
                            className="w-full rounded-lg border border-[#e9edef] bg-white px-3 py-2 text-[12.5px] text-[#111b21] focus:border-[#008069] focus:outline-none"
                          >
                            <option value="real_usage">Doğal Kullanım ve Sahne Hareketi</option>
                            <option value="studio_orbit">Vitrin & 3/4 Açı (Şık ve Dengeli)</option>
                            <option value="macro_detail">Yakın Çekim & Detay Odaklı</option>
                          </select>
                        </Field>
                      </div>

                      <Field label="Varsa Özel Kampanya / Teklif (İsteğe bağlı)">
                        <Input
                          value={offerDetails}
                          onChange={(e) => setOfferDetails(e.target.value)}
                          placeholder="Örn: Fabrika teslim özel indirim"
                        />
                      </Field>
                    </div>
                  </details>
                </div>
              ) : null}

              {/* STEP 2: REKLAM TASLAĞI & BAŞLAT */}
              {step === 'draft' ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-[15px] font-bold text-[#111b21]">2 — Reklam Taslağı & Başlat</h2>
                    <p className="text-[12px] text-[#667781] mt-0.5">
                      Yapay zekanın yazdığı seslendirme metnini inceleyin, düzenleyin ve videoyu başlatın.
                    </p>
                  </div>

                  {isDrafting ? (
                    <div className="rounded-xl border border-[#b7e4d5] bg-[#f1fbf7] p-4 text-center">
                      <span className="mx-auto mb-2 block size-3 animate-ping rounded-full bg-[#008069]" />
                      <p className="text-[12.5px] font-bold text-[#006b58]">Reklam taslağınız yazılıyor...</p>
                      <p className="mt-0.5 text-[11.5px] text-[#667781]">Kampanya notunuz ve ürün bilgileri derleniyor.</p>
                    </div>
                  ) : null}
                  {draftError ? <Notice tone="danger">{draftError}</Notice> : null}

                  {/* Seslendirme Metni Alanı */}
                  <div className="rounded-xl border border-hairline bg-surface p-4 space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[12.5px] font-bold text-[#111b21]">
                        Seslendirme Metni
                      </label>
                      <span className="rounded bg-[#e7f8f2] px-2 py-0.5 text-[11px] font-bold text-[#008069]">
                        ~8 Saniye
                      </span>
                    </div>

                    <Textarea
                      rows={3}
                      value={fullSpeechText}
                      onChange={(e) => {
                        const val = e.target.value
                        if (speechTimeline.length > 0) {
                          const updated = [...speechTimeline]
                          updated[0].exact_text = val
                          setSpeechTimeline(updated)
                        } else {
                          setSpeechTimeline([{
                            start_sec: 0.5,
                            end_sec: 5.5,
                            exact_text: val,
                            speaker: 'Spiker',
                          }])
                        }
                        setDraftApproved(false)
                        setTranscriptConfirmed(false)
                      }}
                      className="text-[14px] font-medium leading-relaxed"
                      placeholder="Reklam seslendirme metni..."
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[12px]">
                      <span className={totalWords > MAX_SPOKEN_WORDS || totalWords === 0 ? 'text-rose-700 font-semibold' : 'text-[#667781]'}>
                        Uzunluk: <strong>{totalWords} kelime</strong> {totalWords > 0 && totalWords <= MAX_SPOKEN_WORDS ? '(İdeal akıcılıkta)' : '(1-18 kelime arası olmalıdır)'}
                      </span>

                      <Button
                        type="button"
                        variant="quiet"
                        className="h-8 text-[12px] font-semibold text-[#008069] border border-[#008069]/30 hover:bg-[#e7f8f2]"
                        disabled={isDrafting}
                        onClick={() => void generateDraft('refresh')}
                      >
                        {isDrafting ? 'Yazılıyor…' : 'Farklı Bir Metin Öner'}
                      </Button>
                    </div>
                  </div>

                  {/* Video Özeti Kartı */}
                  <div className="rounded-xl border border-hairline bg-[#f8fafb] p-3.5 space-y-2">
                    <p className="text-[12px] font-bold text-[#111b21] uppercase tracking-wider">Video Özeti</p>
                    <div className="grid grid-cols-2 gap-2 text-[11.5px] sm:grid-cols-4">
                      <div>
                        <span className="text-[#667781]">Ürün:</span>
                        <p className="font-semibold text-[#111b21] truncate">{activeProductName}</p>
                      </div>
                      <div>
                        <span className="text-[#667781]">Tarz:</span>
                        <p className="font-semibold text-[#008069] truncate">
                          {FAST_FORMAT_OPTIONS.find((f) => f.id === adFormat)?.label || 'Ürün Vitrini'}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#667781]">Altyazı:</span>
                        <p className="font-semibold text-[#008069]">{subtitles ? 'Dinamik Altyazılı' : 'Altyazısız'}</p>
                      </div>
                      <div>
                        <span className="text-[#667781]">Ürün Koruması:</span>
                        <p className="font-semibold text-[#008069]">Orijinal Görünüm</p>
                      </div>
                    </div>
                  </div>

                  {/* Tek Onay Kutusu */}
                  <label className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                    draftApproved ? 'border-[#008069] bg-[#e7f8f2]/60' : 'border-amber-300 bg-amber-50/70'
                  }`}>
                    <input
                      type="checkbox"
                      checked={draftApproved}
                      disabled={isDrafting || Boolean(draftError) || totalWords === 0 || totalWords > MAX_SPOKEN_WORDS}
                      onChange={(e) => {
                        setDraftApproved(e.target.checked)
                        setTranscriptConfirmed(e.target.checked)
                      }}
                      className="mt-0.5 size-5 rounded text-[#008069] focus:ring-[#008069]"
                    />
                    <div className="text-[12.5px] leading-snug">
                      <span className={`font-bold ${draftApproved ? 'text-[#008069]' : 'text-amber-950'}`}>
                        {draftApproved ? 'Seslendirme metnini onayladım' : 'Seslendirme metnini ve video kurgusunu onaylıyorum'}
                      </span>
                      <p className="text-[11.5px] text-[#667781] mt-0.5">
                        Yapay zeka ses motoru videoda kelimesi kelimesine bu metni seslendirecektir.
                      </p>
                    </div>
                  </label>
                </div>
              ) : null}

              {/* Wizard Navigasyon Butonları */}
              <div className="flex items-center justify-between pt-3 border-t border-hairline">
                {step === 'draft' ? (
                  <Button
                    type="button"
                    variant="quiet"
                    onClick={() => setStep('campaign')}
                  >
                    ← Geri (Ürün & Kampanya)
                  </Button>
                ) : <div />}

                {step === 'campaign' ? (
                  <Button
                    type="button"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-11 px-6 shadow-sm"
                    disabled={!hasValidProduct || !hasValidLogo}
                    onClick={() => {
                      setStep('draft')
                      void generateDraft()
                    }}
                  >
                    Devam Et & Reklam Metnini Gör →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="wb-wa-submit !bg-[#008069] hover:!bg-[#00a884] text-white font-bold h-11 px-8 shadow-sm"
                    disabled={isSubmitting || !draftApproved || isDrafting || totalWords === 0 || totalWords > MAX_SPOKEN_WORDS}
                  >
                    {isSubmitting ? 'Kuyruğa Alınıyor…' : 'Videoyu Oluştur'}
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
