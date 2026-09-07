import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Card,
  CardHeader,
  Notice,
  PageHeader,
  StatStrip,
  StatusPill,
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
  label?: string | null
  phone_e164?: string | null
  lease_holder?: string | null
}

type OverviewWorker = {
  worker_id: string
  leased_accounts?: number
  max_sessions?: number
  live?: number
  alive?: boolean
  seen_at?: string
}

type OverviewScaler = {
  desired_workers?: number
  demand?: number
  alive_workers?: number
  capacity_per_worker?: number
  reason?: string | null
}

type Overview = {
  organizations?: OverviewOrg[]
  accounts?: OverviewAccount[]
  workers?: OverviewWorker[]
  scaler?: OverviewScaler
  jobs?: { id: number; status: string; type: string; org_id?: string; error?: string | null }[]
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
          {error instanceof Error ? error.message : 'admin_overview okunamadı.'}
        </Notice>
      </>
    )
  }

  const orgs = overview.organizations ?? []
  const accounts = overview.accounts ?? []
  const workers = overview.workers ?? []
  const scaler = overview.scaler ?? {}
  const jobs = overview.jobs ?? []
  const connected = accounts.filter((a) => a.status === 'connected').length
  const locked = accounts.filter((a) => a.is_locked).length
  const members = orgs.reduce((sum, org) => sum + (org.member_count ?? 0), 0)
  const suspended = orgs.filter((o) => o.suspended_at).length
  const aliveWorkers = workers.filter((w) => w.alive).length
  const leased = workers.reduce((s, w) => s + (w.leased_accounts ?? 0), 0)
  const attentionJobs = jobs.filter((j) => j.status === 'failed' || j.status === 'pending')

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
        description={`${orgs.length} işletme · ${aliveWorkers}/${workers.length} worker · demand ${scaler.demand ?? 0}→${scaler.desired_workers ?? '—'}`}
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
          {
            label: 'Worker',
            value: `${aliveWorkers}/${workers.length}`,
            tone: aliveWorkers > 0 ? 'ok' : 'danger',
          },
        ]}
      />

      <div className="mb-3 grid gap-2 sm:grid-cols-3">
        <Card>
          <div className="p-3">
            <p className="text-[11px] text-ink-faint">Scaler</p>
            <p className="mt-0.5 text-[16px] font-extrabold tabular">
              {scaler.demand ?? 0}
              <span className="text-[12px] font-medium text-ink-muted">
                {' '}
                → {scaler.desired_workers ?? '—'}
              </span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-ink-faint">
              {scaler.reason || '—'} · kapasite/worker {scaler.capacity_per_worker ?? '—'}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <p className="text-[11px] text-ink-faint">Kiralanmış hat</p>
            <p className="mt-0.5 text-[16px] font-extrabold tabular">{leased}</p>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <p className="text-[11px] text-ink-faint">Dikkat (fail/pending)</p>
            <p
              className={`mt-0.5 text-[16px] font-extrabold tabular ${
                attentionJobs.length > 0 ? 'text-danger' : ''
              }`}
            >
              {attentionJobs.length}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.75fr)]">
        <AdminOrgList orgs={orgRows} />
        <div className="space-y-3">
          <Card>
            <CardHeader title="Yeni müşteri" subtitle="Davet + işletme + kota" />
            <div className="p-3.5">
              <ProvisionCustomerForm />
            </div>
          </Card>

          {workers.length > 0 ? (
            <Card>
              <CardHeader title="Worker’lar" subtitle={`${aliveWorkers} canlı`} />
              <ul className="divide-y divide-hairline text-[12px]">
                {workers.slice(0, 12).map((w) => (
                  <li
                    key={w.worker_id}
                    className="flex items-center justify-between gap-2 px-3.5 py-2"
                  >
                    <span className="min-w-0 truncate font-mono text-[11px] text-ink-muted">
                      {w.worker_id}
                    </span>
                    <span className="flex items-center gap-2 tabular">
                      {w.leased_accounts ?? 0} lease
                      <StatusPill status={w.alive ? 'connected' : 'disconnected'} />
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>

      {locked > 0 ? (
        <Card className="mt-2.5">
          <CardHeader title="Kilitli hatlar" subtitle={`${locked} · org detayından aç`} />
          <ul className="divide-y divide-hairline text-[12px]">
            {accounts
              .filter((a) => a.is_locked)
              .slice(0, 20)
              .map((a) => (
                <li key={a.id} className="flex justify-between gap-2 px-3.5 py-2">
                  <span className="truncate">
                    {a.label || a.phone_e164 || a.id.slice(0, 8)}
                  </span>
                  <Link
                    href={`/admin/${a.org_id}`}
                    className="shrink-0 text-accent underline-offset-2 hover:underline"
                  >
                    Org
                  </Link>
                </li>
              ))}
          </ul>
        </Card>
      ) : null}

      {jobs.length > 0 ? (
        <Card className="mt-2.5">
          <CardHeader title="Son işler" subtitle="Kuyruk" />
          <ul className="divide-y divide-hairline text-[12px]">
            {jobs.slice(0, 20).map((job) => (
              <li key={job.id} className="flex justify-between gap-2 px-3.5 py-2 text-ink-muted">
                <span className="truncate">
                  #{job.id} · {job.type}
                  {job.error ? ` · ${job.error.slice(0, 40)}` : ''}
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
