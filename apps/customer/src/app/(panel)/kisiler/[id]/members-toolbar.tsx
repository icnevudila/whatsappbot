'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { CardHeader, Input } from '@/components/ui'
import { Icon } from '@/components/icon'
import { ListActions } from '../list-actions'
import { AddToGroupForm } from './add-to-group-form'
import { MemberActions, type MemberRow } from './member-actions'

export function MembersPanel({
  listId,
  listName,
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
  listName: string
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
        listName={listName}
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
  listName,
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
  listName: string
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
  const searchRef = useRef<HTMLInputElement>(null)
  const filtered = statusFilter !== 'tum'
  const [filterOpen, setFilterOpen] = useState(filtered)
  const [addOpen, setAddOpen] = useState(false)

  useEffect(() => {
    if (!searchOpen) return
    searchRef.current?.focus()
  }, [searchOpen])

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
              }}
              className="wb-wa-icon-btn relative"
            >
              <Icon name="filter" className="size-4" />
              {filtered ? (
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#25d366]" aria-hidden />
              ) : null}
            </button>
            <button
              type="button"
              aria-label="Ara"
              aria-expanded={searchOpen}
              title="Ara"
              onClick={() => {
                onSearchOpenChange((value) => !value)
              }}
              className="wb-wa-icon-btn relative"
            >
              <Icon name="search" className="size-4" />
              {query.trim() ? (
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-[#25d366]" aria-hidden />
              ) : null}
            </button>
            <ListActions
              compact
              listId={listId}
              currentName={listName}
              menuLabel="Diğer"
              menuExtra={(close) => (
                <button
                  type="button"
                  role="menuitem"
                  className="wb-wa-menu-item"
                  onClick={() => {
                    close()
                    setAddOpen(true)
                  }}
                >
                  <Icon name="plus" className="size-4 text-ink-muted" />
                  Gruba numara ekle
                </button>
              )}
            />
          </div>
        }
      />
      {filterOpen || searchOpen ? (
        <div className="px-3 py-2">
          {filterOpen ? (
            <div className={`wb-wa-seg${searchOpen ? ' mb-2' : ''}`}>
            <Link
              href={hrefFor('tum')}
              className={`wb-wa-chip${statusFilter === 'tum' ? ' is-active' : ''}`}
            >
              Tümü ({memberTotal})
            </Link>
            <Link
              href={hrefFor('var')}
              className={`wb-wa-chip${statusFilter === 'var' ? ' is-active' : ''}`}
              title="WhatsApp hesabı olan numaralar"
            >
              WhatsApp’ta ({validCount})
            </Link>
            <Link
              href={hrefFor('yok')}
              className={`wb-wa-chip${statusFilter === 'yok' ? ' is-active' : ''}`}
              title="WhatsApp hesabı olmayan numaralar"
            >
              Yok ({invalidCount})
            </Link>
            {unknownCount > 0 ? (
              <Link
                href={hrefFor('bekleyen')}
                className={`wb-wa-chip${statusFilter === 'bekleyen' ? ' is-active' : ''}`}
                title="Henüz kontrol edilmemiş numaralar"
              >
                Bekleyen ({unknownCount})
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
                className={`wb-wa-search${query ? ' pr-9' : ''}`}
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
        className="wb-modal-panel wb-modal-panel--wide wb-wa-modal"
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
            className="wb-wa-icon-btn"
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
