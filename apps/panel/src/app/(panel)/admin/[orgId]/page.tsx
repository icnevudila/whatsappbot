import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  Button,
  Card,
  CardHeader,
  Notice,
  PageHeader,
  StatStrip,
  StatusPill,
} from '@/components/ui'
import { requirePlatformAdmin } from '@/lib/org'
import { enterOrganization, setOrgAutoReply } from '../actions'
import {
  AccountDailyLimitForm,
  AccountEnableForm,
  AccountJobButton,
  AccountLockForm,
  CancelOrgJobsForm,
  OrgSuspendForm,
  UnlockAccountButton,
} from '../admin-ops-forms'
import { OrgQuotaForm } from './org-quota-form'

export const dynamic = 'force-dynamic'

type OrgDetail = {
  organization: {
    id: string
    name: string
    slug: string
    plan: string
    accounts_quota: number
    monthly_message_quota: number
    suspended_at: string | null
    suspend_reason: string | null
    auto_reply_enabled: boolean
    webhook_url?: string | null
    stripe_customer_id: string | null
    stripe_subscription_id: string | null
    created_at: string
  }
  members: {
    user_id: string
    role: string
    email: string | null
    full_name: string | null
    created_at: string
  }[]
  accounts: {
    id: string
    label: string
    phone_e164: string | null
    status: string
    status_detail?: string | null
    enabled: boolean
    is_locked: boolean
    lock_reason?: string | null
    locked_at?: string | null
    sent_today: number
    daily_send_limit: number
    warmup_started_at?: string | null
    new_chat_quota_total?: number | null
    new_chat_quota_used?: number | null
    reachout_locked_until?: string | null
    connected_at?: string | null
    last_seen_at?: string | null
    lease_holder?: string | null
    lease_expires_at?: string | null
  }[]
  counts: {
    contacts: number
    lists: number
    campaigns: number
    campaigns_running: number
    blacklist: number
    out_today: number
    out_month?: number
    jobs_pending?: number
    jobs_failed?: number
  }
  recent_jobs?: {
    id: number
    type: string
    status: string
    error: string | null
    account_id: string | null
    claimed_by: string | null
    updated_at: string
  }[]
  recent_campaigns?: {
    id: string
    name: string
    status: string
    total_targets: number
    sent_count: number
    failed_count: number
    updated_at: string
  }[]
}

function fmtWhen(iso: string | null | undefined) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('tr-TR')
  } catch {
    return iso
  }
}

export default async function AdminOrgPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgId: string }>
  searchParams: Promise<{ hata?: string | string[] }>
}) {
  const { orgId } = await params
  const sp = await searchParams
  const errRaw = Array.isArray(sp.hata) ? sp.hata[0] : sp.hata

  let detail: OrgDetail
  try {
    const { supabase } = await requirePlatformAdmin()
    const { data, error } = await supabase.rpc('admin_org_detail', {
      p_org_id: orgId,
    })
    if (error || !data) throw error ?? new Error('Detay yok')
    detail = data as OrgDetail
  } catch (error) {
    if (error instanceof Error && error.message === 'FORBIDDEN_PLATFORM_ADMIN') {
      redirect('/ozet')
    }
    redirect('/admin')
  }

  const org = detail.organization
  const jobs = detail.recent_jobs ?? []
  const campaigns = detail.recent_campaigns ?? []
  const connected = detail.accounts.filter((a) => a.status === 'connected').length
  const locked = detail.accounts.filter((a) => a.is_locked).length

  return (
    <>
      <PageHeader
        title={org.name}
        description={`${org.slug} · ${org.plan} · oluşturulma ${fmtWhen(org.created_at)}`}
        action={
          <Link href="/admin" className="text-[13px] text-accent underline-offset-2 hover:underline">
            ← İşletmeler
          </Link>
        }
      />

      {errRaw ? <Notice tone="danger">{errRaw}</Notice> : null}

      {org.suspended_at ? (
        <Notice tone="danger">
          Askıda{org.suspend_reason ? `: ${org.suspend_reason}` : ''} · {fmtWhen(org.suspended_at)}
        </Notice>
      ) : null}

      <StatStrip
        items={[
          { label: 'Kişi', value: detail.counts.contacts },
          { label: 'Grup', value: detail.counts.lists },
          { label: 'Kampanya', value: detail.counts.campaigns },
          { label: 'Çalışan', value: detail.counts.campaigns_running },
          { label: 'Bugün', value: detail.counts.out_today },
          { label: 'Bu ay', value: detail.counts.out_month ?? 0 },
          { label: 'Opt-out', value: detail.counts.blacklist },
          {
            label: 'İş pending',
            value: detail.counts.jobs_pending ?? 0,
            tone: (detail.counts.jobs_pending ?? 0) > 0 ? 'danger' : 'default',
          },
          {
            label: 'Fail 7g',
            value: detail.counts.jobs_failed ?? 0,
            tone: (detail.counts.jobs_failed ?? 0) > 0 ? 'danger' : 'default',
          },
          {
            label: 'Hat',
            value: `${connected}/${detail.accounts.length}`,
            tone: connected > 0 ? 'ok' : 'default',
          },
          {
            label: 'Kilit',
            value: locked,
            tone: locked > 0 ? 'danger' : 'default',
          },
        ]}
      />

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <OrgSuspendForm orgId={org.id} suspendedAt={org.suspended_at} />
        <CancelOrgJobsForm orgId={org.id} />
        <form action={enterOrganization}>
          <input type="hidden" name="org_id" value={org.id} />
          <Button type="submit" variant="accent">
            Panele gir →
          </Button>
        </form>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Paket / kota" subtitle={`${org.accounts_quota} hat · ${org.monthly_message_quota} msg/ay`} />
          <div className="p-3.5">
            <OrgQuotaForm
              orgId={org.id}
              plan={org.plan}
              accountsQuota={org.accounts_quota}
              monthlyQuota={org.monthly_message_quota}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Kontrol / billing" />
          <div className="space-y-3 p-3.5 text-[12.5px]">
            <form
              action={setOrgAutoReply}
              className="flex flex-wrap items-center gap-2"
            >
              <input type="hidden" name="org_id" value={org.id} />
              <input
                type="hidden"
                name="enabled"
                value={org.auto_reply_enabled ? '0' : '1'}
              />
              <span className="text-ink-muted">
                Otomatik yanıt: {org.auto_reply_enabled ? 'açık' : 'kapalı'}
              </span>
              <Button type="submit" className="text-[12px]">
                {org.auto_reply_enabled ? 'Kapat' : 'Aç'}
              </Button>
            </form>
            <div className="space-y-1 border-t border-hairline pt-3 font-mono text-[11px] text-ink-muted">
              <p>webhook: {org.webhook_url || '—'}</p>
              <p>stripe customer: {org.stripe_customer_id || '—'}</p>
              <p>stripe sub: {org.stripe_subscription_id || '—'}</p>
              <p>org id: {org.id}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-2.5">
        <CardHeader title="Üyeler" subtitle={`${detail.members.length}`} />
        <ul className="divide-y divide-hairline">
          {detail.members.map((m) => (
            <li
              key={m.user_id}
              className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-ink">
                  {m.full_name || m.email || m.user_id}
                </span>
                <span className="text-[11.5px] text-ink-faint">
                  {m.email} · {fmtWhen(m.created_at)}
                </span>
              </span>
              <span className="rounded-sm border border-hairline px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-muted">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-2.5">
        <CardHeader title="Hatlar" subtitle={`${detail.accounts.length} · tam kontrol`} />
        {detail.accounts.length === 0 ? (
          <p className="p-3.5 text-[13px] text-ink-muted">Hat yok.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {detail.accounts.map((a) => (
              <li key={a.id} className="space-y-2 px-3.5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold">{a.label}</span>
                    <span className="text-[11.5px] text-ink-faint tabular">
                      {a.phone_e164 ?? '—'} · bugün {a.sent_today}/{a.daily_send_limit}
                      {a.new_chat_quota_total != null
                        ? ` · yeni sohbet ${a.new_chat_quota_used ?? 0}/${a.new_chat_quota_total}`
                        : ''}
                    </span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-ink-faint">
                      {a.id.slice(0, 8)}… · lease {a.lease_holder ?? '—'}
                      {a.status_detail ? ` · ${a.status_detail}` : ''}
                    </span>
                    {a.is_locked && a.lock_reason ? (
                      <span className="mt-1 block text-[11.5px] text-danger">
                        Kilit: {a.lock_reason}
                      </span>
                    ) : null}
                    {a.reachout_locked_until ? (
                      <span className="mt-0.5 block text-[11px] text-warn">
                        Reachout kilit: {fmtWhen(a.reachout_locked_until)}
                      </span>
                    ) : null}
                  </span>
                  <StatusPill status={a.is_locked ? 'banned' : a.status} />
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <AccountEnableForm accountId={a.id} enabled={a.enabled} />
                  {a.is_locked ? (
                    <UnlockAccountButton accountId={a.id} />
                  ) : (
                    <AccountLockForm accountId={a.id} />
                  )}
                  <AccountJobButton accountId={a.id} type="account.connect" label="Bağla" />
                  <AccountJobButton accountId={a.id} type="account.disconnect" label="Kes" />
                  <AccountJobButton accountId={a.id} type="account.logout" label="Logout" />
                </div>

                <AccountDailyLimitForm accountId={a.id} dailyLimit={a.daily_send_limit} />

                <p className="text-[10.5px] text-ink-faint">
                  bağlandı {fmtWhen(a.connected_at)} · son görülme {fmtWhen(a.last_seen_at)} ·
                  ısınma {fmtWhen(a.warmup_started_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Son kampanyalar" subtitle={`${campaigns.length}`} />
          {campaigns.length === 0 ? (
            <p className="p-3.5 text-[13px] text-ink-muted">Kampanya yok.</p>
          ) : (
            <ul className="divide-y divide-hairline text-[12.5px]">
              {campaigns.map((c) => (
                <li key={c.id} className="flex justify-between gap-2 px-3.5 py-2">
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-ink">{c.name}</span>
                    <span className="text-ink-faint">
                      {' '}
                      · {c.sent_count}/{c.total_targets}
                      {c.failed_count ? ` · ${c.failed_count} hata` : ''}
                    </span>
                  </span>
                  <StatusPill status={c.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Son işler" subtitle={`${jobs.length}`} />
          {jobs.length === 0 ? (
            <p className="p-3.5 text-[13px] text-ink-muted">İş yok.</p>
          ) : (
            <ul className="divide-y divide-hairline text-[12px]">
              {jobs.map((j) => (
                <li key={j.id} className="px-3.5 py-2 text-ink-muted">
                  <div className="flex justify-between gap-2">
                    <span className="truncate">
                      #{j.id} · {j.type}
                      {j.claimed_by ? ` · ${j.claimed_by}` : ''}
                    </span>
                    <span className="tabular">{j.status}</span>
                  </div>
                  {j.error ? (
                    <p className="mt-0.5 truncate text-[11px] text-danger">{j.error}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
