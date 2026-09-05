import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Card, CardHeader, PageHeader, QuietLink } from '@/components/ui'
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

  const [{ data: campaigns }, { count: sent }, { count: delivered }, { count: read }, { count: failed }] =
    await Promise.all([
      supabase
        .from('campaigns')
        .select('id, name, status, total_targets, sent_count, failed_count, skipped_count, created_at')
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

  return (
    <>
      <PageHeader
        title="Raporlar"
        description="Bu ay gönderim özeti ve kampanya tablosu. CSV dışa aktarım."
        action={
          <div className="flex gap-2">
            <a
              href="/api/raporlar/csv"
              className="inline-flex h-8 items-center rounded-[var(--radius-sm)] bg-accent px-3 text-[13px] font-medium text-accent-ink"
            >
              CSV indir
            </a>
            <QuietLink href="/kampanyalar">Kampanyalar</QuietLink>
          </div>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        {[
          ['Gönderilen', sent ?? 0],
          ['Teslim', delivered ?? 0],
          ['Okundu', read ?? 0],
          ['Başarısız', failed ?? 0],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-[10px] border border-hairline bg-surface px-4 py-3 shadow-[var(--shadow-card)]"
          >
            <p className="text-[11.5px] text-ink-muted">{label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular">{value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Son kampanyalar" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[12.5px]">
            <thead>
              <tr className="border-b border-hairline text-[11.5px] text-ink-muted">
                <th className="px-4 py-2">Ad</th>
                <th className="px-4 py-2">Durum</th>
                <th className="px-4 py-2">Hedef</th>
                <th className="px-4 py-2">Gönderilen</th>
                <th className="px-4 py-2">Fail/Skip</th>
              </tr>
            </thead>
            <tbody>
              {(campaigns ?? []).map((c) => (
                <tr key={c.id} className="border-b border-hairline last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/kampanyalar/${c.id}`} className="font-medium underline-offset-2 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{c.status}</td>
                  <td className="px-4 py-2.5 tabular">{c.total_targets}</td>
                  <td className="px-4 py-2.5 tabular">{c.sent_count}</td>
                  <td className="px-4 py-2.5 tabular text-ink-muted">
                    {c.failed_count}/{c.skipped_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}
