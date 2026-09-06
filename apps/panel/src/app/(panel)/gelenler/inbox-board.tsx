'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, CardHeader, EmptyState, FilterChip, Input, Notice, SplitPane, StatusPill, Toolbar } from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { ReplyForm } from './reply-form'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { blacklistPhone } from '../kara-liste/actions'

export type InboxMessage = {
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
  lastBody: string | null
  lastAt: string
  messageType: string
  accountId: string | null
  accountLabel: string | null
  isReply?: boolean
  missingPhone?: boolean
}

export type InboxTab = 'tum' | 'yanitlar' | 'yeni'

const timeFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function hrefFor(opts: {
  tel?: string | null
  tab: InboxTab
  threadMode: 'gelen' | 'tam'
}) {
  const params = new URLSearchParams()
  params.set('sekme', opts.tab)
  params.set('konusma', opts.threadMode)
  if (opts.tel) params.set('tel', opts.tel)
  return `/gelenler?${params.toString()}`
}

/** Liste satırı için son 2 hane — soft avatar mark. */
function phoneMark(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length >= 2) return digits.slice(-2)
  return phone.replace(/@lid$/, '').slice(0, 2).toUpperCase() || '?'
}

export function InboxBoard({
  orgId,
  tab,
  threadMode,
  allCount,
  replyCount,
  newCount,
  previews,
  selectedPhone,
  thread,
  accountLabels,
}: {
  orgId: string
  tab: InboxTab
  threadMode: 'gelen' | 'tam'
  allCount: number
  replyCount: number
  newCount: number
  previews: ThreadPreview[]
  selectedPhone: string | null
  thread: InboxMessage[]
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
  const visibleList = list.filter(item => `${item.phone} ${item.lastBody ?? ''} ${item.accountLabel ?? ''}`.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')))

  useEffect(() => {
    setList(previews)
  }, [previews])

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' })
  }, [selectedPhone, thread.length, thread.at(-1)?.id])

  /**
   * Gelen/giden message_log satirlari sunucu props ile geliyor; Realtime'da
   * router.refresh() ile yeniliyoruz. INSERT yeni mesaj, UPDATE ise ACK/status.
   * Realtime kopsa bile hafif poll yedegi (sekme gorunurken) ayni yenilemeyi yapar.
   */
  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    const onMessageChange = (payload: { new: Record<string, unknown> }) => {
      const row = payload.new as InboxMessage
      if (row.direction !== 'in' && row.direction !== 'out') return
      router.refresh()
    }

    const channel = supabase
      .channel('gelenler-live')
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
      .subscribe((status, err) => {
        if (status !== 'SUBSCRIBED') {
          console.warn('[gelenler-live] realtime durumu:', status, err ?? '')
        }
      })

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
      const result = await blacklistPhone(selectedPhone, 'Gelenler’den eklendi')
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
      : tab === 'yeni'
        ? {
            title: 'Yeni gelen yok',
            description:
              'Henüz yazmadığınız numaralar veya telefonu çözülememiş (LID) sohbetler burada listelenir.',
          }
        : {
            title: 'Gelen yok',
            description: 'Bağlı hatlara mesaj gelince burada görünür.',
          }

  return (
    <SplitPane
      list={
        <div className={selectedPhone ? 'hidden lg:flex lg:min-h-0 lg:flex-col' : 'flex min-h-0 flex-col'}>
          <CardHeader
            title="Sohbetler"
            subtitle={`${list.length} kişi`}
          />
          <div className="border-b border-hairline px-3 py-2">
            <Toolbar className="mb-2">
              <FilterChip href={hrefFor({ tel: selectedPhone, tab: 'tum', threadMode })} active={tab === 'tum'}>
                Tümü ({allCount})
              </FilterChip>
              <FilterChip href={hrefFor({ tel: selectedPhone, tab: 'yanitlar', threadMode })} active={tab === 'yanitlar'}>
                Yanıtlar ({replyCount})
              </FilterChip>
              <FilterChip href={hrefFor({ tel: selectedPhone, tab: 'yeni', threadMode })} active={tab === 'yeni'}>
                Yeni ({newCount})
              </FilterChip>
            </Toolbar>
            <Input
              aria-label="Sohbetlerde ara"
              type="search"
              placeholder="Numara veya mesaj ara…"
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
              {visibleList.map((item) => {
                const active = item.phone === selectedPhone
                return (
                  <li key={item.phone}>
                    <Link
                      href={hrefFor({ tel: item.phone, tab, threadMode })}
                      className={`block rounded-[var(--radius-sm)] px-3.5 py-2.5 transition-colors hover:bg-surface-raised ${
                        active
                          ? 'border border-accent/25 bg-accent-soft shadow-[inset_3px_0_0_var(--color-accent)]'
                          : 'border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold tabular ${
                            item.isReply
                              ? 'border-accent/25 bg-accent-soft text-accent-dim'
                              : 'border-ok/30 bg-ok-soft text-ok-dim'
                          }`}
                          aria-hidden
                        >
                          {phoneMark(item.phone)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="truncate font-mono text-[13px] font-medium tabular">
                              {item.missingPhone ? item.phone.replace(/@lid$/, '') : item.phone}
                            </p>
                            <span className="shrink-0 text-[11px] text-ink-faint">
                              {timeFormat.format(new Date(item.lastAt))}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[12.5px] text-ink-muted">
                            {item.lastBody ?? `(${item.messageType})`}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11.5px] text-ink-faint">
                            {item.accountLabel ? <span>{item.accountLabel}</span> : null}
                            {item.missingPhone ? (
                              <span className="rounded-sm border border-hairline bg-surface-raised px-1.5 py-px text-[10.5px]">
                                numara yok
                              </span>
                            ) : null}
                            {item.isReply ? (
                              <span className="rounded-sm border border-accent/30 bg-accent-soft px-1.5 py-px text-[10.5px] font-semibold text-accent">
                                yanıt
                              </span>
                            ) : (
                              <span className="rounded-sm border border-warn/30 bg-[#fff8e8] px-1.5 py-px text-[10.5px] font-semibold text-warn">
                                yeni
                              </span>
                            )}
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
                href={hrefFor({ tab, threadMode })}
                className="border-b border-hairline px-3.5 py-2.5 text-[12.5px] font-medium text-accent lg:hidden"
              >
                ← Tüm sohbetler
              </Link>
              <CardHeader
                title={
                  selectedPreview?.missingPhone
                    ? selectedPhone.replace(/@lid$/, '')
                    : selectedPhone
                }
                subtitle={
                  selectedPreview?.missingPhone
                    ? 'Telefon çözülemedi (LID) · salt okuma'
                    : selectedPreview?.accountLabel
                      ? `Hat: ${selectedPreview.accountLabel}`
                      : 'Konuşma geçmişi'
                }
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={hrefFor({
                        tel: selectedPhone,
                        tab,
                        threadMode: threadMode === 'gelen' ? 'tam' : 'gelen',
                      })}
                      className="text-[11.5px] text-ink-muted underline decoration-hairline-strong underline-offset-2 hover:text-ink"
                    >
                      {threadMode === 'gelen' ? 'Tam konuşma' : 'Sadece gelen'}
                    </Link>
                    {selectedPhone.startsWith('+') ? (
                      <Button disabled={pending} onClick={block}>
                        {pending ? 'Ekleniyor…' : 'Kara listeye al'}
                      </Button>
                    ) : null}
                  </div>
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
              description="Soldan bir sohbet seçerek geçmişi okuyun ve yanıt verin."
            />
          )}
        </div>
      }
    />
  )
}
