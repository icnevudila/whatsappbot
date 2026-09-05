'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Card, CardHeader, EmptyState, Input, Notice, StatusPill } from '@/components/ui'
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
  initialInbound,
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
  initialInbound: InboxMessage[]
}) {
  const router = useRouter()
  const [list, setList] = useState(previews)
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const visibleList = list.filter(item => `${item.phone} ${item.lastBody ?? ''} ${item.accountLabel ?? ''}`.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')))

  useEffect(() => {
    setList(previews)
  }, [previews])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
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
        (payload) => {
          const row = payload.new as InboxMessage
          if (row.direction !== 'in' && row.direction !== 'out') return
          router.refresh()
        },
      )
      .subscribe()

    return () => {
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
      return
    }
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await blacklistPhone(selectedPhone, 'Gelenler’den eklendi')
      if (result.error) setError(result.error)
      else setNotice('Kara listeye eklendi. Bundan sonra kampanya bu numarayı atlar.')
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
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className={selectedPhone ? 'hidden lg:block' : ''}>
        <CardHeader
          title="Sohbetler"
          subtitle={`${list.length} kişi`}
          action={
            <div className="flex flex-wrap gap-1 text-[11.5px]">
              <Link
                href={hrefFor({ tel: selectedPhone, tab: 'tum', threadMode })}
                className={
                  tab === 'tum' ? 'font-medium text-accent' : 'text-ink-muted hover:text-ink'
                }
              >
                Tümü ({allCount})
              </Link>
              <span className="text-ink-faint">·</span>
              <Link
                href={hrefFor({ tel: selectedPhone, tab: 'yanitlar', threadMode })}
                className={
                  tab === 'yanitlar'
                    ? 'font-medium text-accent'
                    : 'text-ink-muted hover:text-ink'
                }
              >
                Yanıtlar ({replyCount})
              </Link>
              <span className="text-ink-faint">·</span>
              <Link
                href={hrefFor({ tel: selectedPhone, tab: 'yeni', threadMode })}
                className={
                  tab === 'yeni' ? 'font-medium text-accent' : 'text-ink-muted hover:text-ink'
                }
              >
                Yeni ({newCount})
              </Link>
            </div>
          }
        />
        <div className="border-b border-hairline p-3"><Input aria-label="Sohbetlerde ara" type="search" placeholder="Numara veya mesaj ara…" value={search} onChange={event => setSearch(event.target.value)} /></div>
        {visibleList.length === 0 ? (
          <EmptyState title={search ? 'Sohbet bulunamadı' : emptyCopy.title} description={search ? 'Başka bir numara veya kelimeyle arayın.' : emptyCopy.description} />
        ) : (
          <ul className="max-h-[70vh] divide-y divide-hairline overflow-y-auto">
            {visibleList.map((item) => {
              const active = item.phone === selectedPhone
              return (
                <li key={item.phone}>
                  <Link
                    href={hrefFor({ tel: item.phone, tab, threadMode })}
                    className={`block px-4 py-3 transition-colors hover:bg-surface-raised ${
                      active ? 'bg-accent-soft' : ''
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate font-mono text-[12.5px] tabular">
                        {item.missingPhone ? item.phone.replace(/@lid$/, '') : item.phone}
                      </p>
                      <span className="shrink-0 text-[10.5px] text-ink-faint">
                        {timeFormat.format(new Date(item.lastAt))}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                      {item.lastBody ?? `(${item.messageType})`}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                      {item.accountLabel ? <span>{item.accountLabel}</span> : null}
                      {item.missingPhone ? (
                        <span className="rounded-sm border border-hairline px-1 py-px text-[10px]">
                          numara yok
                        </span>
                      ) : null}
                      {item.isReply ? (
                        <span className="text-[10px] text-accent">yanıt</span>
                      ) : null}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className={selectedPhone ? 'flex min-w-0 flex-col' : 'hidden lg:block'}>
        {selectedPhone ? (
          <>
            <Link href={hrefFor({ tab, threadMode })} className="border-b border-hairline px-4 py-3 text-sm text-accent lg:hidden">← Tüm sohbetler</Link>
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
              <div className="space-y-2 border-b border-hairline px-4 py-3">
                {notice ? <Notice tone="accent">{notice}</Notice> : null}
                {error ? <Notice tone="danger">{error}</Notice> : null}
              </div>
            )}

            {thread.length === 0 ? (
              <EmptyState
                title="Konuşma boş"
                description="Bu numara için henüz kayıtlı mesaj yok."
              />
            ) : (
              <div className="flex max-h-[55vh] min-h-48 flex-col gap-3 overflow-y-auto bg-canvas/50 p-5">
                {thread.map((row) => {
                  const outgoing = row.direction === 'out'
                  return (
                    <div
                      key={row.id}
                      className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-md border px-3 py-2 ${
                          outgoing
                            ? 'border-accent/25 bg-accent/10'
                            : 'border-hairline bg-canvas'
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-ink">
                          {row.body ?? `(${row.message_type})`}
                        </p>
                        <p className="mt-1 text-[10.5px] text-ink-faint">
                          {outgoing ? 'Giden' : 'Gelen'}
                          {row.account_id && accountLabels[row.account_id]
                            ? ` · ${accountLabels[row.account_id]}`
                            : ''}
                          {' · '}
                          {timeFormat.format(new Date(row.created_at))}
                          {row.campaign_id ? ' · kampanya' : ''}
                        </p>
                        {outgoing && <div className="mt-1.5"><StatusPill status={row.status} /></div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {selectedPhone.startsWith('+') && (selectedPreview?.accountId || thread.at(-1)?.account_id) ? <ReplyForm key={selectedPhone} phone={selectedPhone} accountId={(selectedPreview?.accountId || thread.at(-1)?.account_id)!} /> : <p className="border-t border-hairline p-4 text-xs text-ink-muted">Yanıt verebilmek için bu konuşmanın telefon numarası ve hattı belirlenmiş olmalı.</p>}
          </>
        ) : (
          <EmptyState
            title="Bir sohbet seçin"
            description="Soldan bir sohbet seçerek geçmişi okuyun ve yanıt verin."
          />
        )}
      </Card>

      <span className="hidden" aria-hidden>
        {initialInbound.length}
      </span>
    </div>
  )
}
