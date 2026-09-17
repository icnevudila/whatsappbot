'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/icon'
import { WaPreview } from './campaign-wizard-ui'

export function CampaignPreviewButton({
  name,
  body,
  mediaUrl,
  className,
  label,
}: {
  name: string
  body: string | null
  mediaUrl: string | null
  className?: string
  label?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        className={className ?? 'wb-camp-preview-btn'}
        aria-label={label ?? 'Kampanyayı önizle'}
        title={label ?? 'Önizle'}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen(true)
        }}
      >
        {label ? <span>{label}</span> : <Icon name="eye" className="size-4" />}
      </button>
      {open ? (
        <CampaignPreviewModal
          name={name}
          body={body}
          mediaUrl={mediaUrl}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function CampaignPreviewModal({
  name,
  body,
  mediaUrl,
  onClose,
}: {
  name: string
  body: string | null
  mediaUrl: string | null
  onClose: () => void
}) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="wb-modal-panel wb-wa-modal max-h-[min(92dvh,44rem)] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              Kampanya önizleme
            </h2>
            <p className="wb-modal-desc truncate">{name}</p>
          </div>
          <button type="button" aria-label="Kapat" onClick={onClose} className="wb-wa-icon-btn">
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <div className="flex justify-center">
          <WaPreview body={body ?? ''} mediaUrl={mediaUrl} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
