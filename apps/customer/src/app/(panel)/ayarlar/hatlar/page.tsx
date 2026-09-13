import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupBanner } from '../../setup-banner'
import { AccountsBoard, type AccountView } from '../../hesaplar/accounts-board'
import { SettingsPageFrame } from '../settings-shell'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Hatlar' }

const ACCOUNT_FIELDS =
  'id, label, phone_e164, status, status_detail, enabled, is_locked, lock_reason, qr_code, qr_expires_at, pairing_code, pairing_expires_at, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used, reachout_locked_until'

export default async function SettingsAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ ekle?: string | string[] }>
}) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  let isPlatformAdmin = false
  try {
    ;({ org, supabase, isPlatformAdmin } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const qs = await searchParams
  const ekleRaw = Array.isArray(qs.ekle) ? qs.ekle[0] : qs.ekle

  const [accountsResult, setup] = await Promise.all([
    supabase
      .from('accounts')
      .select(ACCOUNT_FIELDS)
      .eq('org_id', org.id)
      .order('created_at'),
    getSetupProgress(org.id),
  ])

  const accounts = (accountsResult.data ?? []) as AccountView[]

  return (
    <SettingsPageFrame
      wide
      title="Hatlar"
      description="Bağlı WhatsApp numaraları"
    >
      {isPlatformAdmin ? null : <SetupBanner progress={setup} />}

      <AccountsBoard
        initial={accounts}
        orgId={org.id}
        accountsQuota={org.accounts_quota}
        canManage={isOrgAdminRole(org.role)}
        sendWindowStart={org.send_window_start ?? '08:00'}
        sendWindowEnd={org.send_window_end ?? '18:00'}
        autoOpenAdd={ekleRaw === '1'}
      />
    </SettingsPageFrame>
  )
}
