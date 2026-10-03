'use client'

import { isReadyImageSource } from '@/lib/creative/image-source'
import { requiredImageAssets } from '@/lib/creative/required-image-assets'
import { getSafeMediaUrl } from '@/lib/media-url'

import { useActionState, useEffect, useMemo, useState, useRef } from 'react'
import Link from 'next/link'
import { Button, Card, Field, FileUploadButton, Input, Notice, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { Stepper } from '@/components/stepper'
import { CreativeProductionVisual } from '@/components/creative-production-visual'
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
import { startCreativeGeneration, uploadLibraryImage, uploadProductReference, type CreativeActionState } from './actions'
import { DEFAULT_INCLUDE, type ProductCard, type SocialOption, type WizardBootstrap } from './wizard-types'
import { AddProductModal } from './add-product-modal'
import { AddSocialModal } from './add-social-modal'

const DRAFT_KEY_PREFIX = 'wa.customer.creative-wizard.image.v2'

type Step = 'start' | 'brief' | 'products' | 'extras' | 'style' | 'summary'

const STEPS: { id: Step; label: string }[] = [
  { id: 'start', label: 'Başlangıç' },
  { id: 'brief', label: 'Fikir' },
  { id: 'products', label: 'Ürünler' },
  { id: 'extras', label: 'Ekler' },
  { id: 'style', label: 'Stil' },
  { id: 'summary', label: 'Özet' },
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
}

function newKey() {
  return crypto.randomUUID()
}

function ProductReferencePreview({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url])
  const source = getSafeMediaUrl(url)
  return (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-hairline bg-surface">
      {source && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={source} alt={`${name} ürün referansı`} loading="lazy" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      ) : <span className="px-1 text-center text-[10px] leading-tight text-muted">Referans görseli eksik</span>}
    </span>
  )
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

function defaultDraft(data: WizardBootstrap): Draft {
  return {
    requestKey: newKey(),
    origin: 'new',
    baseCreativeId: '',
    brief: '',
    brandKitId: data.kits.find((kit) => kit.isDefault)?.id ?? data.kits[0]?.id ?? '',
    useLogo: Boolean(data.org.logoPreview || data.kits.some((kit) => kit.samplePreview)),
    productIds: [],
    productExtras: {},
    phoneIds: [],
    socialIds: [],
    labels: [],
    cta: '',
    address: '',
    website: data.org.websiteHint ?? '',
    dateRange: '',
    customText: '',
    formatId: 'wa',
    style: 'auto',
    textDensity: 'balanced',
  }
}

export function ImageCreativeWizard({ data }: { data: WizardBootstrap }) {
  const [step, setStep] = useState<Step>('start')
  const [draft, setDraft] = useState<Draft>(() => defaultDraft(data))
  const [labelInput, setLabelInput] = useState('')
  const [ideaPending, setIdeaPending] = useState(false)
  const [ideaNotice, setIdeaNotice] = useState('')
  const ideaVersion = useRef(0)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [referenceUploading, setReferenceUploading] = useState<string | null>(null)
  const [uploadedSourceId, setUploadedSourceId] = useState<string | null>(null)
  const imageLibrary = data.library.filter(isReadyImageSource)
  const validBaseSource = Boolean(draft.baseCreativeId && (uploadedSourceId === draft.baseCreativeId || imageLibrary.some(item => item.id === draft.baseCreativeId)))
  const [showPhones, setShowPhones] = useState(false)
  const [showSocials, setShowSocials] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [state, formAction, pending] = useActionState<CreativeActionState, FormData>(
    startCreativeGeneration,
    null,
  )
  const isImageToImage = Boolean(draft.baseCreativeId) || draft.productIds.length > 0
  useCreativeGenerationProgress(pending, isImageToImage)

  const orgDraftKey = `${DRAFT_KEY_PREFIX}.${data.org.id}`

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
      localStorage.removeItem('wa.customer.creative-wizard.v1')
      const raw = localStorage.getItem(orgDraftKey)
      if (!raw) return
      const saved = JSON.parse(raw) as Partial<Draft>
      if (saved.formatId === 'reels_video') {
        saved.formatId = 'wa'
      }
      const validProductIds = (saved.productIds || []).filter((id) =>
        data.products.some((p) => p.id === id)
      )
      const validKitId = (data.kits.some((k) => k.id === saved.brandKitId) && saved.brandKitId)
        ? saved.brandKitId
        : (data.kits.find((k) => k.isDefault)?.id ?? data.kits[0]?.id ?? '')

      setDraft((current) => ({
        ...current,
        ...saved,
        brandKitId: validKitId,
        productIds: validProductIds,
        // BUG-FIX: requestKey'i localStorage'dan GERİ YÜKLEME. Her yeni
        // üretim isteği benzersiz bir key almalı, aksi halde sunucu eski
        // key'i DB'de bulup önceki görsele redirect yapıyor.
        requestKey: newKey(),
        // BUG-FIX: Eski localStorage verilerinde bu alanlar null olabilir.
        // null.map() çağrıldığında sayfa "Bu sayfayı yükleyemedik" ile çöküyordu.
        labels: Array.isArray(saved.labels) ? saved.labels : current.labels,
        phoneIds: Array.isArray(saved.phoneIds) ? saved.phoneIds : current.phoneIds,
        socialIds: Array.isArray(saved.socialIds) ? saved.socialIds : current.socialIds,
        productExtras: (saved.productExtras && typeof saved.productExtras === 'object' && !Array.isArray(saved.productExtras))
          ? saved.productExtras
          : current.productExtras,
      }))
    } catch {
      /* ignore */
    }
  }, [orgDraftKey, data.products, data.kits])

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

  const stepIndex = STEPS.findIndex((row) => row.id === step)
  const selectedKit = data.kits.find((kit) => kit.id === draft.brandKitId)
  const selectedProducts = productsList.filter((product) => draft.productIds.includes(product.id))
  const allProductReferencesReady = selectedProducts.every(product => {
    const extra = { ...(draft.productExtras[product.id] ?? emptyExtra()), imageUrl: draft.productExtras[product.id]?.imageUrl || product.images[0]?.url || '' }
    return extra.include.image && Boolean(extra.imageUrl) && extra.imageUrl !== data.org.logoPreview && !/^\/?(?:brand|logos)\//i.test(extra.imageUrl) &&
      product.images.some(image => image.url === extra.imageUrl)
  })
  const requiredAssetsReady = requiredImageAssets({
    useLogo: draft.useLogo, hasLogo: Boolean(selectedKit?.samplePreview || data.org.logoPreview),
    hasValidBase: draft.origin === 'derive' && Boolean(validBaseSource),
    hasProductReference: selectedProducts.length > 0 && allProductReferencesReady,
  }).ready && allProductReferencesReady
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
    const next = STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]
    if (next) go(next.id)
  }
  const prevStep = () => {
    const prev = STEPS[Math.max(0, stepIndex - 1)]
    if (prev) go(prev.id)
  }

  const patch = (partial: Partial<Draft>) => setDraft((current) => ({ ...current, ...partial }))

  async function suggestIdea(category: string) {
    const version = ++ideaVersion.current
    const fallback = `${data.org.name} için ${category.toLocaleLowerCase('tr-TR')} odaklı, markamızın renkleriyle sade bir tanıtım görseli hazırlayalım.`
    setIdeaPending(true)
    setIdeaNotice('İşletmenize uygun kısa fikir hazırlanıyor…')
    try {
      const response = await fetch('/api/icerik/fikir',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({category,brandKitId:draft.brandKitId,productIds:draft.productIds}),signal:AbortSignal.timeout(25000)})
      const result = await response.json()
      if (!response.ok || typeof result.text!=='string') throw new Error('IDEA_UNAVAILABLE')
      if (version !== ideaVersion.current) return
      patch({brief:result.text})
      setIdeaNotice(result.source==='gpt' ? 'İşletmenize göre önerildi. Metni değiştirebilirsiniz.' : 'Hazır fikir eklendi. Metni değiştirebilirsiniz.')
    } catch {
      if (version !== ideaVersion.current) return
      patch({brief:fallback})
      setIdeaNotice('Hazır fikir eklendi. Metni değiştirebilirsiniz.')
    } finally { if (version === ideaVersion.current) setIdeaPending(false) }
  }

  const addProduct = (id: string, suppliedProduct?: ProductCard) => {
    if (draft.productIds.includes(id)) return
    const product = suppliedProduct || productsList.find((row) => row.id === id)
    patch({
      productIds: [...draft.productIds, id],
      productExtras: {
        ...draft.productExtras,
        [id]: draft.productExtras[id] ?? emptyExtra(product?.images[0]?.url ?? ''),
      },
    })
  }

  async function saveProductReference(productId: string, file: File) {
    setReferenceUploading(productId)
    setUploadError(null)
    try {
      const form = new FormData()
      form.set('productId',productId)
      form.set('file',file)
      const result = await uploadProductReference(form)
      if (!result.image) throw new Error(result.error || 'Görsel kaydedilemedi.')
      const image = result.image
      setProductsList(current => current.map(product => product.id === productId ? {...product,images:[image,...product.images]} : product))
      setDraft(current => ({...current,productExtras:{...current.productExtras,[productId]:{...(current.productExtras[productId] || emptyExtra()),imageUrl:image.url,include:{...(current.productExtras[productId]?.include || DEFAULT_INCLUDE),image:true}}}}))
    } catch (error) { setUploadError(error instanceof Error ? error.message : 'Görsel kaydedilemedi.') }
    finally { setReferenceUploading(null) }
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
    if (!isReadyImageSource({format:'square',status:'ready',publicUrl:result.publicUrl})) {
      setUploadError('Yüklenen kaynak kullanılabilir bir görsel olarak doğrulanamadı.')
      return
    }
    setUploadedSourceId(result.id)
    patch({ origin: 'derive', baseCreativeId: result.id })
  }

  const canContinue =
    step !== 'brief' || draft.brief.trim().length >= 8
  const currentLabel = STEPS.find((item) => item.id === step)?.label ?? ''

  return (
    <>
      <Card className="wb-wa-wizard creative-studio-wizard overflow-visible">
        {pending ? (
          <div className="creative-image-pending" role="status" aria-live="polite">
            <CreativeProductionVisual kind="image" />
            <h3 className="creative-production-heading">Görseliniz hazırlanıyor</h3>
            <p className="creative-production-caption">Markanız ve seçtiğiniz görsellerle oluşturulan isteğiniz işleniyor. Sonuç bu işlem tamamlandığında gösterilecek.</p>
          </div>
        ) : null}
        <div className="wb-wa-wizard-steps">
          <Stepper
            label="Görsel adımları"
            steps={STEPS}
            current={step}
            onJump={(id) => go(id as Step)}
            className="wb-wa-steps"
          />
          <p className="wb-wa-wizard-step-title">{currentLabel}</p>
        </div>

      <form
        action={formAction}
        onSubmit={(event) => {
          if (step !== 'summary' || !requiredAssetsReady || (draft.origin === 'derive' && !validBaseSource)) event.preventDefault()
        }}
        className="flex flex-col"
      >
        <input type="hidden" name="draft" value={payload} />

      <div className="space-y-3 px-4 py-3 sm:px-5">
      {step === 'start' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              patch({ origin: 'new', baseCreativeId: '' })
              go('brief')
            }}
            className={`wb-wa-choice${draft.origin === 'new' ? ' is-on' : ''}`}
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
            {imageLibrary.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {imageLibrary.map((item) => (
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
            <Button type="button" className="wb-wa-submit" disabled={!validBaseSource} onClick={() => go('brief')}>
              Devam
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 'brief' ? (
        <Card>
          <div className="space-y-3 p-3.5">
            <Field label="Görselde ne anlatmak istiyorsunuz?">
              <Textarea
                name="brief-ui"
                rows={5}
                value={draft.brief}
                onChange={(event) => { ideaVersion.current++; setIdeaPending(false); setIdeaNotice(''); patch({ brief: event.target.value }) }}
                placeholder="Hafta sonuna özel tüm kahvaltı ürünlerinde %25 indirim. Sıcak, iştah açıcı ve premium bir WhatsApp kampanya görseli istiyorum."
              />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {BRIEF_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  className="wb-wa-chip"
                  disabled={ideaPending}
                  onClick={() => void suggestIdea(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
            {ideaNotice ? <p role="status" className="text-xs text-muted">{ideaNotice}</p> : null}
          </div>
        </Card>
      ) : null}

      {step === 'products' ? (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-2">
            {productsList.map((product) => (
              <button
                key={product.id}
                type="button"
                aria-pressed={draft.productIds.includes(product.id)}
                className={`flex min-w-0 items-center gap-3 rounded-[var(--radius-card)] border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${draft.productIds.includes(product.id) ? 'border-[#00a884] bg-[#e7f8f2]' : 'border-hairline bg-surface hover:bg-[#f7f9fa]'}`}
                onClick={() => addProduct(product.id)}
              >
                <ProductReferencePreview url={draft.productExtras[product.id]?.imageUrl || product.images[0]?.url} name={product.name} />
                <span className="min-w-0 flex-1">
                  <span className="block break-words text-[13.5px] font-semibold">{product.name}</span>
                  <span className="block text-xs text-muted">{product.images.length ? 'Üretime gönderilecek ürün referansı' : 'Referans görseli eksik'}</span>
                </span>
                <span aria-hidden="true" className="text-lg">{draft.productIds.includes(product.id) ? '✓' : '+'}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAddProductOpen(true)}
              className="rounded-full border border-dashed border-[#00a884]/60 bg-[#e7f8f2] px-3 py-1 text-[12.5px] font-medium text-[#008069] hover:bg-[#d9f5eb]"
            >
              + Ürün ekle
            </button>
            {productsList.length === 0 ? (
              <Notice tone="warn">
                Aktif ürün yok.{' '}
                <button
                  type="button"
                  onClick={() => setAddProductOpen(true)}
                  className="underline font-semibold cursor-pointer text-ink hover:text-[#008069]"
                >
                  Modal ile ürün ekle
                </button>
              </Notice>
            ) : null}
          </div>
          {selectedProducts.map((product) => {
            const extra = { ...(draft.productExtras[product.id] ?? emptyExtra()), imageUrl: draft.productExtras[product.id]?.imageUrl || product.images[0]?.url || '' }
            return (
              <details key={product.id} open className="rounded-[var(--radius-card)] border border-hairline bg-surface">
                <summary className="cursor-pointer px-3.5 py-2.5 text-[13.5px] font-semibold">
                  <span className="inline-flex items-center gap-3 align-middle">
                    <ProductReferencePreview url={extra.imageUrl} name={product.name} />
                    <span>{product.name}</span>
                  </span>
                </summary>
                <div className="space-y-2 border-t border-hairline p-3.5">
                  <FileUploadButton label={extra.imageUrl ? 'Ürün görselini ekle / değiştir' : 'Ürün görseli ekle'} accept="image/png,image/jpeg,image/webp" uploading={referenceUploading !== null} onFile={file => void saveProductReference(product.id,file)} />
                  <p className="text-xs text-muted">Yüklediğiniz görsel bu ürüne kaydedilir ve üretimde seçilir.</p>
                  {uploadError ? <Notice tone="danger">{uploadError}</Notice> : null}
                  {product.images.length > 1 ? (
                    <Field label="AI’a gönderilecek ürün görseli">
                      <div className="grid grid-cols-4 gap-1.5">
                        {product.images.map((image) => (
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
                            className={`overflow-hidden rounded-md border ${
                              extra.imageUrl === image.url ? 'border-[#00a884]' : 'border-[#e9edef]'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={image.url} alt="" className="h-16 w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </Field>
                  ) : null}
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

      {step === 'extras' ? (
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
        </div>
      ) : null}

      {step === 'summary' ? (
        <Card>
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
            {!requiredAssetsReady ? <p role="alert" className="text-sm text-red-700">Görsel üretmek için logo ve ürün veya referans görseli ekleyin.</p> : null}
            <Button type="submit" className="wb-wa-submit" disabled={pending || !data.canManage || !data.imageAiEnabled || !requiredAssetsReady || (draft.origin === 'derive' && !validBaseSource)}>
              {pending ? 'Kuyruğa alınıyor…' : 'Görseli oluştur'}
            </Button>
            {!data.canManage ? <Notice tone="warn">Üretim için yönetici gerekir.</Notice> : null}
          </div>
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
        addProduct(newProduct.id, newProduct)
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
