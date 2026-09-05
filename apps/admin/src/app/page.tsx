import type { Metadata } from 'next'
import { Button, Card, CardHeader, Notice } from '@/components/ui'
import { requirePlatformAdmin } from '@/lib/platform'
import { signOut } from '@/app/giris/actions'
import { OrgQuotaForm } from './org-quota-form'
import { UnlockAccountButton } from './unlock-account-button'

export const metadata: Metadata = { title: 'Genel bakış' }

type OverviewOrg = {
  id: string
  name: string
  slug: string
  plan: string
  accounts_quota: number
  monthly_message_quota?: number
  member_count: number
}

type OverviewAccount = {
  id: string
  org_id: string
  label: string | null
  phone_e164: string | null
  status: string
  is_locked: boolean
  lock_reason: string | null
  enabled: boolean
  lease_holder?: string | null
  lease_expires_at?: string | null
}

type OverviewJob = {
  id: number
  org_id: string
  type: string
  status: string
  error: string | null
  claimed_by: string | null
  updated_at: string
}

type OverviewWorker = {
  worker_id: string
  leased_accounts: number
  max_sessions?: number
  tracked?: number
  live?: number
  seen_at?: string
  alive?: boolean
  soonest_expiry?: string
}

type OverviewScaler = {
  desired_workers?: number
  demand?: number
  alive_workers?: number
  alive_workers_reported?: number
  capacity_per_worker?: number
  reason?: string | null
  updated_at?: string
}

type AdminOverview = {
  organizations: OverviewOrg[]
  accounts: OverviewAccount[]
  workers?: OverviewWorker[]
  scaler?: OverviewScaler
  jobs: OverviewJob[]
}

async function loadOverview(
  supabase: Awaited<ReturnType<typeof requirePlatformAdmin>>['supabase'],
): Promise<{ data: AdminOverview | null; error: string | null }> {
  // Migration uygulanana kadar Database tiplerinde yok; cast ile cagiriyoruz.
  const { data, error } = await supabase.rpc('admin_overview' as never)

  if (error) {
    return { data: null, error: error.message }
  }

  const raw = data as AdminOverview | null
  return {
    data: {
      organizations: raw?.organizations ?? [],
      accounts: raw?.accounts ?? [],
      workers: raw?.workers ?? [],
      scaler: raw?.scaler ?? {},
      jobs: raw?.jobs ?? [],
    },
    error: null,
  }
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString('tr-TR', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

export default async function AdminOverviewPage() {
  const { user, supabase } = await requirePlatformAdmin()
  const { data, error } = await loadOverview(supabase)

  const orgs = data?.organizations ?? []
  const accounts = data?.accounts ?? []
  const workers = data?.workers ?? []
  const scaler = data?.scaler ?? {}
  const jobs = data?.jobs ?? []

  const lockedAccounts = accounts.filter((a) => a.is_locked)
  const attentionJobs = jobs.filter((j) => j.status === 'failed' || j.status === 'pending')

  const orgNameById = new Map(orgs.map((o) => [o.id, o.name]))
  const leasedTotal = workers.reduce((sum, w) => sum + (w.leased_accounts ?? 0), 0)
  const aliveWorkers = workers.filter((w) => w.alive).length

  return (
    <div className="min-h-dvh">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[13.5px] font-semibold tracking-[-0.02em]">Filo Admin</p>
            <p className="text-[12px] text-ink-muted">
              Platform genel bakış · kota düzenleme ve kilit açma
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-[12px] text-ink-muted sm:inline">{user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="quiet">
                Çıkış
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="filo-fade-in mx-auto max-w-6xl space-y-6 px-4 py-6">
        {error ? (
          <Notice tone="danger">
            Özet yüklenemedi: {error}. Migration{' '}
            <code className="font-mono text-[12px]">admin_overview</code> uygulanmış mı?
          </Notice>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-[10px] border border-hairline bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-ink-muted">Scaler demand → desired</p>
            <p className="mt-1 text-[22px] font-semibold tabular tracking-[-0.02em]">
              {scaler.demand ?? 0}
              <span className="text-[14px] font-medium text-ink-muted">
                {' '}
                → {scaler.desired_workers ?? '—'}
              </span>
            </p>
          </div>
          <div className="rounded-[10px] border border-hairline bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-ink-muted">Worker canlı / heartbeat</p>
            <p className="mt-1 text-[22px] font-semibold tabular tracking-[-0.02em]">
              {aliveWorkers}
              <span className="text-[14px] font-medium text-ink-muted">
                {' '}
                / {workers.length}
              </span>
            </p>
          </div>
          <div className="rounded-[10px] border border-hairline bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-ink-muted">Kiralanmış hat</p>
            <p className="mt-1 text-[22px] font-semibold tabular tracking-[-0.02em]">
              {leasedTotal}
            </p>
          </div>
          <div className="rounded-[10px] border border-hairline bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-ink-muted">Kilitli / dikkat iş</p>
            <p
              className={`mt-1 text-[22px] font-semibold tabular tracking-[-0.02em] ${
                lockedAccounts.length > 0 || attentionJobs.length > 0 ? 'text-danger' : ''
              }`}
            >
              {lockedAccounts.length}
              <span className="text-[14px] font-medium text-ink-muted">
                {' '}
                / {attentionJobs.length}
              </span>
            </p>
          </div>
        </section>

        <Card>
          <CardHeader
            title="Autoscale"
            subtitle={
              scaler.reason ||
              'wa.scaler_state — hat talebine göre desired worker (actuator: noop/docker/webhook)'
            }
          />
          <div className="grid gap-3 px-4 pb-4 text-[12.5px] sm:grid-cols-4">
            <div>
              <p className="text-ink-muted">Demand</p>
              <p className="mt-0.5 font-semibold tabular">{scaler.demand ?? '—'}</p>
            </div>
            <div>
              <p className="text-ink-muted">Desired</p>
              <p className="mt-0.5 font-semibold tabular">{scaler.desired_workers ?? '—'}</p>
            </div>
            <div>
              <p className="text-ink-muted">Kapasite / worker</p>
              <p className="mt-0.5 font-semibold tabular">
                {scaler.capacity_per_worker ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-ink-muted">Güncelleme</p>
              <p className="mt-0.5 tabular text-ink-muted">
                {scaler.updated_at ? formatDate(scaler.updated_at) : '—'}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Worker dağılımı"
            subtitle={
              workers.length === 0
                ? 'Heartbeat yok — worker ayakta değil'
                : `${aliveWorkers} canlı · ${leasedTotal} kiralanmış oturum`
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline text-[11.5px] text-ink-muted">
                  <th className="px-4 py-2 font-medium">WORKER_ID</th>
                  <th className="px-4 py-2 font-medium">Canlı</th>
                  <th className="px-4 py-2 font-medium">Lease</th>
                  <th className="px-4 py-2 font-medium">Tracked/Live</th>
                  <th className="px-4 py-2 font-medium">Max</th>
                  <th className="px-4 py-2 font-medium">Seen</th>
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-ink-muted">
                      Henüz heartbeat yok.
                    </td>
                  </tr>
                ) : (
                  workers.map((worker) => (
                    <tr key={worker.worker_id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[12px]">{worker.worker_id}</td>
                      <td className="px-4 py-2.5">
                        {worker.alive ? (
                          <span className="text-ok-dim">evet</span>
                        ) : (
                          <span className="text-ink-faint">hayır</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular">{worker.leased_accounts}</td>
                      <td className="px-4 py-2.5 tabular text-ink-muted">
                        {worker.tracked ?? '—'} / {worker.live ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 tabular">{worker.max_sessions ?? '—'}</td>
                      <td className="px-4 py-2.5 tabular text-ink-muted">
                        {worker.seen_at ? formatDate(worker.seen_at) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="İşletmeler"
            subtitle={`${orgs.length} kayıt · üye ve kota özeti`}
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline text-[11.5px] text-ink-muted">
                  <th className="px-4 py-2 font-medium">Ad</th>
                  <th className="px-4 py-2 font-medium">Slug</th>
                  <th className="px-4 py-2 font-medium">Üye</th>
                  <th className="px-4 py-2 font-medium">Plan / kota</th>
                </tr>
              </thead>
              <tbody>
                {orgs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-ink-muted">
                      Henüz işletme yok.
                    </td>
                  </tr>
                ) : (
                  orgs.map((org) => (
                    <tr key={org.id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 font-medium">{org.name}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-ink-muted">
                        {org.slug}
                      </td>
                      <td className="px-4 py-2.5 tabular">{org.member_count}</td>
                      <td className="px-4 py-2.5">
                        <OrgQuotaForm
                          orgId={org.id}
                          plan={org.plan}
                          accountsQuota={org.accounts_quota}
                          messageQuota={org.monthly_message_quota}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Kilitli hesaplar"
            subtitle={
              lockedAccounts.length === 0
                ? 'Kilitli hat yok'
                : `${lockedAccounts.length} hat kilitli — dikkat`
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline text-[11.5px] text-ink-muted">
                  <th className="px-4 py-2 font-medium">Etiket</th>
                  <th className="px-4 py-2 font-medium">Telefon</th>
                  <th className="px-4 py-2 font-medium">İşletme</th>
                  <th className="px-4 py-2 font-medium">Durum</th>
                  <th className="px-4 py-2 font-medium">Worker</th>
                  <th className="px-4 py-2 font-medium">Kilit nedeni</th>
                  <th className="px-4 py-2 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {lockedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-ink-muted">
                      Kilitli hesap bulunmuyor.
                    </td>
                  </tr>
                ) : (
                  lockedAccounts.map((account) => (
                    <tr
                      key={account.id}
                      className="border-b border-danger/20 bg-danger/5 last:border-0"
                    >
                      <td className="px-4 py-2.5 font-medium">
                        {account.label || '—'}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">
                        {account.phone_e164 || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">
                        {orgNameById.get(account.org_id) ?? account.org_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-2.5">{account.status}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] text-ink-muted">
                        {account.lease_holder || '—'}
                      </td>
                      <td className="px-4 py-2.5 text-danger">
                        {account.lock_reason || '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <UnlockAccountButton accountId={account.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Son işler"
            subtitle="Başarısız veya bekleyen öncelikli · en fazla 50 kayıt"
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline text-[11.5px] text-ink-muted">
                  <th className="px-4 py-2 font-medium">ID</th>
                  <th className="px-4 py-2 font-medium">Tür</th>
                  <th className="px-4 py-2 font-medium">Durum</th>
                  <th className="px-4 py-2 font-medium">İşletme</th>
                  <th className="px-4 py-2 font-medium">Hata</th>
                  <th className="px-4 py-2 font-medium">Güncelleme</th>
                </tr>
              </thead>
              <tbody>
                {attentionJobs.length === 0 && jobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-ink-muted">
                      İş kaydı yok.
                    </td>
                  </tr>
                ) : attentionJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-ink-muted">
                      Başarısız veya bekleyen iş yok. Son {jobs.length} iş temiz.
                    </td>
                  </tr>
                ) : (
                  attentionJobs.map((job) => (
                    <tr
                      key={job.id}
                      className={`border-b border-hairline last:border-0 ${
                        job.status === 'failed' ? 'bg-danger/5' : 'bg-warn/5'
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono tabular text-[12px]">{job.id}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px]">{job.type}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            job.status === 'failed' ? 'text-danger' : 'text-warn'
                          }
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-muted">
                        {orgNameById.get(job.org_id) ?? job.org_id.slice(0, 8)}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-2.5 text-ink-muted">
                        {job.error || '—'}
                      </td>
                      <td className="px-4 py-2.5 tabular text-ink-muted">
                        {formatDate(job.updated_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  )
}
