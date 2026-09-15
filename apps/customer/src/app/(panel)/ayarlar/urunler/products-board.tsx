'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmptyState, Input } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { deleteProduct } from './actions'

export type ProductListItem = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  thumb: string | null
}

export function ProductsBoard({
  products,
  canManage,
}: {
  products: ProductListItem[]
  canManage: boolean
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('tum')
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  const query = search.trim().toLocaleLowerCase('tr-TR')
  const visible = products.filter((product) => {
    if (status === 'aktif' && !product.is_active) return false
    if (status === 'pasif' && product.is_active) return false
    if (!query) return true
    const haystack = `${product.name} ${product.description ?? ''}`.toLocaleLowerCase('tr-TR')
    return haystack.includes(query)
  })

  const activeCount = products.filter((product) => product.is_active).length
  const passiveCount = products.length - activeCount
  const filtered = status !== 'tum'

  return (
    <div>
      <div className="flex items-center gap-1 px-3 py-1">
        {searchOpen ? (
          <Input
            ref={searchRef}
            aria-label="Ürün ara"
            type="search"
            placeholder="Ürün adına göre ara…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="wb-wa-search min-w-0 flex-1"
          />
        ) : (
          <p className="min-w-0 flex-1 px-1 text-[13px] text-[#667781]">
            {visible.length} ürün
            {filtered || query ? ` · ${products.length} içinden` : ''}
          </p>
        )}
        <button
          type="button"
          aria-label="Ara"
          aria-expanded={searchOpen}
          title="Ara"
          onClick={() => {
            setSearchOpen((value) => !value)
            setFilterOpen(false)
          }}
          className="wb-wa-icon-btn relative"
        >
          <Icon name="search" className="size-5" />
          {query ? (
            <span className="wb-wa-icon-dot" aria-hidden />
          ) : null}
        </button>
        <button
          type="button"
          aria-label="Filtre"
          aria-expanded={filterOpen}
          title="Filtre"
          onClick={() => {
            setFilterOpen((value) => !value)
            setSearchOpen(false)
          }}
          className="wb-wa-icon-btn relative"
        >
          <Icon name="filter" className="size-5" />
          {filtered ? (
            <span className="wb-wa-icon-dot" aria-hidden />
          ) : null}
        </button>
      </div>

      {filterOpen ? (
        <div className="wb-wa-seg px-3 pb-2">
          <StatusChip active={status === 'tum'} onClick={() => setStatus('tum')}>
            Tümü ({products.length})
          </StatusChip>
          <StatusChip active={status === 'aktif'} onClick={() => setStatus('aktif')}>
            Aktif ({activeCount})
          </StatusChip>
          <StatusChip active={status === 'pasif'} onClick={() => setStatus('pasif')}>
            Pasif ({passiveCount})
          </StatusChip>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          tone="generic"
          title="Ürün bulunamadı"
          description="Aramayı veya filtreyi değiştirin."
        />
      ) : (
        <ul className="wb-inbox-list">
          {visible.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} canManage={canManage} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function StatusChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`wb-wa-chip${active ? ' is-active' : ''}`}
    >
      {children}
    </button>
  )
}

function ProductCard({
  product,
  canManage,
}: {
  product: ProductListItem
  canManage: boolean
}) {
  return (
    <div className="flex items-center">
      <Link href={`/ayarlar/urunler/${product.id}`} className="wb-wa-row min-w-0 flex-1">
        {product.thumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.thumb} alt="" className="wb-wa-avatar object-cover" />
        ) : (
          <span className="wb-wa-avatar" style={{ background: '#00a884' }} aria-hidden>
            {product.name.slice(0, 2).toLocaleUpperCase('tr-TR')}
          </span>
        )}
        <span className="wb-wa-row-main">
          <span className="wb-wa-row-top">
            <span className="wb-wa-name">{product.name}</span>
            <span className="wb-wa-time">{product.is_active ? 'Aktif' : 'Pasif'}</span>
          </span>
          <span className="wb-wa-row-bottom">
            <span className="wb-wa-preview">{product.description || 'Açıklama yok'}</span>
          </span>
        </span>
      </Link>
      {canManage ? <ProductCardMenu id={product.id} name={product.name} /> : null}
    </div>
  )
}

function ProductCardMenu({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative shrink-0 pr-1" ref={menuRef}>
      <button
        type="button"
        aria-label="Ürün işlemleri"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Diğer"
        disabled={pending}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((value) => !value)
        }}
        className="wb-wa-icon-btn"
      >
        <Icon name="ellipsis" className="size-5" />
      </button>
      {open ? (
        <div role="menu" className="wb-wa-menu">
          <Link
            href={`/ayarlar/urunler/${id}`}
            role="menuitem"
            className="wb-wa-menu-item"
            onClick={() => setOpen(false)}
          >
            <Icon name="edit" className="size-4 text-ink-muted" />
            Düzenle
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            className="wb-wa-menu-item is-danger"
            onClick={() => {
              setOpen(false)
              void (async () => {
                const ok = await confirm({
                  title: 'Ürünü sil',
                  description: `“${name}” ve görselleri kalıcı olarak silinecek.`,
                  confirmLabel: 'Sil',
                  tone: 'danger',
                })
                if (!ok) return
                startTransition(() => {
                  void deleteProduct(id).then((result) => {
                    if (result?.error) {
                      toast(result.error, 'danger')
                      return
                    }
                    toast('Ürün silindi.', 'success')
                    router.refresh()
                  })
                })
              })()
            }}
          >
            <Icon name="trash" className="size-4" />
            {pending ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
