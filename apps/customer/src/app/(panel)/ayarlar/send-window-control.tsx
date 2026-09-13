'use client'

import { useState, useTransition } from 'react'
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
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const label = formatSendWindowLabel(start, end)

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        title="Gönderim saatini düzenle"
        aria-expanded={open}
        disabled={!canEdit}
        onClick={() => canEdit && setOpen((value) => !value)}
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
        <form
          className="absolute right-0 z-20 mt-1 w-[min(18rem,calc(100vw-2rem))] space-y-2 rounded-md border border-hairline bg-surface p-3 shadow-[var(--shadow-md)]"
          action={(formData) => {
            startTransition(async () => {
              const result = await updateOrgSendWindow(formData)
              if (result.error) toast(result.error, 'danger')
              else {
                toast(result.ok ?? 'Kaydedildi.', 'success')
                setOpen(false)
              }
            })
          }}
        >
          <p className="text-[12.5px] font-medium text-ink">Gönderim saati (İstanbul)</p>
          <p className="text-[11.5px] text-ink-muted">
            Bu aralık dışında kampanya ve giden mesaj durur; saat gelince kendiliğinden devam eder.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Başlangıç">
              <Input
                name="send_window_start"
                type="time"
                required
                defaultValue={normalizeClock(start)}
              />
            </Field>
            <Field label="Bitiş">
              <Input
                name="send_window_end"
                type="time"
                required
                defaultValue={normalizeClock(end)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-1.5">
            <Button type="button" onClick={() => setOpen(false)}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
