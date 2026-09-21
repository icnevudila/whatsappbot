'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, Card, Field, FileUploadButton, Input, Notice, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { Stepper } from '@/components/stepper'
import { useCreativeGenerationProgress } from '@/lib/creative/use-creative-progress'
import {
  BRIEF_CHIPS,
  CREATIVE_FORMATS,
  CREATIVE_STYLES,
  PRODUCT_FIELD_KEYS,
  PRODUCT_FIELD_LABELS,
  TEXT_DENSITIES,
  type ProductFieldKey,
} from '@/lib/creative/types'
import { startCreativeGeneration, uploadLibraryImage, uploadAssetOnly, type CreativeActionState } from './actions'
import { DEFAULT_INCLUDE, type ProductCard, type SocialOption, type WizardBootstrap } from './wizard-types'
import { AddProductModal } from './add-product-modal'
import { AddSocialModal } from './add-social-modal'
import { getSafeMediaUrl } from '@/lib/media-url'

const DRAFT_KEY_PREFIX = 'wa.customer.creative-wizard.v2'

type Step = 'start' | 'brief' | 'products' | 'extras' | 'style' | 'summary'

const IMAGE_STEPS: { id: Step; label: string }[] = [
  { id: 'start', label: 'Başlangıç' },
  { id: 'brief', label: 'Fikir' },
  { id: 'products', label: 'Ürünler' },
  { id: 'extras', label: 'Ekler' },
  { id: 'style', label: 'Stil' },
  { id: 'summary', label: 'Özet' },
]

const VIDEO_STEPS: { id: Step; label: string }[] = [
  { id: 'products', label: '1 — Ürününü Seç' },
  { id: 'brief', label: '2 — Amacını Seç' },
  { id: 'summary', label: '3 — Kontrol Et ve Oluştur' },
]

const VIDEO_BRIEF_CHIPS = [
  {
    label: 'Dijital Katalog',
    text: 'Güncel ürün kataloğumuzu ve fiyat listemizi inceleyerek WhatsApp üzerinden hızlıca sipariş verebilirsiniz.',
  },
  {
    label: 'Fabrikadan Hızlı Teslimat',
    text: 'Fabrikadan doğrudan adresinize hızlı ve güvenli teslimat. Avantajlı fiyat teklifi için WhatsApp ile iletişime geçin.',
  },
  {
    label: 'Üstün Kalite & İşçilik',
    text: 'Birinci sınıf malzeme ve uzman işçilikle üretilen ürünlerimiz hakkında detaylı bilgi almak için hemen yazın.',
  },
  {
    label: 'Özel Fiyat & Kampanya',
    text: 'Bu döneme özel avantajlı fiyat tekliflerimiz ve toplu sipariş fırsatları için hemen WhatsApp üzerinden teklif isteyin.',
  },
  {
    label: 'Stoktan Hızlı Sevkiyat',
    text: 'Beklemeden, aynı gün stoktan teslim avantajıyla ihtiyacınız olan ürünleri hemen WhatsApp üzerinden sipariş edin.',
  },
  {
    label: 'Doğrudan İletişim & Teklif',
    text: 'İşletmenize özel fiyat teklifi ve detaylı ürün bilgisi almak için doğrudan WhatsApp hattımıza bağlanın.',
  },
]

type ProductExtra = {
  imageUrl: string
  price: string
  oldPrice: string
  promo: string
  extra: string
  include: Record<ProductFieldKey, boolean>
}

type Draft = {
  requestKey: string
  origin: 'new' | 'derive'
  baseCreativeId: string
  brief: string
  brandKitId: string
  useLogo: boolean
  customLogoUrl?: string
  productIds: string[]
  productExtras: Record<string, ProductExtra>
  phoneIds: string[]
  socialIds: string[]
  labels: string[]
  cta: string
  address: string
  website: string
  dateRange: string
  customText: string
  formatId: string
  style: string
  textDensity: string
  videoSpeech?: boolean
  subtitles?: boolean
  videoScenarioPrompt?: string
  videoScenarioTitle?: string
  customVoiceover?: string
  videoPurpose?: 'tanitim' | 'kampanya' | 'yeni_urun'
  offerDetails?: string
  moreSettingsOpen?: boolean
  referenceImageUrls?: string[]
}

function newKey() {
  return crypto.randomUUID()
}

function emptyExtra(imageUrl = ''): ProductExtra {
  return {
    imageUrl,
    price: '',
    oldPrice: '',
    promo: '',
    extra: '',
    include: { ...DEFAULT_INCLUDE },
  }
}

function defaultDraft(data: WizardBootstrap, initialFormat?: string): Draft {
  const isVideo = initialFormat === 'reels_video'
  const defaultVideoBrief = data.suggestedVideoChips?.[0]?.text || ''
  const firstProduct = data.products?.[0]
  return {
    requestKey: newKey(),
    origin: 'new',
    baseCreativeId: '',
    brief: isVideo ? defaultVideoBrief : '',
    brandKitId: data.kits.find((kit) => kit.isDefault)?.id ?? data.kits[0]?.id ?? '',
    useLogo: true,
    customLogoUrl: '',
    productIds: isVideo && firstProduct ? [firstProduct.id] : [],
    productExtras: isVideo && firstProduct && firstProduct.images?.[0]?.url ? {
      [firstProduct.id]: emptyExtra(firstProduct.images[0].url)
    } : {},
    phoneIds: [],
    socialIds: [],
    labels: [],
    cta: isVideo ? 'Bizimle İletişime Geçin' : '',
    address: '',
    website: data.org.websiteHint ?? '',
    dateRange: '',
    customText: '',
    formatId: isVideo ? 'reels_video' : 'wa',
    style: 'auto',
    textDensity: 'balanced',
    videoSpeech: true,
    subtitles: true,
    videoScenarioPrompt: '',
    videoScenarioTitle: '',
    customVoiceover: '',
    videoPurpose: 'tanitim',
    offerDetails: '',
    moreSettingsOpen: false,
    referenceImageUrls: [],
  }
}

export function CreativeWizard({
  data,
  initialFormat,
}: {
  data: WizardBootstrap
  initialFormat?: string
}) {
  const isInitialVideo = initialFormat === 'reels_video'
  const [draft, setDraft] = useState<Draft>(() => defaultDraft(data, initialFormat))
  const [step, setStep] = useState<Step>(() => (isInitialVideo ? 'products' : 'start'))
  const [labelInput, setLabelInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [showPhones, setShowPhones] = useState(false)
  const [showSocials, setShowSocials] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [state, formAction, pending] = useActionState<CreativeActionState, FormData>(
    startCreativeGeneration,
    null,
  )
  const isVideo = draft.formatId === 'reels_video'
  const isImageToImage = Boolean(draft.baseCreativeId) || draft.productIds.length > 0
  useCreativeGenerationProgress(pending, isImageToImage, isVideo)

  const activeSteps = isVideo ? VIDEO_STEPS : IMAGE_STEPS

  const orgDraftKey = useMemo(
    () => `${DRAFT_KEY_PREFIX}.${isVideo ? 'video' : 'image'}.${data.org.id}`,
    [isVideo, data.org.id],
  )

  useEffect(() => {
    if (!pending) return
    try {
      localStorage.removeItem(orgDraftKey)
    } catch {
      /* ignore */
    }
  }, [pending, orgDraftKey])

  useEffect(() => {
    try {
      // Eski zehirli paylaşılan draft anahtarlarını temizle
      localStorage.removeItem('wa.customer.creative-wizard.video.v1')
      localStorage.removeItem('wa.customer.creative-wizard.v1')

      const raw = localStorage.getItem(orgDraftKey)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<Draft>

      // Güvenlik: Kaydedilen ürünlerin gerçekten bu organizasyona ait olduğunu doğrula
      const validProductIds = (saved.productIds || []).filter((id) =>
        data.products.some((p) => p.id === id)
      )
      const validKitId = (data.kits.some((k) => k.id === saved.brandKitId) && saved.brandKitId)
        ? saved.brandKitId
        : (data.kits.find((k) => k.isDefault)?.id ?? data.kits[0]?.id ?? '')

      const effectiveFormat = initialFormat || saved.formatId || (isInitialVideo ? 'reels_video' : 'wa')
      setDraft((current) => ({
        ...current,
        ...saved,
        brandKitId: validKitId,
        productIds: validProductIds,
        productExtras: validProductIds.length > 0 ? (saved.productExtras || {}) : {},
        customVoiceover: validProductIds.length > 0 ? saved.customVoiceover : undefined,
        formatId: effectiveFormat,
        requestKey: saved.requestKey || current.requestKey,
      }))
      if (effectiveFormat === 'reels_video') {
        setStep((s) => (s === 'start' ? 'products' : s))
      }
    } catch {
      /* ignore */
    }
  }, [orgDraftKey, initialFormat, isInitialVideo, data.products, data.kits])

  useEffect(() => {
    try {
      localStorage.setItem(orgDraftKey, JSON.stringify(draft))
    } catch {
      /* ignore */
    }
  }, [orgDraftKey, draft])

  useEffect(() => {
    if (data.kits.length === 0) return
    const known = data.kits.some((kit) => kit.id === draft.brandKitId)
    if (known) return
    const fallback = data.kits.find((kit) => kit.isDefault)?.id ?? data.kits[0]?.id ?? ''
    setDraft((current) => ({ ...current, brandKitId: fallback }))
  }, [data.kits, draft.brandKitId])

  const [productsList, setProductsList] = useState<ProductCard[]>(data.products)
  const [socialsList, setSocialsList] = useState<SocialOption[]>(data.socials)
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [addSocialOpen, setAddSocialOpen] = useState(false)

  const stepIndex = activeSteps.findIndex((row) => row.id === step)
  const selectedKit = data.kits.find((kit) => kit.id === draft.brandKitId)
  const selectedProducts = productsList.filter((product) => draft.productIds.includes(product.id))

  const cleanBrandName = (name?: string | null) => {
    if (!name) return ''
    return name
      .replace(/\s*(brand\s*kit|marka\s*kiti|kampanya\s*kiti)\s*/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const sanitizeVoiceover = (text: string) => {
    return text
      .replace(/\bbrand\s*kit\b/gi, '')
      .replace(/\bmarka\s*kiti\b/gi, '')
      .replace(/\bkampanya\s*kiti\b/gi, '')
      .replace(/\b(?:cta|prompt|act\s*\d+|shot\s*\d+|sahne\s*\d+|veo|flow)\b/gi, '')
      .replace(/["“”«»*#\[\]]/g, '')
      .replace(/\byeni\s+yeni\b/gi, 'yeni')
      .replace(/\s{2,}/g, ' ')
      .trim()
  }

  const currentProductName = selectedProducts[0]?.name?.trim() || 'Ürünümüz'
  const currentBrandName = cleanBrandName(data.org.name) || cleanBrandName(selectedKit?.name) || 'İşletmemiz'
  const currentOffer = draft.offerDetails?.trim()

  const productIntroPhrase = currentProductName.toLowerCase().startsWith('yeni ')
    ? currentProductName
    : `yeni ${currentProductName}`

  const defaultVoiceover = useMemo(() => {
    if (draft.videoPurpose === 'kampanya') {
      return sanitizeVoiceover(`${currentBrandName} güvencesiyle ${currentProductName}. Avantajlı fırsatlar için hemen WhatsApp ile yazın.`)
    }
    if (draft.videoPurpose === 'yeni_urun') {
      return sanitizeVoiceover(`${currentBrandName} ${productIntroPhrase} ile tanışın. Detaylar ve sipariş için hemen ulaşın.`)
    }
    return sanitizeVoiceover(`${currentBrandName} ile ${currentProductName} şimdi sizlerle. Hızlı bilgi ve sipariş için hemen yazın.`)
  }, [currentBrandName, currentProductName, productIntroPhrase, draft.videoPurpose])

  const activeVoiceoverText = (draft.customVoiceover && draft.customVoiceover.trim().length > 0)
    ? sanitizeVoiceover(draft.customVoiceover)
    : defaultVoiceover

  const voiceoverWordCount = useMemo(() => {
    return activeVoiceoverText.trim().split(/\s+/).filter(Boolean).length
  }, [activeVoiceoverText])

  const voiceoverPresets = useMemo(() => [
    {
      label: 'Fırsat & Kampanya',
      text: sanitizeVoiceover(`${currentBrandName} güvencesiyle ${currentProductName}. Avantajlı fırsatlar için hemen WhatsApp ile yazın.`),
    },
    {
      label: 'Kalite & Güven',
      text: sanitizeVoiceover(`${currentBrandName} kalitesiyle ${currentProductName} yanınızda. En uygun teklif için hemen yazın.`),
    },
    {
      label: 'Hızlı Teslimat',
      text: sanitizeVoiceover(`${currentBrandName} ${currentProductName} stoktan hızlı teslimatla adresinizde. Hemen mesaj atın.`),
    },
    {
      label: 'Ürün Tanıtımı',
      text: sanitizeVoiceover(`${currentBrandName} ${productIntroPhrase} ile tanışın. Detaylı bilgi ve sipariş için ulaşın.`),
    },
  ], [currentBrandName, currentProductName, productIntroPhrase])

  const payload = useMemo(
    () =>
      JSON.stringify({
        ...draft,
        customVoiceover: activeVoiceoverText,
        generationType: draft.origin === 'derive' ? 'derived' : 'new',
        useLogo: draft.useLogo,
      }),
    [draft, activeVoiceoverText],
  )

  const go = (next: Step) => setStep(next)
  const nextStep = () => {
    const safeIndex = stepIndex >= 0 ? stepIndex : 0
    const next = activeSteps[Math.min(activeSteps.length - 1, safeIndex + 1)]
    if (next) go(next.id)
  }
  const prevStep = () => {
    if (stepIndex <= 0) {
      if (!isVideo && step !== 'start') go('start')
      return
    }
    const prev = activeSteps[stepIndex - 1]
    if (prev) go(prev.id)
  }

  const patch = (partial: Partial<Draft>) => setDraft((current) => ({ ...current, ...partial }))

  const toggleProduct = (id: string) => {
    if (isVideo) {
      const product = productsList.find((row) => row.id === id)
      patch({
        productIds: [id],
        productExtras: {
          ...draft.productExtras,
          [id]: draft.productExtras[id] ?? emptyExtra(product?.images[0]?.url ?? ''),
        },
      })
      return
    }
    if (draft.productIds.includes(id)) {
      patch({ productIds: draft.productIds.filter((item) => item !== id) })
    } else {
      const product = productsList.find((row) => row.id === id)
      patch({
        productIds: [...draft.productIds, id],
        productExtras: {
          ...draft.productExtras,
          [id]: draft.productExtras[id] ?? emptyExtra(product?.images[0]?.url ?? ''),
        },
      })
    }
  }

  const addProduct = (id: string) => {
    if (!draft.productIds.includes(id)) {
      toggleProduct(id)
    }
  }

  const onUpload = async (file: File) => {
    setUploading(true)
    setUploadError(null)
    const form = new FormData()
    form.set('file', file)
    const result = await uploadLibraryImage(form)
    setUploading(false)
    if (result?.error || !result?.id) {
      setUploadError(result?.error ?? 'Yükleme başarısız.')
      return
    }
    patch({ origin: 'derive', baseCreativeId: result.id })
  }

  const hasValidVideoProduct =
    selectedProducts.length > 0 &&
    selectedProducts.some((p) => {
      const extra = draft.productExtras[p.id]
      return Boolean(extra?.imageUrl || p.images[0]?.url)
    })
  const activeLogoUrl = getSafeMediaUrl(draft.customLogoUrl || selectedKit?.samplePreview || data.org.logoPreview || '') || ''
  const hasValidVideoLogo = Boolean(activeLogoUrl)

  let canContinue = true
  if (isVideo) {
    if (step === 'products') {
      canContinue = hasValidVideoProduct && hasValidVideoLogo
    } else if (step === 'brief') {
      if (draft.videoPurpose === 'kampanya') {
        canContinue = (draft.offerDetails || '').trim().length >= 3
      } else {
        canContinue = true
      }
    } else if (step === 'summary') {
      canContinue = hasValidVideoLogo && hasValidVideoProduct
    }
  } else {
    if (step === 'brief') {
      canContinue = draft.brief.trim().length >= 8
    }
  }
  const currentLabel = activeSteps[stepIndex]?.label ?? ''

  return (
    <>
      <Card className="wb-wa-wizard overflow-visible">
        <div className="wb-wa-wizard-steps">
          <Stepper
            label={isVideo ? 'Video adımları' : 'Görsel adımları'}
            steps={activeSteps}
            current={step}
            onJump={(id) => go(id as Step)}
            className="wb-wa-steps"
          />
          <p className="wb-wa-wizard-step-title">{currentLabel}</p>
        </div>

      <form
        action={formAction}
        onSubmit={(event) => {
          if (step !== 'summary') event.preventDefault()
        }}
        className="flex flex-col"
      >
        <input type="hidden" name="draft" value={payload} />

      <div className="space-y-3 px-4 py-3 sm:px-5">
      {step === 'start' ? (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              patch({ origin: 'new', baseCreativeId: '', formatId: 'wa' })
              go('brief')
            }}
            className={`wb-wa-choice${draft.origin === 'new' && draft.formatId !== 'reels_video' ? ' is-on' : ''}`}
          >
            <p className="font-bold text-[#111b21]">Yeni görsel oluştur</p>
            <p className="mt-1 text-[12.5px] text-[#667781]">Sıfırdan kampanya görseli. Marka ve ürünleriniz bağlanır.</p>
          </button>
          <button
            type="button"
            onClick={() => {
              patch({ origin: 'derive' })
            }}
            className={`wb-wa-choice${draft.origin === 'derive' ? ' is-on' : ''}`}
          >
            <p className="font-bold text-[#111b21]">Var olandan türet</p>
            <p className="mt-1 text-[12.5px] text-[#667781]">Kütüphaneden seçin veya dosya yükleyin.</p>
          </button>
        </div>
      ) : null}

      {step === 'start' && draft.origin === 'derive' ? (
        <Card>
          <div className="space-y-3 p-3.5">
            <p className="text-[13px] font-semibold">Kaynak görsel</p>
            <p className="text-[12px] text-ink-muted">PNG, JPG veya WEBP · en fazla 5 MB. Sürükleyip bırakabilirsiniz.</p>
            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                const file = event.dataTransfer.files[0]
                if (file) void onUpload(file)
              }}
              className="rounded-md border border-dashed border-hairline-strong bg-canvas p-3"
            >
            <FileUploadButton
              accept="image/png,image/jpeg,image/webp"
              uploading={uploading}
              label="Görsel yükle (PNG, JPG, WEBP · 5 MB)"
              onFile={(file) => void onUpload(file)}
            />
            {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}
            </div>
            {data.library.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {data.library.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => patch({ baseCreativeId: item.id })}
                    className={`overflow-hidden rounded-md border ${
                      draft.baseCreativeId === item.id ? 'border-[#00a884] ring-1 ring-[#00a884]' : 'border-[#e9edef]'
                    }`}
                  >
                    {item.publicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.publicUrl} alt="" className="h-20 w-full object-cover" />
                    ) : null}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[12.5px] text-ink-muted">Kütüphanede henüz görsel yok — yükleyebilirsiniz.</p>
            )}
            <Button type="button" className="wb-wa-submit" disabled={!draft.baseCreativeId} onClick={() => go('brief')}>
              Devam
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 'brief' ? (
        <Card>
          <div className="space-y-4 p-4">
            {isVideo ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[14px] font-bold text-[#111b21]">2 — Reklam Filminin Amacını Seçin</p>
                  <p className="text-[12px] text-[#667781] mt-0.5">Videonun kurgusu ve seslendirmesi bu amaca göre hazırlanır.</p>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => patch({ videoPurpose: 'tanitim', brief: `${data.org.name || 'İşletmemiz'} ürün kalitesi ve üretim gücünü anlatan tanıtım filmi.` })}
                    className={`rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
                      draft.videoPurpose === 'tanitim'
                        ? 'border-[#00a884] bg-[#e7f8f2] ring-1 ring-[#00a884]'
                        : 'border-[#e9edef] hover:border-[#00a884]/40 bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[13.5px] font-bold text-[#111b21]">Tanıtım</p>
                      {draft.videoPurpose === 'tanitim' ? <span className="text-[#00a884] font-bold text-sm">✓</span> : null}
                    </div>
                    <p className="text-[11.5px] text-[#667781] mt-1.5 leading-relaxed">
                      Kurumsal güven, ürün kalitesi ve üretim gücünü öne çıkaran tanıtım filmi.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => patch({ videoPurpose: 'kampanya' })}
                    className={`rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
                      draft.videoPurpose === 'kampanya'
                        ? 'border-[#00a884] bg-[#e7f8f2] ring-1 ring-[#00a884]'
                        : 'border-[#e9edef] hover:border-[#00a884]/40 bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[13.5px] font-bold text-[#111b21]">Kampanya</p>
                      {draft.videoPurpose === 'kampanya' ? <span className="text-[#00a884] font-bold text-sm">✓</span> : null}
                    </div>
                    <p className="text-[11.5px] text-[#667781] mt-1.5 leading-relaxed">
                      Özel fiyat teklifi, indirim, toptan alım avantajı veya sınırlı süreli fırsat duyurusu.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => patch({ videoPurpose: 'yeni_urun', brief: `${data.org.name || 'İşletmemiz'} yeni ürün tanıtımı ve duyurusu.` })}
                    className={`rounded-lg border p-3.5 text-left transition-all cursor-pointer ${
                      draft.videoPurpose === 'yeni_urun'
                        ? 'border-[#00a884] bg-[#e7f8f2] ring-1 ring-[#00a884]'
                        : 'border-[#e9edef] hover:border-[#00a884]/40 bg-surface'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-[13.5px] font-bold text-[#111b21]">Yeni Ürün / Hizmet</p>
                      {draft.videoPurpose === 'yeni_urun' ? <span className="text-[#00a884] font-bold text-sm">✓</span> : null}
                    </div>
                    <p className="text-[11.5px] text-[#667781] mt-1.5 leading-relaxed">
                      Piyasaya yeni çıkan ürün veya hizmetinizin ilk lansmanı ve duyurusu.
                    </p>
                  </button>
                </div>

                {draft.videoPurpose === 'kampanya' ? (
                  <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50/50 p-3.5">
                    <Field
                      label="Kampanya / İndirim Bilgisi"
                      hint="Varsa indirim oranı veya kampanya detayını yazın."
                    >
                      <Input
                        value={draft.offerDetails || ''}
                        onChange={(e) => patch({ offerDetails: e.target.value, brief: `${data.org.name || 'İşletme'} kampanya teklifi: ${e.target.value}` })}
                        placeholder="Örn: Toptan alımlarda özel fabrika fiyatı ve şantiyeye doğrudan teslimat"
                      />
                    </Field>
                  </div>
                ) : null}

                {/* Altyazı Seçeneği ve İsteğe Bağlı Not */}
                <div className="rounded-lg border border-hairline bg-surface p-3.5 space-y-3">
                  <label className="flex items-center gap-2 text-[13px] font-medium text-[#111b21] cursor-pointer">
                    <input
                      type="checkbox"
                      className="size-4 rounded border-hairline text-[#00a884] focus:ring-[#00a884]"
                      checked={draft.subtitles !== false}
                      onChange={(e) => patch({ subtitles: e.target.checked })}
                    />
                    <span>Videoya altyazı eklensin</span>
                  </label>

                  <Field label="Özel İstek / Not (İsteğe Bağlı)">
                    <Textarea
                      rows={2}
                      value={draft.customText || ''}
                      onChange={(e) => patch({ customText: e.target.value })}
                      placeholder="Örn: Videoda gün batımı ışığı kullanılsın, fabrika içi forklift hareketi gösterilsin vb."
                    />
                  </Field>
                </div>
              </div>
            ) : (
              <>
                <Field label="Görselde ne anlatmak istiyorsunuz?">
                  <Textarea
                    name="brief-ui"
                    rows={4}
                    value={draft.brief}
                    onChange={(event) => patch({ brief: event.target.value })}
                    placeholder="Hafta sonuna özel tüm ürünlerde %25 indirim. Sıcak, kaliteli ve premium bir WhatsApp kampanya görseli istiyorum."
                  />
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {BRIEF_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      className="wb-wa-chip"
                      onClick={() => {
                        if (!draft.brief.includes(chip)) {
                          patch({ brief: draft.brief ? `${draft.brief.trim()} ${chip}.` : `${chip}. ` })
                        }
                      }}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      ) : null}

      {step === 'products' ? (
        isVideo ? (
          <div className="space-y-4">
            {/* 1. Marka ve Kayıtlı Logo Özeti */}
            <Card>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-[#111b21]">1 — Aktif Marka ve Kurumsal Logo</p>
                    <p className="text-[12px] text-[#667781] mt-0.5">
                      Videonuzda ve tabelalarda kullanılacak kurumsal marka logonuz.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-canvas p-3">
                  <div className="flex items-center gap-3">
                    {activeLogoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeLogoUrl}
                        alt="Marka Logosu"
                        className="size-14 rounded-md border border-hairline bg-white object-contain p-1 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="size-14 rounded-md border border-dashed border-rose-300 bg-rose-50 flex items-center justify-center text-rose-500 font-bold text-xs shrink-0">
                        Logo Yok
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-[#111b21] text-[14px]">
                        {data.org.name || 'İşletmeniz'}
                      </p>
                      <p className="text-[12px] text-[#667781]">
                        {draft.customLogoUrl ? 'Özel yüklenen kurumsal logo' : 'Sistemde kayıtlı kurumsal logo'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <FileUploadButton
                      accept="image/png,image/jpeg,image/webp"
                      uploading={uploading}
                      label={draft.customLogoUrl ? 'Farklı Logo Seç' : 'Farklı Logo Yükle'}
                      onFile={async (file) => {
                        setUploading(true)
                        const form = new FormData()
                        form.set('file', file)
                        const res = await uploadAssetOnly(form, 'logos')
                        setUploading(false)
                        if (res?.publicUrl) {
                          patch({ customLogoUrl: res.publicUrl })
                        }
                      }}
                    />
                    {draft.customLogoUrl ? (
                      <Button
                        type="button"
                        variant="quiet"
                        className="h-8 text-[12px]"
                        onClick={() => patch({ customLogoUrl: '' })}
                      >
                        Kayıtlı Logoya Dön
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>

            {/* 2. Ürün Seçimi Bölümü (Görselli Kartlar) */}
            <Card>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[14px] font-bold text-[#111b21]">2 — Tanıtılacak Ürünü Seçin</p>
                    <p className="text-[12px] text-[#667781] mt-0.5">
                      Videoda yer alacak ana ürününüzü seçin.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddProductOpen(true)}
                    className="rounded-full border border-dashed border-[#00a884]/60 bg-[#e7f8f2] px-3 py-1 text-[12px] font-medium text-[#008069] hover:bg-[#d9f5eb] cursor-pointer"
                  >
                    + Yeni Ürün Ekle
                  </button>
                </div>

                {productsList.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {productsList.map((product) => {
                      const isSelected = draft.productIds.includes(product.id)
                      const extra = draft.productExtras[product.id]
                      const activeProductImg = getSafeMediaUrl(extra?.imageUrl || product.images[0]?.url)
                      return (
                        <button
                          key={product.id}
                          type="button"
                          onClick={() => toggleProduct(product.id)}
                          className={`flex flex-col rounded-lg border text-left overflow-hidden transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#00a884] bg-[#e7f8f2]/30 ring-2 ring-[#00a884] shadow-sm'
                              : 'border-[#e9edef] hover:border-[#00a884]/40 bg-surface'
                          }`}
                        >
                          <div className="relative aspect-video w-full bg-[#f0f2f5] overflow-hidden">
                            {activeProductImg ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={activeProductImg}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[11px] text-ink-muted">
                                Fotoğraf Yok
                              </div>
                            )}
                            {isSelected ? (
                              <span className="absolute top-2 right-2 bg-[#00a884] text-white rounded-full p-1 text-[10px] leading-none shadow">
                                ✓
                              </span>
                            ) : null}
                          </div>
                          <div className="p-2.5">
                            <p className="text-[13px] font-semibold text-[#111b21] truncate">
                              {product.name}
                            </p>
                            <p className="text-[11px] text-[#667781] line-clamp-1 mt-0.5">
                              {product.description || 'Kayıtlı ürün'}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <Notice tone="warn">
                    Kayıtlı ürün bulunamadı. Lütfen videoda kullanılacak ürünü ekleyin.{' '}
                    <button
                      type="button"
                      onClick={() => setAddProductOpen(true)}
                      className="underline font-semibold cursor-pointer text-ink hover:text-[#008069]"
                    >
                      Ürün ekle
                    </button>
                  </Notice>
                )}

                {/* Seçilen Ürün Detayı & Fotoğraf Değiştirme */}
                {selectedProducts[0] ? (() => {
                  const product = selectedProducts[0]
                  const extra = draft.productExtras[product.id] ?? emptyExtra(product.images[0]?.url ?? '')
                  return (
                    <div className="mt-3 rounded-lg border border-[#00a884]/30 bg-[#e7f8f2]/20 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[12.5px] font-semibold text-[#111b21]">
                          Seçilen: <strong>{product.name}</strong> — Ürün Fotoğrafı
                        </p>
                        <FileUploadButton
                          accept="image/png,image/jpeg,image/webp"
                          uploading={uploading}
                          label="Farklı Fotoğraf Yükle"
                          onFile={async (file) => {
                            setUploading(true)
                            const form = new FormData()
                            form.set('file', file)
                            const res = await uploadAssetOnly(form, 'products')
                            setUploading(false)
                            if (res?.publicUrl) {
                              patch({
                                productExtras: {
                                  ...draft.productExtras,
                                  [product.id]: { ...extra, imageUrl: res.publicUrl },
                                },
                              })
                            }
                          }}
                        />
                      </div>

                      {product.images.length > 1 ? (
                        <div>
                          <p className="text-[11.5px] text-[#667781] mb-1.5">Bu ürün için kayıtlı farklı fotoğraf seçebilirsiniz:</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {product.images.map((image) => {
                              const isImgSelected = (extra.imageUrl || product.images[0]?.url) === image.url
                              return (
                                <button
                                  key={image.id}
                                  type="button"
                                  onClick={() =>
                                    patch({
                                      productExtras: {
                                        ...draft.productExtras,
                                        [product.id]: { ...extra, imageUrl: image.url },
                                      },
                                    })
                                  }
                                  className={`relative shrink-0 overflow-hidden rounded-md border ${
                                    isImgSelected ? 'border-[#00a884] ring-2 ring-[#00a884]' : 'border-[#e9edef]'
                                  }`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={image.url} alt="" className="size-14 object-cover" />
                                  {isImgSelected ? (
                                    <span className="absolute top-1 right-1 bg-[#00a884] text-white rounded-full p-0.5 text-[8px] leading-none">
                                      ✓
                                    </span>
                                  ) : null}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  )
                })() : null}
              </div>
            </Card>

            {/* 3. Ek Referans Fotoğrafları (Opsiyonel - En fazla 5 adet) */}
            <Card>
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[14px] font-bold text-[#111b21]">3 — Ek Referans Fotoğrafları (İsteğe Bağlı)</p>
                  <p className="text-[12px] text-[#667781] mt-0.5">
                    Farklı ürün açıları, ambalaj detayları veya mekan/şantiye fotoğrafları ekleyebilirsiniz (en fazla 5 adet).
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 items-center">
                  {(draft.referenceImageUrls || []).map((imgUrl, idx) => (
                    <div key={idx} className="relative group size-16 sm:size-20 rounded-lg border border-hairline overflow-hidden bg-canvas shrink-0 shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={`Referans ${idx + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (draft.referenceImageUrls || []).filter((_, i) => i !== idx)
                          patch({ referenceImageUrls: updated })
                        }}
                        className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px] hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Fotoğrafı Kaldır"
                      >
                        ✕
                      </button>
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 py-0.5 text-[9px] text-white">
                        #{idx + 1}
                      </span>
                    </div>
                  ))}

                  {(draft.referenceImageUrls || []).length < 5 ? (
                    <FileUploadButton
                      accept="image/png,image/jpeg,image/webp"
                      uploading={uploading}
                      label="+ Fotoğraf Ekle"
                      onFile={async (file) => {
                        setUploading(true)
                        const form = new FormData()
                        form.set('file', file)
                        const res = await uploadAssetOnly(form, 'references')
                        setUploading(false)
                        if (res?.publicUrl) {
                          const current = draft.referenceImageUrls || []
                          if (current.length < 5) {
                            patch({ referenceImageUrls: [...current, res.publicUrl] })
                          }
                        }
                      }}
                    />
                  ) : null}
                </div>
              </div>
            </Card>

            {/* 4. Marka & Ürün Özet Şeridi */}
            <div className="rounded-lg border border-hairline bg-canvas p-3">
              <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[#667781] mb-2">
                Kullanılacak Marka ve Ürün Görselleri
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2.5 rounded-md border border-hairline bg-surface p-2.5">
                  {activeLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={activeLogoUrl} alt="" className="size-10 rounded object-contain border border-hairline bg-white p-0.5 shrink-0" />
                  ) : (
                    <div className="size-10 rounded border border-dashed border-rose-300 bg-rose-50 flex items-center justify-center text-[10px] text-rose-500 font-bold shrink-0">Yok</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#667781]">Marka Logosu</p>
                    <p className="text-[12.5px] font-semibold text-[#111b21] truncate">{data.org.name || 'Marka Logosu'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-md border border-hairline bg-surface p-2.5">
                  {selectedProducts[0] && (draft.productExtras[selectedProducts[0].id]?.imageUrl || selectedProducts[0].images[0]?.url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={getSafeMediaUrl(draft.productExtras[selectedProducts[0].id]?.imageUrl || selectedProducts[0].images[0]?.url)}
                      alt=""
                      className="size-10 rounded object-cover border border-hairline shrink-0"
                    />
                  ) : (
                    <div className="size-10 rounded border border-dashed border-amber-300 bg-amber-50 flex items-center justify-center text-[10px] text-amber-600 font-bold shrink-0">Seçilmedi</div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#667781]">Ana Ürün</p>
                    <p className="text-[12.5px] font-semibold text-[#111b21] truncate">{selectedProducts[0]?.name || 'Henüz seçilmedi'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-md border border-hairline bg-surface p-2.5">
                  <div className="size-10 rounded border border-hairline bg-surface flex items-center justify-center text-[12px] font-bold text-[#00a884] shrink-0">
                    {(draft.referenceImageUrls || []).length}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#667781]">Ek Referans</p>
                    <p className="text-[12.5px] font-semibold text-[#111b21] truncate">
                      {(draft.referenceImageUrls || []).length > 0
                        ? `${(draft.referenceImageUrls || []).length} Fotoğraf Eklendi`
                        : 'İsteğe Bağlı'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
            {productsList.map((product) => {
              const isSelected = draft.productIds.includes(product.id)
              return (
                <button
                  key={product.id}
                  type="button"
                  className={`wb-wa-chip ${isSelected ? '!border-[#00a884] !bg-[#e7f8f2] !text-[#008069] font-medium' : ''}`}
                  onClick={() => toggleProduct(product.id)}
                >
                  {product.name}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() => setAddProductOpen(true)}
              className="rounded-full border border-dashed border-[#00a884]/60 bg-[#e7f8f2] px-3 py-1 text-[12.5px] font-medium text-[#008069] hover:bg-[#d9f5eb]"
            >
              Yeni ürün ekle
            </button>
            {productsList.length === 0 ? (
              <Notice tone="warn">
                Aktif ürün yok.{' '}
                <button
                  type="button"
                  onClick={() => setAddProductOpen(true)}
                  className="underline font-semibold cursor-pointer text-ink hover:text-[#008069]"
                >
                  Ürün ekle
                </button>
              </Notice>
            ) : null}
          </div>
          {selectedProducts.map((product) => {
            const extra = draft.productExtras[product.id] ?? emptyExtra(product.images[0]?.url ?? '')
            return (
              <details key={product.id} open className="rounded-[var(--radius-card)] border border-hairline bg-surface">
                <summary className="cursor-pointer px-3.5 py-2.5 text-[13.5px] font-semibold flex items-center justify-between">
                  <span>{product.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleProduct(product.id)
                    }}
                    className="text-[12px] font-normal text-rose-600 hover:underline cursor-pointer"
                  >
                    Kaldır
                  </button>
                </summary>
                <div className="space-y-2 border-t border-hairline p-3.5">
                  {product.images.length > 0 ? (
                    <Field label="AI’a gönderilecek ürün görseli">
                      <div className="space-y-2">
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                          {product.images.map((image) => {
                            const isSelected = (extra.imageUrl || product.images[0]?.url) === image.url
                            return (
                              <button
                                key={image.id}
                                type="button"
                                onClick={() =>
                                  patch({
                                    productExtras: {
                                      ...draft.productExtras,
                                      [product.id]: { ...extra, imageUrl: image.url },
                                    },
                                  })
                                }
                                className={`relative overflow-hidden rounded-md border ${
                                  isSelected ? 'border-[#00a884] ring-2 ring-[#00a884]' : 'border-[#e9edef]'
                                }`}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={image.url} alt="" className="h-16 w-full object-cover" />
                                {isSelected ? (
                                  <span className="absolute top-1 right-1 bg-[#00a884] text-white rounded-full p-0.5 text-[9px] leading-none">
                                    ✓
                                  </span>
                                ) : null}
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <FileUploadButton
                            accept="image/png,image/jpeg,image/webp"
                            uploading={uploading}
                            label="Farklı Fotoğraf Yükle"
                            onFile={async (file) => {
                              setUploading(true)
                              const form = new FormData()
                              form.set('file', file)
                              const res = await uploadAssetOnly(form, 'products')
                              setUploading(false)
                              if (res?.publicUrl) {
                                patch({
                                  productExtras: {
                                    ...draft.productExtras,
                                    [product.id]: { ...extra, imageUrl: res.publicUrl },
                                  },
                                })
                              }
                            }}
                          />
                        </div>
                      </div>
                    </Field>
                  ) : (
                    <Field label="Ürün Görseli (İsteğe Bağlı)">
                      <div className="space-y-2">
                        <p className="text-[12px] text-ink-muted">
                          Bu ürünün kayıtlı fotoğrafı yok. Aşağıdaki içerik kütüphanesinden bir görsel seçebilir veya doğrudan yeni bir fotoğraf yükleyebilirsiniz:
                        </p>
                        {data.library.length > 0 ? (
                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-canvas rounded-md border border-hairline">
                            {data.library.map((item) => {
                              if (!item.publicUrl) return null
                              const isSelected = extra.imageUrl === item.publicUrl
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  onClick={() =>
                                    patch({
                                      productExtras: {
                                        ...draft.productExtras,
                                        [product.id]: { ...extra, imageUrl: item.publicUrl! },
                                      },
                                    })
                                  }
                                  className={`relative overflow-hidden rounded-md border transition-all ${
                                    isSelected ? 'border-[#00a884] ring-2 ring-[#00a884]' : 'border-hairline hover:opacity-80'
                                  }`}
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={item.publicUrl} alt="" className="h-14 w-full object-cover" />
                                  {isSelected ? (
                                    <span className="absolute top-1 right-1 bg-[#00a884] text-white rounded-full p-0.5 text-[9px] leading-none">
                                      ✓
                                    </span>
                                  ) : null}
                                </button>
                              )
                            })}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <FileUploadButton
                            accept="image/png,image/jpeg,image/webp"
                            uploading={uploading}
                            label="Fotoğraf Yükle"
                            onFile={async (file) => {
                              setUploading(true)
                              const form = new FormData()
                              form.set('file', file)
                              const res = await uploadAssetOnly(form, 'products')
                              setUploading(false)
                              if (res?.publicUrl) {
                                patch({
                                  productExtras: {
                                    ...draft.productExtras,
                                    [product.id]: { ...extra, imageUrl: res.publicUrl },
                                  },
                                })
                              }
                            }}
                          />
                          {extra.imageUrl ? (
                            <span className="text-[12px] text-[#008069] font-medium flex items-center gap-1">
                              ✓ Ürün görseli seçildi
                            </span>
                          ) : (
                            <span className="text-[12px] text-ink-muted">
                              (Görsel seçmeden de devam edebilirsiniz)
                            </span>
                          )}
                        </div>
                      </div>
                    </Field>
                  )}
                  {isVideo ? (
                    <Field
                      label="Kampanya veya İskonto Vurgusu (İsteğe Bağlı)"
                      hint="Bu bilgi reklam spikeri tarafından videoda seslendirilir ve CapCut altyazısında vurgulanır."
                    >
                      <Input
                        value={extra.promo}
                        onChange={(event) =>
                          patch({
                            productExtras: {
                              ...draft.productExtras,
                              [product.id]: { ...extra, promo: event.target.value },
                            },
                          })
                        }
                        placeholder="Örn: Bu aya özel toptan alımlarda özel iskonto veya avantajlı fiyat"
                      />
                    </Field>
                  ) : null}
                  {!isVideo ? (
                    <>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Field label="Fiyat">
                          <Input
                            value={extra.price}
                            onChange={(event) =>
                              patch({
                                productExtras: {
                                  ...draft.productExtras,
                                  [product.id]: { ...extra, price: event.target.value },
                                },
                              })
                            }
                            placeholder="Örn. 249 TL"
                          />
                        </Field>
                        <Field label="Eski fiyat">
                          <Input
                            value={extra.oldPrice}
                            onChange={(event) =>
                              patch({
                                productExtras: {
                                  ...draft.productExtras,
                                  [product.id]: { ...extra, oldPrice: event.target.value },
                                },
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Bu görsele özel ek bilgi">
                        <Input
                          value={extra.extra}
                          onChange={(event) =>
                            patch({
                              productExtras: {
                                ...draft.productExtras,
                                [product.id]: { ...extra, extra: event.target.value },
                              },
                            })
                          }
                          placeholder="%40 indirim, 2 al 1 öde…"
                        />
                      </Field>
                      <Field label="Kampanya bilgisi">
                        <Input
                          value={extra.promo}
                          onChange={(event) =>
                            patch({
                              productExtras: {
                                ...draft.productExtras,
                                [product.id]: { ...extra, promo: event.target.value },
                              },
                            })
                          }
                        />
                      </Field>
                      <details>
                        <summary className="cursor-pointer text-[12.5px] text-ink-muted">AI ile paylaşılacak bilgiler</summary>
                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {PRODUCT_FIELD_KEYS.map((key) => (
                            <label key={key} className="flex items-center gap-2 text-[12.5px]">
                              <input
                                type="checkbox"
                                checked={extra.include[key]}
                                onChange={(event) =>
                                  patch({
                                    productExtras: {
                                      ...draft.productExtras,
                                      [product.id]: {
                                        ...extra,
                                        include: { ...extra.include, [key]: event.target.checked },
                                      },
                                    },
                                  })
                                }
                              />
                              {PRODUCT_FIELD_LABELS[key]}
                            </label>
                          ))}
                        </div>
                      </details>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    variant="danger"
                    className="h-8 text-[12px]"
                    onClick={() => patch({ productIds: draft.productIds.filter((id) => id !== product.id) })}
                  >
                    Kaldır
                  </Button>
                </div>
              </details>
            )
          })}
        </div>
      )
    ) : null}

      {step === 'extras' && !isVideo ? (
        <div className="space-y-2">
          <Button type="button" variant="quiet" onClick={() => setShowPhones((value) => !value)}>
            Numara ekle
          </Button>
          {showPhones ? (
            <Card>
              <div className="space-y-1.5 p-3.5">
                {data.phones.length === 0 ? (
                  <p className="text-[12.5px] text-ink-muted">Kayıtlı hat numarası yok.</p>
                ) : (
                  data.phones.map((phone) => (
                    <label key={phone.id} className="flex items-center gap-2 text-[13px]">
                      <input
                        type="checkbox"
                        checked={draft.phoneIds.includes(phone.id)}
                        onChange={(event) =>
                          patch({
                            phoneIds: event.target.checked
                              ? [...draft.phoneIds, phone.id]
                              : draft.phoneIds.filter((id) => id !== phone.id),
                          })
                        }
                      />
                      {phone.label} · {phone.phone}
                    </label>
                  ))
                )}
              </div>
            </Card>
          ) : null}

          <Button type="button" variant="quiet" onClick={() => setShowSocials((value) => !value)}>
            Sosyal medya ekle
          </Button>
          {showSocials ? (
            <Card>
              <div className="space-y-1.5 p-3.5">
                {socialsList.length === 0 ? (
                  <div className="flex flex-col items-start gap-2">
                    <p className="text-[12.5px] text-ink-muted">Kayıtlı hesap yok.</p>
                    {data.canManage ? (
                      <Button
                        type="button"
                        className="wb-wa-submit h-8"
                        onClick={() => setAddSocialOpen(true)}
                      >
                        <Icon name="plus" className="size-3.5" />
                        Hemen ekle
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {socialsList.map((social) => (
                      <label key={social.id} className="flex items-center gap-2 text-[13px]">
                        <input
                          type="checkbox"
                          checked={draft.socialIds.includes(social.id)}
                          onChange={(event) =>
                            patch({
                              socialIds: event.target.checked
                                ? [...draft.socialIds, social.id]
                                : draft.socialIds.filter((id) => id !== social.id),
                            })
                          }
                        />
                        {social.platform} · {social.label || social.url}
                      </label>
                    ))}
                    {data.canManage ? (
                      <Button
                        type="button"
                        variant="quiet"
                        className="mt-1 h-8 text-[12.5px]"
                        onClick={() => setAddSocialOpen(true)}
                      >
                        <Icon name="plus" className="size-3.5" />
                        Hesap ekle
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </Card>
          ) : null}

          <Field label="Etiket ekle">
            <div className="flex gap-2">
              <Input
                value={labelInput}
                onChange={(event) => setLabelInput(event.target.value)}
                placeholder="Nakitte geçerli"
              />
              <Button
                type="button"
                variant="quiet"
                onClick={() => {
                  const value = labelInput.trim()
                  if (!value) return
                  patch({ labels: [...draft.labels, value].slice(0, 8) })
                  setLabelInput('')
                }}
              >
                Ekle
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {draft.labels.map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full bg-[#e7f8f2] px-2.5 py-1 text-[12px] text-[#008069]"
                  onClick={() => patch({ labels: draft.labels.filter((item) => item !== label) })}
                >
                  {label} ×
                </button>
              ))}
            </div>
          </Field>

          <Button type="button" variant="quiet" onClick={() => setShowMore((value) => !value)}>
            Adres, site, tarih, CTA
          </Button>
          {showMore ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="CTA">
                <Input value={draft.cta} onChange={(event) => patch({ cta: event.target.value })} placeholder="Şimdi sipariş ver" />
              </Field>
              <Field label="Web sitesi">
                <Input value={draft.website} onChange={(event) => patch({ website: event.target.value })} />
              </Field>
              <Field label="Adres">
                <Input
                  value={draft.address}
                  onChange={(event) => patch({ address: event.target.value })}
                  placeholder={data.org.address ?? ''}
                />
              </Field>
              <Field label="Kampanya tarihi">
                <Input value={draft.dateRange} onChange={(event) => patch({ dateRange: event.target.value })} placeholder="9–15 Eylül" />
              </Field>
              <Field label="Özel metin">
                <Input value={draft.customText} onChange={(event) => patch({ customText: event.target.value })} />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 'style' ? (
        <div className="space-y-3">
          {!isVideo ? (
            <Field label="Kullanım alanı">
              <div className="grid gap-2 sm:grid-cols-2">
                {CREATIVE_FORMATS.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => patch({ formatId: row.id })}
                    className={`wb-wa-choice${draft.formatId === row.id ? ' is-on' : ''}`}
                  >
                    <span className="block text-[13.5px] font-semibold text-[#111b21]">{row.label}</span>
                    <span className="text-[12px] text-[#667781]">{row.hint}</span>
                  </button>
                ))}
              </div>
            </Field>
          ) : null}
          {isVideo ? (
            <Field label="Kurumsal Marka Logosu" hint="Videonuzda ve mekan tabelalarında kullanılacak kurumsal logonuz.">
              <div className="space-y-3">
                {draft.customLogoUrl || data.org.logoPreview ? (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={draft.customLogoUrl || data.org.logoPreview!}
                        alt="Marka Logosu"
                        className="size-14 shrink-0 rounded-lg border border-hairline bg-white object-contain p-1 shadow-sm"
                      />
                      <div>
                        <p className="text-[13.5px] font-bold text-[#111b21]">
                          {draft.customLogoUrl ? 'Özel Yüklenen Logo' : `${data.org.name || 'İşletme'} Resmi Logosu`}
                        </p>
                        <p className="text-[12px] font-medium text-emerald-700">
                          ✓ Videonuzda ve tabelalarda yer alacaktır
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileUploadButton
                        label="Farklı Logo Yükle"
                        accept="image/png,image/jpeg,image/webp"
                        uploading={uploading}
                        onFile={async (file) => {
                          setUploading(true)
                          try {
                            const form = new FormData()
                            form.append('file', file)
                            const res = await uploadAssetOnly(form, 'logos')
                            if (res?.publicUrl) patch({ customLogoUrl: res.publicUrl })
                          } finally {
                            setUploading(false)
                          }
                        }}
                      />
                      {draft.customLogoUrl ? (
                        <button
                          type="button"
                          onClick={() => patch({ customLogoUrl: '' })}
                          className="text-[12px] font-medium text-rose-600 hover:underline"
                        >
                          Varsayılana Dön
                        </button>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/60 p-4 text-center space-y-2">
                    <p className="text-[13px] font-semibold text-amber-900">Şirket logonuz tanımlı değil</p>
                    <p className="text-[12px] text-amber-800">
                      Videonun kurumsal kimliğinizi taşıması için lütfen logonuzu yükleyin.
                    </p>
                    <FileUploadButton
                      label="Logo Yükle"
                      accept="image/png,image/jpeg,image/webp"
                      uploading={uploading}
                      onFile={async (file) => {
                        setUploading(true)
                        try {
                          const form = new FormData()
                          form.append('file', file)
                          const res = await uploadAssetOnly(form, 'logos')
                          if (res?.publicUrl) patch({ customLogoUrl: res.publicUrl })
                        } finally {
                          setUploading(false)
                        }
                      }}
                    />
                  </div>
                )}
                <label className="flex items-center gap-2 text-[13px] text-[#111b21]">
                  <input
                    type="checkbox"
                    checked={draft.useLogo}
                    onChange={(event) => patch({ useLogo: event.target.checked })}
                  />
                  <span>İşletme logosu videonun kapanış sahnesinde yer alsın</span>
                </label>
              </div>
            </Field>
          ) : (
            <Field
              label="Marka kiti"
              hint={
                data.kits.length === 0
                  ? 'Kit yoksa renkler varsayılan kalır.'
                  : data.kits.length === 1
                    ? 'Tek kitiniz üretimde kullanılacak.'
                    : 'Varsayılan kit seçili; başka kit seçebilirsiniz.'
              }
            >
              {data.kits.length === 0 ? (
                <Notice tone="warn">
                  Marka kiti yok. Renkler varsayılan kalır.{' '}
                  <Link href="/ayarlar/marka/yeni" className="underline">
                    Kit ekle
                  </Link>
                </Notice>
              ) : (
                <div className="space-y-2">
                  {data.kits.map((kit) => {
                    const selected = draft.brandKitId === kit.id
                    const locked = data.kits.length === 1
                    return (
                      <button
                        key={kit.id}
                        type="button"
                        disabled={locked}
                        aria-pressed={selected}
                        onClick={() => {
                          if (!locked) patch({ brandKitId: kit.id })
                        }}
                        className={`wb-wa-choice flex w-full items-center gap-3 text-left${
                          selected ? ' is-on' : ''
                        }${locked ? ' is-fixed' : ''}`}
                      >
                        {kit.samplePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={kit.samplePreview}
                            alt=""
                            className="size-12 rounded-md border border-hairline bg-canvas object-contain"
                          />
                        ) : (
                          <span className="flex size-12 items-center justify-center rounded-md border border-hairline bg-canvas text-[11px] text-ink-faint">
                            Kit
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block font-semibold">
                            {kit.name}
                            {kit.isDefault ? (
                              <span className="ml-1.5 text-[11px] font-medium text-ink-muted">varsayılan</span>
                            ) : null}
                          </span>
                          <span className="mt-1 flex gap-1">
                            {['primary', 'accent', 'secondary'].map((key) => (
                              <span
                                key={key}
                                className="size-4 rounded-full border border-hairline"
                                style={{ background: kit.colors[key] }}
                              />
                            ))}
                          </span>
                          {kit.tone ? (
                            <span className="mt-1 block truncate text-[12px] text-ink-muted">{kit.tone}</span>
                          ) : null}
                        </span>
                      </button>
                    )
                  })}
                  {data.org.logoPreview ? (
                    <label className="flex items-center gap-2.5 text-[13px]">
                      <input
                        type="checkbox"
                        checked={draft.useLogo}
                        onChange={(event) => patch({ useLogo: event.target.checked })}
                      />
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={data.org.logoPreview}
                        alt=""
                        className="size-8 shrink-0 rounded-md border border-hairline bg-canvas object-contain"
                      />
                      <span>İşletme logosunu görsele ekle</span>
                    </label>
                  ) : (
                    <p className="text-[12.5px] text-ink-muted">
                      Logo eklemek için{' '}
                      <Link href="/ayarlar/marka" className="underline">
                        Marka kitleri
                      </Link>{' '}
                      sayfasından işletme logosu yükleyin.
                    </p>
                  )}
                </div>
              )}
            </Field>
          )}
          {!isVideo ? (
            <>
              <Field label="Görsel stili">
                <div className="flex flex-wrap gap-1.5">
                  {CREATIVE_STYLES.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => patch({ style: row.id })}
                      className={`wb-wa-chip${draft.style === row.id ? ' is-active' : ''}`}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Görseldeki metin miktarı">
                <div className="flex flex-wrap gap-1.5">
                  {TEXT_DENSITIES.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => patch({ textDensity: row.id })}
                      className={`wb-wa-chip${draft.textDensity === row.id ? ' is-active' : ''}`}
                    >
                      {row.label}
                    </button>
                  ))}
                </div>
              </Field>
            </>
          ) : (
            <>
              <Field label="Video Altyazı Seçeneği">
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => patch({ subtitles: true })}
                    className={`wb-wa-choice${draft.subtitles !== false ? ' is-on' : ''}`}
                  >
                    <span className="block text-[13.5px] font-semibold text-[#111b21]">Altyazılı</span>
                    <span className="text-[12px] text-[#667781]">
                      Video oluşturulduktan sonra altyazı botumuz Türkçe dış sesi algılayıp videoya senkronize altyazı ekler.
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => patch({ subtitles: false })}
                    className={`wb-wa-choice${draft.subtitles === false ? ' is-on' : ''}`}
                  >
                    <span className="block text-[13.5px] font-semibold text-[#111b21]">Altyazısız</span>
                    <span className="text-[12px] text-[#667781]">
                      Saf sinematik video; videonun üzerine hiçbir yazı veya altyazı eklenmez.
                    </span>
                  </button>
                </div>
              </Field>

              <Notice tone="accent">
                Yapay zeka işletmenizi, marka kitinizi ve ürünlerinizi analiz ederek en yüksek dönüşüm getiren sinematik reklam kurgusunu otomatik olarak oluşturacaktır.
              </Notice>
            </>
          )}
        </div>
      ) : null}

      {step === 'summary' ? (
        <Card>
          {isVideo ? (
            <div className="space-y-4 p-4 text-[13px]">
              <div>
                <p className="text-[14px] font-bold text-[#111b21]">3 — Kontrol Et ve Oluştur</p>
                <p className="text-[12px] text-[#667781] mt-0.5">
                  9:16 Dikey Format (8 Saniye) · Reels, TikTok ve WhatsApp Durum için optimize
                </p>
              </div>

              {/* Kompakt Logo ve Ürün Özeti */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-[#f8fafb] p-2">
                  {activeLogoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeLogoUrl}
                      alt="Logo"
                      className="size-9 rounded-md object-contain border border-hairline bg-white p-0.5 shrink-0"
                    />
                  ) : (
                    <div className="size-9 rounded-md border border-dashed border-rose-300 bg-rose-50 flex items-center justify-center text-[10px] text-rose-500 font-bold shrink-0">
                      Yok
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-semibold text-[#667781] tracking-wider">Logo</p>
                    <p className="font-semibold text-[#111b21] text-[12px] truncate">{data.org.name || 'İşletmeniz'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 rounded-lg border border-hairline bg-[#f8fafb] p-2">
                  {selectedProducts[0] && (draft.productExtras[selectedProducts[0].id]?.imageUrl || selectedProducts[0].images[0]?.url) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={draft.productExtras[selectedProducts[0].id]?.imageUrl || selectedProducts[0].images[0]?.url}
                      alt="Ürün"
                      className="size-9 rounded-md object-cover border border-hairline shrink-0"
                    />
                  ) : (
                    <div className="size-9 rounded-md border border-dashed border-amber-300 bg-amber-50 flex items-center justify-center text-[10px] text-amber-600 font-bold shrink-0">
                      Yok
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase font-semibold text-[#667781] tracking-wider">Ürün</p>
                    <p className="font-semibold text-[#111b21] text-[12px] truncate">{selectedProducts[0]?.name || 'Ürün'}</p>
                  </div>
                </div>
              </div>

              {/* Spiker Seslendirme Metni (Ön Onay) */}
              <div className="rounded-xl border border-hairline bg-surface p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-md bg-[#e7f8f2] text-[#008069]">
                      <Icon name="mic" className="size-3.5" />
                    </span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#111b21]">Seslendirme Metni</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded bg-[#e7f8f2] px-2 py-0.5 text-[10.5px] font-medium text-[#008069] border border-[#00a884]/30">
                    Ön Onaylı
                  </span>
                </div>

                {/* Düzenlenebilir Metin Kutusu */}
                <div>
                  <Textarea
                    value={activeVoiceoverText}
                    onChange={(e) => patch({ customVoiceover: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-[#d1d7db] bg-white p-2.5 text-[13px] font-normal text-[#111b21] focus:border-[#008069] focus:ring-1 focus:ring-[#008069]"
                    placeholder="Spikerin okumasını istediğiniz reklam repliğini buraya yazın veya düzenleyin..."
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px]">
                    <span className={voiceoverWordCount > 18 ? 'text-amber-700 font-medium' : 'text-[#667781]'}>
                      {voiceoverWordCount} kelime · ~{(voiceoverWordCount * 0.45).toFixed(1)} sn
                    </span>
                    {draft.customVoiceover && (
                      <button
                        type="button"
                        onClick={() => patch({ customVoiceover: '' })}
                        className="text-[#008069] hover:underline font-medium cursor-pointer"
                      >
                        Varsayılan Metne Dön
                      </button>
                    )}
                  </div>
                </div>

                {/* Hızlı Replik Şablonları */}
                <div className="space-y-1">
                  <p className="text-[10.5px] font-medium text-[#667781]">Hazır Şablonlar:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {voiceoverPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => patch({ customVoiceover: preset.text })}
                        className="rounded-md border border-[#e9edef] bg-white px-2 py-0.5 text-[11.5px] font-medium text-[#111b21] hover:bg-[#f0f2f5] hover:border-[#d1d7db] transition-colors cursor-pointer"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Garanti Notu */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#667781] pt-0.5">
                  <Icon name="check" className="size-3.5 text-[#008069] shrink-0" />
                  <span>Spiker ve altyazı motoru videoda sadece bu onaylanan metni okur.</span>
                </div>
              </div>

              {isVideo && !hasValidVideoLogo ? (
                <Notice tone="danger">
                  <strong>Kurumsal Logo Zorunludur:</strong> Yapay zekanın uydurma amblem üretmemesi için kurumsal logonuz tanımlı olmalıdır.
                </Notice>
              ) : null}
              {isVideo && !hasValidVideoProduct ? (
                <Notice tone="danger">
                  <strong>Ürün Görseli Zorunludur:</strong> Reklam videosu için lütfen geri dönüp ürün seçin.
                </Notice>
              ) : null}

              {/* Düzenle ve Videoyu Oluştur Butonları */}
              <div className="flex gap-2.5 pt-1">
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => go('products')}
                  className="flex-1 h-10 text-[13px] font-medium border border-hairline"
                >
                  Düzenle
                </Button>
                <Button
                  type="submit"
                  className="wb-wa-submit flex-2 h-10 text-[13px] font-semibold !bg-[#008069] hover:!bg-[#00a884] text-white shadow-sm"
                  disabled={
                    pending ||
                    !data.canManage ||
                    !data.imageAiEnabled ||
                    !hasValidVideoLogo ||
                    !hasValidVideoProduct
                  }
                >
                  {pending ? 'Video Prodüksiyonu Başlatılıyor…' : 'Metni Onayla ve Videoyu Üret'}
                </Button>
              </div>
              {!data.canManage ? <Notice tone="warn">Üretim için yönetici gerekir.</Notice> : null}
            </div>
          ) : (
            <div className="space-y-2 p-3.5 text-[13px]">
              <p>
                <span className="text-ink-muted">Marka: </span>
                {selectedKit?.name ?? 'Yok'}
              </p>
              <p>
                <span className="text-ink-muted">Format: </span>
                {isVideo
                  ? 'Kampanya videosu (9:16)'
                  : CREATIVE_FORMATS.find((row) => row.id === draft.formatId)?.label}
              </p>
              <p>
                <span className="text-ink-muted">Ürünler: </span>
                {selectedProducts.length}
              </p>
              <p>
                <span className="text-ink-muted">Logo: </span>
                {draft.useLogo ? 'Eklenecek' : 'Yok'}
              </p>
              {draft.phoneIds.length ? (
                <p>
                  <span className="text-ink-muted">Telefon: </span>
                  {data.phones
                    .filter((row) => draft.phoneIds.includes(row.id))
                    .map((row) => row.phone)
                    .join(', ')}
                </p>
              ) : null}
              {draft.labels.length ? (
                <p>
                  <span className="text-ink-muted">Etiketler: </span>
                  {draft.labels.join(', ')}
                </p>
              ) : null}
              <p className="text-ink-muted">{draft.brief}</p>
              <Button type="submit" className="wb-wa-submit" disabled={pending || !data.canManage || !data.imageAiEnabled}>
                {pending ? 'Kuyruğa alınıyor…' : 'Görseli oluştur'}
              </Button>
              {!data.canManage ? <Notice tone="warn">Üretim için yönetici gerekir.</Notice> : null}
            </div>
          )}
        </Card>
      ) : null}

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {!data.imageAiEnabled ? (
        <Notice tone="warn">Görsel üretimi kapalı. Sunucuda sağlayıcı anahtarı yok.</Notice>
      ) : null}
      </div>

      {step !== 'start' && step !== 'summary' ? (
        <div className="wb-wa-wizard-foot sticky bottom-0 z-[1] flex justify-between gap-2 px-4 py-3 sm:px-5">
          <Button type="button" className="wb-wa-text-btn" onClick={prevStep}>
            <Icon name="back" className="size-4" />
            Geri
          </Button>
          <Button type="button" className="wb-wa-submit" disabled={!canContinue} onClick={nextStep}>
            İleri
            <Icon name="outbound" className="size-4" />
          </Button>
        </div>
      ) : null}

      {step === 'summary' && !isVideo ? (
        <div className="wb-wa-wizard-foot sticky bottom-0 z-[1] px-4 py-3 sm:px-5">
          <Button type="button" className="wb-wa-text-btn" onClick={prevStep}>
            <Icon name="back" className="size-4" />
            Geri
          </Button>
        </div>
      ) : null}
    </form>
      </Card>

    <AddProductModal
      open={addProductOpen}
      onClose={() => setAddProductOpen(false)}
      onSuccess={(newProduct) => {
        setProductsList((prev) => [...prev, newProduct])
        addProduct(newProduct.id)
      }}
    />
    <AddSocialModal
      open={addSocialOpen}
      onClose={() => setAddSocialOpen(false)}
      onSuccess={(social) => {
        setSocialsList((prev) => (prev.some((row) => row.id === social.id) ? prev : [...prev, social]))
        setShowSocials(true)
        setDraft((current) => ({
          ...current,
          socialIds: current.socialIds.includes(social.id)
            ? current.socialIds
            : [...current.socialIds, social.id],
        }))
      }}
    />
  </>
  )
}
