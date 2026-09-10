'use client'

import { useActionState, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/confirm-dialog'
import { Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { deleteProductImage, saveProduct, type ProductState } from './actions'

export type ProductImage = {
  id: string
  public_url: string
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
  const previews = useMemo(
    () => localFiles.map((file) => ({ name: file.name, url: URL.createObjectURL(file) })),
    [localFiles],
  )

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

      <Field label="Kutu içeriği">
        <Textarea
          name="box_contents"
          rows={3}
          defaultValue={product?.boxContents ?? ''}
          disabled={!canEdit}
          placeholder="Kutuda neler var? Madde madde yazabilirsiniz."
        />
      </Field>

      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={product?.isActive ?? true}
          disabled={!canEdit}
        />
        Aktif
      </label>

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
        <Field label="Görseller" hint="PNG, JPG veya WEBP. Birden fazla seçebilirsiniz. En fazla 8 görsel, her biri 5 MB.">
          <Input
            name="images"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            onChange={(event) => {
              setLocalFiles(Array.from(event.target.files ?? []))
            }}
          />
        </Field>
      ) : null}

      {previews.length > 0 ? (
        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-muted">Yeni seçilenler</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {previews.map((preview) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={preview.url}
                src={preview.url}
                alt={preview.name}
                className="h-28 w-full rounded-md border border-hairline object-cover bg-canvas"
              />
            ))}
          </div>
        </div>
      ) : null}

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      {canEdit ? (
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? 'Kaydediliyor…' : product?.id ? 'Kaydet' : 'Ürün ekle'}
        </Button>
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
