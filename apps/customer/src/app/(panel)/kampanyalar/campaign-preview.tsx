'use client'

import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/components/icon'

export function CampaignPreviewButton({
  name: _name,
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
          body={body}
          mediaUrl={mediaUrl}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function CampaignPreviewModal({
  body,
  mediaUrl,
  onClose,
}: {
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
        className="wb-modal-panel wb-wa-modal wb-camp-preview-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id={titleId} className="wb-modal-title">
            Kampanya önizleme
          </h2>
          <button type="button" aria-label="Kapat" onClick={onClose} className="wb-wa-icon-btn">
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <CompactWaPreview body={body ?? ''} mediaUrl={mediaUrl} />
      </div>
    </div>,
    document.body,
  )
}

function CompactWaPreview({ body, mediaUrl }: { body: string; mediaUrl: string | null }) {
  const preview = body.replaceAll('{{ad}}', 'Ahmet').replaceAll('{{name}}', 'Ahmet')
  return (
    <div className="wb-wa-bubble-preview">
      <div className="wb-wa-phone-bubble">
        {mediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={mediaUrl} alt="" className="wb-wa-phone-media" />
        ) : null}
        <div className="wb-wa-phone-text">
          <p>{preview || <span style={{ color: 'rgba(0,0,0,0.4)' }}>Mesaj yazılmadı</span>}</p>
          <p className="wb-wa-phone-time">12:04</p>
        </div>
      </div>
    </div>
  )
}
