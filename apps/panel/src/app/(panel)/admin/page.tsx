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
  suspend_reason?: string | null
  member_count?: number
  created_at?: string
}

type OverviewAccount = {
  id: string
  org_id: string
  status: string
  is_locked: boolean
  lock_reason?: string | null
  enabled?: boolean
  label?: string | null
  phone_e164?: string | null
  lease_holder?: string | null
  lease_expires_at?: string | null
}

type OverviewWorker = {
  worker_id: string
  leased_accounts?: number
  max_sessions?: number
  tracked?: number
  live?: number
  db_pool_max?: number
  alive?: boolean
  seen_at?: string
  meta?: { stale?: number; connecting?: number; uptimeSeconds?: number } | null
}

type OverviewScaler = {
  desired_workers?: number
  demand?: number
  alive_workers?: number
  capacity_per_worker?: number
  reason?: string | null
  updated_at?: string
}

type Overview = {
  organizations?: OverviewOrg[]
  accounts?: OverviewAccount[]
  workers?: OverviewWorker[]
  scaler?: OverviewScaler
  jobs?: {
    id: number
    status: string
    type: string
    org_id?: string
    error?: string | null
    claimed_by?: string | null
    updated_at?: string
  }[]
}

function fmtSeen(iso?: string) {
  if (!iso) return '—'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return `${Math.max(1, Math.floor(ms / 1000))} sn`
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)} dk`
  return new Date(iso).toLocaleString('tr-TR')
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
  const lockedAccounts = accounts.filter((a) => a.is_locked)
  const leasedAccounts = accounts.filter((a) => a.lease_holder)
  const members = orgs.reduce((sum, org) => sum + (org.member_count ?? 0), 0)
  const suspendedOrgs = orgs.filter((o) => o.suspended_at)
  const aliveWorkers = workers.filter((w) => w.alive).length
  const leased = workers.reduce((s, w) => s + (w.leased_accounts ?? 0), 0)
  const pendingJobs = jobs.filter((j) => j.status === 'pending')
  const failedJobs = jobs.filter((j) => j.status === 'failed')
  const orgNameById = Object.fromEntries(orgs.map((o) => [o.id, o.name]))

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
            href="/durum"
            className="text-[13px] text-accent underline-offset-2 hover:underline"
          >
            Durum / fleet →
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
            value: lockedAccounts.length,
            tone: lockedAccounts.length > 0 ? 'danger' : 'default',
          },
          {
            label: 'Askı',
            value: suspendedOrgs.length,
            tone: suspendedOrgs.length > 0 ? 'danger' : 'default',
          },
          {
            label: 'Lease',
            value: leased,
            tone: leased > 0 ? 'ok' : 'default',
          },
          {
            label: 'Worker',
            value: `${aliveWorkers}/${workers.length}`,
            tone: aliveWorkers > 0 ? 'ok' : 'danger',
          },
          {
            label: 'Pending',
            value: pendingJobs.length,
            tone: pendingJobs.length > 0 ? 'danger' : 'default',
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
              {scaler.reason || '—'} · kap/worker {scaler.capacity_per_worker ?? '—'}
              {scaler.updated_at ? ` · ${fmtSeen(scaler.updated_at)}` : ''}
            </p>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <p className="text-[11px] text-ink-faint">Aktif lease (hesap)</p>
            <p className="mt-0.5 text-[16px] font-extrabold tabular">
              {leasedAccounts.length}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-faint">heartbeat lease toplamı {leased}</p>
          </div>
        </Card>
        <Card>
          <div className="p-3">
            <p className="text-[11px] text-ink-faint">Fail (son 80 iş)</p>
            <p
              className={`mt-0.5 text-[16px] font-extrabold tabular ${
                failedJobs.length > 0 ? 'text-danger' : ''
              }`}
            >
              {failedJobs.length}
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
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
              <CardHeader
                title="Worker fleet"
                subtitle={`${aliveWorkers} canlı · detaylı heartbeat`}
              />
              <ul className="divide-y divide-hairline text-[12px]">
                {workers.map((w) => (
                  <li key={w.worker_id} className="space-y-0.5 px-3.5 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-mono text-[11px] text-ink-muted">
                        {w.worker_id}
                      </span>
                      <StatusPill status={w.alive ? 'connected' : 'disconnected'} />
                    </div>
                    <p className="tabular text-[11px] text-ink-faint">
                      live {w.live ?? 0}/{w.max_sessions ?? '—'} · track {w.tracked ?? 0} · lease{' '}
                      {w.leased_accounts ?? 0} · pool {w.db_pool_max ?? '—'} · seen{' '}
                      {fmtSeen(w.seen_at)}
                      {w.meta?.stale != null ? ` · stale ${w.meta.stale}` : ''}
                      {w.meta?.connecting != null ? ` · connecting ${w.meta.connecting}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          ) : (
            <Card>
              <CardHeader title="Worker’lar" />
              <p className="p-3.5 text-[13px] text-ink-muted">Heartbeat yok.</p>
            </Card>
          )}
        </div>
      </div>

      {suspendedOrgs.length > 0 ? (
        <Card className="mt-2.5">
          <CardHeader title="Askıdaki işletmeler" subtitle={`${suspendedOrgs.length}`} />
          <ul className="divide-y divide-hairline text-[12.5px]">
            {suspendedOrgs.map((o) => (
              <li key={o.id} className="flex justify-between gap-2 px-3.5 py-2">
                <span className="min-w-0 truncate">
                  <span className="font-medium text-ink">{o.name}</span>
                  <span className="text-ink-faint">
                    {o.suspend_reason ? ` · ${o.suspend_reason}` : ''}
                  </span>
                </span>
                <Link
                  href={`/admin/${o.id}`}
                  className="shrink-0 text-accent underline-offset-2 hover:underline"
                >
                  Aç
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {lockedAccounts.length > 0 ? (
        <Card className="mt-2.5">
          <CardHeader title="Kilitli hatlar" subtitle={`${lockedAccounts.length}`} />
          <ul className="divide-y divide-hairline text-[12px]">
            {lockedAccounts.slice(0, 40).map((a) => (
              <li key={a.id} className="flex justify-between gap-2 px-3.5 py-2">
                <span className="min-w-0 truncate">
                  {a.label || a.phone_e164 || a.id.slice(0, 8)}
                  <span className="text-ink-faint">
                    {' '}
                    · {orgNameById[a.org_id] ?? a.org_id.slice(0, 8)}
                    {a.lock_reason ? ` · ${a.lock_reason}` : ''}
                  </span>
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

      {leasedAccounts.length > 0 ? (
        <Card className="mt-2.5">
          <CardHeader title="Aktif lease’ler" subtitle={`${leasedAccounts.length}`} />
          <ul className="divide-y divide-hairline text-[12px]">
            {leasedAccounts.slice(0, 40).map((a) => (
              <li key={a.id} className="flex justify-between gap-2 px-3.5 py-2">
                <span className="min-w-0 truncate">
                  {a.label || a.phone_e164 || a.id.slice(0, 8)}
                  <span className="font-mono text-[11px] text-ink-faint">
                    {' '}
                    · {a.lease_holder}
                  </span>
                </span>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {jobs.length > 0 ? (
        <Card className="mt-2.5">
          <CardHeader title="Son işler" subtitle="Kuyruk (80)" />
          <ul className="divide-y divide-hairline text-[12px]">
            {jobs.slice(0, 40).map((job) => (
              <li key={job.id} className="px-3.5 py-2 text-ink-muted">
                <div className="flex justify-between gap-2">
                  <span className="truncate">
                    #{job.id} · {job.type}
                    {job.claimed_by ? ` · ${job.claimed_by}` : ''}
                    {job.org_id ? (
                      <>
                        {' · '}
                        <Link
                          href={`/admin/${job.org_id}`}
                          className="text-accent underline-offset-2 hover:underline"
                        >
                          {orgNameById[job.org_id] ?? 'org'}
                        </Link>
                      </>
                    ) : null}
                  </span>
                  <span className="tabular">{job.status}</span>
                </div>
                {job.error ? (
                  <p className="mt-0.5 truncate text-[11px] text-danger">{job.error}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  )
}
