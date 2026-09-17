'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icon'
import { Notice } from '@/components/ui'
import { useToast } from '@/components/toast'
import { removeOrgLogo, saveOrgLogo } from './actions'

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const IMAGE_MAX = 5 * 1024 * 1024

export function OrgLogoCard({
  previewUrl,
  canEdit,
}: {
  previewUrl: string | null
  canEdit: boolean
}) {
  const router = useRouter()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [over, setOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const upload = (file: File | null | undefined) => {
    if (!file || !canEdit || pending) return
    if (file.size > IMAGE_MAX) {
      setError('Logo en fazla 5 MB olabilir.')
      return
    }
    if (!IMAGE_TYPES.includes(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
      setError('PNG, JPG veya WEBP yükleyin.')
      return
    }
    setError(null)
    const data = new FormData()
    data.set('logo', file)
    startTransition(() => {
      void saveOrgLogo(data).then((result) => {
        if (result?.error) {
          setError(result.error)
          toast(result.error, 'danger')
          return
        }
        toast(result?.ok ?? 'Logo kaydedildi.', 'success')
        router.refresh()
      })
    })
  }

  return (
    <section className="border-b border-[#e9edef] px-3.5 py-3.5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-ink">İşletme logosu</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-muted">
            Tüm kampanyalarda kullanılır. Marka kitlerinden bağımsızdır.
          </p>
        </div>
        {previewUrl && canEdit ? (
          <button
            type="button"
            disabled={pending}
            className="shrink-0 text-[12.5px] font-medium text-ink-muted hover:text-danger disabled:opacity-50"
            onClick={() => {
              startTransition(() => {
                void removeOrgLogo().then((result) => {
                  if (result?.error) {
                    setError(result.error)
                    toast(result.error, 'danger')
                    return
                  }
                  toast(result?.ok ?? 'Logo kaldırıldı.', 'success')
                  router.refresh()
                })
              })
            }}
          >
            Kaldır
          </button>
        ) : null}
      </div>

      <div
        onDragEnter={(event) => {
          if (!canEdit) return
          event.preventDefault()
          dragDepth.current += 1
          setOver(true)
        }}
        onDragOver={(event) => {
          if (!canEdit) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDragLeave={() => {
          dragDepth.current = Math.max(0, dragDepth.current - 1)
          if (dragDepth.current === 0) setOver(false)
        }}
        onDrop={(event) => {
          if (!canEdit) return
          event.preventDefault()
          dragDepth.current = 0
          setOver(false)
          upload(event.dataTransfer.files?.[0])
        }}
        className={`relative overflow-hidden rounded-md border border-dashed transition-colors ${
          over ? 'border-accent bg-accent-soft/40' : 'border-hairline-strong bg-canvas'
        } ${!canEdit || pending ? 'opacity-70' : ''}`}
      >
        {canEdit ? (
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={pending}
            className="absolute inset-0 z-10 cursor-pointer opacity-0"
            aria-label="İşletme logosu yükle"
            onChange={(event) => {
              upload(event.target.files?.[0])
              event.target.value = ''
            }}
          />
        ) : null}

        {previewUrl ? (
          <div className="pointer-events-none flex min-h-[112px] items-center gap-3 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt=""
              className="size-16 rounded-md border border-hairline bg-white object-contain"
            />
            <div className="min-w-0">
              <p className="text-[13.5px] font-medium text-ink">
                {pending ? 'Yükleniyor…' : canEdit ? 'Değiştirmek için sürükleyin veya tıklayın' : 'Kayıtlı logo'}
              </p>
              <p className="mt-0.5 text-[12px] text-ink-faint">PNG, JPG, WEBP · en fazla 5 MB</p>
            </div>
          </div>
        ) : (
          <div className="pointer-events-none flex min-h-[112px] flex-col items-center justify-center gap-1.5 px-4 py-5 text-center">
            <span className="flex size-11 items-center justify-center rounded-full border border-hairline bg-surface text-ink-muted">
              <Icon name="image" className="size-5" />
            </span>
            <p className="text-[13.5px] font-semibold text-ink">
              {pending ? 'Yükleniyor…' : canEdit ? 'Logoyu sürükleyin veya seçin' : 'Logo yok'}
            </p>
            <p className="text-[12px] text-ink-faint">PNG, JPG, WEBP · en fazla 5 MB</p>
          </div>
        )}
      </div>

      {error ? (
        <div className="mt-2">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}
    </section>
  )
}
