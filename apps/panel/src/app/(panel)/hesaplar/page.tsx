import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AccountsBoard, type AccountView } from './accounts-board'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Hesaplar' }

const ACCOUNT_FIELDS =
  'id, label, phone_e164, status, status_detail, enabled, is_locked, lock_reason, qr_code, qr_expires_at, pairing_code, pairing_expires_at, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used, reachout_locked_until'

export default async function AccountsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const [accountsResult, contactsResult, campaignsResult, profileResult] = await Promise.all([
    supabase.from('accounts').select(ACCOUNT_FIELDS).order('created_at'),
    supabase.from('contacts').select('id', { count: 'exact', head: true }),
    supabase.from('campaigns').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('accounts_quota').eq('id', user.id).single(),
  ])

  const accounts = (accountsResult.data ?? []) as AccountView[]
  const hasConnected = accounts.some((account) => account.status === 'connected')
  const accountsQuota = profileResult.data?.accounts_quota ?? 40

  return (
    <>
      <PageHeader
        title="Hesaplar"
        description="Her satır ayrı bir WhatsApp numarası. Birden fazla hat bağlayıp kampanya ve hızlı gönderimde birlikte kullanabilirsiniz."
      />

      <Onboarding
        connected={hasConnected}
        hasContacts={(contactsResult.count ?? 0) > 0}
        hasCampaign={(campaignsResult.count ?? 0) > 0}
      />

      <AccountsBoard
        initial={accounts}
        userId={user.id}
        accountsQuota={accountsQuota}
      />
    </>
  )
}

/**
 * Kurulum seridi. Uc adim da tamamlaninca kayboluyor:
 * kalici bir kontrol listesi bir sure sonra gorsel gurultuye donusuyor.
 */
function Onboarding({
  connected,
  hasContacts,
  hasCampaign,
}: {
  connected: boolean
  hasContacts: boolean
  hasCampaign: boolean
}) {
  if (connected && hasContacts && hasCampaign) return null

  const steps = [
    { done: connected, label: 'WhatsApp hattı bağla', href: '/hesaplar' as string | null },
    {
      done: hasContacts || hasCampaign,
      label: 'Liste ekle veya hızlı gönder',
      href: hasContacts ? '/hizli-gonderim' : '/kisiler',
    },
    { done: hasCampaign, label: 'İlk gönderimi yap', href: '/hizli-gonderim' },
  ]

  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[10px] border border-hairline bg-surface px-4 py-3">
      <span className="text-[11.5px] font-medium tracking-wide text-ink-faint uppercase">
        Kurulum
      </span>

      {steps.map((step, index) => (
        <div key={step.label} className="flex items-center gap-2">
          <span
            className={`grid size-4 shrink-0 place-items-center rounded-full border text-[9px] ${
              step.done
                ? 'border-accent/40 bg-accent/15 text-accent'
                : 'border-hairline-strong text-ink-faint'
            }`}
          >
            {step.done ? '✓' : index + 1}
          </span>

          {step.href && !step.done ? (
            <Link
              href={step.href}
              className="text-[12.5px] text-ink-muted underline decoration-hairline-strong underline-offset-2 transition-colors hover:text-ink"
            >
              {step.label}
            </Link>
          ) : (
            <span
              className={`text-[12.5px] ${step.done ? 'text-ink-faint line-through' : 'text-ink'}`}
            >
              {step.label}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
