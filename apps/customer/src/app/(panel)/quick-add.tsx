'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Icon, type IconName } from '@/components/icon'

const ListRequestModal = dynamic(
  () => import('./kisiler/list-request-modal').then((mod) => mod.ListRequestModal),
  { ssr: false },
)

const NewGroupModal = dynamic(
  () => import('./kisiler/new-group-form').then((mod) => mod.NewGroupModal),
  { ssr: false },
)

const AddPersonModal = dynamic(
  () => import('./kisiler/add-person-modal').then((mod) => mod.AddPersonModal),
  { ssr: false },
)

const AddBrandKitModal = dynamic(
  () =>
    import('./ayarlar/marka/add-brand-kit-button').then((mod) => mod.AddBrandKitModal),
  { ssr: false },
)

type QuickItem = {
  href?: string
  action?: 'list' | 'group' | 'person' | 'brandKit'
  label: string
  icon: IconName
}

const ITEMS: QuickItem[] = [
  { href: '/kampanyalar/yeni', label: 'Yeni kampanya', icon: 'campaign' },
  { href: '/icerik/yeni', label: 'Yeni içerik üret', icon: 'image' },
  { action: 'list', label: 'Yeni kişi listesi talep', icon: 'search' },
]

const OTHER_ITEMS: QuickItem[] = [
  { action: 'person', label: 'Yeni kişi', icon: 'people' },
  { action: 'group', label: 'Yeni grup', icon: 'people' },
  { href: '/ayarlar/urunler/yeni', label: 'Yeni ürün ekle', icon: 'file' },
  { action: 'brandKit', label: 'Yeni kit ekle', icon: 'brand' },
  { href: '/ayarlar/hatlar?ekle=1', label: 'Yeni hat ekle', icon: 'phone' },
]

function chatDetailOpen() {
  if (typeof window === 'undefined') return false
  return (
    document.body.classList.contains('wb-chat-open') ||
    Boolean(new URLSearchParams(window.location.search).get('tel'))
  )
}

export function QuickAdd() {
  const pathname = usePathname()
  const menuId = useId()
  const otherId = useId()
  const [open, setOpen] = useState(false)
  const [otherOpen, setOtherOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [groupOpen, setGroupOpen] = useState(false)
  const [personOpen, setPersonOpen] = useState(false)
  const [brandKitOpen, setBrandKitOpen] = useState(false)
  const [threadOpen, setThreadOpen] = useState(false)
  const onInbox = pathname === '/mesajlar' || pathname.startsWith('/mesajlar/')
  const onCreateFlow =
    pathname === '/kampanyalar/yeni' ||
    pathname.startsWith('/kampanyalar/yeni/') ||
    /\/kampanyalar\/[^/]+\/duzenle(?:\/|$)/.test(pathname) ||
    pathname === '/icerik/yeni' ||
    pathname.startsWith('/icerik/yeni/') ||
    pathname.startsWith('/ayarlar/marka/')
  const hidden = onCreateFlow || (onInbox && threadOpen)

  useEffect(() => {
    const sync = () => setThreadOpen(chatDetailOpen())
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    window.addEventListener('popstate', sync)
    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', sync)
    }
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const close = () => {
    setOpen(false)
    setOtherOpen(false)
  }

  useEffect(() => {
    if (hidden) close()
  }, [hidden])

  if (hidden) return null

  const renderItem = (item: QuickItem) =>
    item.href ? (
      <Link key={item.label} href={item.href} className="wb-fab-item" onClick={close}>
        <Icon name={item.icon} className="size-4 shrink-0 text-accent" />
        <span>{item.label}</span>
      </Link>
    ) : (
      <button
        key={item.label}
        type="button"
        className="wb-fab-item"
        onClick={() => {
          close()
          if (item.action === 'list') setListOpen(true)
          if (item.action === 'group') setGroupOpen(true)
          if (item.action === 'person') setPersonOpen(true)
          if (item.action === 'brandKit') setBrandKitOpen(true)
        }}
      >
        <Icon name={item.icon} className="size-4 shrink-0 text-accent" />
        <span>{item.label}</span>
      </button>
    )

  return (
    <>
      {open ? (
        <button type="button" className="wb-fab-backdrop" aria-label="Kapat" onClick={close} />
      ) : null}

      <div className="wb-fab">
        {open ? (
          <nav id={menuId} className="wb-fab-menu" aria-label="Hızlı ekle">
            {ITEMS.map(renderItem)}
            <button
              type="button"
              className="wb-fab-item wb-fab-other"
              aria-expanded={otherOpen}
              aria-controls={otherId}
              onClick={() => setOtherOpen((value) => !value)}
            >
              <Icon name="more" className="size-4 shrink-0 text-accent" />
              <span>Diğer</span>
              <span className={`wb-fab-caret${otherOpen ? ' is-open' : ''}`} aria-hidden>
                ▾
              </span>
            </button>
            {otherOpen ? (
              <div id={otherId} className="wb-fab-other-list">
                {OTHER_ITEMS.map(renderItem)}
              </div>
            ) : null}
          </nav>
        ) : null}

        <button
          type="button"
          className={`wb-fab-btn${open ? ' is-open' : ''}`}
          aria-label={open ? 'Kapat' : 'Hızlı ekle'}
          aria-expanded={open}
          aria-controls={open ? menuId : undefined}
          aria-haspopup="menu"
          onClick={() => {
            if (open) close()
            else setOpen(true)
          }}
        >
          <Icon name="plus" className="size-6" />
        </button>
      </div>

      {listOpen ? (
        <ListRequestModal initialView="form" onClose={() => setListOpen(false)} />
      ) : null}
      {groupOpen ? <NewGroupModal onClose={() => setGroupOpen(false)} /> : null}
      {personOpen ? <AddPersonModal onClose={() => setPersonOpen(false)} /> : null}
      {brandKitOpen ? <AddBrandKitModal onClose={() => setBrandKitOpen(false)} /> : null}
    </>
  )
}
