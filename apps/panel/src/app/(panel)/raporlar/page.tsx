import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  QuietLink,
  Stat,
  StatusPill,
} from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'

export const metadata: Metadata = { title: 'Raporlar' }

export default async function ReportsPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [
    { data: campaigns },
    { count: sent },
    { count: delivered },
    { count: read },
    { count: failed },
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select(
        'id, name, status, total_targets, sent_count, failed_count, skipped_count, created_at',
      )
      .eq('org_id', org.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('direction', 'out')
      .in('status', ['sent', 'delivered', 'read'])
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('direction', 'out')
      .eq('status', 'delivered')
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('direction', 'out')
      .eq('status', 'read')
      .gte('created_at', monthStart.toISOString()),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('direction', 'out')
      .eq('status', 'failed')
      .gte('created_at', monthStart.toISOString()),
  ])

  const rows = campaigns ?? []

  return (
    <>
      <PageHeader
        title="Raporlar"
        description="Bu ay gönderim özeti ve kampanya tablosu. CSV dışa aktarım."
        action={
          <div className="flex flex-wrap gap-2">
            <a
              href="/api/raporlar/csv"
              className="inline-flex h-8 items-center justify-center rounded-[var(--radius-sm)] bg-accent px-3 text-[13px] font-medium text-accent-ink shadow-sm hover:bg-accent-dim"
            >
              CSV indir
            </a>
            <QuietLink href="/kampanyalar">Kampanyalar</QuietLink>
          </div>
        }
      />

      <div className="mb-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="p-3.5">
            <Stat label="Gönderilen" value={sent ?? 0} tone="accent" />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat label="Teslim" value={delivered ?? 0} tone="muted" />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat label="Okundu" value={read ?? 0} tone="muted" />
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <Stat
              label="Başarısız"
              value={failed ?? 0}
              tone={(failed ?? 0) > 0 ? 'danger' : 'muted'}
            />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Son kampanyalar" subtitle="En fazla 30 kayıt" />
        {rows.length === 0 ? (
          <EmptyState
            title="Henüz kampanya yok"
            description="İlk toplu gönderimi oluşturunca buraya düşer. Hızlı gönderim de kampanya olarak görünür."
            action={<AccentLink href="/kampanyalar">Kampanyalara git</AccentLink>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline text-[11.5px] text-ink-muted">
                  <th className="px-3.5 py-2 font-medium">Ad</th>
                  <th className="px-3.5 py-2 font-medium">Durum</th>
                  <th className="px-3.5 py-2 font-medium">Hedef</th>
                  <th className="px-3.5 py-2 font-medium">Gönderilen</th>
                  <th className="px-3.5 py-2 font-medium">Fail / Skip</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-hairline last:border-0">
                    <td className="px-3.5 py-2">
                      <Link
                        href={`/kampanyalar/${c.id}`}
                        className="font-medium text-ink underline-offset-2 hover:text-accent hover:underline"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="px-3.5 py-2 tabular">{c.total_targets}</td>
                    <td className="px-3.5 py-2 tabular">{c.sent_count}</td>
                    <td className="px-3.5 py-2 tabular text-ink-muted">
                      {c.failed_count}/{c.skipped_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}
