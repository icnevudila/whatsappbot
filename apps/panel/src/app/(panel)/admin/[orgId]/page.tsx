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
  AccountEnableForm,
  AccountJobButton,
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
    enabled: boolean
    is_locked: boolean
    sent_today: number
    daily_send_limit: number
  }[]
  counts: {
    contacts: number
    lists: number
    campaigns: number
    campaigns_running: number
    blacklist: number
    out_today: number
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

  return (
    <>
      <PageHeader
        title={org.name}
        description={`${org.slug} · ${org.plan} · kota ${org.accounts_quota} hat / ${org.monthly_message_quota} msg`}
        action={
          <Link href="/admin" className="text-[13px] text-accent underline-offset-2 hover:underline">
            ← İşletmeler
          </Link>
        }
      />

      {errRaw ? <Notice tone="danger">{errRaw}</Notice> : null}

      {org.suspended_at ? (
        <Notice tone="danger">
          Askıda{org.suspend_reason ? `: ${org.suspend_reason}` : ''}
        </Notice>
      ) : null}

      <StatStrip
        items={[
          { label: 'Kişi', value: detail.counts.contacts },
          { label: 'Grup', value: detail.counts.lists },
          { label: 'Kampanya', value: detail.counts.campaigns },
          { label: 'Çalışan', value: detail.counts.campaigns_running },
          { label: 'Bugün', value: detail.counts.out_today },
          { label: 'Opt-out', value: detail.counts.blacklist },
        ]}
      />

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <OrgSuspendForm orgId={org.id} suspendedAt={org.suspended_at} />
        <CancelOrgJobsForm orgId={org.id} />
      </div>

      {(org.stripe_customer_id || org.stripe_subscription_id) ? (
        <Card className="mb-2.5">
          <CardHeader title="Stripe" subtitle="Billing kimlikleri" />
          <div className="space-y-1 px-3.5 py-2.5 font-mono text-[11.5px] text-ink-muted">
            <p>customer: {org.stripe_customer_id ?? '—'}</p>
            <p>subscription: {org.stripe_subscription_id ?? '—'}</p>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-2.5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Paket / kota" />
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
          <CardHeader title="Kontrol" subtitle="Panele gir · otomatik yanıt" />
          <div className="space-y-3 p-3.5">
            <form action={enterOrganization}>
              <input type="hidden" name="org_id" value={org.id} />
              <Button type="submit" variant="accent">
                İşletme paneline gir →
              </Button>
            </form>
            <form
              action={setOrgAutoReply}
              className="flex flex-wrap items-center gap-2 border-t border-hairline pt-3"
            >
              <input type="hidden" name="org_id" value={org.id} />
              <input
                type="hidden"
                name="enabled"
                value={org.auto_reply_enabled ? '0' : '1'}
              />
              <span className="text-[12px] text-ink-muted">
                Otomatik yanıt: {org.auto_reply_enabled ? 'açık' : 'kapalı'}
              </span>
              <Button type="submit" className="text-[12px]">
                {org.auto_reply_enabled ? 'Kapat' : 'Aç'}
              </Button>
            </form>
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
                <span className="text-[11.5px] text-ink-faint">{m.email}</span>
              </span>
              <span className="rounded-sm border border-hairline px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-muted">
                {m.role}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-2.5">
        <CardHeader title="Hatlar" subtitle={`${detail.accounts.length}`} />
        {detail.accounts.length === 0 ? (
          <p className="p-3.5 text-[13px] text-ink-muted">Hat yok.</p>
        ) : (
          <ul className="divide-y divide-hairline">
            {detail.accounts.map((a) => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium">{a.label}</span>
                  <span className="text-[11.5px] text-ink-faint tabular">
                    {a.phone_e164 ?? '—'} · bugün {a.sent_today}/{a.daily_send_limit}
                  </span>
                </span>
                <span className="flex max-w-full flex-wrap items-center justify-end gap-1.5">
                  <StatusPill status={a.is_locked ? 'banned' : a.status} />
                  <AccountEnableForm accountId={a.id} enabled={a.enabled} />
                  {a.is_locked ? <UnlockAccountButton accountId={a.id} /> : null}
                  <AccountJobButton
                    accountId={a.id}
                    type="account.connect"
                    label="Bağla"
                  />
                  <AccountJobButton
                    accountId={a.id}
                    type="account.disconnect"
                    label="Kes"
                  />
                  <AccountJobButton
                    accountId={a.id}
                    type="account.logout"
                    label="Logout"
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
