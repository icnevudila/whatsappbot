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
  const searchRef = useRef(null)

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
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {searchOpen ? (
          <Input
            ref={searchRef}
            aria-label="Ürün ara"
            type="search"
            placeholder="Ürün adına göre ara…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-8 min-w-0 flex-1 !py-1.5"
          />
        ) : (
          <p className="min-w-0 flex-1 text-[12.5px] text-ink-muted">
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
          className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
        >
          <Icon name="search" className="size-4" />
          {query ? (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" aria-hidden />
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
          className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
        >
          <Icon name="filter" className="size-4" />
          {filtered ? (
            <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" aria-hidden />
          ) : null}
        </button>
      </div>

      {filterOpen ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-sm)] border border-hairline bg-surface px-2.5 py-2">
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
        <ul className="grid grid-cols-2 gap-2">
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
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
        active
          ? 'bg-ink text-canvas'
          : 'border border-hairline bg-surface text-ink-muted hover:text-ink'
      }`}
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
    <div className="relative rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]">
      <Link href={`/ayarlar/urunler/${product.id}`} className="block">
        <div className="relative overflow-hidden rounded-t-[var(--radius-card)]">
          {product.thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.thumb} alt="" className="h-28 w-full bg-canvas object-cover sm:h-32" />
          ) : (
            <div className="flex h-28 items-center justify-center bg-canvas text-[11px] text-ink-faint sm:h-32">
              Görsel yok
            </div>
          )}
          <span
            className={`absolute left-1.5 top-1.5 rounded-full border px-1.5 py-0.5 text-[10.5px] font-semibold shadow-sm backdrop-blur-sm ${
              product.is_active
                ? 'border-accent/40 bg-accent text-accent-ink'
                : 'border-hairline bg-surface/90 text-ink-muted'
            }`}
          >
            {product.is_active ? 'Aktif' : 'Pasif'}
          </span>
        </div>
        <div className="space-y-0.5 px-2.5 py-2">
          <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-ink">{product.name}</p>
          {product.description ? (
            <p className="line-clamp-1 text-[11.5px] text-ink-muted">{product.description}</p>
          ) : null}
        </div>
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
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event) => {
      if (!menuRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
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
    <div className="absolute right-1.5 top-1.5 z-20" ref={menuRef}>
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
        className="inline-flex size-8 items-center justify-center rounded-full border border-hairline bg-surface/95 text-ink shadow-sm backdrop-blur-sm hover:bg-canvas disabled:opacity-50"
      >
        <Icon name="ellipsis" className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[9.5rem] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
        >
          <Link
            href={`/ayarlar/urunler/${id}`}
            role="menuitem"
            className="flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
            onClick={() => setOpen(false)}
          >
            Düzenle
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={pending}
            className="flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] font-medium text-danger hover:bg-canvas disabled:opacity-50"
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
            {pending ? 'Siliniyor…' : 'Sil'}
          </button>
        </div>
      ) : null}
    </div>
  )
}
