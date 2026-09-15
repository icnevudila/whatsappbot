'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { CardHeader, Input } from '@/components/ui'
import { Icon } from '@/components/icon'
import { AddToGroupForm } from './add-to-group-form'
import { MemberActions, type MemberRow } from './member-actions'

export function MembersPanel({
  listId,
  members,
  totalCount,
  statusFilter,
  memberTotal,
  validCount,
  invalidCount,
  unknownCount,
  subtitle,
}: {
  listId: string
  members: MemberRow[]
  totalCount: number
  statusFilter: string
  memberTotal: number
  validCount: number
  invalidCount: number
  unknownCount: number
  subtitle: string
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  return (
    <>
      <MembersPanelHeader
        listId={listId}
        statusFilter={statusFilter}
        memberTotal={memberTotal}
        validCount={validCount}
        invalidCount={invalidCount}
        unknownCount={unknownCount}
        subtitle={subtitle}
        searchOpen={searchOpen}
        query={query}
        onQueryChange={setQuery}
        onSearchOpenChange={setSearchOpen}
      />
      <MemberActions listId={listId} members={members} totalCount={totalCount} query={query} />
    </>
  )
}

export function MembersPanelHeader({
  listId,
  statusFilter,
  memberTotal,
  validCount,
  invalidCount,
  unknownCount,
  subtitle,
  searchOpen,
  query,
  onQueryChange,
  onSearchOpenChange,
}: {
  listId: string
  statusFilter: string
  memberTotal: number
  validCount: number
  invalidCount: number
  unknownCount: number
  subtitle: string
  searchOpen: boolean
  query: string
  onQueryChange: (value: string) => void
  onSearchOpenChange: (value: boolean | ((current: boolean) => boolean)) => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = statusFilter !== 'tum'
  const [filterOpen, setFilterOpen] = useState(filtered)
  const [menuOpen, setMenuOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!searchOpen) return
    searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!menuOpen) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false)
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

  const hrefFor = (status: string) =>
    status === 'tum' ? `/kisiler/${listId}` : `/kisiler/${listId}?durum=${status}`

  return (
    <>
      <CardHeader
        title="Üyeler"
        subtitle={subtitle}
        action={
          <div className="flex flex-wrap items-center justify-end gap-1">
            <button
              type="button"
              aria-label="Filtre"
              aria-expanded={filterOpen}
              title="Filtre"
              onClick={() => {
                setFilterOpen((value) => !value)
                setMenuOpen(false)
              }}
              className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
            >
              <Icon name="filter" className="size-4" />
              {filtered ? (
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" aria-hidden />
              ) : null}
            </button>
            <button
              type="button"
              aria-label="Ara"
              aria-expanded={searchOpen}
              title="Ara"
              onClick={() => {
                onSearchOpenChange((value) => !value)
                setMenuOpen(false)
              }}
              className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
            >
              <Icon name="search" className="size-4" />
              {query.trim() ? (
                <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" aria-hidden />
              ) : null}
            </button>
            <div className="relative shrink-0" ref={menuRef}>
              <button
                type="button"
                aria-label="Diğer"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                title="Diğer"
                onClick={() => {
                  setMenuOpen((value) => !value)
                  setFilterOpen(false)
                  onSearchOpenChange(false)
                }}
                className="inline-flex size-8 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
              >
                <Icon name="ellipsis" className="size-4" />
              </button>
              {menuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-1 min-w-[13rem] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
                    onClick={() => {
                      setMenuOpen(false)
                      setAddOpen(true)
                    }}
                  >
                    <Icon name="plus" className="size-4 text-ink-muted" />
                    Gruba numara ekle
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        }
      />
      {filterOpen || searchOpen ? (
        <div className="border-b border-hairline bg-canvas/40 px-3 py-2">
          {filterOpen ? (
            <div className={`flex flex-wrap items-center gap-1.5${searchOpen ? ' mb-2' : ''}`}>
            <Link
              href={hrefFor('tum')}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                statusFilter === 'tum'
                  ? 'bg-ink text-canvas font-bold'
                  : 'border border-hairline bg-surface text-ink-muted hover:text-ink'
              }`}
            >
              Tümü ({memberTotal})
            </Link>
            <Link
              href={hrefFor('var')}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                statusFilter === 'var'
                  ? 'border border-ok bg-ok text-white font-bold'
                  : 'border border-ok/35 bg-ok-soft text-ok hover:bg-ok/15'
              }`}
              title="WhatsApp hesabı olan numaralar"
            >
              <span aria-hidden>✓</span>
              <span>WhatsApp'ta Var ({validCount})</span>
            </Link>
            <Link
              href={hrefFor('yok')}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                statusFilter === 'yok'
                  ? 'border border-danger bg-danger text-white font-bold'
                  : 'border border-danger/35 bg-danger/10 text-danger hover:bg-danger/20'
              }`}
              title="WhatsApp hesabı olmayan numaralar"
            >
              <span aria-hidden>×</span>
              <span>WhatsApp'ta Yok ({invalidCount})</span>
            </Link>
            {unknownCount > 0 ? (
              <Link
                href={hrefFor('bekleyen')}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                  statusFilter === 'bekleyen'
                    ? 'bg-ink-muted text-canvas font-bold'
                    : 'border border-hairline bg-surface text-ink-muted hover:text-ink'
                }`}
                title="Henüz kontrol edilmemiş numaralar"
              >
                <span aria-hidden>?</span>
                <span>Doğrulanmamış ({unknownCount})</span>
              </Link>
            ) : null}
            </div>
          ) : null}
          {searchOpen ? (
            <div className="relative">
              <Input
                ref={searchRef}
                aria-label="Ad veya numara ara"
                type="text"
                placeholder="Ad veya numara ara"
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                className={query ? 'pr-9' : undefined}
              />
              {query ? (
                <button
                  type="button"
                  aria-label="Aramayı temizle"
                  title="Temizle"
                  onClick={() => {
                    onQueryChange('')
                    searchRef.current?.focus()
                  }}
                  className="absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-surface hover:text-ink"
                >
                  <Icon name="close" className="size-3.5" />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {addOpen ? (
        <AddToGroupModal listId={listId} onClose={() => setAddOpen(false)} />
      ) : null}
    </>
  )
}

function AddToGroupModal({ listId, onClose }: { listId: string; onClose: () => void }) {
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
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="wb-modal-panel wb-modal-panel--wide"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              Gruba numara ekle
            </h2>
            <p className="wb-modal-desc">Excel yükleyin veya numaraları yapıştırın. Deftere de yazılır.</p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-canvas hover:text-ink"
          >
            ✕
          </button>
        </div>
        <AddToGroupForm listId={listId} padded={false} onDone={onClose} />
      </div>
    </div>,
    document.body,
  )
}
