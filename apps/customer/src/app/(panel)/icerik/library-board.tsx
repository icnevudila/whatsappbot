'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AccentLink, Badge, Button, EmptyState, Input, QuietLink } from '@/components/ui'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useServerSyncedState } from '@/lib/use-server-synced-state'
import { deleteCreative } from './actions'

export type LibraryItem = {
  id: string
  title: string | null
  publicUrl: string | null
  status: string
  source: string
  generationType: string
  brandName: string | null
  createdAt: string
  error: string | null
  parentId: string | null
}

type Filter = 'all' | 'ai' | 'upload' | 'running'

const STAGES = [
  'Markanızı analiz ediyoruz…',
  'Ürünleri kompozisyona yerleştiriyoruz…',
  'Kampanya tasarımınız hazırlanıyor…',
  'Son dokunuşlar yapılıyor…',
]

export function LibraryBoard({
  orgId,
  initial,
  canManage,
}: {
  orgId: string
  initial: LibraryItem[]
  canManage: boolean
}) {
  const [items, setItems] = useServerSyncedState(initial)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'new' | 'old'>('new')
  const toast = useToast()
  const confirm = useConfirm()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const kicked = useRef(new Set<string>())
  const [renderErrors, setRenderErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`creatives-lib-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'creatives', filter: `org_id=eq.${orgId}` },
        () => {
          router.refresh()
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, router])

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
          const json = (await response.json().catch(() => null)) as { error?: string } | null
          if (!response.ok) {
            const message = json?.error ?? 'Görsel üretilemedi.'
            setRenderErrors((prev) => ({ ...prev, [item.id]: message }))
          }
          router.refresh()
        })
        .catch((error: unknown) => {
          const timedOut = error instanceof Error && error.name === 'TimeoutError'
          const message = timedOut ? 'Üretim zaman aşımına uğradı.' : 'Üretim başlatılamadı.'
          setRenderErrors((prev) => ({ ...prev, [item.id]: message }))
        })
    }
  }, [canManage, items, router])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = items.filter((item) => {
      if (filter === 'ai' && item.source !== 'ai') return false
      if (filter === 'upload' && item.source !== 'upload') return false
      if (filter === 'running' && !['pending', 'rendering'].includes(item.status)) return false
      if (q && !(item.title ?? '').toLowerCase().includes(q)) return false
      return true
    })
    rows.sort((a, b) =>
      sort === 'new'
        ? b.createdAt.localeCompare(a.createdAt)
        : a.createdAt.localeCompare(b.createdAt),
    )
    return rows
  }, [items, filter, query, sort])

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-hairline bg-surface">
        <EmptyState
          tone="brand"
          title="İlk kampanya görselini oluştur"
          description="Markanıza ve ürünlerinize uygun kampanya görsellerini AI ile hazırlayın. Üretim arka planda devam eder."
          action={<AccentLink href="/icerik/yeni">✨ Kampanya görseli oluştur</AccentLink>}
        />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ['all', 'Tümü'],
            ['ai', 'AI üretimleri'],
            ['upload', 'Yüklenenler'],
            ['running', 'Devam edenler'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`rounded-full px-3 py-1 text-[12.5px] ${
              filter === id ? 'bg-accent text-white' : 'border border-hairline bg-surface'
            }`}
          >
            {label}
          </button>
        ))}
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Başlık ara"
          className="max-w-48"
          aria-label="Görsel ara"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value === 'old' ? 'old' : 'new')}
          className="rounded-md border border-hairline-strong bg-canvas px-2 py-1.5 text-[13px]"
          aria-label="Sıralama"
        >
          <option value="new">En yeni</option>
          <option value="old">En eski</option>
        </select>
      </div>

      {visible.length === 0 ? (
        <p className="rounded-md border border-hairline bg-surface px-4 py-8 text-center text-[13px] text-ink-muted">
          Bu filtreye uyan görsel yok.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((item) => (
            <li key={item.id}>
              <article className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]">
                <Link href={`/icerik/${item.id}`} className="block">
                  {item.publicUrl && item.status === 'ready' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.publicUrl} alt="" className="h-auto w-full bg-canvas object-contain" />
                  ) : (
                    <GeneratingFrame
                      status={renderErrors[item.id] ? 'failed' : item.status}
                      error={renderErrors[item.id] ?? item.error}
                    />
                  )}
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 font-semibold">{item.title || 'Kampanya görseli'}</p>
                    <p className="text-[12px] text-ink-muted">
                      {new Date(item.createdAt).toLocaleString('tr-TR')}
                      {item.brandName ? ` · ${item.brandName}` : ''}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        tone={
                          item.status === 'ready'
                            ? 'accent'
                            : item.status === 'failed' || renderErrors[item.id]
                              ? 'danger'
                              : 'warn'
                        }
                      >
                        {statusLabel(
                          renderErrors[item.id] && item.status !== 'ready' ? 'failed' : item.status,
                        )}
                      </Badge>
                      <Badge>
                        {item.source === 'ai' ? sourceType(item.generationType) : 'Yükleme'}
                      </Badge>
                    </div>
                  </div>
                </Link>
                <div className="flex flex-wrap gap-1 border-t border-hairline px-3 py-2">
                  <QuietLink href={`/icerik/${item.id}`} className="h-8 text-[12px]">
                    Görüntüle
                  </QuietLink>
                  {item.status === 'ready' && item.publicUrl ? (
                    <>
                      <QuietLink href={`/icerik/${item.id}?revize=1`} className="h-8 text-[12px]">
                        Revize et
                      </QuietLink>
                      <QuietLink href={`/icerik/${item.id}`} className="h-8 text-[12px]">
                        Varyasyon
                      </QuietLink>
                      <a
                        href={item.publicUrl}
                        download
                        className="inline-flex h-8 items-center px-2 text-[12px] font-medium text-ink-muted"
                      >
                        İndir
                      </a>
                      <AccentLink
                        href={`/kampanyalar/yeni?gorsel=${encodeURIComponent(item.publicUrl)}`}
                        className="h-8 text-[12px]"
                      >
                        Kampanyada kullan
                      </AccentLink>
                    </>
                  ) : null}
                  {canManage ? (
                    <Button
                      type="button"
                      variant="danger"
                      className="h-8 text-[12px]"
                      disabled={pending}
                      onClick={() => {
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
                    >
                      Sil
                    </Button>
                  ) : null}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function statusLabel(status: string) {
  if (status === 'ready') return 'Hazır'
  if (status === 'pending') return 'Sırada'
  if (status === 'rendering') return 'Üretiliyor'
  if (status === 'failed') return 'Hata'
  return status
}

function sourceType(type: string) {
  if (type === 'revision') return 'Revizyon'
  if (type === 'variation') return 'Varyasyon'
  if (type === 'derived') return 'Türetme'
  return 'AI'
}

function GeneratingFrame({ status, error }: { status: string; error: string | null }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const timer = setInterval(() => setTick((value) => value + 1), 2800)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-1 bg-canvas px-4 text-center">
      {status === 'failed' ? (
        <p className="text-[12.5px] text-danger">{error || 'Görsel oluşturulamadı'}</p>
      ) : (
        <>
          <span className="wb-busy-pill" aria-hidden />
          <p className="text-[12.5px] text-ink-muted">{STAGES[tick % STAGES.length]}</p>
        </>
      )}
    </div>
  )
}
