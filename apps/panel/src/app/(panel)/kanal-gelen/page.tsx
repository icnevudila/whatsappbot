import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, PageHeader } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { ReplyForm } from './reply-form'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Kanal gelen kutusu' }

type MsgRow = {
  id: string
  channel: string
  direction: string
  text: string | null
  sender_id: string | null
  external_thread_id: string
  channel_account_id: string
  occurred_at: string
}

export default async function KanalGelenPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const { data } = await supabase
    .from('channel_messages' as 'message_log')
    .select(
      'id, channel, direction, text, sender_id, external_thread_id, channel_account_id, occurred_at',
    )
    .eq('org_id', org.id)
    .order('occurred_at', { ascending: false })
    .limit(100)

  const rows = (data ?? []) as unknown as MsgRow[]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kanal gelen kutusu"
        description="WhatsApp dışı kanallardan gelen/giden mesajlar (channel_messages)."
      />
      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted">Henüz kanal mesajı yok.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((row) => (
              <li key={row.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="font-semibold text-ink">{row.channel}</span>
                  <span>{row.direction}</span>
                  <span>{row.external_thread_id}</span>
                  <span>{new Date(row.occurred_at).toLocaleString('tr-TR')}</span>
                </div>
                <p className="mt-1 text-sm text-ink">{row.text || '—'}</p>
                {row.direction === 'inbound' ? (
                  <ReplyForm
                    channelAccountId={row.channel_account_id}
                    threadId={row.external_thread_id}
                    channel={row.channel}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
