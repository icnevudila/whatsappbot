'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, Card, CardHeader, EmptyState, Notice } from '@/components/ui'
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
  related?: boolean
}

const timeFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function hrefFor(opts: {
  tel?: string | null
  tab: 'ilgili' | 'diger'
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
  relatedCount,
  otherCount,
  previews,
  selectedPhone,
  thread,
  accountLabels,
  initialInbound,
}: {
  orgId: string
  tab: 'ilgili' | 'diger'
  threadMode: 'gelen' | 'tam'
  relatedCount: number
  otherCount: number
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
          if (row.direction !== 'in') return
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

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title="Sohbetler"
          subtitle={`${list.length} kişi`}
          action={
            <div className="flex gap-1 text-[11.5px]">
              <Link
                href={hrefFor({ tel: selectedPhone, tab: 'ilgili', threadMode })}
                className={
                  tab === 'ilgili'
                    ? 'font-medium text-accent'
                    : 'text-ink-muted hover:text-ink'
                }
              >
                İlgili ({relatedCount})
              </Link>
              <span className="text-ink-faint">·</span>
              <Link
                href={hrefFor({ tel: selectedPhone, tab: 'diger', threadMode })}
                className={
                  tab === 'diger' ? 'font-medium text-accent' : 'text-ink-muted hover:text-ink'
                }
              >
                Diğer ({otherCount})
              </Link>
            </div>
          }
        />
        {list.length === 0 ? (
          <EmptyState
            title={tab === 'ilgili' ? 'İlgili gelen yok' : 'Diğer gelen yok'}
            description={
              tab === 'ilgili'
                ? 'Sizin yazdığınız numaralardan yanıt gelince burada görünür.'
                : 'Kampanya dışı / kişisel gelenler burada listelenir.'
            }
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
                      <p className="truncate font-mono text-[12.5px] tabular">{item.phone}</p>
                      <span className="shrink-0 text-[10.5px] text-ink-faint">
                        {timeFormat.format(new Date(item.lastAt))}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-ink-muted">
                      {item.lastBody ?? `(${item.messageType})`}
                    </p>
                    {item.accountLabel ? (
                      <p className="mt-0.5 text-[11px] text-ink-faint">{item.accountLabel}</p>
                    ) : null}
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
              title={selectedPhone}
              subtitle={
                selectedPreview?.accountLabel
                  ? `Hat: ${selectedPreview.accountLabel} · salt okuma`
                  : 'Salt okuma gelen kutusu'
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
            description="Soldan bir numaraya tıklayın. Varsayılan olarak yalnız gelen mesajlar gösterilir."
          />
        )}
      </Card>

      <span className="hidden" aria-hidden>
        {initialInbound.length}
      </span>
    </div>
  )
}
