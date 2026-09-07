import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Card,
  CardHeader,
  Notice,
  PageHeader,
  StatStrip,
} from '@/components/ui'
import { requirePlatformAdmin } from '@/lib/org'
import { AdminOrgList, type AdminOrgRow } from './admin-org-list'
import { ProvisionCustomerForm } from './admin-ops-forms'

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

type OverviewAccount = {
  id: string
  org_id: string
  status: string
  is_locked: boolean
}

type Overview = {
  organizations?: OverviewOrg[]
  accounts?: OverviewAccount[]
  workers?: { worker_id: string; alive?: boolean; live?: number }[]
  jobs?: { id: number; status: string; type: string; org_id?: string }[]
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
  const members = orgs.reduce((sum, org) => sum + (org.member_count ?? 0), 0)
  const suspended = orgs.filter((o) => o.suspended_at).length

  const orgRows: AdminOrgRow[] = orgs.map((org) => {
    const orgAccounts = accounts.filter((a) => a.org_id === org.id)
    return {
      ...org,
      connected: orgAccounts.filter((a) => a.status === 'connected').length,
      accountsTotal: orgAccounts.length,
      locked: orgAccounts.filter((a) => a.is_locked).length,
    }
  })

  return (
    <>
      <PageHeader
        title="Süper admin"
        description={`${orgs.length} işletme · ${connected} bağlı hat · kontrol burada`}
        action={
          <Link
            href="/ozet"
            className="text-[13px] text-accent underline-offset-2 hover:underline"
          >
            Aktif işletme →
          </Link>
        }
      />

      <StatStrip
        items={[
          { label: 'İşletme', value: orgs.length },
          { label: 'Üye', value: members },
          {
            label: 'Hat',
            value: `${connected}/${accounts.length}`,
            tone: connected > 0 ? 'ok' : 'default',
          },
          {
            label: 'Kilit',
            value: locked,
            tone: locked > 0 ? 'danger' : 'default',
          },
          {
            label: 'Askı',
            value: suspended,
            tone: suspended > 0 ? 'danger' : 'default',
          },
          { label: 'Worker', value: workers.length },
        ]}
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
        <AdminOrgList orgs={orgRows} />
        <Card>
          <CardHeader title="Yeni müşteri" subtitle="Davet + işletme + kota" />
          <div className="p-3.5">
            <ProvisionCustomerForm />
          </div>
        </Card>
      </div>

      {jobs.length > 0 ? (
        <Card className="mt-2.5">
          <CardHeader title="Son işler" subtitle="Kuyruk" />
          <ul className="divide-y divide-hairline text-[12px]">
            {jobs.slice(0, 16).map((job) => (
              <li key={job.id} className="flex justify-between gap-2 px-3.5 py-2 text-ink-muted">
                <span className="truncate">
                  #{job.id} · {job.type}
                  {job.org_id ? (
                    <>
                      {' · '}
                      <Link
                        href={`/admin/${job.org_id}`}
                        className="text-accent underline-offset-2 hover:underline"
                      >
                        org
                      </Link>
                    </>
                  ) : null}
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
