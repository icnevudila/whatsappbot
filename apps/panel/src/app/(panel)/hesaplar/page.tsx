import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AccentLink, PageHeader, QuietLink } from '@/components/ui'
import { requireActiveOrg } from '@/lib/org'
import { getSetupProgress } from '@/lib/setup-progress'
import { SetupBanner } from '../setup-banner'
import { AccountsBoard, type AccountView } from './accounts-board'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Hesaplar' }

const ACCOUNT_FIELDS =
  'id, label, phone_e164, status, status_detail, enabled, is_locked, lock_reason, qr_code, qr_expires_at, pairing_code, pairing_expires_at, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used, reachout_locked_until'

export default async function AccountsPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const [accountsResult, setup] = await Promise.all([
    supabase
      .from('accounts')
      .select(ACCOUNT_FIELDS)
      .eq('org_id', org.id)
      .order('created_at'),
    getSetupProgress(supabase, org.id),
  ])

  const accounts = (accountsResult.data ?? []) as AccountView[]

  return (
    <>
      <PageHeader
        title="Hesaplar"
        description="Her satır ayrı WhatsApp hattı. QR veya telefon koduyla bağlayın."
        action={
          <div className="flex flex-wrap gap-2">
            <AccentLink href="/hizli-gonderim">Hızlı gönderim</AccentLink>
            <QuietLink href="/durum">Durum</QuietLink>
          </div>
        }
      />

      <SetupBanner progress={setup} />

      <AccountsBoard
        initial={accounts}
        orgId={org.id}
        accountsQuota={org.accounts_quota}
      />
    </>
  )
}
