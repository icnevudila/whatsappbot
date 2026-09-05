'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AccentLink,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Notice,
  QuietLink,
  StatusPill,
} from '@/components/ui'
import { WaMark } from '@/components/wa-mark'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { blacklistPhone } from '../kara-liste/actions'
import { InboxReplyForm } from './inbox-reply-form'

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
  waStatus?: string | null
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

function messageTypeLabel(type: string): string {
  switch (type) {
    case 'text':
      return 'metin'
    case 'image':
      return 'görsel'
    case 'video':
      return 'video'
    case 'document':
      return 'belge'
    case 'audio':
      return 'ses'
    case 'sticker':
      return 'çıkartma'
    default:
      return type || 'mesaj'
  }
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
  selectedPreview,
  selectedBlacklisted,
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
  selectedPreview: ThreadPreview | null
  selectedBlacklisted: boolean
  thread: InboxMessage[]
  accountLabels: Record<string, string>
}) {
  const router = useRouter()
  const [list, setList] = useState(previews)
  const [pending, startTransition] = useTransition()
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [blacklisted, setBlacklisted] = useState(selectedBlacklisted)

  useEffect(() => {
    setList(previews)
  }, [previews])

  useEffect(() => {
    setBlacklisted(selectedBlacklisted)
    setNotice(null)
    setError(null)
  }, [selectedPhone, selectedBlacklisted])

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
          // Gelenlerde canlı yenile; tam konuşmada gidenleri de yakala.
          if (row.direction === 'in' || threadMode === 'tam') {
            router.refresh()
          }
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, router, threadMode])

  const block = () => {
    if (!selectedPhone || !selectedPhone.startsWith('+')) {
      setError('Bu konuşmada geçerli telefon numarası yok; kara listeye eklenemedi.')
      return
    }
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const result = await blacklistPhone(selectedPhone, 'Gelenler’den eklendi')
      if (result.error) setError(result.error)
      else {
        setBlacklisted(true)
        setNotice('Kara listeye eklendi. Bundan sonra kampanya ve hızlı gönderim bu numarayı atlar.')
        router.refresh()
      }
    })
  }

  const emptyCopy =
    tab === 'yanitlar'
      ? {
          title: 'Henüz yanıt yok',
          description: 'Sizin yazdığınız numaralardan cevap gelince burada toplanır.',
          action: <AccentLink href="/hizli-gonderim">Hızlı gönderime git</AccentLink>,
        }
      : tab === 'yeni'
        ? {
            title: 'Henüz yeni gelen yok',
            description:
              'Henüz yazmadığınız numaralar veya telefonu bilinmeyen sohbetler burada listelenir.',
            action: <QuietLink href="/durum">Durum paneline bak</QuietLink>,
          }
        : {
            title: 'Henüz gelen yok',
            description: 'Bağlı hatlara mesaj gelince sohbetler burada görünür.',
            action: (
              <div className="flex flex-wrap justify-center gap-2">
                <AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>
                <QuietLink href="/durum">Durum</QuietLink>
              </div>
            ),
          }

  const threadSubtitle = (() => {
    const parts: string[] = []
    if (selectedPreview?.missingPhone) parts.push('Telefon çözülemedi')
    else if (selectedPreview?.accountLabel) parts.push(`Hat: ${selectedPreview.accountLabel}`)
    parts.push('salt okuma')
    if (threadMode === 'tam') parts.push('gidenler dahil')
    else parts.push('yalnız gelen')
    if (blacklisted) parts.push('kara listede')
    return parts.join(' · ')
  })()

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title="Sohbetler"
          subtitle={
            tab === 'yanitlar'
              ? `${list.length} yanıt · sizin yazdıklarınız`
              : tab === 'yeni'
                ? `${list.length} yeni · henüz yazılmamış`
                : `${list.length} sohbet`
          }
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
                title="Daha önce mesaj attığınız numaralardan gelenler"
              >
                Yanıtlar ({replyCount})
              </Link>
              <span className="text-ink-faint">·</span>
              <Link
                href={hrefFor({ tel: selectedPhone, tab: 'yeni', threadMode })}
                className={
                  tab === 'yeni' ? 'font-medium text-accent' : 'text-ink-muted hover:text-ink'
                }
                title="Henüz yazmadığınız numaralar veya çözülememiş sohbetler"
              >
                Yeni ({newCount})
              </Link>
            </div>
          }
        />
        {list.length === 0 ? (
          <EmptyState
            title={emptyCopy.title}
            description={emptyCopy.description}
            action={emptyCopy.action}
          />
        ) : (
          <ul className="max-h-[70vh] divide-y divide-hairline overflow-y-auto">
            {list.map((item) => {
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
                      <div className="flex min-w-0 items-center gap-1.5">
                        {!item.missingPhone && item.waStatus ? (
                          <WaMark status={item.waStatus} className="shrink-0" />
                        ) : null}
                        <p className="truncate font-mono text-[12.5px] tabular">
                          {item.missingPhone ? item.phone.replace(/@lid$/, '') : item.phone}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10.5px] text-ink-faint">
                        {timeFormat.format(new Date(item.lastAt))}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                      {item.lastBody ?? `(${messageTypeLabel(item.messageType)})`}
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-ink-faint">
                      {item.accountLabel ? <span>{item.accountLabel}</span> : null}
                      {item.missingPhone ? (
                        <span className="rounded-sm border border-hairline px-1 py-px text-[10px]">
                          numara yok
                        </span>
                      ) : null}
                      {item.isReply ? (
                        <span className="rounded-sm border border-accent/30 bg-accent/8 px-1 py-px text-[10px] text-accent">
                          yanıt
                        </span>
                      ) : (
                        <span className="rounded-sm border border-hairline px-1 py-px text-[10px]">
                          yeni
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card>
        {selectedPhone ? (
          <>
            <CardHeader
              title={
                selectedPreview?.missingPhone
                  ? selectedPhone.replace(/@lid$/, '')
                  : selectedPhone
              }
              subtitle={
                <span className="inline-flex flex-wrap items-center gap-2">
                  {!selectedPreview?.missingPhone && selectedPreview?.waStatus ? (
                    <WaMark status={selectedPreview.waStatus} showLabel />
                  ) : null}
                  <span>{threadSubtitle}</span>
                </span>
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
                    title={
                      threadMode === 'gelen'
                        ? 'Giden mesajları da göster'
                        : 'Yalnızca gelen mesajları göster'
                    }
                  >
                    {threadMode === 'gelen' ? 'Tam konuşma (gidenler dahil)' : 'Sadece gelen'}
                  </Link>
                  {selectedPhone.startsWith('+') ? (
                    blacklisted ? (
                      <QuietLink href="/kara-liste" className="text-[12px]">
                        Kara listede
                      </QuietLink>
                    ) : (
                      <Button disabled={pending} onClick={block}>
                        {pending ? 'Ekleniyor…' : 'Kara listeye al'}
                      </Button>
                    )
                  ) : null}
                </div>
              }
            />

            <div className="border-b border-hairline px-4 py-2 text-[11.5px] text-ink-muted">
              {threadMode === 'gelen' ? (
                <>
                  Salt okuma · yalnızca gelenler. Giden mesajlarınızı görmek için{' '}
                  <Link
                    href={hrefFor({ tel: selectedPhone, tab, threadMode: 'tam' })}
                    className="font-medium text-ink underline decoration-hairline-strong underline-offset-2"
                  >
                    Tam konuşma
                  </Link>
                  ’ya geçin.
                </>
              ) : (
                <>
                  Tam konuşma · gelen ve giden. Aşağıdan yanıt yazabilirsiniz.
                </>
              )}
            </div>

            <div className="border-b border-hairline px-4 py-3">
              <InboxReplyForm
                phone={selectedPhone}
                accountId={selectedPreview?.accountId ?? null}
              />
            </div>

            {(notice || error) && (
              <div className="space-y-2 border-b border-hairline px-4 py-3">
                {notice ? <Notice tone="accent">{notice}</Notice> : null}
                {error ? <Notice tone="danger">{error}</Notice> : null}
              </div>
            )}

            {thread.length === 0 ? (
              <EmptyState
                title="Henüz mesaj yok"
                description={
                  threadMode === 'tam'
                    ? 'Bu numara için gelen veya giden kayıt bulunamadı.'
                    : 'Bu numara için henüz gelen mesaj yok. Gidenler için Tam konuşma’ya geçin.'
                }
                action={
                  threadMode === 'gelen' ? (
                    <QuietLink
                      href={hrefFor({ tel: selectedPhone, tab, threadMode: 'tam' })}
                    >
                      Tam konuşmayı aç
                    </QuietLink>
                  ) : (
                    <QuietLink href="/hizli-gonderim">Hızlı gönderim</QuietLink>
                  )
                }
              />
            ) : (
              <div className="flex max-h-[70vh] flex-col gap-2 overflow-y-auto p-4">
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
                        <p className="whitespace-pre-wrap text-[12.5px] text-ink">
                          {row.body ?? `(${messageTypeLabel(row.message_type)})`}
                        </p>
                        <p className="mt-1 text-[10.5px] text-ink-faint">
                          {outgoing ? 'Giden' : 'Gelen'}
                          {row.account_id && accountLabels[row.account_id]
                            ? ` · ${accountLabels[row.account_id]}`
                            : ''}
                          {' · '}
                          {timeFormat.format(new Date(row.created_at))}
                          {row.campaign_id ? ' · kampanya' : ''}
                          {outgoing && row.status ? (
                            <>
                              {' · '}
                              <StatusPill status={row.status} />
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="Bir sohbet seçin"
            description="Soldan bir numaraya tıklayın. Varsayılan: yalnız gelenler; Tam konuşma’da gidenler de görünür."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <QuietLink href="/durum">Durum</QuietLink>
                <QuietLink href="/kara-liste">Kara liste</QuietLink>
                <QuietLink href="/hizli-gonderim">Hızlı gönderim</QuietLink>
              </div>
            }
          />
        )}
      </Card>
    </div>
  )
}
