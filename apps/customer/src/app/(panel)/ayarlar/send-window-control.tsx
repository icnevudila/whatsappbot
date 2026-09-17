'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { formatSendWindowLabel, normalizeClock } from '@wa/shared'
import { Button, Field, Input } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { updateOrgSendWindow } from '../org-actions'

export function SendWindowControl({
  start,
  end,
  canEdit = true,
}: {
  start: string
  end: string
  canEdit?: boolean
}) {
  const [open, setOpen] = useState(false)
  const label = formatSendWindowLabel(start, end)

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        title="Gönderim saatini düzenle"
        aria-expanded={open}
        disabled={!canEdit}
        onClick={() => canEdit && setOpen(true)}
        className="wb-row-enter wb-card-lift flex h-full min-w-0 w-full flex-col justify-center rounded-md border border-hairline bg-surface px-2.5 py-2 text-left sm:px-3 disabled:opacity-70"
      >
        <span className="flex w-full items-center justify-between gap-1">
          <span className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">Saat</span>
          {canEdit ? (
            <Icon name="edit" className="size-3.5 shrink-0 text-ink-muted" />
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[13px] font-extrabold tabular leading-tight sm:text-[15px]">
          {label}
        </span>
      </button>
      {open ? (
        <SendWindowModal start={start} end={end} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  )
}

function SendWindowModal({
  start,
  end,
  onClose,
}: {
  start: string
  end: string
  onClose: () => void
}) {
  const titleId = useId()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [pending, startTransition] = useTransition()

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
        className="wb-modal-panel wb-wa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              Gönderim saati
            </h2>
            <p className="wb-modal-desc">
              Bu aralık dışında kampanya ve giden mesaj durur; saat gelince kendiliğinden devam eder
              (İstanbul saati).
            </p>
          </div>
          <button type="button" aria-label="Kapat" onClick={onClose} className="wb-wa-icon-btn">
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <form
          className="space-y-3"
          action={(formData) => {
            startTransition(async () => {
              const result = await updateOrgSendWindow(formData)
              if (result.error) {
                toast(result.error, 'danger')
                return
              }
              toast(result.ok ?? 'Kaydedildi.', 'success')
              onClose()
            })
          }}
        >
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Başlangıç">
              <Input
                name="send_window_start"
                type="time"
                required
                defaultValue={normalizeClock(start)}
                className="min-h-11"
              />
            </Field>
            <Field label="Bitiş">
              <Input
                name="send_window_end"
                type="time"
                required
                defaultValue={normalizeClock(end)}
                className="min-h-11"
              />
            </Field>
          </div>
          <div className="wb-modal-actions flex-col-reverse sm:flex-row [&_button]:min-h-11 [&_button]:w-full sm:[&_button]:w-auto">
            <Button type="button" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" className="wb-wa-submit" disabled={pending}>
              {pending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
