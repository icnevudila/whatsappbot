import type { Metadata } from 'next'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { AccentLink, Badge, Card, CardHeader } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { planLabel } from '@wa/shared'
import { MembersPanel, OrgSettingsForm } from '../org-forms'
import { QuotaRow } from '../quota-row'
import { SettingsPageFrame } from '../settings-shell'

export const metadata: Metadata = { title: 'İşletme' }

async function MonthlyMessageQuota({ orgId, quota }: { orgId: string; quota: number }) {
  const { supabase } = await requireActiveOrg()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const { count } = await supabase
    .from('message_log')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .eq('direction', 'out')
    .gte('created_at', monthStart.toISOString())

  return (
    <QuotaRow
      label="Bu ay mesaj"
      used={count ?? 0}
      total={quota}
      hint="Her ayın 1’inde sıfırlanır"
    />
  )
}

export default async function OrgSettingsPage() {
  let userId: string
  let email: string | null
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, email, org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const canManage = org.role === 'owner' || org.role === 'admin'

  const [{ data: profile }, { data: accounts }, { data: memberRows }] = await Promise.all([
    supabase.from('profiles').select('full_name, company').eq('id', userId).single(),
    supabase.from('accounts').select('id, status').eq('org_id', org.id),
    canManage
      ? supabase
          .from('organization_members')
          .select('user_id, role')
          .eq('org_id', org.id)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] as { user_id: string; role: string }[] }),
  ])

  const usedAccounts = accounts?.length ?? 0
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
      email: memberProfile?.email ?? (isSelf ? email : null),
      fullName: memberProfile?.full_name ?? (isSelf ? (profile?.full_name ?? null) : null),
      role: row.role,
    }
  })

  return (
    <SettingsPageFrame title="İşletme" description="Paket, ad ve ekip.">
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
                <AccentLink href="/ayarlar/hatlar" className="text-[12px]">
                  Hat bağla →
                </AccentLink>
              ) : (
                `${connectedCount} bağlı`
              )
            }
          />
          <Suspense
            fallback={
              <QuotaRow
                label="Bu ay mesaj"
                used={0}
                total={org.monthly_message_quota}
                hint="Hesaplanıyor…"
              />
            }
          >
            <MonthlyMessageQuota orgId={org.id} quota={org.monthly_message_quota} />
          </Suspense>
        </div>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader title="İşletme adı" />
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
      ) : (
        <Card>
          <CardHeader title="Ekip" subtitle="Yalnız yöneticiler ekip yönetebilir." />
        </Card>
      )}
    </SettingsPageFrame>
  )
}
