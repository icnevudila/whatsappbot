import type { Metadata } from 'next'
import { Button, Card, CardHeader, Notice } from '@/components/ui'
import { requirePlatformAdmin } from '@/lib/platform'
import { signOut } from '@/app/giris/actions'

export const metadata: Metadata = { title: 'Genel bakış' }

type OverviewOrg = {
  id: string
  name: string
  slug: string
  plan: string
  accounts_quota: number
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
  soonest_expiry: string
}

type AdminOverview = {
  organizations: OverviewOrg[]
  accounts: OverviewAccount[]
  workers?: OverviewWorker[]
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
  const jobs = data?.jobs ?? []

  const lockedAccounts = accounts.filter((a) => a.is_locked)
  const attentionJobs = jobs.filter((j) => j.status === 'failed' || j.status === 'pending')

  const orgNameById = new Map(orgs.map((o) => [o.id, o.name]))
  const leasedTotal = workers.reduce((sum, w) => sum + (w.leased_accounts ?? 0), 0)

  return (
    <div className="min-h-dvh">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div>
            <p className="text-[13.5px] font-semibold tracking-[-0.02em]">Filo Admin</p>
            <p className="text-[12px] text-ink-muted">Platform genel bakış · salt okuma</p>
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
            <p className="text-[11.5px] text-ink-muted">İşletmeler</p>
            <p className="mt-1 text-[22px] font-semibold tabular tracking-[-0.02em]">
              {orgs.length}
            </p>
          </div>
          <div className="rounded-[10px] border border-hairline bg-surface px-4 py-3 shadow-[var(--shadow-card)]">
            <p className="text-[11.5px] text-ink-muted">Worker’lar</p>
            <p className="mt-1 text-[22px] font-semibold tabular tracking-[-0.02em]">
              {workers.length}
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
            title="Worker dağılımı"
            subtitle={
              workers.length === 0
                ? 'Aktif lease yok — worker ayakta değil veya henüz hat yok'
                : `${workers.length} worker · ${leasedTotal} kiralanmış oturum`
            }
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline text-[11.5px] text-ink-muted">
                  <th className="px-4 py-2 font-medium">WORKER_ID</th>
                  <th className="px-4 py-2 font-medium">Kiralanmış hat</th>
                  <th className="px-4 py-2 font-medium">En yakın kira bitişi</th>
                </tr>
              </thead>
              <tbody>
                {workers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-ink-muted">
                      Henüz lease yok.
                    </td>
                  </tr>
                ) : (
                  workers.map((worker) => (
                    <tr key={worker.worker_id} className="border-b border-hairline last:border-0">
                      <td className="px-4 py-2.5 font-mono text-[12px]">{worker.worker_id}</td>
                      <td className="px-4 py-2.5 tabular">{worker.leased_accounts}</td>
                      <td className="px-4 py-2.5 tabular text-ink-muted">
                        {formatDate(worker.soonest_expiry)}
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
                  <th className="px-4 py-2 font-medium">Plan</th>
                  <th className="px-4 py-2 font-medium">Üye</th>
                  <th className="px-4 py-2 font-medium">Hat kotası</th>
                </tr>
              </thead>
              <tbody>
                {orgs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-ink-muted">
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
                      <td className="px-4 py-2.5">{org.plan}</td>
                      <td className="px-4 py-2.5 tabular">{org.member_count}</td>
                      <td className="px-4 py-2.5 tabular">{org.accounts_quota}</td>
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
                </tr>
              </thead>
              <tbody>
                {lockedAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-ink-muted">
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
