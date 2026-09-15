'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  CardHeader,
  EmptyState,
  FilterChip,
  Input,
  Notice,
  SplitPane,
  Toolbar,
} from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { blacklistPhone } from '../kara-liste/actions'
import { ReplyForm } from './reply-form'

export type ChatMessage = {
  id: number
  clientKey?: string
  account_id: string | null
  direction: string
  phone_e164: string | null
  remote_jid: string | null
  message_type: string
  body: string | null
  status: string
  created_at: string
  campaign_id: string | null
  campaignName?: string | null
  wa_message_id?: string | null
}

export type ThreadPreview = {
  phone: string
  contactName?: string | null
  pushName?: string | null
  lastBody: string | null
  lastAt: string
  lastDirection: 'in' | 'out'
  messageType: string
  accountId: string | null
  accountLabel: string | null
  /** Biz yazdık + onlar yanıtladı */
  isReply?: boolean
  /** Yalnızca giden (henüz gelen yok) */
  outboundOnly?: boolean
  missingPhone?: boolean
}

export function threadDisplayName(item: {
  contactName?: string | null
  pushName?: string | null
}): string | null {
  const contact = item.contactName?.trim()
  if (contact) return contact
  const push = item.pushName?.trim()
  if (push) return push
  return null
}

export type MessagesTab = 'tum' | 'giden'
export type MessagesDateRange = 'tum' | 'bugun' | 'dun' | '7gun'

const timeFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

const bubbleTime = new Intl.DateTimeFormat('tr-TR', {
  hour: '2-digit',
  minute: '2-digit',
})

function tickMark(status: string) {
  if (status === 'read' || status === 'delivered') return '✓✓'
  if (status === 'failed' || status === 'skipped') return '!'
  if (status === 'sent') return '✓'
  return '◌'
}

function tickTone(status: string) {
  if (status === 'read') return 'is-read'
  if (status === 'failed' || status === 'skipped') return 'is-fail'
  if (status === 'pending' || status === 'queued' || status === 'sending') return 'is-pending'
  return ''
}

function hrefFor(opts: { tel?: string | null; tab: MessagesTab; date: MessagesDateRange }) {
  const params = new URLSearchParams()
  if (opts.tab !== 'tum') params.set('sekme', opts.tab)
  if (opts.date !== 'tum') params.set('tarih', opts.date)
  if (opts.tel) params.set('tel', opts.tel)
  const query = params.toString()
  return query ? `/mesajlar?${query}` : '/mesajlar'
}

function telFromPath() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('tel')
}

function rowPhone(row: ChatMessage) {
  return row.phone_e164 || row.remote_jid || ''
}

function mergeThread(list: ChatMessage[], incoming: ChatMessage) {
  const key = incoming.clientKey || (incoming.id ? `log-${incoming.id}` : '')
  const match = list.findIndex(
    (item) =>
      (key && (item.clientKey || `log-${item.id}`) === key) ||
      (incoming.wa_message_id && item.wa_message_id === incoming.wa_message_id) ||
      (incoming.id && item.id === incoming.id),
  )
  if (match >= 0) {
    const next = list.slice()
    next[match] = { ...next[match], ...incoming, clientKey: next[match].clientKey || key }
    return next
  }
  const pending = list.findIndex(
    (item) =>
      String(item.clientKey ?? '').startsWith('local-') &&
      item.direction === incoming.direction &&
      (item.body ?? '') === (incoming.body ?? ''),
  )
  if (pending >= 0) {
    const next = list.slice()
    next[pending] = { ...incoming, clientKey: incoming.clientKey || key }
    return next
  }
  return [...list, { ...incoming, clientKey: key || `log-${incoming.id}` }]
}

function rememberCache(phone: string, message: ChatMessage, preview?: Partial<ThreadPreview>) {
  void fetch('/api/mesajlar/cache', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ phone, message, preview: preview ?? null }),
  })
}

function phoneMark(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 2) return digits.slice(-2)
  return phone.replace(/@lid$/, '').slice(0, 2).toUpperCase() || '?'
}

function previewLine(item: ThreadPreview): string {
  const body = item.lastBody ?? `(${item.messageType})`
  return item.lastDirection === 'out' ? `Siz: ${body}` : body
}

export function MessagesBoard({
  orgId,
  tab,
  dateRange,
  allCount,
  outboundCount,
  previews,
  selectedPhone,
  thread,
  accountLabels,
}: {
  orgId: string
  tab: MessagesTab
  dateRange: MessagesDateRange
  allCount: number
  outboundCount: number
  previews: ThreadPreview[]
  selectedPhone: string | null
  thread: ChatMessage[]
  accountLabels: Record<string, string>
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [list, setList] = useState(previews)
  const [labels, setLabels] = useState(accountLabels)
  const [activePhone, setActivePhone] = useState(selectedPhone)
  const [liveThread, setLiveThread] = useState(thread)
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [timeOpen, setTimeOpen] = useState(dateRange !== 'tum')
  const [searchOpen, setSearchOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [threadMenuOpen, setThreadMenuOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const threadMenuRef = useRef<HTMLDivElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const [flashPhone, setFlashPhone] = useState<string | null>(null)
  const topPhoneRef = useRef<string | null>(previews[0]?.phone ?? null)
  const threadMemo = useRef(new Map<string, ChatMessage[]>())
  const inflight = useRef(new Map<string, Promise<ChatMessage[]>>())
  const openGen = useRef(0)
  const activePhoneRef = useRef(selectedPhone)
  useSyncBusy(pending, 'İstemeyenlere ekleniyor…')
  activePhoneRef.current = activePhone

  useEffect(() => {
    setLabels(accountLabels)
  }, [accountLabels])

  useEffect(() => {
    setActivePhone(selectedPhone)
    setLiveThread(thread)
    if (selectedPhone) threadMemo.current.set(selectedPhone, thread)
  }, [selectedPhone, thread])

  useEffect(() => {
    document.body.classList.toggle('wb-chat-open', Boolean(activePhone))
    if (activePhone) document.body.dataset.chatPhone = activePhone
    else delete document.body.dataset.chatPhone
    return () => {
      document.body.classList.remove('wb-chat-open')
      delete document.body.dataset.chatPhone
    }
  }, [activePhone])

  useEffect(() => {
    if (!searchOpen) return
    searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    if (!menuOpen && !threadMenuOpen) return
    const onDoc = (event: MouseEvent | TouchEvent) => {
      if (!(event.target instanceof Node)) return
      if (menuOpen && !menuRef.current?.contains(event.target)) setMenuOpen(false)
      if (threadMenuOpen && !threadMenuRef.current?.contains(event.target)) setThreadMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      setThreadMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen, threadMenuOpen])

  useEffect(() => {
    setThreadMenuOpen(false)
  }, [activePhone])

  const visibleList = list.filter((item) =>
    `${item.contactName ?? ''} ${item.pushName ?? ''} ${item.phone} ${item.lastBody ?? ''} ${item.accountLabel ?? ''}`
      .toLocaleLowerCase('tr-TR')
      .includes(search.toLocaleLowerCase('tr-TR')),
  )

  useEffect(() => {
    const top = previews[0]?.phone ?? null
    if (top && top !== topPhoneRef.current) {
      topPhoneRef.current = top
      setFlashPhone(top)
      const t = window.setTimeout(() => setFlashPhone(null), 1050)
      setList(previews)
      return () => window.clearTimeout(t)
    }
    setList(previews)
  }, [previews])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' })
  }, [activePhone, liveThread.length, liveThread.at(-1)?.id, liveThread.at(-1)?.clientKey])

  const prefetchThread = (phone: string) => {
    if (!phone || threadMemo.current.has(phone) || inflight.current.has(phone)) {
      return inflight.current.get(phone)
    }
    const req = fetch(`/api/mesajlar/thread?tel=${encodeURIComponent(phone)}`)
      .then((response) => response.json())
      .then((data) => {
        const rows = Array.isArray(data.thread) ? (data.thread as ChatMessage[]) : []
        if (!data.error) threadMemo.current.set(phone, rows)
        return rows
      })
      .finally(() => {
        inflight.current.delete(phone)
      })
    inflight.current.set(phone, req)
    return req
  }

  const openChat = async (phone: string) => {
    const gen = ++openGen.current
    setActivePhone(phone)
    const cached = threadMemo.current.get(phone)
    if (cached) setLiveThread(cached)
    window.history.pushState({ tel: phone }, '', hrefFor({ tel: phone, tab, date: dateRange }))
    const rows = cached ?? (await (prefetchThread(phone) ?? Promise.resolve([])))
    if (gen !== openGen.current) return
    if (rows) setLiveThread(rows)
  }

  const closeChat = () => {
    openGen.current += 1
    setActivePhone(null)
    window.history.pushState({}, '', hrefFor({ tab, date: dateRange }))
  }

  useEffect(() => {
    const onPop = () => {
      const tel = telFromPath()
      setActivePhone(tel)
      if (!tel) {
        setLiveThread([])
        return
      }
      const cached = threadMemo.current.get(tel)
      if (cached) {
        setLiveThread(cached)
        return
      }
      void prefetchThread(tel)?.then((rows) => {
        if (telFromPath() === tel) setLiveThread(rows)
      })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [tab, dateRange])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const onMessageChange = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as ChatMessage
      if (row.direction !== 'in' && row.direction !== 'out') return
      const phone = rowPhone(row)
      if (!phone) return
      const incoming = { ...row, clientKey: row.clientKey || `log-${row.id}` }
      threadMemo.current.set(phone, mergeThread(threadMemo.current.get(phone) ?? [], incoming))
      if (activePhoneRef.current === phone) {
        setLiveThread((current) => mergeThread(current, incoming))
      }
      setList((current) => {
        const rest = current.filter((item) => item.phone !== phone)
        const prev = current.find((item) => item.phone === phone)
        return [
          {
            phone,
            contactName: prev?.contactName ?? null,
            pushName: prev?.pushName ?? (typeof payload.new.push_name === 'string' ? payload.new.push_name : null),
            lastBody: incoming.body,
            lastAt: incoming.created_at,
            lastDirection: incoming.direction === 'out' ? 'out' : 'in',
            messageType: incoming.message_type,
            accountId: incoming.account_id,
            accountLabel: incoming.account_id ? labels[incoming.account_id] ?? prev?.accountLabel ?? null : prev?.accountLabel ?? null,
            isReply: Boolean(prev?.isReply || incoming.direction === 'in'),
            outboundOnly: incoming.direction === 'out' && !prev?.isReply,
            missingPhone: !phone.startsWith('+'),
          },
          ...rest,
        ]
      })
      rememberCache(phone, incoming)
    }

    const channel = supabase
      .channel('mesajlar-live')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_log',
          filter: `org_id=eq.${orgId}`,
        },
        onMessageChange,
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'message_log',
          filter: `org_id=eq.${orgId}`,
        },
        onMessageChange,
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, labels])

  const selectedPreview = useMemo(
    () => list.find((item) => item.phone === activePhone) ?? null,
    [list, activePhone],
  )

  const block = () => {
    if (!activePhone || !activePhone.startsWith('+')) {
      setError('Bu sohbette telefon numarası yok; İstemeyenler\'e eklenemedi.')
      toast('İstemeyenlere eklenemedi — numara yok.', 'danger')
      return
    }
    const displayName = threadDisplayName(selectedPreview ?? {}) ?? activePhone
    void confirm({
      title: 'İstemeyenlere al',
      description: `${displayName} numarasını istemeyenler listesine eklemek istediğinize emin misiniz? Bu numara bundan sonra kampanyalara dahil edilmeyecek.`,
      confirmLabel: 'Evet, ekle',
    }).then((ok) => {
      if (!ok) return
      setError(null)
      setNotice(null)
      startTransition(async () => {
        const result = await blacklistPhone(activePhone, 'Mesajlar\'dan eklendi')
        if (result.error) {
          setError(result.error)
          toast(result.error, 'danger')
        } else {
          setNotice('İstemeyenlere eklendi. Bundan sonra kampanya bu numarayı atlar.')
          toast('İstemeyenlere eklendi.', 'success')
        }
      })
    })
  }

  const emptyCopy =
    dateRange !== 'tum'
      ? {
          title: 'Bu tarihte sohbet yok',
          description: 'Başka bir gün seçin veya Tümü’ne dönün.',
        }
      : tab === 'giden'
        ? {
            title: 'Cevapsız yok',
            description:
              'Sizin yazıp henüz dönüş almadığınız numaralar burada (kampanya / hızlı gönderim).',
          }
        : {
            title: 'Mesaj yok',
            description: 'Gönderim veya gelen mesaj olunca sohbetler burada görünür.',
          }

  return (
    <SplitPane
      listPaneClassName={activePhone ? 'is-hidden-mobile' : undefined}
      detailPaneClassName={activePhone ? undefined : 'is-hidden-mobile'}
      list={
        <div className="flex min-h-0 flex-1 flex-col">
          <CardHeader
            title="Sohbetler"
            subtitle={`${list.length} kişi`}
            action={
              <div className="flex flex-wrap items-center justify-end gap-1">
                <FilterChip href={hrefFor({ tel: activePhone, tab: 'tum', date: dateRange })} active={tab === 'tum'}>
                  Tümü ({allCount})
                </FilterChip>
                <FilterChip
                  href={hrefFor({ tel: activePhone, tab: 'giden', date: dateRange })}
                  active={tab === 'giden'}
                >
                  Cevapsız ({outboundCount})
                </FilterChip>
                <button
                  type="button"
                  aria-label="Zaman filtresi"
                  aria-expanded={timeOpen}
                  title="Zaman filtresi"
                  onClick={() => {
                    setTimeOpen((value) => !value)
                    setSearchOpen(false)
                    setMenuOpen(false)
                  }}
                  className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
                >
                  <Icon name="clock" className="size-4" />
                  {dateRange !== 'tum' ? (
                    <span className="absolute right-1 top-1 size-1.5 rounded-full bg-accent" aria-hidden />
                  ) : null}
                </button>
                <button
                  type="button"
                  aria-label="Ara"
                  aria-expanded={searchOpen}
                  title="Ara"
                  onClick={() => {
                    setSearchOpen((value) => !value)
                    setTimeOpen(false)
                    setMenuOpen(false)
                  }}
                  className="relative inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
                >
                  <Icon name="search" className="size-4" />
                  {search.trim() ? (
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
                      setTimeOpen(false)
                      setSearchOpen(false)
                    }}
                    className="inline-flex size-8 items-center justify-center rounded-full border border-hairline bg-surface text-ink hover:bg-canvas"
                  >
                    <Icon name="ellipsis" className="size-4" />
                  </button>
                  {menuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 z-30 mt-1 min-w-[12.5rem] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
                    >
                      <Link
                        href="/ayarlar/engellenenler"
                        role="menuitem"
                        className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Icon name="shield" className="size-4 text-ink-muted" />
                        Engellenenler
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
            }
          />
          {timeOpen || searchOpen ? (
            <div className="border-b border-hairline px-3 py-2">
              {timeOpen ? (
                <Toolbar className={searchOpen ? 'mb-2' : '!mb-0'}>
                  {(
                    [
                      ['tum', 'Tümü'],
                      ['bugun', 'Bugün'],
                      ['dun', 'Dün'],
                      ['7gun', 'Son 7 gün'],
                    ] as const
                  ).map(([id, label]) => (
                    <FilterChip
                      key={id}
                      href={hrefFor({ tel: activePhone, tab, date: id })}
                      active={dateRange === id}
                    >
                      {label}
                    </FilterChip>
                  ))}
                </Toolbar>
              ) : null}
              {searchOpen ? (
                <div className="relative">
                  <Input
                    ref={searchRef}
                    aria-label="Sohbetlerde ara"
                    type="text"
                    placeholder="İsim, numara veya mesaj ara…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className={search ? 'pr-9' : undefined}
                  />
                  {search ? (
                    <button
                      type="button"
                      aria-label="Aramayı temizle"
                      title="Temizle"
                      onClick={() => {
                        setSearch('')
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
          {visibleList.length === 0 ? (
            <EmptyState
              tone="inbox"
              title={search ? 'Sohbet bulunamadı' : emptyCopy.title}
              description={search ? 'Başka bir numara veya kelimeyle arayın.' : emptyCopy.description}
            />
          ) : (
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
              {visibleList.map((item, index) => {
                const active = item.phone === activePhone
                const displayName = threadDisplayName(item)
                return (
                  <li
                    key={item.phone}
                    className={`wb-row-enter${flashPhone === item.phone ? ' wb-row-flash' : ''}`}
                    style={{ animationDelay: `${Math.min(index, 10) * 24}ms` }}
                  >
                    <a
                      href={hrefFor({ tel: item.phone, tab, date: dateRange })}
                      onPointerDown={() => {
                        void prefetchThread(item.phone)
                      }}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                          return
                        }
                        event.preventDefault()
                        void openChat(item.phone)
                      }}
                      className={`wb-list-row block rounded-[var(--radius-sm)] px-3.5 py-2.5 transition-colors hover:bg-surface-raised ${
                        active
                          ? 'border border-accent/25 bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent)]'
                          : 'border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold tabular ${
                            item.lastDirection === 'out'
                              ? 'border-accent/25 bg-accent-soft text-accent-dim'
                              : item.isReply
                                ? 'border-accent/25 bg-accent-soft text-accent-dim'
                                : 'border-ok/30 bg-ok-soft text-ok-dim'
                          }`}
                          aria-hidden
                        >
                          {phoneMark(item.phone)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate text-[13px] font-medium">
                              {displayName ? (
                                <>
                                  <span>{displayName}</span>
                                  <span className="ml-1.5 font-mono text-[12px] font-normal tabular text-ink-muted">
                                    {item.missingPhone
                                      ? item.phone.replace(/@lid$/, '')
                                      : item.phone}
                                  </span>
                                </>
                              ) : (
                                <span className="font-mono tabular">
                                  {item.missingPhone
                                    ? item.phone.replace(/@lid$/, '')
                                    : item.phone}
                                </span>
                              )}
                            </p>
                            <span className="shrink-0 text-[11px] text-ink-faint">
                              {timeFormat.format(new Date(item.lastAt))}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
                            {previewLine(item)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-faint">
                            {item.accountLabel ? <span>{item.accountLabel}</span> : null}
                            {item.missingPhone ? (
                              <span className="rounded-sm border border-hairline bg-surface-raised px-1.5 py-px text-[10.5px]">
                                numara yok
                              </span>
                            ) : null}
                            {item.lastDirection === 'out' ? (
                              <span className="rounded-sm border border-accent/30 bg-accent-soft px-1.5 py-px text-[10.5px] font-semibold text-accent">
                                giden
                              </span>
                            ) : (
                              <span className="rounded-sm border border-ok/30 bg-ok-soft px-1.5 py-px text-[10.5px] font-semibold text-ok-dim">
                                gelen
                              </span>
                            )}
                            {item.isReply ? (
                              <span className="rounded-sm border border-accent/30 bg-accent-soft px-1.5 py-px text-[10.5px] font-semibold text-accent">
                                yanıt
                              </span>
                            ) : null}
                            {item.outboundOnly ? (
                              <span className="rounded-sm border border-hairline bg-surface-raised px-1.5 py-px text-[10.5px]">
                                bekliyor
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </a>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      }
      detail={
        <div className="flex h-full min-h-0 flex-1 flex-col">
          {activePhone ? (
            <>
              <CardHeader
                className="wb-chat-header"
                leading={
                  <>
                    <button
                      type="button"
                      aria-label="Tüm sohbetler"
                      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink hover:bg-white/70 lg:hidden"
                      onClick={closeChat}
                    >
                      <Icon name="back" className="size-4" />
                    </button>
                    <span className="wb-chat-avatar" aria-hidden>
                      {phoneMark(activePhone)}
                    </span>
                  </>
                }
                title={
                  threadDisplayName(selectedPreview ?? {}) ??
                  (selectedPreview?.missingPhone
                    ? activePhone.replace(/@lid$/, '')
                    : activePhone)
                }
                subtitle={
                  selectedPreview?.missingPhone
                    ? 'Numara okunamadı — yalnızca görüntüleme'
                    : [
                        threadDisplayName(selectedPreview ?? {}) ? activePhone : null,
                        selectedPreview?.accountLabel
                          ? `Hat: ${selectedPreview.accountLabel}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Konuşma geçmişi'
                }
                action={
                  activePhone.startsWith('+') ? (
                    <div className="relative shrink-0" ref={threadMenuRef}>
                      <button
                        type="button"
                        aria-label="Diğer"
                        aria-haspopup="menu"
                        aria-expanded={threadMenuOpen}
                        title="Diğer"
                        disabled={pending}
                        onClick={() => setThreadMenuOpen((value) => !value)}
                        className="inline-flex size-8 items-center justify-center rounded-full text-ink hover:bg-white/70 disabled:opacity-50"
                      >
                        <Icon name="ellipsis" className="size-4" />
                      </button>
                      {threadMenuOpen ? (
                        <div
                          role="menu"
                          className="absolute right-0 z-30 mt-1 min-w-[12.5rem] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            disabled={pending}
                            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas disabled:opacity-50"
                            onClick={() => {
                              setThreadMenuOpen(false)
                              block()
                            }}
                          >
                            <Icon name="shield" className="size-4 text-ink-muted" />
                            {pending ? 'Ekleniyor…' : 'İstemeyenlere al'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null
                }
              />

              {(notice || error) && (
                <div className="space-y-2 border-b border-hairline px-3.5 py-2.5">
                  {notice ? <Notice tone="accent">{notice}</Notice> : null}
                  {error ? <Notice tone="danger">{error}</Notice> : null}
                </div>
              )}

              {liveThread.length === 0 ? (
                <div className="wb-chat-thread">
                  <p className="wb-chat-empty">
                    {dateRange === 'tum'
                      ? 'Bu konuşmada henüz mesaj yok.'
                      : 'Bu tarih aralığında mesaj yok. Tümü’ne geçerek tüm konuşmayı görün.'}
                  </p>
                </div>
              ) : (
                <div className="wb-chat-thread" role="log" aria-live="polite" aria-relevant="additions">
                  {liveThread.map((row) => {
                    const outgoing = row.direction === 'out'
                    const hat =
                      row.account_id && labels[row.account_id]
                        ? labels[row.account_id]
                        : null
                    const caption = row.campaign_id
                      ? ['Kampanya', row.campaignName, hat].filter(Boolean).join(' · ')
                      : hat && !outgoing
                        ? hat
                        : null
                    const pendingSend =
                      outgoing &&
                      (row.status === 'pending' || row.status === 'queued' || row.status === 'sending')
                    const failedSend = outgoing && (row.status === 'failed' || row.status === 'skipped')
                    const ticks = tickMark(row.status)
                    return (
                      <div
                        key={row.clientKey ?? `log-${row.id}`}
                        className={`wb-chat-row ${outgoing ? 'wb-chat-row--out' : 'wb-chat-row--in'}`}
                      >
                        <div className="wb-chat-col">
                          <div
                            className={`wb-chat-bubble ${
                              outgoing ? 'wb-chat-bubble--out' : 'wb-chat-bubble--in'
                            }`}
                          >
                            {caption ? <p className="wb-chat-bubble-caption">{caption}</p> : null}
                            <p className="wb-chat-bubble-body">
                              {row.body ?? `(${row.message_type})`}
                              <span className="wb-chat-bubble-meta">
                                <time dateTime={row.created_at}>
                                  {bubbleTime.format(new Date(row.created_at))}
                                </time>
                                {outgoing ? (
                                  <span
                                    className={`wb-chat-ticks ${tickTone(row.status)}`}
                                    title={
                                      pendingSend ? 'Gönderiliyor' : failedSend ? 'Gönderilemedi' : undefined
                                    }
                                    aria-hidden
                                  >
                                    {pendingSend ? <Icon name="clock" className="size-3" /> : ticks}
                                  </span>
                                ) : null}
                              </span>
                            </p>
                          </div>
                          {pendingSend ? (
                            <p className="wb-chat-send-hint">Gönderiliyor…</p>
                          ) : failedSend ? (
                            <p className="wb-chat-send-hint is-fail">Gönderilemedi</p>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={threadEndRef} aria-hidden className="h-px shrink-0" />
                </div>
              )}
              {activePhone.startsWith('+') &&
              (selectedPreview?.accountId || liveThread.at(-1)?.account_id) ? (
                <div className="wb-chat-composer">
                  <ReplyForm
                    key={activePhone}
                    phone={activePhone}
                    accountId={(selectedPreview?.accountId || liveThread.at(-1)?.account_id)!}
                    onQueued={(body, clientKey) => {
                      const msg = {
                        id: 0,
                        clientKey,
                        account_id: selectedPreview?.accountId || liveThread.at(-1)?.account_id || null,
                        direction: 'out',
                        phone_e164: activePhone,
                        remote_jid: null,
                        message_type: 'text',
                        body,
                        status: 'pending',
                        created_at: new Date().toISOString(),
                        campaign_id: null,
                      }
                      setLiveThread((current) => {
                        const next = mergeThread(current, msg)
                        threadMemo.current.set(activePhone, next)
                        return next
                      })
                      setList((current) => {
                        const rest = current.filter((item) => item.phone !== activePhone)
                        const prev = current.find((item) => item.phone === activePhone)
                        return [
                          {
                            phone: activePhone,
                            contactName: prev?.contactName ?? null,
                            pushName: prev?.pushName ?? null,
                            lastBody: body,
                            lastAt: msg.created_at,
                            lastDirection: 'out',
                            messageType: 'text',
                            accountId: msg.account_id,
                            accountLabel: prev?.accountLabel ?? null,
                            isReply: Boolean(prev?.isReply),
                            outboundOnly: !prev?.isReply,
                            missingPhone: Boolean(prev?.missingPhone),
                          },
                          ...rest,
                        ]
                      })
                      rememberCache(activePhone, msg)
                    }}
                    onUpdate={(clientKey, patch) => {
                      const apply = (rows: ChatMessage[]) =>
                        rows.map((row) => (row.clientKey === clientKey ? { ...row, ...patch } : row))
                      for (const [phone, rows] of threadMemo.current) {
                        if (rows.some((row) => row.clientKey === clientKey)) {
                          threadMemo.current.set(phone, apply(rows))
                        }
                      }
                      setLiveThread((current) => apply(current))
                    }}
                  />
                </div>
              ) : (
                <p className="wb-chat-composer p-3.5 text-[12px] text-ink-muted">
                  Yanıt verebilmek için bu konuşmanın telefon numarası ve hattı belirlenmiş olmalı.
                </p>
              )}
            </>
          ) : (
            <EmptyState
              tone="inbox"
              title="Bir sohbet seçin"
              description="Soldan bir sohbet seçerek gelen ve giden mesajları birlikte görün."
            />
          )}
        </div>
      }
    />
  )
}
