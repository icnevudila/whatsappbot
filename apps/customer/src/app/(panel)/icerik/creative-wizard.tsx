'use client'

import { useActionState, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button, Card, Field, FileUploadButton, Input, Notice, Textarea } from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
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
import { DEFAULT_INCLUDE, type ProductCard, type WizardBootstrap } from './wizard-types'
import { AddProductModal } from './add-product-modal'

const DRAFT_KEY = 'wa.customer.creative-wizard.v1'

type Step = 'start' | 'brief' | 'brand' | 'products' | 'extras' | 'style' | 'summary'

const STEPS: { id: Step; label: string }[] = [
  { id: 'start', label: 'Başlangıç' },
  { id: 'brief', label: 'Fikir' },
  { id: 'brand', label: 'Marka' },
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
    useLogo: true,
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
  useSyncBusy(pending, 'Görsel üretiliyor…')

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

  // 1 kit (veya hiç kit) varsa marka seçim adımına gerek yok — defaultDraft zaten doğru kiti seçiyor.
  const effectiveSteps = data.kits.length <= 1 ? STEPS.filter((s) => s.id !== 'brand') : STEPS

  const [productsList, setProductsList] = useState<ProductCard[]>(data.products)
  const [addProductOpen, setAddProductOpen] = useState(false)

  const stepIndex = effectiveSteps.findIndex((row) => row.id === step)
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
    const next = effectiveSteps[Math.min(effectiveSteps.length - 1, stepIndex + 1)]
    if (next) go(next.id)
  }
  const prevStep = () => {
    const prev = effectiveSteps[Math.max(0, stepIndex - 1)]
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

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (step !== 'summary') event.preventDefault()
      }}
      className="space-y-3"
    >
      <input type="hidden" name="draft" value={payload} />

      <nav aria-label="Görsel adımları" className="overflow-x-auto">
        <ol className="flex min-w-max gap-1">
          {effectiveSteps.map((row, index) => {
            const active = row.id === step
            const done = index < stepIndex
            return (
              <li key={row.id}>
                <button
                  type="button"
                  disabled={index > stepIndex}
                  onClick={() => {
                    if (index < stepIndex) go(row.id)
                  }}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium ${
                    active
                      ? 'bg-accent text-white'
                      : done
                        ? 'bg-accent-soft text-accent'
                        : 'bg-canvas text-ink-faint'
                  }`}
                >
                  {row.label}
                </button>
              </li>
            )
          })}
        </ol>
      </nav>

      {step === 'start' ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              patch({ origin: 'new', baseCreativeId: '' })
              go('brief')
            }}
            className={`rounded-[var(--radius-card)] border p-4 text-left shadow-[var(--shadow-card)] ${
              draft.origin === 'new' ? 'border-accent bg-accent-soft/40' : 'border-hairline bg-surface'
            }`}
          >
            <p className="font-bold">Yeni görsel oluştur</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">Sıfırdan kampanya görseli. Marka ve ürünleriniz bağlanır.</p>
          </button>
          <button
            type="button"
            onClick={() => {
              patch({ origin: 'derive' })
            }}
            className={`rounded-[var(--radius-card)] border p-4 text-left shadow-[var(--shadow-card)] ${
              draft.origin === 'derive' ? 'border-accent bg-accent-soft/40' : 'border-hairline bg-surface'
            }`}
          >
            <p className="font-bold">Var olandan türet</p>
            <p className="mt-1 text-[12.5px] text-ink-muted">Kütüphaneden seçin veya dosya yükleyin.</p>
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
                      draft.baseCreativeId === item.id ? 'border-accent ring-1 ring-accent' : 'border-hairline'
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
            <Button type="button" variant="accent" disabled={!draft.baseCreativeId} onClick={() => go('brief')}>
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
                  className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[12px]"
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

      {step === 'brand' ? (
        <div className="space-y-2">
          {data.kits.length === 0 ? (
            <Notice tone="warn">
              Marka kiti yok. Renkler varsayılan kalır.{' '}
              <Link href="/ayarlar/marka/yeni" className="underline">
                Kit ekle
              </Link>
            </Notice>
          ) : (
            data.kits.map((kit) => (
              <button
                key={kit.id}
                type="button"
                onClick={() => patch({ brandKitId: kit.id })}
                className={`flex w-full items-center gap-3 rounded-[var(--radius-card)] border p-3 text-left ${
                  draft.brandKitId === kit.id ? 'border-accent bg-accent-soft/40' : 'border-hairline bg-surface'
                }`}
              >
                {kit.logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={kit.logoPreview} alt="" className="size-12 rounded-md border border-hairline object-contain bg-canvas" />
                ) : (
                  <span className="flex size-12 items-center justify-center rounded-md border border-hairline bg-canvas text-[11px] text-ink-faint">
                    Logo
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block font-semibold">{kit.name}</span>
                  <span className="mt-1 flex gap-1">
                    {['primary', 'accent', 'secondary'].map((key) => (
                      <span
                        key={key}
                        className="size-4 rounded-full border border-hairline"
                        style={{ background: kit.colors[key] }}
                      />
                    ))}
                  </span>
                  {kit.tone ? <span className="mt-1 block truncate text-[12px] text-ink-muted">{kit.tone}</span> : null}
                </span>
              </button>
            ))
          )}
          <label className="flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={draft.useLogo}
              onChange={(event) => patch({ useLogo: event.target.checked })}
            />
            Logoyu görsele ekle
          </label>
        </div>
      ) : null}

      {step === 'products' ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {productsList.map((product) => (
              <button
                key={product.id}
                type="button"
                className="rounded-full border border-hairline bg-surface px-3 py-1 text-[12.5px]"
                onClick={() => addProduct(product.id)}
              >
                + {product.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAddProductOpen(true)}
              className="rounded-full border border-dashed border-accent/60 bg-accent-soft/30 px-3 py-1 text-[12.5px] font-medium text-accent hover:bg-accent-soft/60"
            >
              + Ürün ekle
            </button>
            {productsList.length === 0 ? (
              <Notice tone="warn">
                Aktif ürün yok.{' '}
                <button
                  type="button"
                  onClick={() => setAddProductOpen(true)}
                  className="underline font-semibold cursor-pointer text-ink hover:text-accent"
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
                              extra.imageUrl === image.url ? 'border-accent' : 'border-hairline'
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
                {data.socials.length === 0 ? (
                  <p className="text-[12.5px] text-ink-muted">Kayıtlı hesap yok.</p>
                ) : (
                  data.socials.map((social) => (
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
                  ))
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
                  className="rounded-full bg-accent-soft px-2.5 py-1 text-[12px] text-accent"
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
                  className={`rounded-md border p-3 text-left ${
                    draft.formatId === row.id ? 'border-accent bg-accent-soft/40' : 'border-hairline bg-surface'
                  }`}
                >
                  <span className="block text-[13.5px] font-semibold">{row.label}</span>
                  <span className="text-[12px] text-ink-muted">{row.hint}</span>
                </button>
              ))}
            </div>
          </Field>
          <Field label="Görsel stili">
            <div className="flex flex-wrap gap-1.5">
              {CREATIVE_STYLES.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => patch({ style: row.id })}
                  className={`rounded-full px-3 py-1 text-[12.5px] ${
                    draft.style === row.id ? 'bg-accent text-white' : 'border border-hairline bg-surface'
                  }`}
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
                  className={`rounded-full px-3 py-1 text-[12.5px] ${
                    draft.textDensity === row.id ? 'bg-accent text-white' : 'border border-hairline bg-surface'
                  }`}
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
            <Button type="submit" variant="accent" disabled={pending || !data.canManage || !data.imageAiEnabled}>
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

      {step !== 'start' && step !== 'summary' ? (
        <div className="flex justify-between gap-2">
          <Button type="button" variant="quiet" onClick={prevStep}>
            Geri
          </Button>
          <Button type="button" variant="accent" disabled={!canContinue} onClick={nextStep}>
            İleri
          </Button>
        </div>
      ) : null}

      {step === 'summary' ? (
        <Button type="button" variant="quiet" onClick={prevStep}>
          Geri
        </Button>
      ) : null}

      <AddProductModal
        open={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onSuccess={(newProduct) => {
          setProductsList((prev) => [...prev, newProduct])
          addProduct(newProduct.id)
        }}
      />
    </form>
  )
}
