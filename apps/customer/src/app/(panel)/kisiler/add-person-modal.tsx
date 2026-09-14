'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button, Field, Input, Notice, Select } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { formatTrMobileMask, isTrMobileMasked } from '@/lib/onboarding'
import { createEmptyList, createManualContact, listContactGroups } from './actions'

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
  const [addingGroup, setAddingGroup] = useState((initialGroups?.length ?? 0) === 0)
  const [groupName, setGroupName] = useState('')
  const [groupError, setGroupError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [groupPending, startGroupTransition] = useTransition()
  useSyncBusy(pending, 'Kişi ekleniyor…')
  useSyncBusy(groupPending, 'Grup oluşturuluyor…')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (initialGroups && initialGroups.length > 0) return
    void listContactGroups().then((rows) => {
      setGroups(rows)
      setListId((current) => current || rows[0]?.id || '')
      if (rows.length > 0) setAddingGroup(false)
    })
  }, [initialGroups])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (addingGroup && groups.length > 0) {
        setAddingGroup(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, addingGroup, groups.length])

  const canSubmit =
    name.trim().length >= 2 && isTrMobileMasked(phone) && Boolean(listId) && !pending && !groupPending

  const createGroup = () => {
    const trimmed = groupName.trim()
    if (trimmed.length < 2 || groupPending) return
    setGroupError(null)
    startGroupTransition(async () => {
      const result = await createEmptyList(trimmed)
      if (result.error || !result.listId) {
        setGroupError(result.error ?? 'Grup oluşturulamadı.')
        toast(result.error ?? 'Grup oluşturulamadı.', 'danger')
        return
      }
      const created = { id: result.listId, name: trimmed }
      setGroups((current) => [created, ...current.filter((row) => row.id !== created.id)])
      setListId(created.id)
      setGroupName('')
      setAddingGroup(false)
      toast('Grup oluşturuldu ve seçildi.', 'success')
    })
  }

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
            {addingGroup || groups.length === 0 ? (
              <div className="space-y-2">
                {groups.length === 0 ? (
                  <p className="text-[12.5px] text-ink-muted">
                    Henüz grup yok. Bir ad yazın, kişi o gruba eklenir.
                  </p>
                ) : null}
                <Input
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  placeholder="Örn. Mahalle müşterileri"
                  maxLength={120}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      createGroup()
                    }
                  }}
                />
                {groupError ? <Notice tone="danger">{groupError}</Notice> : null}
                <div className="flex gap-2">
                  {groups.length > 0 ? (
                    <Button
                      type="button"
                      disabled={groupPending}
                      onClick={() => {
                        setAddingGroup(false)
                        setGroupError(null)
                      }}
                    >
                      Vazgeç
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="accent"
                    className="flex-1"
                    disabled={groupPending || groupName.trim().length < 2}
                    onClick={createGroup}
                  >
                    <Icon name="plus" className="size-4" />
                    {groupPending ? 'Oluşturuluyor…' : 'Grup oluştur'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={listId} onChange={(event) => setListId(event.target.value)}>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  onClick={() => {
                    setAddingGroup(true)
                    setGroupError(null)
                  }}
                  className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline"
                >
                  <Icon name="plus" className="size-3.5" />
                  Yeni grup
                </button>
              </div>
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
