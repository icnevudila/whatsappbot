'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button, Field, Notice, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { createBrandKitWithAi } from './actions'

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const IMAGE_MAX = 5 * 1024 * 1024
const ACTION_IMAGE_MAX = 900 * 1024

async function compressImageForAction(file: File) {
  if (file.size <= ACTION_IMAGE_MAX) return file

  const bitmap = await createImageBitmap(file)
  const maxSide = 1600
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    return file
  }
  // JPEG şeffaflığı siyah yapmasın
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const baseName = file.name.replace(/\.[^.]+$/, '') || 'brand'
  let quality = 0.85
  while (quality >= 0.45) {
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), 'image/jpeg', quality)
    })
    if (blob && blob.size <= ACTION_IMAGE_MAX) {
      return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
    }
    quality -= 0.1
  }

  const fallback = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), 'image/jpeg', 0.4)
  })
  if (!fallback) return file
  return new File([fallback], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() })
}

export function AddBrandKitButton({ label = 'Kit ekle' }: { label?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="wb-wa-text-btn" onClick={() => setOpen(true)}>
        {label}
      </button>
      {open ? <AddBrandKitModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export function AddBrandKitModal({ onClose }: { onClose: () => void }) {
  const titleId = useId()
  const router = useRouter()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [mode, setMode] = useState<'choose' | 'ai'>('choose')
  const [file, setFile] = useState<File | null>(null)
  const [about, setAbout] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(null)
  const dragDepth = useRef(0)
  const [over, setOver] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, pending])

  const takeFile = (next: File | null | undefined) => {
    if (!next) return
    if (next.size > IMAGE_MAX) {
      setError('Görsel en fazla 5 MB olabilir.')
      return
    }
    if (!IMAGE_TYPES.includes(next.type) && !/\.(png|jpe?g|webp)$/i.test(next.name)) {
      setError('PNG, JPG veya WEBP yükleyin.')
      return
    }
    setError(null)
    setFile(next)
  }

  const submitAi = () => {
    if (pending) return
    setError(null)
    startTransition(async () => {
      try {
        const data = new FormData()
        if (file) {
          const asset = await compressImageForAction(file)
          data.set('asset', asset)
        }
        if (about.trim()) data.set('about', about.trim())
        const result = await createBrandKitWithAi(data)
        if (result?.error) {
          setError(result.error)
          toast(result.error, 'danger')
        }
      } catch (err) {
        const message =
          err instanceof Error && /Body exceeded/i.test(err.message)
            ? 'Görsel çok büyük. Daha küçük bir dosya deneyin.'
            : err instanceof Error
              ? err.message
              : 'Marka kiti oluşturulamadı.'
        setError(message)
        toast(message, 'danger')
      }
    })
  }

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose()
        }}
      />
      <div
        className="wb-modal-panel wb-wa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              {mode === 'choose' ? 'Marka kiti ekle' : 'AI ile marka kiti'}
            </h2>
            <p className="wb-modal-desc">
              {mode === 'choose'
                ? 'Görselden otomatik kit çıkarın veya alanları kendiniz doldurun.'
                : 'Örnek görsel yükleyin; isteğe bağlı açıklama ekleyin.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            disabled={pending}
            onClick={onClose}
            className="wb-wa-icon-btn"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        {mode === 'choose' ? (
          <div className="grid gap-2">
            <button
              type="button"
              className="flex items-start gap-3 rounded-md border border-accent/30 bg-accent-soft/50 px-3.5 py-3 text-left transition-colors hover:border-accent"
              onClick={() => setMode('ai')}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white">
                <Icon name="sparkles" className="size-4" />
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-ink">AI ile oluştur</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-muted">
                  Görsel + açıklamadan renk, font ve ton çıkarır
                </span>
              </span>
            </button>
            <button
              type="button"
              className="flex items-start gap-3 rounded-md border border-hairline bg-surface px-3.5 py-3 text-left transition-colors hover:bg-canvas"
              onClick={() => {
                onClose()
                router.push('/ayarlar/marka/yeni')
              }}
            >
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-hairline bg-canvas text-ink-muted">
                <Icon name="edit" className="size-4" />
              </span>
              <span>
                <span className="block text-[14px] font-semibold text-ink">Manuel ekle</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-muted">
                  Renk, ton ve örnek görseli kendiniz girin
                </span>
              </span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-muted">Örnek görsel</span>
              <div
                onDragEnter={(event) => {
                  event.preventDefault()
                  dragDepth.current += 1
                  setOver(true)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'copy'
                }}
                onDragLeave={() => {
                  dragDepth.current = Math.max(0, dragDepth.current - 1)
                  if (dragDepth.current === 0) setOver(false)
                }}
                onDrop={(event) => {
                  event.preventDefault()
                  dragDepth.current = 0
                  setOver(false)
                  takeFile(event.dataTransfer.files?.[0])
                }}
                className={`relative min-h-[140px] overflow-hidden rounded-md border border-dashed transition-colors ${
                  over ? 'border-accent bg-accent-soft/40' : 'border-hairline-strong bg-canvas'
                }`}
              >
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={pending}
                  className="absolute inset-0 z-10 cursor-pointer opacity-0"
                  aria-label="Marka görseli yükle"
                  onChange={(event) => {
                    takeFile(event.target.files?.[0])
                    event.target.value = ''
                  }}
                />
                {preview ? (
                  <div className="pointer-events-none flex min-h-[140px] items-center justify-center p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="" className="max-h-[160px] w-full object-contain" />
                  </div>
                ) : (
                  <div className="pointer-events-none flex min-h-[140px] flex-col items-center justify-center gap-1 px-4 text-center">
                    <p className="text-[13.5px] font-medium text-ink">Sürükle veya tıkla</p>
                    <p className="text-[12px] text-ink-faint">PNG, JPG, WEBP · max 5 MB</p>
                  </div>
                )}
              </div>
              {file ? (
                <button
                  type="button"
                  className="mt-1.5 text-[12.5px] font-medium text-ink-muted hover:text-ink"
                  disabled={pending}
                  onClick={() => setFile(null)}
                >
                  Görseli kaldır
                </button>
              ) : null}
            </div>

            <Field label="Açıklama" hint="İsteğe bağlı — sektör, ürün, tarz.">
              <Textarea
                rows={3}
                value={about}
                disabled={pending}
                onChange={(event) => setAbout(event.target.value)}
                placeholder="Örn. İnşaat sektörü, toptan ve perakende tuğla satışı, eğlenceli ve dikkat çekici tasarım dili."
                maxLength={800}
              />
            </Field>

            {error ? <Notice tone="danger">{error}</Notice> : null}

            <div className="wb-modal-actions flex-col-reverse sm:flex-row [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
              <Button type="button" disabled={pending} onClick={() => setMode('choose')}>
                Geri
              </Button>
              <Button
                type="button"
                variant="accent"
                className="!rounded-full !border-0 !bg-[#00a884] !text-white !shadow-none hover:!bg-[#008069]"
                disabled={pending || (!file && !about.trim())}
                onClick={submitAi}
              >
                <Icon name="sparkles" className="size-4" />
                {pending ? 'Analiz ediliyor…' : 'Kit oluştur'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
