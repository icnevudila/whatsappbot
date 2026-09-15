'use client'

import { useActionState, useCallback, useEffect, useId, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Field, Input, Notice, Pagination, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { PAGE_SIZES, clampPage, totalPages } from '@/lib/pagination'
import { addToBlacklist, removeFromBlacklist, type BlacklistState } from './actions'

export type BlacklistRow = {
  id: string
  phone_e164: string
  reason: string | null
  created_at: string
}

export function BlacklistBoard({ initial }: { initial: BlacklistRow[] }) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const t = useT()
  const [rows, setRows] = useState(initial)
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [, startTransition] = useTransition()
  useSyncBusy(busyId != null, 'Kaldırılıyor…')

  useEffect(() => {
    setRows(initial)
  }, [initial])

  useEffect(() => {
    setPage(1)
  }, [search])

  const close = useCallback(() => setOpen(false), [])

  const visible = rows.filter((row) =>
    `${row.phone_e164} ${row.reason ?? ''}`
      .toLocaleLowerCase('tr-TR')
      .includes(search.toLocaleLowerCase('tr-TR')),
  )

  const pageSize = PAGE_SIZES.blacklist
  const pages = totalPages(visible.length, pageSize)
  const safePage = clampPage(page, pages)
  const pageRows = visible.slice((safePage - 1) * pageSize, safePage * pageSize)

  const remove = (id: string, phone: string) => {
    void (async () => {
      const ok = await confirm({
        title: t('confirm.unblacklistTitle'),
        description: t('confirm.unblacklistBody', { phone }),
        confirmLabel: t('confirm.unblacklistConfirm'),
        cancelLabel: t('common.cancel'),
        tone: 'danger',
      })
      if (!ok) return

      setBusyId(id)
      startTransition(async () => {
        const result = await removeFromBlacklist(id)
        if (result.error) toast(result.error, 'danger')
        else {
          setRows((current) => current.filter((row) => row.id !== id))
          toast('Kaldırıldı.', 'success')
        }
        setBusyId(null)
      })
    })()
  }

  return (
    <div>
      <div className="flex justify-end px-2">
        <button type="button" className="wb-wa-text-btn" onClick={() => setOpen(true)}>
          + Yeni numara engelle
        </button>
      </div>

      <div className="relative px-3 py-2">
        <Input
          aria-label="Numara ara"
          type="search"
          autoComplete="off"
          placeholder="Numara ara…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="wb-wa-search pr-10 [&::-webkit-search-cancel-button]:hidden"
        />
        {search ? (
          <button
            type="button"
            aria-label="Aramayı temizle"
            className="absolute right-1.5 top-1/2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
            onClick={() => setSearch('')}
          >
            <Icon name="close" className="size-3.5" />
          </button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-[#667781]">
          Engellenen numara yok.
        </p>
      ) : rows.length > 0 && visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13px] text-[#667781]">
          Eşleşen numara yok.
        </p>
      ) : rows.length > 0 ? (
        <div>
          <ul className="wb-inbox-list">
            {pageRows.map((row) => (
              <li key={row.id}>
                <div className="flex items-center">
                  <div className="wb-wa-row min-w-0 flex-1">
                    <span
                      className="wb-wa-avatar"
                      style={{ background: '#e17076' }}
                      aria-hidden
                    >
                      {row.phone_e164.replace(/\D/g, '').slice(-2) || '?'}
                    </span>
                    <span className="wb-wa-row-main">
                      <span className="wb-wa-row-top">
                        <span className="wb-wa-name">{row.phone_e164}</span>
                      </span>
                      <span className="wb-wa-row-bottom">
                        <span className="wb-wa-preview">{row.reason?.trim() || 'Sebep yok'}</span>
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className="wb-wa-text-btn is-danger mr-1"
                    disabled={busyId === row.id}
                    onClick={() => remove(row.id, row.phone_e164)}
                  >
                    {busyId === row.id ? 'Kaldırılıyor…' : 'Kaldır'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {pages > 1 ? (
            <Pagination
              page={safePage}
              totalPages={pages}
              label={`${visible.length} numara`}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      ) : null}

      {open ? (
        <AddBlockedModal
          onClose={close}
          onSaved={() => {
            close()
            router.refresh()
          }}
        />
      ) : null}
    </div>
  )
}

function AddBlockedModal({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: () => void
}) {
  const titleId = useId()
  const descId = useId()
  const toast = useToast()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, pending] = useActionState<BlacklistState, FormData>(
    addToBlacklist,
    null,
  )
  useSyncBusy(pending, 'Ekleniyor…')

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, pending])

  useEffect(() => {
    if (!state?.ok) return
    toast(state.ok, 'success')
    formRef.current?.reset()
    onSaved()
  }, [state?.ok, onSaved, toast])

  return (
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="wb-modal-panel wb-wa-modal"
      >
        <h2 id={titleId} className="wb-modal-title">
          Yeni numara engelle
        </h2>
        <p id={descId} className="wb-modal-desc">
          Kampanya bu numaralara gitmez. Birden fazla satır yapıştırabilirsiniz.
        </p>

        <form ref={formRef} action={formAction} className="mt-4 space-y-3">
          <Field label="Numaralar">
            <Textarea
              name="numbers"
              rows={5}
              required
              autoFocus
              placeholder={'0532 123 45 67\n+90 533 234 56 78'}
            />
          </Field>
          <Field label="Sebep" hint="İsteğe bağlı">
            <Input name="reason" placeholder="Örn. çıkmak istedi" />
          </Field>
          {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
          <div className="wb-modal-actions">
            <Button type="button" variant="quiet" disabled={pending} onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" className="wb-wa-submit" disabled={pending}>
              {pending ? 'Ekleniyor…' : 'Engelle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
