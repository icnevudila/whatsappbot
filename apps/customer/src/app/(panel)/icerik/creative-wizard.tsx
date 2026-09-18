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
import {
  fetchVideoScenariosAction,
  startCreativeGeneration,
  uploadLibraryImage,
  type CreativeActionState,
} from './actions'
import type { VideoScenarioOption } from '@/lib/creative/video-scenario'
import { DEFAULT_INCLUDE, type ProductCard, type SocialOption, type WizardBootstrap } from './wizard-types'
import { AddProductModal } from './add-product-modal'
import { AddSocialModal } from './add-social-modal'

const DRAFT_KEY = 'wa.customer.creative-wizard.v1'

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
  videoSpeech?: boolean
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

function defaultDraft(data: WizardBootstrap): Draft {
  return {
    requestKey: newKey(),
    origin: 'new',
    baseCreativeId: '',
    brief: '',
    brandKitId: data.kits.find((kit) => kit.isDefault)?.id ?? data.kits[0]?.id ?? '',
    useLogo: false,
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
    videoSpeech: true,
    videoScenarioPrompt: '',
    videoScenarioTitle: '',
  }
}

export function CreativeWizard({ data }: { data: WizardBootstrap }) {
  const [step, setStep] = useState<Step>('start')
  const [draft, setDraft] = useState<Draft>(() => defaultDraft(data))
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

  const [scenarios, setScenarios] = useState<VideoScenarioOption[]>([])
  const [scenariosLoading, setScenariosLoading] = useState(false)
  const [scenarioStage, setScenarioStage] = useState(0)
  const [expandedPromptId, setExpandedPromptId] = useState<string | null>(null)

  const SCENARIO_STAGES = [
    { title: '1. Bağlam Analizi', desc: 'İşletme kimliği, ürünler ve kampanya hedefleri inceleniyor...' },
    { title: '2. ChatGPT Senaryo Masası', desc: '3 farklı dikkat çekici reklam filmi senaryosu yazılıyor...' },
    { title: '3. Kamera & Dış Ses Kurgusu', desc: '9:16 kamera hareketleri, sahne geçişleri ve diyaloglar kurgulanıyor...' },
    { title: '4. Senaryolar Hazırlandı!', desc: 'Seçebileceğiniz 3 özel reklam senaryosu hazır.' },
  ]

  const handleGenerateScenarios = async () => {
    setScenariosLoading(true)
    setScenarioStage(0)

    const timer1 = setTimeout(() => setScenarioStage(1), 900)
    const timer2 = setTimeout(() => setScenarioStage(2), 2100)

    try {
      const res = await fetchVideoScenariosAction(draft as unknown as Record<string, unknown>)
      clearTimeout(timer1)
      clearTimeout(timer2)
      setScenarioStage(3)
      await new Promise((r) => setTimeout(r, 500))

      if (res.ok && res.scenarios?.length) {
        setScenarios(res.scenarios)
        if (!draft.videoScenarioPrompt || !res.scenarios.some((s) => s.fullPrompt === draft.videoScenarioPrompt)) {
          patch({
            videoScenarioPrompt: res.scenarios[0].fullPrompt,
            videoScenarioTitle: res.scenarios[0].title,
          })
        }
      }
    } catch (err) {
      console.error('Senaryo üretilirken hata:', err)
    } finally {
      setScenariosLoading(false)
    }
  }

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
      setDraft((current) => ({ ...current, ...saved, requestKey: saved.requestKey || current.requestKey }))
    } catch {
      /* ignore */
    }
  }, [])

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

  const stepIndex = STEPS.findIndex((row) => row.id === step)
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
    const next = STEPS[Math.min(STEPS.length - 1, stepIndex + 1)]
    if (next) go(next.id)
  }
  const prevStep = () => {
    const prev = STEPS[Math.max(0, stepIndex - 1)]
    if (prev) go(prev.id)
  }

  const patch = (partial: Partial<Draft>) => setDraft((current) => ({ ...current, ...partial }))

  const addProduct = (id: string) => {
    if (draft.productIds.includes(id)) return
    const product = productsList.find((row) => row.id === id)
    patch({
      productIds: [...draft.productIds, id],
      productExtras: {
        ...draft.productExtras,
        [id]: draft.productExtras[id] ?? emptyExtra(product?.images[0]?.url ?? ''),
      },
    })
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

  const canContinue =
    step !== 'brief' || draft.brief.trim().length >= 8
  const currentLabel = STEPS.find((item) => item.id === step)?.label ?? ''

  return (
    <>
      <Card className="wb-wa-wizard overflow-visible">
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
            <p className="font-bold text-[#111b21]">Kampanya videosu üret</p>
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
            <Field label="Görselde ne anlatmak istiyorsunuz?">
              <Textarea
                name="brief-ui"
                rows={5}
                value={draft.brief}
                onChange={(event) => patch({ brief: event.target.value })}
                placeholder="Hafta sonuna özel tüm kahvaltı ürünlerinde %25 indirim. Sıcak, iştah açıcı ve premium bir WhatsApp kampanya görseli istiyorum."
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
          </div>
        </Card>
      ) : null}

      {step === 'products' ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {productsList.map((product) => (
              <button
                key={product.id}
                type="button"
                className="wb-wa-chip"
                onClick={() => addProduct(product.id)}
              >
                + {product.name}
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
            const extra = draft.productExtras[product.id] ?? emptyExtra(product.images[0]?.url ?? '')
            return (
              <details key={product.id} open className="rounded-[var(--radius-card)] border border-hairline bg-surface">
                <summary className="cursor-pointer px-3.5 py-2.5 text-[13.5px] font-semibold">
                  {product.name}
                </summary>
                <div className="space-y-2 border-t border-hairline p-3.5">
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
          {isVideo ? (
            <>
              <Field label="Video seslendirme ve ses kurgusu">
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => patch({ videoSpeech: true })}
                  className={`wb-wa-choice${draft.videoSpeech !== false ? ' is-on' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name="mic" className="size-4 text-emerald-600" />
                    <span className="block text-[13.5px] font-semibold text-[#111b21]">Seslendirmeli (Dış Ses Var)</span>
                  </div>
                  <span className="text-[12px] text-[#667781]">
                    Profesyonel Türkçe reklam spikeri; ürün, kampanya ve sipariş çağrısını seslendirir.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => patch({ videoSpeech: false })}
                  className={`wb-wa-choice${draft.videoSpeech === false ? ' is-on' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Icon name="activity" className="size-4 text-sky-600" />
                    <span className="block text-[13.5px] font-semibold text-[#111b21]">Konuşmasız (Sadece Müzik & Foley)</span>
                  </div>
                  <span className="text-[12px] text-[#667781]">
                    İnsan sesi ve diyalog yok; sadece sahneye özel doğal ses efektleri ve dinamik fon müziği.
                  </span>
                </button>
              </div>
            </Field>

            <Field
              label="Reklam filmi senaryosu & yönetmen kurgusu"
              hint="ChatGPT işletmeniz ve ürünleriniz için 3 farklı dikkat çekici reklam senaryosu hazırlar."
            >
              <div className="space-y-3">
                {scenarios.length === 0 && !scenariosLoading ? (
                  <div className="rounded-xl border border-dashed border-[#00a884]/40 bg-[#e7f8f2]/30 p-4 text-center">
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-[#00a884]/15 text-[#008069]">
                      <Icon name="sparkles" className="size-5" />
                    </div>
                    <h4 className="mt-2 text-[14px] font-semibold text-[#111b21]">
                      ChatGPT Reklam Senaryoları Hazırla
                    </h4>
                    <p className="mt-1 text-[12.5px] text-[#667781]">
                      Marka ve ürün bağlamınızdan 3 farklı video senaryosu ve Veo çekim promptu oluşturun.
                    </p>
                    <Button
                      type="button"
                      className="wb-wa-submit mx-auto mt-3 h-9 gap-2 px-4 text-[13px]"
                      onClick={handleGenerateScenarios}
                    >
                      <Icon name="sparkles" className="size-4" />
                      ChatGPT ile Senaryoları Üret
                    </Button>
                  </div>
                ) : null}

                {scenariosLoading ? (
                  <div className="rounded-xl border border-[#00a884]/30 bg-[#f0fbf7] p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-bold uppercase tracking-wider text-[#008069]">
                        Yapay Zeka Yönetmen Sihirbazı
                      </span>
                      <span className="text-[12px] font-medium text-[#008069]">
                        Adım {Math.min(scenarioStage + 1, 4)} / 4
                      </span>
                    </div>

                    {/* Dynamic Progress Bar */}
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#008069]/15">
                      <div
                        className="h-full bg-[#008069] transition-all duration-500 ease-out"
                        style={{ width: `${((scenarioStage + 1) / 4) * 100}%` }}
                      />
                    </div>

                    {/* Stages List */}
                    <div className="mt-3 space-y-2">
                      {SCENARIO_STAGES.map((st, idx) => {
                        const isPast = scenarioStage > idx
                        const isCurrent = scenarioStage === idx
                        return (
                          <div
                            key={st.title}
                            className={`flex items-start gap-2.5 rounded-lg p-2 transition-all ${
                              isCurrent
                                ? 'bg-white shadow-xs border border-[#00a884]/20'
                                : isPast
                                ? 'opacity-85'
                                : 'opacity-40'
                            }`}
                          >
                            <div
                              className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                isPast
                                  ? 'bg-[#008069] text-white'
                                  : isCurrent
                                  ? 'bg-[#00a884] text-white animate-pulse'
                                  : 'bg-gray-200 text-gray-500'
                              }`}
                            >
                              {isPast ? '✓' : idx + 1}
                            </div>
                            <div className="min-w-0">
                              <p className={`text-[12.5px] font-semibold ${isCurrent ? 'text-[#008069]' : 'text-[#111b21]'}`}>
                                {st.title}
                              </p>
                              <p className="text-[11.5px] text-[#667781]">{st.desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                {scenarios.length > 0 && !scenariosLoading ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-[#667781]">
                        Hangi senaryoyu tercih edersiniz?
                      </span>
                      <button
                        type="button"
                        onClick={handleGenerateScenarios}
                        className="flex items-center gap-1 text-[11.5px] font-medium text-[#008069] hover:underline"
                      >
                        <Icon name="refresh" className="size-3" />
                        Farklı Senaryolar Üret
                      </button>
                    </div>

                    <div className="space-y-2">
                      {scenarios.map((sc) => {
                        const isSelected = draft.videoScenarioPrompt === sc.fullPrompt
                        const isExpanded = expandedPromptId === sc.id
                        return (
                          <div
                            key={sc.id}
                            className={`relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#00a884] bg-[#f0fbf7] shadow-xs'
                                : 'border-hairline bg-white hover:border-[#00a884]/40'
                            }`}
                            onClick={() =>
                              patch({
                                videoScenarioPrompt: sc.fullPrompt,
                                videoScenarioTitle: sc.title,
                              })
                            }
                          >
                            <div className="flex items-start gap-3">
                              {/* Custom Radio Button */}
                              <div
                                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                                  isSelected
                                    ? 'border-[#00a884] bg-[#00a884] text-white'
                                    : 'border-gray-300 bg-white'
                                }`}
                              >
                                {isSelected ? <div className="size-2 rounded-full bg-white" /> : null}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[13.5px] font-bold text-[#111b21]">
                                    {sc.title}
                                  </span>
                                  {sc.badge ? (
                                    <span className="rounded-full bg-[#008069]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[#008069]">
                                      {sc.badge}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Plain human-readable summary */}
                                <p className="mt-1 text-[12.5px] leading-relaxed text-[#3b4a54]">
                                  {sc.summary}
                                </p>

                                {/* Expandable Prompt Technical Accordion */}
                                <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedPromptId(isExpanded ? null : sc.id)
                                    }
                                    className="text-[11px] font-medium text-[#667781] hover:text-[#111b21] flex items-center gap-1"
                                  >
                                    <span>{isExpanded ? 'Teknik promptu gizle' : 'Teknik prompt detayını gör'}</span>
                                    <span>{isExpanded ? '▴' : '▾'}</span>
                                  </button>

                                  {isExpanded ? (
                                    <div className="mt-1.5 rounded-md bg-gray-900 p-2.5 text-[11px] font-mono text-gray-200 whitespace-pre-wrap leading-relaxed">
                                      {sc.fullPrompt}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              </Field>
            </>
          ) : (
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
          )}
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
            {isVideo ? (
              <>
                <p>
                  <span className="text-ink-muted">Seslendirme: </span>
                  {draft.videoSpeech !== false ? 'Seslendirmeli (Türkçe Dış Ses)' : 'Konuşmasız (Sadece Müzik & Ses Efektleri)'}
                </p>
                {draft.videoScenarioTitle ? (
                  <p>
                    <span className="text-ink-muted">Seçilen Senaryo: </span>
                    <span className="font-semibold text-[#008069]">{draft.videoScenarioTitle}</span>
                  </p>
                ) : null}
              </>
            ) : null}
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
