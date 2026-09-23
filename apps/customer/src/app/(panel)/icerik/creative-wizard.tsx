'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, Card, Field, FileUploadButton, Input, Notice, Textarea } from '@/components/ui'
import { Stepper } from '@/components/stepper'
import { uploadAssetOnly } from './actions'
import {
  AD_FORMAT_OPTIONS,
  type AdFormatType,
  type PromotionType,
  type ProductCard,
  type SpeechTimelineItem,
  type WizardBootstrap,
} from './wizard-types'
import { AddProductModal } from './add-product-modal'
import { getSafeMediaUrl } from '@/lib/media-url'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

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
  const [extraReferenceUrls, setExtraReferenceUrls] = useState<string[]>([])
  
  // Step 2: Campaign & Format Router
  const [adFormat, setAdFormat] = useState<AdFormatType>('AUTO')
  const [offerDetails, setOfferDetails] = useState('')
  const [creativeNote, setCreativeNote] = useState('')
  const [subtitles, setSubtitles] = useState(true)

  // Step 3: AI Creative Plan & Continuous 0-8s Speech Timeline
  const [creativeIdea, setCreativeIdea] = useState('')
  const [speechTimeline, setSpeechTimeline] = useState<SpeechTimelineItem[]>([
    { start_sec: 0.0, end_sec: 1.8, exact_text: '', speaker: 'Spiker', corresponding_visual_beat: 'Ürünün belirgin detaylarıyla dinamik makro açılışı' },
    { start_sec: 1.8, end_sec: 4.2, exact_text: '', speaker: 'Spiker', corresponding_visual_beat: 'Çalışma ortamında yüksek performans ve işlev gösterimi' },
    { start_sec: 4.2, end_sec: 6.5, exact_text: '', speaker: 'Spiker', corresponding_visual_beat: 'Kullanım kolaylığı, sağlamlık ve verimlilik vurgusu' },
    { start_sec: 6.5, end_sec: 8.0, exact_text: '', speaker: 'Spiker', corresponding_visual_beat: 'Kurumsal logo kilidi ve harekete geçirici çağrı (CTA)' },
  ])
  const [veoPromptPreview, setVeoPromptPreview] = useState('')
  const [isPromptCustomized, setIsPromptCustomized] = useState(false)

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

  const hasValidProduct = Boolean(
    promotionType === 'general_brand' ? true : activeProductImage && activeProductName
  )

  // Seed default speech timeline when product or brand changes
  useEffect(() => {
    const brandName = data.org.name || 'İşletmemiz'
    const prodName = activeProductName
    const ctaText = `${brandName} güvencesiyle hemen tanışın.`

    setCreativeIdea(`${brandName} kalitesi ve ${prodName} kullanımını öne çıkaran 8 saniyelik dinamik reels reklamı.`)

    setSpeechTimeline([
      {
        start_sec: 0.0,
        end_sec: 1.8,
        exact_text: `Zorlu koşullara meydan okuyan sağlam teknoloji.`,
        speaker: 'Spiker',
        corresponding_visual_beat: 'Ürünün belirgin detaylarıyla dinamik makro açılışı',
      },
      {
        start_sec: 1.8,
        end_sec: 4.2,
        exact_text: `Yüksek dayanıklılık ve kesintisiz performans ${prodName} ile buluştu.`,
        speaker: 'Spiker',
        corresponding_visual_beat: 'Çalışma ortamında yüksek performans ve işlev gösterimi',
      },
      {
        start_sec: 4.2,
        end_sec: 6.5,
        exact_text: `Zamandan kazanın, projelerinizi güvenle tamamlayın.`,
        speaker: 'Spiker',
        corresponding_visual_beat: 'Kullanım kolaylığı, sağlamlık ve verimlilik vurgusu',
      },
      {
        start_sec: 6.5,
        end_sec: 8.0,
        exact_text: ctaText,
        speaker: 'Spiker',
        corresponding_visual_beat: 'Kurumsal logo kilidi ve harekete geçirici çağrı (CTA)',
      },
    ])
  }, [activeProductName, data.org.name])

  // Total speech word count
  const fullSpeechText = useMemo(() => speechTimeline.map((s) => s.exact_text).join(' '), [speechTimeline])
  const totalWords = useMemo(() => fullSpeechText.split(/\s+/).filter(Boolean).length, [fullSpeechText])

  // Deterministic Veo Prompt Compiler
  useEffect(() => {
    if (isPromptCustomized) return
    const brandName = data.org.name || 'İşletmemiz'
    const promptLines = [
      `Photorealistic 9:16 vertical commercial television ad for ${brandName}.`,
      `[Subject Focus]: @HeroProduct in an authentic operational commercial setting.`,
      `[Cinematography]: 35mm lens, smooth forward dolly, commercial rim lighting, shallow depth of field.`,
      `[Visual Beats]:`,
      `0.0-1.8s: ${speechTimeline[0]?.corresponding_visual_beat || 'Macro product focus'}`,
      `1.8-4.2s: ${speechTimeline[1]?.corresponding_visual_beat || 'Operational demonstration'}`,
      `4.2-6.5s: ${speechTimeline[2]?.corresponding_visual_beat || 'Performance payoff'}`,
      `6.5-8.0s: Hero lock framing with @BrandLogo placement.`,
      ``,
      `[AUDIO TIMELINE]`,
      `Spoken language: Turkish (tr-TR).`,
      ...speechTimeline.map((s) => `${s.start_sec.toFixed(1)}-${s.end_sec.toFixed(1)}s: "${s.exact_text}"`),
      ``,
      `Speak the approved Turkish lines in the exact order. Do not translate. Do not paraphrase. Do not add dialogue.`,
      `[Negative Constraints]: no distorted branding, no cartoon textures, no blurry typography, no CGI artifact.`,
    ]
    setVeoPromptPreview(promptLines.join('\n'))
  }, [data.org.name, speechTimeline, isPromptCustomized])

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
      productIds: selectedProductId ? [selectedProductId] : [],
      productExtras: selectedProductId
        ? {
            [selectedProductId]: {
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
      referenceImageUrls: extraReferenceUrls,
      customText: creativeNote || undefined,
      videoScenarioPrompt: veoPromptPreview,
      metadata: {
        ad_format: adFormat,
        promotion_type: promotionType,
        speech_timeline: speechTimeline,
        authoritative_facts: {
          brand_name: brandName,
          product_name: activeProductName,
          offer: offerDetails || undefined,
        },
      },
    })
  }, [
    creativeIdea,
    activeProductName,
    defaultKit?.id,
    hasValidLogo,
    customLogoUrl,
    selectedProductId,
    activeProductImage,
    offerDetails,
    creativeNote,
    subtitles,
    adFormat,
    fullSpeechText,
    extraReferenceUrls,
    veoPromptPreview,
    promotionType,
    speechTimeline,
    data.org.name,
  ])

  // AI Quick Actions for Speech Revision via Creative Director API
  const applyAiRevision = async (type: 'sales' | 'short' | 'corporate' | 'refresh') => {
    setDraftApproved(false)
    try {
      const res = await fetch('/api/ai-media/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brandName: data.org.name || 'İşletmemiz',
          productName: activeProductName,
          productDescription: selectedProduct?.description || '',
          adFormat,
          revisionType: type,
          offerDetails,
          creativeNote,
          logoUrl: activeLogoUrl,
          productImageUrl: activeProductImage,
          referenceUrls: extraReferenceUrls,
        }),
      })

      if (res.ok) {
        const draftRes = await res.json()
        if (draftRes.creative_idea) setCreativeIdea(draftRes.creative_idea)
        if (draftRes.speech_timeline) setSpeechTimeline(draftRes.speech_timeline)
        if (draftRes.veo_prompt) setVeoPromptPreview(draftRes.veo_prompt)
      }
    } catch (e) {
      console.error('Failed to generate AI revision:', e)
    }
  }

  // Authoritative Video Job Submission (POST /api/ai-media/jobs)
  const handleRealSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transcriptConfirmed || !draftApproved) return

    setIsSubmitting(true)
    setSubmissionError(null)

    try {
      const payload = {
        title: `${data.org.name || 'İşletme'} - ${activeProductName} Reklamı`,
        brief: creativeIdea,
        adFormat,
        userStylePreference: adFormat,
        subtitles: subtitles ? 'auto' : 'off',
        promotionType,
        creativeIdea,
        speechTimeline,
        veoPrompt: veoPromptPreview,
        authoritativeFacts: {
          brand_name: data.org.name || 'İşletmemiz',
          product_name: activeProductName,
          offer: offerDetails || undefined,
          cta: `${data.org.name || 'İşletmemiz'} ile iletişime geçin`,
        },
        logoAsset: {
          url: activeLogoUrl,
          name: 'brand_logo.png',
        },
        productAsset: activeProductImage
          ? { url: activeProductImage, name: activeProductName }
          : null,
        referenceAssets: extraReferenceUrls.map((u, i) => ({
          url: u,
          name: `ref_${i + 1}.jpg`,
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
        const vm = resData.job
        if (!vm || !isMounted) return

        setJobState(vm.state)
        setJobStageIndex(vm.stage_index)
        setJobDisplayState(vm.display_state)
        setJobDisplayTitle(vm.display_title)
        setJobDisplayMessage(vm.display_message)
        setQueueAhead(vm.queue_ahead_count ?? null)
        setEtaText(vm.eta_display_text || 'Süre tahmini oluşturuluyor...')

        if (vm.state === 'COMPLETED' && vm.playback_url) {
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
                setStep(id as Step)
              }}
              className="wb-wa-steps"
            />
          </div>
        ) : null}

        {/* 1. WAITING / GENERATION EXPERIENCE (Realtime & Authoritative Backend State) */}
        {jobState !== 'IDLE' && jobState !== 'COMPLETED' ? (
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
                      { id: 'existing_product', label: 'Mevcut Ürün', desc: 'Katalogdan seç' },
                      { id: 'existing_service', label: 'Mevcut Hizmet', desc: 'Hizmet tanıtımı' },
                      { id: 'general_brand', label: 'Genel Marka', desc: 'Kurumsal film' },
                      { id: 'new_offering', label: 'Yeni Ürün/Hizmet', desc: 'Yeni görsel yükle' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setPromotionType(opt.id as PromotionType)}
                        className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          promotionType === opt.id
                            ? 'border-[#008069] bg-[#e7f8f2] ring-1 ring-[#008069]'
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
                                onClick={() => setSelectedProductId(p.id)}
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

                      {/* Ek Görseller */}
                      <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-white p-2">
                        <span className="flex size-9 items-center justify-center rounded bg-[#e7f8f2] text-[11px] font-bold text-[#008069]">
                          +{extraReferenceUrls.length}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold text-[#111b21]">Ek Referanslar</p>
                          <p className="text-[10px] text-[#667781]">{extraReferenceUrls.length} görsel ekli</p>
                        </div>
                      </div>
                    </div>

                    {!hasValidLogo ? (
                      <Notice tone="danger">
                        <strong>Kurumsal Logo Zorunludur:</strong> Yapay zekanın uydurma logo üretmemesi için lütfen logonuzu yükleyin.
                      </Notice>
                    ) : null}
                    {!hasValidProduct && promotionType !== 'general_brand' ? (
                      <Notice tone="danger">
                        <strong>Ürün Görseli Zorunludur:</strong> Reklam videosu için gerçek bir ürün fotoğrafı seçilmelidir.
                      </Notice>
                    ) : null}
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
                    <Field label="Kampanya / İndirim Teklifi (İsteğe bağlı)" hint="Varsa indirim, taksit veya özel fiyat teklifinizi yazın.">
                      <Input
                        value={offerDetails}
                        onChange={(e) => setOfferDetails(e.target.value)}
                        placeholder="Örn: Toptan alımlarda fabrika fiyatı ve şantiyeye doğrudan teslimat"
                      />
                    </Field>

                    <Field label="Özel İstek / Sahne Notu (İsteğe bağlı)">
                      <Input
                        value={creativeNote}
                        onChange={(e) => setCreativeNote(e.target.value)}
                        placeholder="Örn: Sabah gün ışığı kullanılsın, fabrika içi üretim anı gösterilsin"
                      />
                    </Field>

                    <label className="flex items-center gap-2 pt-1 text-[13px] font-medium text-[#111b21] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subtitles}
                        onChange={(e) => setSubtitles(e.target.checked)}
                        className="size-4 rounded text-[#008069] focus:ring-[#008069]"
                      />
                      <span>Videoya senkronize altyazı katmanı eklensin</span>
                    </label>
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
                        8 saniyelik sinematik seslendirme ve sahne akışı. Her repliği doğrudan düzenleyebilirsiniz.
                      </p>
                    </div>
                    <span className="rounded bg-[#e7f8f2] px-2.5 py-1 text-[11px] font-bold text-[#008069] border border-[#008069]/20">
                      ~8.0 Saniye
                    </span>
                  </div>

                  {/* Reklam Fikri Özeti */}
                  <div className="rounded-xl border border-hairline bg-[#f8fafb] p-3">
                    <p className="text-[11px] uppercase font-bold text-[#667781] tracking-wider">Reklam Konsepti</p>
                    <p className="text-[13px] font-semibold text-[#111b21] mt-0.5">{creativeIdea}</p>
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
                    <span className={totalWords > 22 ? 'text-amber-700 font-medium' : 'text-[#667781]'}>
                      Toplam: <strong>{totalWords} kelime</strong> (Doğal Türkçe konuşma hızı: ~15-20 kelime)
                    </span>
                  </div>

                  {/* Quick Revision Action Buttons */}
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-[#667781]">Hızlı Yenileme:</p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="quiet" className="h-8 text-[12px]" onClick={() => applyAiRevision('refresh')}>
                        Yeniden Öner
                      </Button>
                      <Button type="button" variant="quiet" className="h-8 text-[12px]" onClick={() => applyAiRevision('sales')}>
                        Daha Satış Odaklı
                      </Button>
                      <Button type="button" variant="quiet" className="h-8 text-[12px]" onClick={() => applyAiRevision('short')}>
                        Daha Kısa
                      </Button>
                      <Button type="button" variant="quiet" className="h-8 text-[12px]" onClick={() => applyAiRevision('corporate')}>
                        Daha Kurumsal
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
                        onChange={(e) => {
                          setIsPromptCustomized(true)
                          setVeoPromptPreview(e.target.value)
                        }}
                        className="font-mono text-[11px]"
                      />
                      <p className="text-[10.5px] text-[#667781]">
                        * Kurumsal logo ve ürün güvenlik kilitleri kullanıcı istemiyle override edilemez.
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
                      (step === 'what' && (!hasValidLogo || (!hasValidProduct && promotionType !== 'general_brand'))) ||
                      (step === 'draft' && !draftApproved)
                    }
                    onClick={() => {
                      if (step === 'what') setStep('campaign')
                      else if (step === 'campaign') setStep('draft')
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
                    disabled={isSubmitting || !transcriptConfirmed || !hasValidLogo || (!hasValidProduct && promotionType !== 'general_brand')}
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
          setAddProductOpen(false)
        }}
      />
    </>
  )
}
