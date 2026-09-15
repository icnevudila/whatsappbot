'use client'

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/confirm-dialog'
import { Icon } from '@/components/icon'
import { Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { deleteProductImage, saveProduct, type ProductState } from './actions'

const ACCEPT = 'image/png,image/jpeg,image/webp'
const MAX_IMAGES = 8

export type ProductImage = {
  id: string
  public_url: string
}

function isImageFile(file: File) {
  return file.type === 'image/png' || file.type === 'image/jpeg' || file.type === 'image/webp'
}

function syncInputFiles(input: HTMLInputElement | null, files: File[]) {
  if (!input) return
  const transfer = new DataTransfer()
  files.forEach((file) => transfer.items.add(file))
  input.files = transfer.files
}

export function ProductForm({
  product,
  images,
  canEdit,
}: {
  product?: {
    id: string
    name: string
    description: string
    boxContents: string
    isActive: boolean
  }
  images?: ProductImage[]
  canEdit: boolean
}) {
  const [state, formAction, pending] = useActionState<ProductState, FormData>(saveProduct, null)
  const [localFiles, setLocalFiles] = useState<File[]>([])
  const [showBoxContents, setShowBoxContents] = useState(Boolean(product?.boxContents))
  const [dropOver, setDropOver] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const existingCount = images?.length ?? 0
  const remaining = Math.max(0, MAX_IMAGES - existingCount - localFiles.length)

  const previews = useMemo(
    () => localFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [localFiles],
  )

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [previews])

  const applyFiles = (incoming: File[]) => {
    const imagesOnly = incoming.filter(isImageFile)
    if (imagesOnly.length === 0) return
    setLocalFiles((current) => {
      const room = Math.max(0, MAX_IMAGES - existingCount - current.length)
      const next = [...current, ...imagesOnly.slice(0, room)]
      queueMicrotask(() => syncInputFiles(fileInput.current, next))
      return next
    })
  }

  const removeLocal = (index: number) => {
    setLocalFiles((current) => {
      const next = current.filter((_, i) => i !== index)
      queueMicrotask(() => syncInputFiles(fileInput.current, next))
      return next
    })
  }

  return (
    <form action={formAction} className="space-y-3 p-3.5">
      {product?.id ? <input type="hidden" name="id" value={product.id} /> : null}

      <Field label="Ürün adı">
        <Input
          name="name"
          required
          maxLength={160}
          defaultValue={product?.name ?? ''}
          disabled={!canEdit}
          placeholder="Örn. Filo Starter Paket"
        />
      </Field>

      <Field label="Açıklama">
        <Textarea
          name="description"
          rows={4}
          defaultValue={product?.description ?? ''}
          disabled={!canEdit}
          placeholder="Ürünü kısaca anlatın."
        />
      </Field>

      {canEdit ? (
        <label className="flex items-center gap-2 text-[13px]">
          <input
            type="checkbox"
            checked={showBoxContents}
            onChange={(event) => setShowBoxContents(event.target.checked)}
          />
          Kutu içeriğini belirt
        </label>
      ) : null}

      {showBoxContents || (!canEdit && Boolean(product?.boxContents)) ? (
        <Field label="Kutu içeriği" hint={canEdit ? 'Madde madde yazabilirsiniz.' : undefined}>
          <Textarea
            name="box_contents"
            rows={3}
            defaultValue={product?.boxContents ?? ''}
            disabled={!canEdit}
            placeholder="Kutuda neler var?"
          />
        </Field>
      ) : null}

      {product?.id && canEdit ? (
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" name="is_active" defaultChecked={product.isActive} />
          Aktif
        </label>
      ) : null}

      {images && images.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-muted">Kayıtlı görseller</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.map((image) => (
              <ProductImageThumb key={image.id} image={image} canEdit={canEdit} />
            ))}
          </div>
        </div>
      ) : null}

      {canEdit ? (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-muted">Görseller</p>
          <input
            ref={fileInput}
            name="images"
            type="file"
            accept={ACCEPT}
            multiple
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => {
              applyFiles(Array.from(event.target.files ?? []))
            }}
          />
          <div
            role="button"
            tabIndex={remaining === 0 ? -1 : 0}
            aria-disabled={remaining === 0}
            onClick={() => {
              if (remaining > 0) fileInput.current?.click()
            }}
            onKeyDown={(event) => {
              if (remaining === 0) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                fileInput.current?.click()
              }
            }}
            onDragEnter={(event) => {
              event.preventDefault()
              event.stopPropagation()
              dragDepth.current += 1
              setDropOver(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
              event.dataTransfer.dropEffect = remaining > 0 ? 'copy' : 'none'
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              event.stopPropagation()
              dragDepth.current = Math.max(0, dragDepth.current - 1)
              if (dragDepth.current === 0) setDropOver(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              dragDepth.current = 0
              setDropOver(false)
              applyFiles(Array.from(event.dataTransfer.files ?? []))
            }}
            className={`cursor-pointer rounded-md border border-dashed px-3 py-6 text-center transition-colors ${
              dropOver ? 'border-accent bg-accent-soft/40' : 'border-hairline-strong bg-canvas'
            } ${remaining === 0 ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <span className="mx-auto flex w-full flex-col items-center gap-2">
              <span className="flex size-11 items-center justify-center rounded-full border border-hairline bg-surface text-ink-muted">
                <Icon name="image" className="size-5" />
              </span>
              <span className="text-[13.5px] font-semibold text-ink">
                Görselleri sürükleyin veya seçin
              </span>
              <span className="text-[12px] text-ink-faint">
                PNG, JPG veya WEBP · en fazla {MAX_IMAGES} görsel
                {remaining < MAX_IMAGES ? ` · ${remaining} hak kaldı` : ''}
              </span>
            </span>
          </div>
        </div>
      ) : null}

      {previews.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-muted">Yeni seçilenler</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {previews.map((preview, index) => (
              <div key={preview.url} className="relative overflow-hidden rounded-md border border-hairline bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.url}
                  alt={preview.name}
                  className="h-28 w-full object-cover"
                />
                <button
                  type="button"
                  aria-label="Kaldır"
                  onClick={() => removeLocal(index)}
                  className="absolute right-1 top-1 inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)] bg-surface/95 text-ink-muted shadow-sm hover:text-ink"
                >
                  <Icon name="close" className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      {canEdit ? (
        <div className="flex justify-center pt-1">
          <Button type="submit" variant="accent" disabled={pending} className="w-full wb-wa-submit">
            <Icon name={product?.id ? 'check' : 'plus'} className="size-4" />
            {pending ? 'Kaydediliyor…' : product?.id ? 'Kaydet' : 'Ürün ekle'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

function ProductImageThumb({ image, canEdit }: { image: ProductImage; canEdit: boolean }) {
  const confirm = useConfirm()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="relative overflow-hidden rounded-md border border-hairline bg-canvas">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.public_url} alt="" className="h-28 w-full object-cover" />
      {canEdit ? (
        <Button
          type="button"
          variant="danger"
          className="absolute right-1 top-1 h-7 px-2 text-[11px]"
          disabled={pending}
          onClick={() => {
            void (async () => {
              const ok = await confirm({
                title: 'Görseli sil',
                description: 'Bu görsel üründen kaldırılacak.',
                confirmLabel: 'Sil',
                tone: 'danger',
              })
              if (!ok) return
              startTransition(() => {
                void deleteProductImage(image.id).then(() => router.refresh())
              })
            })()
          }}
        >
          {pending ? '…' : 'Sil'}
        </Button>
      ) : null}
    </div>
  )
}
