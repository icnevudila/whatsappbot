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
  const [description, setDescription] = useState('')
  const [boxContents, setBoxContents] = useState('')
  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

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
    if (boxContents.trim()) formData.set('box_contents', boxContents.trim())
    for (const file of files) {
      formData.append('images', file)
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
      onClose()
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4"
    >
      <div
        className="fixed inset-0 bg-backdrop/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[var(--radius-card)] border border-hairline bg-surface p-4 sm:p-5 shadow-[var(--shadow-overlay)]">
        <div className="flex items-center justify-between border-b border-hairline pb-3">
          <h2 id={titleId} className="text-[15px] font-bold text-ink">
            Yeni ürün ekle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-muted hover:bg-canvas hover:text-ink"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="mt-3 space-y-3">
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

          <Field label="Açıklama" hint="Görselde veya kampanyada vurgulanacak detaylar">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Örn. Özel soslu, lavaş arası enfes lezzet."
            />
          </Field>

          <Field label="Kutu / Porsiyon içeriği" hint="İsteğe bağlı">
            <Input
              value={boxContents}
              onChange={(e) => setBoxContents(e.target.value)}
              placeholder="Örn. Yanında patates ve ayran ile"
            />
          </Field>

          <Field label="Ürün görseli" hint="PNG, JPG veya WEBP (en fazla 5 MB)">
            <Input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
          </Field>

          {error ? <Notice tone="danger">{error}</Notice> : null}

          <div className="flex justify-end gap-2 pt-2 border-t border-hairline">
            <Button type="button" variant="quiet" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending || !name.trim()}>
              {pending ? 'Ekleniyor…' : 'Kaydet ve Seç'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
