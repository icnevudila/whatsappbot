'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  CardHeader,
  EmptyState,
  FilterChip,
  Input,
  Notice,
  PageHeader,
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
  media_url?: string | null
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
export type MessagesDateRange = 'tum' | 'bugun' | 'dun' | '7gun' | string

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

const AVATAR_COLORS = ['#00a884', '#53bdeb', '#e17076', '#7bc862', '#a586e8', '#f5c26b', '#00a5f4', '#ff8a65']

function avatarColor(phone: string) {
  let hash = 0
  for (let i = 0; i < phone.length; i += 1) hash = (hash * 31 + phone.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function avatarLetters(name: string | null, phone: string) {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toLocaleUpperCase('tr-TR')
    return name.slice(0, 2).toLocaleUpperCase('tr-TR')
  }
  return phoneMark(phone)
}

function formatInboxTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startThat = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000)
  if (diffDays === 0) {
    return new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' }).format(date)
  }
  if (diffDays === 1) return 'Dün'
  if (diffDays > 1 && diffDays < 7) {
    return new Intl.DateTimeFormat('tr-TR', { weekday: 'long' }).format(date)
  }
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit',
  }).format(date)
}

function previewLine(item: ThreadPreview): string {
  const typeLabel: Record<string, string> = {
    sticker: 'Sticker',
    image: 'Fotoğraf',
    video: 'Video',
    audio: 'Ses',
    document: 'Belge',
  }
  if (!item.lastBody) return typeLabel[item.messageType] ?? `(${item.messageType})`
  return item.lastBody
}

function previewIcon(item: ThreadPreview): string | null {
  if (item.lastBody) return null
  const icons: Record<string, string> = {
    image: '📷',
    sticker: '🎨',
    video: '🎥',
    audio: '🎵',
    document: '📄',
  }
  return icons[item.messageType] ?? null
}

function formatPhoneDisplay(phone: string): string {
  if (phone.startsWith('+90') && phone.length === 13) {
    const n = phone.slice(3)
    return `0${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`
  }
  if (phone.endsWith('@lid')) return phone.replace(/@lid$/, '')
  return phone
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
  title = 'Mesajlar',
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
  title?: string
}) {
  const toast = useToast()
  const confirm = useConfirm()
  const [list, setList] = useState(previews)
  const [labels, setLabels] = useState(accountLabels)
  const [activePhone, setActivePhone] = useState(selectedPhone)
  const [liveThread, setLiveThread] = useState(thread)
  const [threadPhone, setThreadPhone] = useState(selectedPhone)
  const [threadLoading, setThreadLoading] = useState(false)
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
  const [transcribingId, setTranscribingId] = useState<number | string | null>(null)

  const handleTranscribeAudio = async (messageId: number | string, mediaUrl: string) => {
    if (transcribingId) return
    setTranscribingId(messageId)
    try {
      const res = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, mediaUrl }),
      })
      const json = await res.json()
      if (json.success && json.text) {
        setLiveThread((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, body: json.text } : msg)),
        )
        toast('Ses başarıyla metne çevrildi.', 'success')
      } else {
        toast(json.error || 'Ses çevrilemedi.', 'danger')
      }
    } catch {
      toast('Bağlantı hatası oluştu.', 'danger')
    } finally {
      setTranscribingId(null)
    }
  }

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
    if (activePhoneRef.current && selectedPhone !== activePhoneRef.current) {
      return
    }
    setActivePhone(selectedPhone)
    setLiveThread(thread)
    setThreadLoading(false)
    if (selectedPhone) {
      setThreadPhone(selectedPhone)
      threadMemo.current.set(selectedPhone, thread)
    } else {
      setThreadPhone(null)
    }
  }, [selectedPhone, thread])

  useEffect(() => {
    document.body.classList.add('wb-inbox-open')
    return () => document.body.classList.remove('wb-inbox-open')
  }, [])

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
    if (cached) {
      setLiveThread(cached)
      setThreadPhone(phone)
      setThreadLoading(false)
    } else {
      setLiveThread([])
      setThreadPhone(phone)
      setThreadLoading(true)
    }
    window.history.pushState({ tel: phone }, '', hrefFor({ tel: phone, tab, date: dateRange }))
    const rows = cached ?? (await (prefetchThread(phone) ?? Promise.resolve([])))
    if (gen !== openGen.current) return
    setLiveThread(rows)
    setThreadPhone(phone)
    setThreadLoading(false)
  }

  const closeChat = () => {
    openGen.current += 1
    setActivePhone(null)
    setThreadPhone(null)
    setLiveThread([])
    setThreadLoading(false)
    window.history.pushState({}, '', hrefFor({ tab, date: dateRange }))
  }

  useEffect(() => {
    const onPop = () => {
      const tel = telFromPath()
      setActivePhone(tel)
      if (!tel) {
        setLiveThread([])
        setThreadPhone(null)
        setThreadLoading(false)
        return
      }
      const cached = threadMemo.current.get(tel)
      if (cached) {
        setLiveThread(cached)
        setThreadPhone(tel)
        setThreadLoading(false)
        return
      }
      setLiveThread([])
      setThreadPhone(tel)
      setThreadLoading(true)
      void prefetchThread(tel)?.then((rows) => {
        if (telFromPath() === tel) {
          setLiveThread(rows)
          setThreadPhone(tel)
          setThreadLoading(false)
        }
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
      description: `${displayName} numarasını istemeyenler listesine eklemek istediğinize emin misiniz? Bu numaradan gelen mesajlar kaydedilmez ve Mesajlar listesinden kaldırılır.`,
      confirmLabel: 'Evet, ekle',
    }).then((ok) => {
      if (!ok) return
      setError(null)
      setNotice(null)
      const blockedPhone = activePhone
      startTransition(async () => {
        const result = await blacklistPhone(blockedPhone, 'Mesajlar\'dan eklendi')
        if (result.error) {
          setError(result.error)
          toast(result.error, 'danger')
          return
        }
        setList((current) => current.filter((item) => item.phone !== blockedPhone))
        threadMemo.current.delete(blockedPhone)
        closeChat()
        setNotice('İstemeyenlere eklendi. Mesajlar silindi; bundan sonra bu numara listede görünmez.')
        toast('İstemeyenlere eklendi.', 'success')
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
    <>
      <div className="wb-inbox-chrome">
        <PageHeader
          title={title}
          action={
            <div className="flex shrink-0 items-center">
              <button
                type="button"
                aria-label="Filtre"
                aria-expanded={timeOpen}
                title="Filtre"
                onClick={() => {
                  setTimeOpen((value) => !value)
                  setSearchOpen(false)
                  setMenuOpen(false)
                }}
                className="wb-wa-icon-btn relative"
              >
                <Icon name="tune" className="size-5" />
                {dateRange !== 'tum' || tab !== 'tum' ? (
                  <span className="wb-wa-icon-dot" aria-hidden />
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
                className="wb-wa-icon-btn relative"
              >
                <Icon name="search" className="size-5" />
                {search.trim() ? <span className="wb-wa-icon-dot" aria-hidden /> : null}
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
                  className="wb-wa-icon-btn"
                >
                  <Icon name="ellipsis" className="size-5" />
                </button>
                {menuOpen ? (
                  <div role="menu" className="wb-wa-menu">
                    <Link
                      href="/ayarlar/engellenenler"
                      role="menuitem"
                      className="wb-wa-menu-item"
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
          <div className="wb-inbox-tools">
            {timeOpen ? (
              <Toolbar>
                <FilterChip href={hrefFor({ tel: activePhone, tab: 'tum', date: dateRange })} active={tab === 'tum'}>
                  Tümü ({allCount})
                </FilterChip>
                <FilterChip
                  href={hrefFor({ tel: activePhone, tab: 'giden', date: dateRange })}
                  active={tab === 'giden'}
                >
                  Cevapsız ({outboundCount})
                </FilterChip>
                {(
                  [
                    ['tum', 'Tüm günler'],
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
                  className={`wb-wa-search${search ? ' pr-9' : ''}`}
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
      </div>
    <div className="wb-inbox-body">
    <SplitPane
      listPaneClassName={activePhone ? 'is-hidden-mobile' : undefined}
      detailPaneClassName={activePhone ? undefined : 'is-hidden-mobile'}
      list={
        <div className="flex min-h-0 flex-1 flex-col">
        {visibleList.length === 0 ? (
          <EmptyState
            tone="inbox"
            title={search ? 'Sohbet bulunamadı' : emptyCopy.title}
            description={search ? 'Başka bir numara veya kelimeyle arayın.' : emptyCopy.description}
          />
        ) : (
          <ul className="wb-inbox-list">
            {visibleList.map((item, index) => {
              const active = item.phone === activePhone
              const displayName = threadDisplayName(item)
              const unread = item.lastDirection === 'in'
              const title =
                displayName ||
                (item.missingPhone
                  ? item.phone.replace(/@lid$/, '')
                  : formatPhoneDisplay(item.phone))
              const mediaIcon = previewIcon(item)
              return (
                <li
                  key={item.phone}
                  className={`wb-row-enter${active ? ' is-selected' : ''}${flashPhone === item.phone ? ' wb-row-flash' : ''}`}
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
                    className={`wb-wa-row${active ? ' is-active' : ''}${unread ? ' is-unread' : ''}`}
                  >
                    <span
                      className="wb-wa-avatar"
                      style={{ background: avatarColor(item.phone) }}
                      aria-hidden
                    >
                      {avatarLetters(displayName, item.phone)}
                    </span>
                    <span className="wb-wa-row-main">
                      <span className="wb-wa-row-top">
                        <span className="wb-wa-name">{title}</span>
                        <span className={`wb-wa-time${unread ? ' is-unread' : ''}`}>
                          {formatInboxTime(item.lastAt)}
                        </span>
                      </span>
                      <span className="wb-wa-row-bottom">
                        <span className="wb-wa-preview">
                          {item.lastDirection === 'out' ? (
                            <span className="wb-wa-ticks" aria-hidden>
                              ✓✓
                            </span>
                          ) : null}
                          {mediaIcon ? (
                            <span className="wb-wa-preview-icon" aria-hidden>
                              {mediaIcon}
                            </span>
                          ) : null}
                          {previewLine(item)}
                        </span>
                        {item.accountLabel ? (
                          <span className="wb-wa-hat">{item.accountLabel}</span>
                        ) : unread ? (
                          <span className="wb-wa-unread-dot" aria-label="Okunmamış" />
                        ) : null}
                      </span>
                    </span>
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
                    <span
                      className="wb-chat-avatar"
                      style={{ background: avatarColor(activePhone) }}
                      aria-hidden
                    >
                      {avatarLetters(threadDisplayName(selectedPreview ?? {}), activePhone)}
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
                        className="inline-flex size-8 items-center justify-center rounded-full border border-[#e9edef] bg-white text-[#54656f] shadow-[0_1px_1px_rgba(11,20,26,0.04)] hover:border-[#d1d7db] hover:bg-white hover:text-[#111b21] disabled:opacity-50"
                      >
                        <Icon name="ellipsis" className="size-4" />
                      </button>
                      {threadMenuOpen ? (
                        <div role="menu" className="wb-wa-menu">
                          <button
                            type="button"
                            role="menuitem"
                            disabled={pending}
                            className="wb-wa-menu-item"
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

              {threadLoading || threadPhone !== activePhone ? (
                <div className="wb-chat-thread" role="status" aria-busy="true" aria-live="polite">
                  <p className="wb-chat-loading">
                    <span className="wb-chat-loading-dots" aria-hidden>
                      <span />
                      <span />
                      <span />
                    </span>
                    Mesajlar yükleniyor…
                  </p>
                </div>
              ) : liveThread.length === 0 ? (
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
                    const personName = threadDisplayName(selectedPreview ?? {})
                    const caption = row.campaign_id
                      ? ['Kampanya', row.campaignName, hat].filter(Boolean).join(' · ')
                      : !outgoing
                        ? personName
                        : null
                    const pendingSend =
                      outgoing &&
                      (row.status === 'pending' || row.status === 'queued' || row.status === 'sending')
                    const failedSend = outgoing && (row.status === 'failed' || row.status === 'skipped')
                    const ticks = tickMark(row.status)
                    const mediaUrl = typeof row.media_url === 'string' && row.media_url.trim() ? row.media_url.trim() : null
                    const typeFallback: Record<string, string> = {
                      image: 'Fotoğraf',
                      sticker: 'Sticker',
                      video: 'Video',
                      audio: 'Ses',
                      document: 'Belge',
                    }
                    const isAudioMsg = row.message_type === 'audio'
                    const bodyText =
                      isAudioMsg
                        ? null
                        : row.body && row.body !== '(görsel)'
                          ? row.body
                          : mediaUrl
                            ? null
                            : row.body ?? typeFallback[row.message_type] ?? `(${row.message_type})`
                    return (
                      <div
                        key={row.clientKey ?? `log-${row.id}`}
                        className={`wb-chat-row ${outgoing ? 'wb-chat-row--out' : 'wb-chat-row--in'}`}
                      >
                        <div className="wb-chat-col">
                          <div
                            className={`wb-chat-bubble ${
                              outgoing ? 'wb-chat-bubble--out' : 'wb-chat-bubble--in'
                            }${mediaUrl ? ' has-media' : ''}`}
                          >
                            {caption ? <p className="wb-chat-bubble-caption">{caption}</p> : null}
                            {mediaUrl ? (
                              row.message_type === 'video' ? (
                                <video
                                  src={mediaUrl}
                                  className="wb-chat-media"
                                  controls
                                  playsInline
                                  preload="metadata"
                                />
                              ) : row.message_type === 'document' ? (
                                <a
                                  href={mediaUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="flex items-center gap-2.5 p-2.5 my-1 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10 transition-colors border border-hairline/60 no-underline text-ink max-w-xs"
                                >
                                  <div className="size-9 rounded-md bg-danger/10 text-danger flex items-center justify-center font-bold text-[11px] shrink-0 border border-danger/20">
                                    PDF
                                  </div>
                                  <div className="flex flex-col min-w-0 flex-1">
                                    <span className="text-[12px] font-semibold truncate leading-tight">
                                      {row.body && row.body !== 'Belge' && row.body !== 'Fotoğraf' ? row.body : 'PDF Belgesi / Katalog'}
                                    </span>
                                    <span className="text-[10.5px] text-ink-muted leading-tight mt-0.5">
                                      Görüntüle / İndir ↗
                                    </span>
                                  </div>
                                </a>
                              ) : row.message_type === 'audio' ? (
                                <div className="flex flex-col gap-1.5 my-1.5 min-w-[240px] max-w-xs">
                                  <audio
                                    src={mediaUrl}
                                    controls
                                    preload="metadata"
                                    className="w-full h-8"
                                  />
                                  {row.body && row.body !== 'Ses' && row.body !== '(ses)' && row.body !== 'Sesli Mesaj' ? (
                                    <div className="mt-1 p-2 rounded bg-black/5 dark:bg-white/5 border border-hairline/60 text-xs">
                                      <div className="flex items-center gap-1 font-semibold text-[10.5px] text-accent">
                                        <Icon name="sparkles" className="size-3 text-accent" />
                                        <span>Ses Metni (AI):</span>
                                      </div>
                                      <p className="mt-0.5 whitespace-pre-wrap leading-relaxed text-[12px] text-ink font-sans">{row.body}</p>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={transcribingId === row.id}
                                      onClick={() => handleTranscribeAudio(row.id, mediaUrl)}
                                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded bg-accent/10 hover:bg-accent/20 text-accent transition-colors self-start cursor-pointer border border-accent/20 mt-1"
                                    >
                                      {transcribingId === row.id ? (
                                        <>
                                          <span className="size-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                                          <span>Metne Çevriliyor…</span>
                                        </>
                                      ) : (
                                        <>
                                          <Icon name="sparkles" className="size-3" />
                                          <span>Metne Çevir (Ücretsiz)</span>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={mediaUrl} alt="" className="wb-chat-media" loading="lazy" />
                              )
                            ) : null}
                            <p className="wb-chat-bubble-body">
                              {bodyText}
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
                    lastInbound={
                      liveThread.filter((m) => m.direction === 'in').at(-1)?.body ||
                      selectedPreview?.lastBody ||
                      null
                    }
                    threadContext={liveThread
                      .slice(-6)
                      .map((m) => `${m.direction === 'in' ? 'Müşteri' : 'Temsilci'}: ${m.body || ''}`)
                      .join('\n')}
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
    </div>
    </>
  )
}
