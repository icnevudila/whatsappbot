import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  AccentLink,
  Badge,
  Button,
  Card,
  CardHeader,
  Meter,
  Notice,
  PageHeader,
} from '@/components/ui'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { signOut } from '@/app/giris/actions'
import { MembersPanel, OrgSettingsForm, WebhookSettingsForm, DeleteOrganizationForm } from './org-forms'
import { ProfileForm } from './profile-form'
import { planLabel } from '@wa/shared'
import { BillingCheckoutButton } from './billing-checkout-button'
import { ApiKeyForm } from './api-key-form'
import { CONTACT_EMAIL } from '@/lib/contact'

export const metadata: Metadata = { title: 'Ayarlar' }

const ROLE_HINT: Record<string, string> = {
  owner: 'Sahip',
  admin: 'Yönetici',
  member: 'Üye',
}

const nf = new Intl.NumberFormat('tr-TR')

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string | string[] }>
}) {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const params = await searchParams
  const billingRaw = params.billing
  const billing =
    typeof billingRaw === 'string'
      ? billingRaw
      : Array.isArray(billingRaw)
        ? billingRaw[0]
        : undefined

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const canManage = org.role === 'owner' || org.role === 'admin'
  const isOwner = org.role === 'owner'
  const { messages } = await getDictionary()

  const [
    { data: profile },
    { data: accounts },
    { count: sentThisMonth },
    { data: memberRows },
    { data: apiKeyRows },
  ] = await Promise.all([
    supabase.from('profiles').select('full_name, company').eq('id', userId).single(),
    supabase.from('accounts').select('id, status').eq('org_id', org.id),
    supabase
      .from('message_log')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('direction', 'out')
      .gte('created_at', monthStart.toISOString()),
    canManage
      ? supabase
          .from('organization_members')
          .select('user_id, role')
          .eq('org_id', org.id)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as { user_id: string; role: string }[] }),
    canManage
      ? supabase
          .from('org_api_keys' as never)
          .select('id, name, key_prefix, last_used_at, created_at' as never)
          .eq('org_id' as never, org.id as never)
          .is('revoked_at' as never, null)
          .order('created_at' as never, { ascending: false })
      : Promise.resolve({
          data: [] as {
            id: string
            name: string
            key_prefix: string
            last_used_at: string | null
            created_at: string
          }[],
        }),
  ])

  const t = createT(messages)
  const usedAccounts = accounts?.length ?? 0
  const usedMessages = sentThisMonth ?? 0
  const connectedCount = (accounts ?? []).filter((a) => a.status === 'connected').length

  const memberIds = (memberRows ?? []).map((row) => row.user_id)
  const { data: memberProfiles } =
    memberIds.length > 0
      ? await supabase.from('profiles').select('id, full_name, email').in('id', memberIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] }

  const profileById = Object.fromEntries((memberProfiles ?? []).map((row) => [row.id, row]))
  const members = (memberRows ?? []).map((row) => {
    const memberProfile = profileById[row.user_id]
    const isSelf = row.user_id === userId
    return {
      userId: row.user_id,
      email: memberProfile?.email ?? (isSelf ? (user.email ?? null) : null),
      fullName: memberProfile?.full_name ?? (isSelf ? (profile?.full_name ?? null) : null),
      role: row.role,
    }
  })

  return (
    <div className="filo-fade-in mx-auto w-full max-w-xl space-y-2.5">
      <PageHeader
        title={t('pages.ayarlarTitle')}
        description={`${org.name} · ${ROLE_HINT[org.role] ?? org.role}`}
      />

      {billing === 'ok' ? (
        <Notice tone="success">Ödeme alındı. Paket kısa süre içinde güncellenir.</Notice>
      ) : null}
      {billing === 'cancel' ? (
        <Notice tone="warn">Ödeme iptal edildi.</Notice>
      ) : null}

      {org.suspended_at ? (
        <Notice tone="danger">
          İşletme askıda{org.suspend_reason ? `: ${org.suspend_reason}` : ''}. Destek:{' '}
          {CONTACT_EMAIL}
        </Notice>
      ) : null}

      <Card>
        <CardHeader
          title="Paket"
          action={<Badge tone="accent">{planLabel(org.plan)}</Badge>}
        />
        <div className="space-y-2.5 p-3.5">
          <QuotaRow
            label="Hat"
            used={usedAccounts}
            total={org.accounts_quota}
            hint={
              connectedCount === 0 ? (
                <AccentLink href="/hesaplar" className="text-[12px]">
                  Hat bağla →
                </AccentLink>
              ) : (
                `${connectedCount} bağlı`
              )
            }
          />
          <QuotaRow
            label="Bu ay mesaj"
            used={usedMessages}
            total={org.monthly_message_quota}
            hint="Her ayın 1’inde sıfırlanır"
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Profil" subtitle={user.email ?? undefined} />
        <ProfileForm
          fullName={profile?.full_name ?? ''}
          company={profile?.company ?? ''}
          email={user.email ?? ''}
          compact
        />
      </Card>

      {canManage ? (
        <Card>
          <CardHeader title="İşletme" />
          <OrgSettingsForm orgName={org.name} canEdit />
        </Card>
      ) : null}

      {canManage ? (
        <Card>
          <CardHeader
            title="Ekip"
            subtitle={members.length <= 1 ? 'Yalnız siz' : `${members.length} üye`}
          />
          <MembersPanel members={members} canManage />
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Oturum" />
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5">
          <p className="text-[12.5px] text-ink-muted">
            Çıkış hatları kesmez; gönderim sunucuda sürer.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="danger">
              Çıkış yap
            </Button>
          </form>
        </div>
      </Card>

      {canManage ? (
        <details className="group rounded-[var(--radius-md)] border border-hairline bg-surface">
          <summary className="cursor-pointer list-none px-3.5 py-3 text-[13px] font-semibold text-ink-muted marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex items-center justify-between gap-2">
              Gelişmiş
              <span className="text-[11.5px] font-normal text-ink-faint group-open:hidden">
                Aç
              </span>
              <span className="hidden text-[11.5px] font-normal text-ink-faint group-open:inline">
                Kapat
              </span>
            </span>
          </summary>
          <div className="space-y-3 border-t border-hairline p-3.5">
            <p className="text-[12px] text-ink-faint">
              Webhook, API anahtarı ve faturalama — çoğu işletme için gerekmez.
            </p>
            <WebhookSettingsForm webhookUrl={org.webhook_url ?? null} canEdit />
            <div className="flex flex-wrap gap-2 border-t border-hairline pt-2.5">
              <BillingCheckoutButton />
              <Link
                href="/marka-kiti"
                className="text-[12.5px] text-ink-muted underline underline-offset-2"
              >
                Marka kiti
              </Link>
            </div>
            <ApiKeyForm
              canEdit
              keys={(apiKeyRows ?? []) as {
                id: string
                name: string
                key_prefix: string
                last_used_at: string | null
                created_at: string
              }[]}
            />
            {isOwner ? (
              <div className="border-t border-danger/20 pt-2.5">
                <p className="mb-2 text-[12px] font-medium text-danger">Tehlikeli bölge</p>
                <DeleteOrganizationForm
                  orgName={org.name}
                  hasStripeSubscription={Boolean(org.stripe_subscription_id)}
                />
              </div>
            ) : null}
          </div>
        </details>
      ) : null}
    </div>
  )
}

function QuotaRow({
  label,
  used,
  total,
  hint,
}: {
  label: string
  used: number
  total: number
  hint?: ReactNode
}) {
  const ratio = total > 0 ? used / total : 0
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[12.5px]">{label}</span>
        <span className="tabular text-[12px] text-ink-muted">
          {nf.format(used)} / {nf.format(total)}
        </span>
      </div>
      <Meter value={used} max={total} tone={ratio > 0.9 ? 'warn' : 'accent'} />
      {hint ? <div className="mt-1 text-[11.5px] text-ink-faint">{hint}</div> : null}
    </div>
  )
}
