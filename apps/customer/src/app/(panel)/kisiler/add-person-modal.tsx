'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button, Field, Input, Notice, Select } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { formatTrMobileMask, isTrMobileMasked } from '@/lib/onboarding'
import { createManualContact, listContactGroups } from './actions'

export function AddPersonButton({
  groups,
}: {
  groups: { id: string; name: string }[]
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        + Kişi
      </Button>
      {open ? <AddPersonModal groups={groups} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export function AddPersonModal({
  groups: initialGroups,
  onClose,
}: {
  groups?: { id: string; name: string }[]
  onClose: () => void
}) {
  const titleId = useId()
  const router = useRouter()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [groups, setGroups] = useState(initialGroups ?? [])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [listId, setListId] = useState(initialGroups?.[0]?.id ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  useSyncBusy(pending, 'Kişi ekleniyor…')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialGroups && initialGroups.length > 0) return
    void listContactGroups().then((rows) => {
      setGroups(rows)
      setListId((current) => current || rows[0]?.id || '')
    })
  }, [initialGroups])

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

  const canSubmit = name.trim().length >= 2 && isTrMobileMasked(phone) && Boolean(listId) && !pending

  const submit = () => {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const result = await createManualContact({ name, phone, listId })
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
        return
      }
      toast(result.ok ?? 'Kişi eklendi.', 'success')
      onClose()
      router.refresh()
    })
  }

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="wb-modal-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              Kişi ekle
            </h2>
            <p className="wb-modal-desc">Ad, numara ve grup seçin.</p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="İsim">
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Örn. Ayşe Yılmaz"
              maxLength={120}
              autoComplete="name"
            />
          </Field>
          <Field label="Telefon" hint="05XX XXX XX XX">
            <Input
              value={phone}
              onChange={(event) => setPhone(formatTrMobileMask(event.target.value))}
              placeholder="05XX XXX XX XX"
              inputMode="numeric"
              autoComplete="tel-national"
            />
          </Field>
          <Field label="Grup">
            {groups.length === 0 ? (
              <Notice tone="accent">Önce + Grup ile bir grup açın.</Notice>
            ) : (
              <Select value={listId} onChange={(event) => setListId(event.target.value)}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          {error ? <Notice tone="danger">{error}</Notice> : null}
        </div>

        <div className="wb-modal-actions">
          <Button type="button" onClick={onClose} disabled={pending}>
            Vazgeç
          </Button>
          <Button type="button" variant="accent" disabled={!canSubmit} onClick={submit}>
            {pending ? 'Ekleniyor…' : 'Ekle'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
