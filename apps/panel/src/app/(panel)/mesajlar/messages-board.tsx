'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Button,
  CardHeader,
  EmptyState,
  FilterChip,
  Input,
  Notice,
  SplitPane,
  StatusPill,
  Toolbar,
} from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { blacklistPhone } from '../kara-liste/actions'
import { ReplyForm } from './reply-form'

export type ChatMessage = {
  id: number
  account_id: string | null
  direction: string
  phone_e164: string | null
  remote_jid: string | null
  message_type: string
  body: string | null
  status: string
  created_at: string
  campaign_id: string | null
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

export type MessagesTab = 'tum' | 'gelen' | 'giden' | 'yanitlar'

const timeFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function hrefFor(opts: { tel?: string | null; tab: MessagesTab }) {
  const params = new URLSearchParams()
  params.set('sekme', opts.tab)
  if (opts.tel) params.set('tel', opts.tel)
  return `/mesajlar?${params.toString()}`
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
  allCount,
  inboundCount,
  outboundCount,
  replyCount,
  previews,
  selectedPhone,
  thread,
  accountLabels,
}: {
  orgId: string
  tab: MessagesTab
  allCount: number
  inboundCount: number
  outboundCount: number
  replyCount: number
  previews: ThreadPreview[]
  selectedPhone: string | null
  thread: ChatMessage[]
  accountLabels: Record<string, string>
}) {
  const router = useRouter()
  const toast = useToast()
  const [list, setList] = useState(previews)
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const threadEndRef = useRef<HTMLDivElement>(null)
  useSyncBusy(pending, 'Kara listeye ekleniyor…')

  const visibleList = list.filter((item) =>
    `${item.contactName ?? ''} ${item.pushName ?? ''} ${item.phone} ${item.lastBody ?? ''} ${item.accountLabel ?? ''}`
      .toLocaleLowerCase('tr-TR')
      .includes(search.toLocaleLowerCase('tr-TR')),
  )

  useEffect(() => {
    setList(previews)
  }, [previews])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' })
  }, [selectedPhone, thread.length, thread.at(-1)?.id])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const onMessageChange = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as ChatMessage
      if (row.direction !== 'in' && row.direction !== 'out') return
      router.refresh()
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

    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh()
    }
    const timer = setInterval(tick, 18_000)

    return () => {
      clearInterval(timer)
      void supabase.removeChannel(channel)
    }
  }, [orgId, router])

  const selectedPreview = useMemo(
    () => list.find((item) => item.phone === selectedPhone) ?? null,
    [list, selectedPhone],
  )

  const block = () => {
    if (!selectedPhone || !selectedPhone.startsWith('+')) {
      setError('Bu konuşmada E.164 numara yok; kara listeye eklenemedi.')
      toast('Kara listeye eklenemedi — numara yok.', 'danger')
      return
    }
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await blacklistPhone(selectedPhone, 'Mesajlar’dan eklendi')
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
      } else {
        setNotice('Kara listeye eklendi. Bundan sonra kampanya bu numarayı atlar.')
        toast('Kara listeye eklendi.', 'success')
      }
    })
  }

  const emptyCopy =
    tab === 'yanitlar'
      ? {
          title: 'Yanıt yok',
          description: 'Sizin yazdığınız numaralardan yanıt gelince burada görünür.',
        }
      : tab === 'gelen'
        ? {
            title: 'Gelen yok',
            description: 'Son etkinliği gelen olan sohbetler burada listelenir.',
          }
        : tab === 'giden'
          ? {
              title: 'Giden yok',
              description: 'Son etkinliği sizin gönderiminiz olan sohbetler burada listelenir.',
            }
          : {
              title: 'Mesaj yok',
              description: 'Gönderim veya gelen mesaj olunca sohbetler burada görünür.',
            }

  return (
    <SplitPane
      list={
        <div className={selectedPhone ? 'hidden lg:flex lg:min-h-0 lg:flex-col' : 'flex min-h-0 flex-col'}>
          <CardHeader title="Sohbetler" subtitle={`${list.length} kişi`} />
          <div className="border-b border-hairline px-3 py-2">
            <Toolbar className="mb-2">
              <FilterChip href={hrefFor({ tel: selectedPhone, tab: 'tum' })} active={tab === 'tum'}>
                Tümü ({allCount})
              </FilterChip>
              <FilterChip href={hrefFor({ tel: selectedPhone, tab: 'gelen' })} active={tab === 'gelen'}>
                Gelen ({inboundCount})
              </FilterChip>
              <FilterChip href={hrefFor({ tel: selectedPhone, tab: 'giden' })} active={tab === 'giden'}>
                Giden ({outboundCount})
              </FilterChip>
              <FilterChip
                href={hrefFor({ tel: selectedPhone, tab: 'yanitlar' })}
                active={tab === 'yanitlar'}
              >
                Yanıtlar ({replyCount})
              </FilterChip>
            </Toolbar>
            <Input
              aria-label="Sohbetlerde ara"
              type="search"
              placeholder="İsim, numara veya mesaj ara…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          {visibleList.length === 0 ? (
            <EmptyState
              tone="inbox"
              title={search ? 'Sohbet bulunamadı' : emptyCopy.title}
              description={search ? 'Başka bir numara veya kelimeyle arayın.' : emptyCopy.description}
            />
          ) : (
            <ul className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-1.5">
              {visibleList.map((item, index) => {
                const active = item.phone === selectedPhone
                const displayName = threadDisplayName(item)
                return (
                  <li
                    key={item.phone}
                    className="wb-row-enter"
                    style={{ animationDelay: `${Math.min(index, 10) * 24}ms` }}
                  >
                    <Link
                      href={hrefFor({ tel: item.phone, tab })}
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
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      }
      detail={
        <div className={`flex min-h-0 flex-col ${selectedPhone ? '' : 'hidden lg:flex'}`}>
          {selectedPhone ? (
            <>
              <Link
                href={hrefFor({ tab })}
                className="border-b border-hairline px-3.5 py-2.5 text-[12.5px] font-medium text-accent lg:hidden"
              >
                ← Tüm sohbetler
              </Link>
              <CardHeader
                title={
                  threadDisplayName(selectedPreview ?? {}) ??
                  (selectedPreview?.missingPhone
                    ? selectedPhone.replace(/@lid$/, '')
                    : selectedPhone)
                }
                subtitle={
                  selectedPreview?.missingPhone
                    ? 'Telefon çözülemedi (LID) · salt okuma'
                    : [
                        threadDisplayName(selectedPreview ?? {}) ? selectedPhone : null,
                        selectedPreview?.accountLabel
                          ? `Hat: ${selectedPreview.accountLabel}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || 'Konuşma geçmişi'
                }
                action={
                  selectedPhone.startsWith('+') ? (
                    <Button disabled={pending} onClick={block}>
                      {pending ? 'Ekleniyor…' : 'Kara listeye al'}
                    </Button>
                  ) : null
                }
              />

              {(notice || error) && (
                <div className="space-y-2 border-b border-hairline px-3.5 py-2.5">
                  {notice ? <Notice tone="accent">{notice}</Notice> : null}
                  {error ? <Notice tone="danger">{error}</Notice> : null}
                </div>
              )}

              {thread.length === 0 ? (
                <EmptyState
                  tone="inbox"
                  title="Konuşma boş"
                  description="Bu numara için henüz kayıtlı mesaj yok."
                />
              ) : (
                <div className="wb-chat-thread" role="log" aria-live="polite" aria-relevant="additions">
                  {thread.map((row) => {
                    const outgoing = row.direction === 'out'
                    return (
                      <div
                        key={row.id}
                        className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`wb-chat-bubble ${
                            outgoing ? 'wb-chat-bubble--out' : 'wb-chat-bubble--in'
                          }`}
                        >
                          <p className="wb-chat-bubble-body">
                            {row.body ?? `(${row.message_type})`}
                          </p>
                          <p className="wb-chat-bubble-meta">
                            {outgoing ? 'Giden' : 'Gelen'}
                            {row.account_id && accountLabels[row.account_id]
                              ? ` · ${accountLabels[row.account_id]}`
                              : ''}
                            {' · '}
                            {timeFormat.format(new Date(row.created_at))}
                            {row.campaign_id ? ' · kampanya' : ''}
                          </p>
                          {outgoing ? (
                            <div className="mt-1">
                              <StatusPill status={row.status} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )
                  })}
                  <div ref={threadEndRef} aria-hidden className="h-px shrink-0" />
                </div>
              )}
              {selectedPhone.startsWith('+') &&
              (selectedPreview?.accountId || thread.at(-1)?.account_id) ? (
                <div className="wb-chat-composer">
                  <ReplyForm
                    key={selectedPhone}
                    phone={selectedPhone}
                    accountId={(selectedPreview?.accountId || thread.at(-1)?.account_id)!}
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
