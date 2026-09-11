'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { useToast } from '@/components/toast'
import { quickCreateProduct } from './actions'
import type { ProductCard } from './wizard-types'

export function AddProductModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (product: ProductCard) => void
}) {
  const titleId = useId()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [boxContents, setBoxContents] = useState('')
  const [description, setDescription] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [filePreview, setFilePreview] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  useEffect(() => {
    if (!selectedFile) {
      setFilePreview(null)
      return
    }
    const url = URL.createObjectURL(selectedFile)
    setFilePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [selectedFile])

  if (!open) return null

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Ürün adı gereklidir.')
      return
    }

    setError(null)
    const formData = new FormData()
    formData.set('name', name.trim())
    if (description.trim()) formData.set('description', description.trim())
    if (boxContents.trim() || price.trim()) {
      const parts = [price.trim() ? `Fiyat: ${price.trim()}` : null, boxContents.trim()].filter(Boolean)
      formData.set('box_contents', parts.join(' · '))
    }
    if (selectedFile) {
      formData.append('images', selectedFile)
    }

    startTransition(async () => {
      const result = await quickCreateProduct(formData)
      if (result.error || !result.product) {
        setError(result.error ?? 'Ürün eklenemedi.')
        toast(result.error ?? 'Ürün eklenemedi.', 'danger')
        return
      }

      toast(`“${result.product.name}” eklendi ve seçildi.`, 'success')
      onSuccess(result.product)
      // Formu temizle
      setName('')
      setPrice('')
      setBoxContents('')
      setDescription('')
      setSelectedFile(null)
      onClose()
    })
  }

  return (
    <div className="wb-modal-root" role="presentation">
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="wb-modal-panel wb-modal-panel--wide"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="wb-modal-title">
            Yeni ürün ekle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-canvas hover:text-ink text-sm"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <p className="wb-modal-desc">
          Görsel sihirbazında kullanılmak üzere ürün bilgisi ve fotoğrafı ekleyin.
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <Field label="Ürün adı" hint="Zorunlu">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Karışık Döner Dürüm"
              required
              autoFocus
              maxLength={160}
            />
          </Field>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Field label="Fiyat" hint="İsteğe bağlı">
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Örn. 249 TL"
              />
            </Field>
            <Field label="Porsiyon / Kutu içeriği" hint="İsteğe bağlı">
              <Input
                value={boxContents}
                onChange={(e) => setBoxContents(e.target.value)}
                placeholder="Örn. Patates ve içecek ile"
              />
            </Field>
          </div>

          <Field label="Açıklama" hint="İsteğe bağlı">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Ürünü kısaca anlatın..."
            />
          </Field>

          <Field label="Ürün görseli" hint="PNG, JPG veya WEBP (en fazla 5 MB)">
            {filePreview ? (
              <div className="flex items-center gap-3 rounded-md border border-hairline bg-canvas p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={filePreview}
                  alt=""
                  className="size-14 rounded border border-hairline object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px] font-medium text-ink">
                    {selectedFile?.name}
                  </p>
                  <p className="text-[11px] text-ink-muted">
                    {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => setSelectedFile(null)}
                >
                  Kaldır
                </Button>
              </div>
            ) : (
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-hairline-strong bg-canvas/60 p-4 text-center transition-colors hover:border-accent hover:bg-accent-soft/20">
                <span className="text-[13px] font-medium text-accent">
                  + Görsel seç veya sürükle
                </span>
                <span className="mt-0.5 text-[11px] text-ink-muted">
                  PNG, JPG, WEBP — En fazla 5 MB
                </span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setSelectedFile(file)
                  }}
                />
              </label>
            )}
          </Field>

          {error ? <Notice tone="danger">{error}</Notice> : null}

          <div className="wb-modal-actions pt-2">
            <Button type="button" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={pending || !name.trim()}
            >
              {pending ? 'Ekleniyor…' : 'Kaydet ve Seç'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
