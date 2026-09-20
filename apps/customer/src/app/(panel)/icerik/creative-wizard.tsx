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
import { startCreativeGeneration, uploadLibraryImage, type CreativeActionState } from './actions'
import { DEFAULT_INCLUDE, type ProductCard, type SocialOption, type WizardBootstrap } from './wizard-types'
import { AddProductModal } from './add-product-modal'
import { AddSocialModal } from './add-social-modal'

const DRAFT_KEY = 'wa.customer.creative-wizard.v1'

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
  { id: 'brief', label: 'Video Fikri' },
  { id: 'products', label: 'Öne Çıkan Ürünler' },
  { id: 'style', label: 'Marka & Ses' },
  { id: 'summary', label: 'Özet & Başlat' },
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
  return {
    requestKey: newKey(),
    origin: 'new',
    baseCreativeId: '',
    brief: isVideo ? defaultVideoBrief : '',
    brandKitId: data.kits.find((kit) => kit.isDefault)?.id ?? data.kits[0]?.id ?? '',
    useLogo: true,
    productIds: [],
    productExtras: {},
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
  const [step, setStep] = useState<Step>(() => (isInitialVideo ? 'brief' : 'start'))
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

  useEffect(() => {
    if (!pending) return
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      /* ignore */
    }
  }, [pending])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<Draft>
      const effectiveFormat = initialFormat || saved.formatId || (isInitialVideo ? 'reels_video' : 'wa')
      setDraft((current) => ({
        ...current,
        ...saved,
        formatId: effectiveFormat,
        requestKey: saved.requestKey || current.requestKey,
      }))
      if (effectiveFormat === 'reels_video') {
        setStep((s) => (s === 'start' ? 'brief' : s))
      }
    } catch {
      /* ignore */
    }
  }, [initialFormat, isInitialVideo])

  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {
      /* ignore */
    }
  }, [draft])

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
  const payload = useMemo(
    () =>
      JSON.stringify({
        ...draft,
        generationType: draft.origin === 'derive' ? 'derived' : 'new',
        useLogo: draft.useLogo,
      }),
    [draft],
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
  const hasValidVideoLogo = Boolean(selectedKit?.samplePreview || data.org.logoPreview)

  let canContinue = true
  if (step === 'brief') {
    canContinue = draft.brief.trim().length >= 8
  } else if (step === 'summary' && isVideo) {
    canContinue = hasValidVideoLogo
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
          <button
            type="button"
            onClick={() => {
              patch({ origin: 'new', baseCreativeId: '', formatId: 'reels_video' })
              go('brief')
            }}
            className={`wb-wa-choice${draft.origin === 'new' && draft.formatId === 'reels_video' ? ' is-on' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-[#111b21]">Kampanya videosu üret</p>
            </div>
            <p className="mt-1 text-[12.5px] text-[#667781]">Sıfırdan sinematik 9:16 reklam videosu. Marka ve ürünleriniz bağlanır.</p>
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
          <div className="space-y-3 p-3.5">
            <Field
              label={isVideo ? 'Kampanya videosunda ne anlatmak istiyorsunuz?' : 'Görselde ne anlatmak istiyorsunuz?'}
              hint={isVideo ? '10 saniyelik dikey reklam filminizin ana temasını ve mesajını yazın.' : undefined}
            >
              <Textarea
                name="brief-ui"
                rows={4}
                value={draft.brief}
                onChange={(event) => patch({ brief: event.target.value })}
                placeholder={
                  isVideo
                    ? `${data.org.name || 'İşletmemiz'} için ürün kalitemizi ve sunduğumuz ayrıcalıkları anlatan, 9:16 dikey sinematik reklam videosu.`
                    : 'Hafta sonuna özel tüm ürünlerde %25 indirim. Sıcak, kaliteli ve premium bir WhatsApp kampanya görseli istiyorum.'
                }
              />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {isVideo
                ? (data.suggestedVideoChips && data.suggestedVideoChips.length > 0
                    ? data.suggestedVideoChips
                    : VIDEO_BRIEF_CHIPS
                  ).map((chip) => (
                    <button
                      key={chip.label}
                      type="button"
                      className={`wb-wa-chip ${draft.brief === chip.text ? '!border-[#00a884] !bg-[#e7f8f2] !text-[#008069] font-medium' : ''}`}
                      onClick={() => patch({ brief: chip.text })}
                    >
                      {chip.label}
                    </button>
                  ))
                : BRIEF_CHIPS.map((chip) => (
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

            {isVideo ? (
              <div className="mt-4 pt-3.5 border-t border-hairline space-y-2">
                <p className="text-[12.5px] font-semibold text-[#111b21]">
                  Eylem Çağrısı (İsteğe Bağlı)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bizimle İletişime Geçin',
                    'Fiyat Teklifi Alın',
                    'Detaylı Bilgi Alın',
                    'Hemen Keşfet',
                    'Randevu Alın',
                    'Sipariş Verin',
                  ].map((ctaItem) => (
                    <button
                      key={ctaItem}
                      type="button"
                      className={`wb-wa-chip text-[12px] transition-all ${
                        draft.cta === ctaItem
                          ? '!border-[#00a884] !bg-[#e7f8f2] !text-[#008069] font-semibold'
                          : 'hover:border-[#00a884]'
                      }`}
                      onClick={() => patch({ cta: draft.cta === ctaItem ? '' : ctaItem })}
                    >
                      {ctaItem}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {step === 'products' ? (
        <div className="space-y-3">
          {isVideo ? (
            <Notice tone="accent">
              Tanıtmak istediğiniz bir ürün varsa seçebilir veya ürün seçmeden doğrudan genel kurumsal tanıtım videosu üretebilirsiniz.
            </Notice>
          ) : null}
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
                              const res = await uploadLibraryImage(form)
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
                              const res = await uploadLibraryImage(form)
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
                    <span>{isVideo ? 'İşletme logosu videonun kapanış sahnesinde yer alsın' : 'İşletme logosunu görsele ekle'}</span>
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
            <div className="space-y-3 p-4 text-[13px]">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-hairline bg-canvas p-3 space-y-1">
                  <p className="text-[11.5px] font-medium text-ink-muted uppercase tracking-wider">Format & Süre</p>
                  <p className="font-bold text-[#111b21]">9:16 Dikey Reklam Videosu (10 Saniye)</p>
                  <p className="text-[12px] text-[#667781]">Reels, TikTok ve WhatsApp Durum için optimize</p>
                </div>
                <div className="rounded-md border border-hairline bg-canvas p-3 space-y-1">
                  <p className="text-[11.5px] font-medium text-ink-muted uppercase tracking-wider">Altyazı Kurgusu</p>
                  <p className="font-bold text-[#111b21]">
                    {draft.subtitles !== false ? 'Altyazılı' : 'Altyazısız'}
                  </p>
                  <p className="text-[12px] text-[#667781]">
                    {draft.subtitles !== false ? 'CapCut botu senkronize altyazı ekler' : 'Saf sinematik video (yazısız)'}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-hairline bg-canvas p-3 space-y-1">
                <p className="text-[11.5px] font-medium text-ink-muted uppercase tracking-wider">Marka & Logo</p>
                <p className="text-[#111b21]">
                  <span className="font-semibold">{selectedKit?.name ?? 'Varsayılan Kurumsal Kimlik'}</span> · Logo: {draft.useLogo ? 'Videonun kapanış sahnesinde yer alacak' : 'Logosuz (Saf Sinematik Çekim)'}
                </p>
              </div>

              <div className="rounded-md border border-hairline bg-canvas p-3 space-y-1">
                <p className="text-[11.5px] font-medium text-ink-muted uppercase tracking-wider">Öne Çıkan Ürünler</p>
                <p className="text-[#111b21]">
                  {selectedProducts.length > 0
                    ? selectedProducts.map((p) => p.name).join(', ')
                    : 'Genel işletme ve marka tanıtımı'}
                </p>
              </div>

              <div className="rounded-md border border-hairline bg-canvas p-3 space-y-1">
                <p className="text-[11.5px] font-medium text-ink-muted uppercase tracking-wider">Kampanya Fikri / Brief</p>
                <p className="text-[#111b21]">{draft.brief}</p>
              </div>

              {draft.cta ? (
                <div className="rounded-md border border-hairline bg-canvas p-3 space-y-1">
                  <p className="text-[11.5px] font-medium text-ink-muted uppercase tracking-wider">
                    Eylem Çağrısı
                  </p>
                  <p className="text-[13px] font-bold text-[#111b21]">{draft.cta}</p>
                </div>
              ) : null}

              {isVideo && !hasValidVideoLogo ? (
                <Notice tone="danger">
                  <strong>Kurumsal Logo Zorunludur:</strong> Yapay zekanın uydurma semboller veya alakasız grafikler üretmemesi için Marka Kiti veya İşletme logonuzun tanımlı olması gerekir. Lütfen{' '}
                  <Link href="/ayarlar/marka" className="underline font-semibold">
                    Marka Kiti sayfasından logonuzu yükleyin.
                  </Link>
                </Notice>
              ) : null}
              {isVideo && hasValidVideoProduct ? (
                <Notice tone="accent">
                  Seçilen ürün fotoğrafı ve kurumsal kimliğiniz ile reklam filmi üretilecektir.
                </Notice>
              ) : isVideo ? (
                <Notice tone="accent">
                  Ürün fotoğrafı seçilmedi; kurumsal logonuz ve marka kimliğiniz temel alınarak genel tanıtım filmi üretilecektir.
                </Notice>
              ) : null}

              <Button
                type="submit"
                className="wb-wa-submit w-full h-11 text-[13.5px] font-semibold"
                disabled={
                  pending ||
                  !data.canManage ||
                  !data.imageAiEnabled ||
                  (isVideo && !hasValidVideoLogo)
                }
              >
                {pending ? 'Video prodüksiyonu başlatılıyor…' : 'Kampanya Videosunu Başlat'}
              </Button>
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
                {CREATIVE_FORMATS.find((row) => row.id === draft.formatId)?.label}
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

      {step === 'summary' ? (
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
