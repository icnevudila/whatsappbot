'use client'

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { deleteBrandKit, duplicateBrandKit } from './actions'

export function BrandKitMoreMenu({
  id,
  name,
  variant = 'list',
}: {
  id: string
  name: string
  variant?: 'list' | 'detail'
}) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [pending, startTransition] = useTransition()
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
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
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node)) return
      if (wrapRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const remove = () => {
    void (async () => {
      const ok = await confirm({
        title: 'Marka kitini sil',
        description: `“${name}” kalıcı olarak silinecek.`,
        confirmLabel: 'Sil',
        tone: 'danger',
      })
      if (!ok) return
      startTransition(() => {
        void deleteBrandKit(id).then((result) => {
          if (result?.error) {
            toast(result.error, 'danger')
            return
          }
          toast('Marka kiti silindi.', 'success')
          router.push('/ayarlar/marka')
          router.refresh()
        })
      })
    })()
  }

  const duplicate = () => {
    startTransition(() => {
      void duplicateBrandKit(id).then((result) => {
        if (result?.error) {
          toast(result.error, 'danger')
          return
        }
        toast('Kit çoğaltıldı.', 'success')
        if (result.kitId) router.push(`/ayarlar/marka/${result.kitId}`)
        else router.refresh()
      })
    })
  }

  return (
    <>
      <div className="relative flex shrink-0 items-center self-center px-2" ref={wrapRef}>
        <button
          ref={buttonRef}
          type="button"
          aria-label="Daha fazla"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={pending}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex size-9 items-center justify-center rounded-full border border-[#e9edef] bg-white text-[#54656f] shadow-[0_1px_1px_rgba(11,20,26,0.04)] transition-colors hover:bg-[#f0f2f5] hover:text-[#111b21] disabled:opacity-50"
        >
          <Icon name="ellipsis" className="size-4" />
        </button>
      </div>

      {open && menuPos
        ? createPortal(
            <div
              ref={panelRef}
              role="menu"
              className="wb-wa-menu wb-wa-menu--fixed"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {variant === 'list' ? (
                <Link
                  role="menuitem"
                  href={`/ayarlar/marka/${id}`}
                  className="wb-wa-menu-item"
                  onClick={() => setOpen(false)}
                >
                  <Icon name="edit" className="size-4 text-ink-muted" />
                  Düzenle
                </Link>
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                className="wb-wa-menu-item"
                onClick={() => {
                  setOpen(false)
                  duplicate()
                }}
              >
                <Icon name="copy" className="size-4 text-ink-muted" />
                Çoğalt
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={pending}
                className="wb-wa-menu-item is-danger"
                onClick={() => {
                  setOpen(false)
                  remove()
                }}
              >
                <Icon name="trash" className="size-4" />
                Sil
              </button>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
