'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AccentLink, EmptyState, Input, Select } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { TypewriterText } from '@/components/typewriter-text'
import { deleteCreative, listLibraryCreatives } from './actions'
import { LIBRARY_PAGE_SIZE, type LibraryCreativeRow } from './library-shared'

export type LibraryItem = LibraryCreativeRow

const STAGES = [
  'Markanızı analiz ediyoruz…',
  'Ürünleri kompozisyona yerleştiriyoruz…',
  'Kampanya tasarımınız hazırlanıyor…',
  'Son dokunuşlar yapılıyor…',
]

export function LibraryBoard({
  orgId,
  initial,
  initialHasMore,
  canManage,
}: {
  orgId: string
  initial: LibraryItem[]
  initialHasMore: boolean
  canManage: boolean
}) {
  const [items, setItems] = useState(initial)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sort, setSort] = useState('new')
  const [loading, setLoading] = useState(false)
  const toast = useToast()
  const confirm = useConfirm()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const kicked = useRef(new Set())
  const [renderErrors, setRenderErrors] = useState({})
  const sentinelRef = useRef(null)
  const loadingMore = useRef(false)
  const requestId = useRef(0)
  const skipFirstQuery = useRef(true)
  const loadedCount = useRef(initial.length)
  loadedCount.current = items.length

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 280)
    return () => window.clearTimeout(timer)
  }, [query])

  const fetchPage = useCallback(
    async (offset, replace) => {
      const id = ++requestId.current
      loadingMore.current = true
      setLoading(true)
      const size =
        replace && offset === 0 && loadedCount.current > LIBRARY_PAGE_SIZE
          ? loadedCount.current
          : LIBRARY_PAGE_SIZE
      const result = await listLibraryCreatives({
        query: debouncedQuery,
        sort,
        offset,
        limit: size,
      })
      if (id !== requestId.current) return
      if (result.error) toast(result.error, 'danger')
      setItems((current) => (replace ? result.items : [...current, ...result.items]))
      setHasMore(result.hasMore)
      setLoading(false)
      loadingMore.current = false
    },
    [debouncedQuery, sort, toast],
  )

  useEffect(() => {
    if (skipFirstQuery.current && !debouncedQuery && sort === 'new') {
      skipFirstQuery.current = false
      return
    }
    skipFirstQuery.current = false
    loadedCount.current = LIBRARY_PAGE_SIZE
    void fetchPage(0, true)
  }, [debouncedQuery, sort, fetchPage])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`creatives-lib-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'creatives', filter: `org_id=eq.${orgId}` },
        () => {
          void fetchPage(0, true)
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, fetchPage])

  useEffect(() => {
    if (!canManage) return
    const waiting = items.filter(
      (item) =>
        item.source === 'ai' &&
        (item.status === 'pending' || item.status === 'rendering') &&
        !kicked.current.has(item.id),
    )
    for (const item of waiting.slice(0, 4)) {
      kicked.current.add(item.id)
      void fetch('/api/icerik/render', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: item.id }),
        signal: AbortSignal.timeout(120_000),
      })
        .then(async (response) => {
          const json = (await response.json().catch(() => null))
          if (!response.ok) {
            const message = json?.error ?? 'Görsel üretilemedi.'
            setRenderErrors((prev) => ({ ...prev, [item.id]: message }))
          }
          void fetchPage(0, true)
        })
        .catch((error) => {
          const timedOut = error instanceof Error && error.name === 'TimeoutError'
          const message = timedOut ? 'Üretim zaman aşımına uğradı.' : 'Üretim başlatılamadı.'
          setRenderErrors((prev) => ({ ...prev, [item.id]: message }))
        })
    }
  }, [canManage, items, fetchPage])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting || loadingMore.current) return
        void fetchPage(items.length, false)
      },
      { rootMargin: '240px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchPage, hasMore, items.length])

  if (items.length === 0 && !loading && !debouncedQuery) {
    return (
      <div className="rounded-[var(--radius-card)] border border-hairline bg-surface">
        <EmptyState
          tone="brand"
          title="İlk kampanya görselini oluştur"
          description="Markanıza ve ürünlerinize uygun kampanya görsellerini AI ile hazırlayın. Üretim arka planda devam eder."
          action={<AccentLink href="/icerik/yeni">Görsel üret</AccentLink>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,1fr)_7.75rem] gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Başlık ara"
          aria-label="Görsel ara"
        />
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value === 'old' ? 'old' : 'new')}
          aria-label="Sıralama"
        >
          <option value="new">En yeni</option>
          <option value="old">En eski</option>
        </Select>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border border-hairline bg-surface px-4 py-8 text-center text-[13px] text-ink-muted">
          Bu aramaya uyan görsel yok.
        </p>
      ) : (
        <ul className="grid grid-cols-2 items-stretch gap-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="h-full">
              <LibraryCard
                item={item}
                canManage={canManage}
                pending={pending}
                renderError={renderErrors[item.id]}
                onDelete={() => {
                  void (async () => {
                    const ok = await confirm({
                      title: 'Görseli sil',
                      description: 'Kütüphaneden kaldırılır. Kampanyadaki kopyalar durur.',
                      confirmLabel: 'Sil',
                      tone: 'danger',
                    })
                    if (!ok) return
                    startTransition(() => {
                      void deleteCreative(item.id).then((result) => {
                        if (result?.error) toast(result.error, 'danger')
                        else {
                          setItems((current) => current.filter((row) => row.id !== item.id))
                          router.refresh()
                        }
                      })
                    })
                  })()
                }}
              />
            </li>
          ))}
        </ul>
      )}

      <div ref={sentinelRef} className="h-8" />
      {loading ? (
        <p className="pb-2 text-center text-[12.5px] text-ink-faint">Yükleniyor…</p>
      ) : null}
    </div>
  )
}

function LibraryCard({
  item,
  canManage,
  pending,
  renderError,
  onDelete,
}: {
  item: LibraryItem
  canManage: boolean
  pending: boolean
  renderError?: string
  onDelete: () => void
}) {
  const failed = Boolean(renderError) && item.status !== 'ready'
  const ready = item.status === 'ready' && Boolean(item.publicUrl)

  return (
    <article className="flex h-full flex-col overflow-visible rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]">
      <div className="relative">
        <Link href={`/icerik/${item.id}`} className="block overflow-hidden rounded-t-[var(--radius-card)]">
          {ready ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.publicUrl} alt="" className="aspect-[4/5] w-full bg-canvas object-cover" />
          ) : (
            <GeneratingFrame status={failed ? 'failed' : item.status} error={renderError ?? item.error} />
          )}
        </Link>
        {item.status !== 'ready' ? (
          <span
            className={`pointer-events-none absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              failed ? 'bg-[#fff5f4] text-danger' : 'bg-surface/90 text-ink-muted'
            }`}
          >
            {statusLabel(failed ? 'failed' : item.status)}
          </span>
        ) : null}
        <ItemMenu item={item} canManage={canManage} pending={pending} onDelete={onDelete} />
      </div>
      <Link href={`/icerik/${item.id}`} className="flex flex-1 flex-col px-2.5 py-2 sm:px-3">
        <p className="line-clamp-2 h-[calc(1.375em*2)] overflow-hidden text-[13px] font-semibold leading-snug text-ink">
          {item.title || 'Kampanya görseli'}
        </p>
        <p className="mt-auto pt-0.5 text-[11.5px] text-ink-faint">{formatRelative(item.createdAt)}</p>
      </Link>
    </article>
  )
}

function ItemMenu({
  item,
  canManage,
  pending,
  onDelete,
}: {
  item: LibraryItem
  canManage: boolean
  pending: boolean
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const ready = item.status === 'ready' && Boolean(item.publicUrl)

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

  const items = []
  if (ready && item.publicUrl) {
    items.push({
      key: 'use',
      label: 'Kampanyada kullan',
      href: `/kampanyalar/yeni?gorsel=${encodeURIComponent(item.publicUrl)}`,
    })
    items.push({ key: 'revise', label: 'Revize et', href: `/icerik/${item.id}?revize=1` })
    items.push({ key: 'vary', label: 'Varyasyon', href: `/icerik/${item.id}` })
    items.push({ key: 'download', label: 'İndir', href: item.publicUrl, download: true })
  }
  if (canManage) items.push({ key: 'delete', label: 'Sil', danger: true, onSelect: onDelete })
  if (items.length === 0) return null

  return (
    <div className="absolute right-2 top-2 z-20" ref={menuRef}>
      <button
        type="button"
        aria-label="Görsel işlemleri"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-8 items-center justify-center rounded-full border border-hairline bg-surface/95 text-ink shadow-sm backdrop-blur-sm hover:bg-surface"
      >
        <Icon name="ellipsis" className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[11.5rem] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
        >
          {items.map((entry) =>
            entry.href ? (
              <a
                key={entry.key}
                role="menuitem"
                href={entry.href}
                download={entry.download ? '' : undefined}
                className="flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
                onClick={() => setOpen(false)}
              >
                {entry.label}
              </a>
            ) : (
              <button
                key={entry.key}
                type="button"
                role="menuitem"
                disabled={pending}
                className="flex w-full items-center rounded px-2.5 py-2 text-left text-[13px] font-medium text-danger hover:bg-canvas disabled:opacity-50"
                onClick={() => {
                  setOpen(false)
                  entry.onSelect?.()
                }}
              >
                {entry.label}
              </button>
            ),
          )}
        </div>
      ) : null}
    </div>
  )
}

function statusLabel(status) {
  if (status === 'ready') return 'Hazır'
  if (status === 'pending') return 'Sırada'
  if (status === 'rendering') return 'Üretiliyor'
  if (status === 'failed') return 'Hata'
  return status
}

function formatRelative(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(ms) || ms < 0) return 'az önce'
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min} dk önce`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} saat önce`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day} gün önce`
  const week = Math.floor(day / 7)
  if (week < 5) return `${week} hafta önce`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} ay önce`
  const year = Math.floor(day / 365)
  return `${year} yıl önce`
}

function GeneratingFrame({ status, error }: { status: string; error: string | null }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 2800)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="flex aspect-[4/5] flex-col items-center justify-center gap-1 bg-canvas px-3 text-center">
      {status === 'failed' ? (
        <p className="text-[12.5px] text-danger">{error || 'Görsel oluşturulamadı'}</p>
      ) : (
        <>
          <span className="wb-busy-pill" aria-hidden />
          <p className="text-[12.5px] text-ink-muted">
            <TypewriterText text={STAGES[tick % STAGES.length] ?? ''} />
          </p>
        </>
      )}
    </div>
  )
}
