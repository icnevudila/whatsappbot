import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Card,
  CardHeader,
  Notice,
  PageHeader,
  StatusPill,
} from '@/components/ui'
import { requirePlatformAdmin } from '@/lib/org'

export const metadata = { title: 'Admin' }
export const dynamic = 'force-dynamic'

type OverviewOrg = {
  id: string
  name: string
  slug: string
  plan: string
  accounts_quota: number
  monthly_message_quota?: number
  suspended_at?: string | null
  member_count?: number
}

type Overview = {
  organizations?: OverviewOrg[]
  accounts?: { id: string; org_id: string; status: string; is_locked: boolean }[]
  workers?: { worker_id: string; alive?: boolean; live?: number }[]
  jobs?: { id: number; status: string; type: string }[]
}

export default async function AdminHomePage() {
  let overview: Overview = {}
  try {
    const { supabase } = await requirePlatformAdmin()
    const { data, error } = await supabase.rpc('admin_overview')
    if (error) throw error
    overview = (data ?? {}) as Overview
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_PLATFORM_ADMIN') {
      redirect('/ozet')
    }
    return (
      <>
        <PageHeader title="Admin" description="Platform konsolu" />
        <Notice tone="danger">
          {error instanceof Error ? error.message : 'admin_overview okunamadı.'} JWT’de
          app_metadata.platform_admin=true veya PLATFORM_ADMIN_EMAILS /
          profiles.is_platform_admin gerekir.
        </Notice>
      </>
    )
  }

  const orgs = overview.organizations ?? []
  const accounts = overview.accounts ?? []
  const workers = overview.workers ?? []
  const jobs = overview.jobs ?? []
  const connected = accounts.filter((a) => a.status === 'connected').length
  const locked = accounts.filter((a) => a.is_locked).length

  return (
    <>
      <PageHeader
        title="Süper admin"
        description="Tüm işletmeler, üyeler, kota ve hatlar. Müşteri paneli sade kalsın — burası senin."
      />

      <div className="mb-3 grid gap-2.5 sm:grid-cols-4">
        <Card>
          <div className="p-3.5">
            <p className="text-[11.5px] text-ink-faint">İşletme</p>
            <p className="mt-1 text-[22px] font-extrabold tabular">{orgs.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <p className="text-[11.5px] text-ink-faint">Hat (bağlı)</p>
            <p className="mt-1 text-[22px] font-extrabold tabular">
              {connected}/{accounts.length}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <p className="text-[11.5px] text-ink-faint">Kilitli hat</p>
            <p className="mt-1 text-[22px] font-extrabold tabular text-danger">{locked}</p>
          </div>
        </Card>
        <Card>
          <div className="p-3.5">
            <p className="text-[11.5px] text-ink-faint">Worker</p>
            <p className="mt-1 text-[22px] font-extrabold tabular">{workers.length}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="İşletmeler" subtitle={`${orgs.length} kayıt · detay için tıkla`} />
        {orgs.length === 0 ? (
          <p className="p-3.5 text-[13px] text-ink-muted">Henüz işletme yok.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/admin/${org.id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 transition-colors hover:bg-surface-raised"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-semibold text-ink">
                      {org.name}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-faint">
                      {org.slug} · {org.member_count ?? 0} üye · hat kotası{' '}
                      {org.accounts_quota}
                      {org.monthly_message_quota != null
                        ? ` · aylık ${org.monthly_message_quota}`
                        : ''}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {org.suspended_at ? <StatusPill status="stopped" /> : null}
                    <span className="rounded-sm border border-hairline px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-muted">
                      {org.plan}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {jobs.length > 0 ? (
        <Card className="mt-2.5">
          <CardHeader title="Son işler" subtitle="Kuyruk (özet)" />
          <ul className="divide-y divide-hairline text-[12px]">
            {jobs.slice(0, 12).map((job) => (
              <li key={job.id} className="flex justify-between gap-2 px-3.5 py-2 text-ink-muted">
                <span className="truncate">
                  #{job.id} · {job.type}
                </span>
                <span className="tabular">{job.status}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  )
}
