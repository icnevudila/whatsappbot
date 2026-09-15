'use client'

import { useEffect, useLayoutEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button, Input, Notice } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { waitForJob } from '@/lib/wait-for-job'
import { deleteList, renameList, verifyList } from './actions'

export function ListActions({
  listId,
  compact = false,
  currentName,
  menuExtra,
  menuLabel = 'Grup işlemleri',
}: {
  listId: string
  compact?: boolean
  currentName?: string
  menuExtra?: (close: () => void) => ReactNode
  menuLabel?: string
}) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const t = useT()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<'verify' | 'delete' | 'rename' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(currentName ?? '')
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  useSyncBusy(
    pending,
    busy === 'delete'
      ? 'Liste siliniyor…'
      : busy === 'rename'
        ? 'Ad güncelleniyor…'
        : 'Liste doğrulanıyor…',
  )

  useLayoutEffect(() => {
    if (!menuOpen || !buttonRef.current) {
      setMenuPos(null)
      return
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPos({
        top: rect.bottom + 4,
        right: Math.max(8, window.innerWidth - rect.right),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node)) return
      if (menuRef.current?.contains(event.target)) return
      if (menuPanelRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const runDelete = (deleteContactsToo: boolean) => {
    setError(null)
    setOk(null)
    setBusy('delete')
    startTransition(async () => {
      const result = await deleteList(listId, { deleteContactsToo })
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
      } else {
        toast(result.ok ?? 'Grup silindi.', 'success')
        router.push('/kisiler')
        router.refresh()
      }
      setBusy(null)
    })
  }

  const runVerify = () => {
    setError(null)
    setOk(null)
    setBusy('verify')
    startTransition(async () => {
      const result = await verifyList(listId)
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
        setBusy(null)
        return
      }

      setOk(result.ok ?? 'Doğrulama kuyruğa alındı…')
      toast('Doğrulama kuyruğa alındı…', 'accent')

      if (result.jobId) {
        const outcome = await waitForJob(result.jobId)
        if (outcome.status === 'done') {
          setOk('Doğrulama bitti.')
          toast('Liste doğrulaması bitti.', 'success')
          router.refresh()
        } else if (outcome.status === 'timeout') {
          setOk('Doğrulama sürüyor olabilir — biraz sonra yenile.')
          router.refresh()
        } else {
          setOk(null)
          setError(outcome.error)
        }
      } else {
        router.refresh()
      }

      setBusy(null)
    })
  }

  const runRename = () => {
    setError(null)
    setBusy('rename')
    startTransition(async () => {
      const result = await renameList(listId, nameDraft)
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
      } else {
        toast(result.ok ?? 'Güncellendi.', 'success')
        setRenaming(false)
        router.refresh()
      }
      setBusy(null)
    })
  }

  const askDeleteCompact = () => {
    void (async () => {
      const okDelete = await confirm({
        title: t('confirm.deleteListTitle'),
        description: 'Grup kaldırılır. Numaralar kişilerde kalır.',
        confirmLabel: 'Sil',
        cancelLabel: t('common.cancel'),
        tone: 'danger',
      })
      if (!okDelete) return
      runDelete(false)
    })()
  }

  const deleteButtons = (
    <Button
      variant="danger"
      onClick={() => {
        void (async () => {
          const onlyGroup = await confirm({
            title: t('confirm.deleteListTitle'),
            description:
              'Yalnız grubu siler; numaralar defterde kalır.',
            confirmLabel: 'Yalnız grubu sil',
            cancelLabel: t('common.cancel'),
            tone: 'danger',
          })
          if (!onlyGroup) return

          const withPeople = await confirm({
            title: 'Gruptaki kişiler de silinsin mi?',
            description: 'Evet = defterden de sil. Hayır = yalnız grup kalkar.',
            confirmLabel: 'Grup + kişiler',
            cancelLabel: 'Yalnız grup',
            tone: 'danger',
          })
          runDelete(Boolean(withPeople))
        })()
      }}
      disabled={pending}
    >
      {busy === 'delete' ? '…' : 'Sil'}
    </Button>
  )

  if (compact) {
    if (renaming) {
      return (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            className="h-8 w-[148px]"
            maxLength={120}
            aria-label="Grup adı"
          />
          <Button variant="accent" disabled={pending} onClick={runRename}>
            Kaydet
          </Button>
          <Button disabled={pending} onClick={() => setRenaming(false)}>
            Vazgeç
          </Button>
        </div>
      )
    }

    const menu =
      menuOpen && menuPos
        ? createPortal(
            <div
              ref={menuPanelRef}
              role="menu"
              className="wb-wa-menu wb-wa-menu--fixed"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {menuExtra ? menuExtra(() => setMenuOpen(false)) : null}
              {currentName != null ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={pending}
                  className="wb-wa-menu-item"
                  onClick={() => {
                    setMenuOpen(false)
                    setNameDraft(currentName)
                    setRenaming(true)
                  }}
                >
                  <Icon name="edit" className="size-4 text-ink-muted" />
                  Adı değiştir
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                title="Bağlı hat gerekir — gruptaki numaraları WhatsApp’ta kontrol eder"
                className="wb-wa-menu-item"
                onClick={() => {
                  setMenuOpen(false)
                  runVerify()
                }}
              >
                <Icon name="check" className="size-4 text-ink-muted" />
                {busy === 'verify' ? 'Doğrulanıyor…' : 'WhatsApp doğrula'}
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                className="wb-wa-menu-item is-danger"
                onClick={() => {
                  setMenuOpen(false)
                  askDeleteCompact()
                }}
              >
                <Icon name="trash" className="size-4" />
                {busy === 'delete' ? 'Siliniyor…' : 'Sil'}
              </button>
            </div>,
            document.body,
          )
        : null

    return (
      <div className="relative shrink-0" ref={menuRef}>
        <button
          ref={buttonRef}
          type="button"
          aria-label={menuLabel}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={menuLabel}
          disabled={pending}
          onClick={() => setMenuOpen((value) => !value)}
          className="wb-wa-icon-btn"
        >
          <Icon name="ellipsis" className="size-5" />
        </button>
        {menu}
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col items-end gap-1.5">
        {renaming ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <Input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              className="h-9 w-[160px]"
              maxLength={120}
            />
            <Button variant="accent" disabled={pending} onClick={runRename}>
              Kaydet
            </Button>
            <Button disabled={pending} onClick={() => setRenaming(false)}>
              Vazgeç
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {currentName != null ? (
              <Button
                disabled={pending}
                onClick={() => {
                  setNameDraft(currentName)
                  setRenaming(true)
                }}
              >
                Adı değiştir
              </Button>
            ) : null}
            <Button
              onClick={runVerify}
              disabled={pending}
              title="Bağlı hat gerekir"
            >
              {busy === 'verify' ? 'Doğrulanıyor…' : 'WhatsApp doğrula'}
            </Button>
            {deleteButtons}
          </div>
        )}
      </div>

      {error ? (
        <div className="basis-full">
          <Notice tone="danger">{error}</Notice>
        </div>
      ) : null}

      {ok && !error ? (
        <div className="basis-full">
          <Notice tone="accent">{ok}</Notice>
        </div>
      ) : null}
    </>
  )
}
