import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { EmptyState, PageHeader } from '@/components/ui'
import { remainingToday } from '@/lib/capacity'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { QuickSendForm, type SenderOption } from './quick-send-form'

export const metadata: Metadata = { title: 'Hizli gonderim' }

export default async function QuickSendPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const { data: accounts } = await supabase
    .from('accounts')
    .select(
      'id, label, phone_e164, daily_send_limit, sent_today, sent_today_on, warmup_started_at, new_chat_quota_total, new_chat_quota_used',
    )
    .eq('status', 'connected')
    .eq('enabled', true)
    .eq('is_locked', false)
    .order('created_at')

  const senders: SenderOption[] = (accounts ?? []).map((account) => ({
    id: account.id,
    label: account.label,
    phone: account.phone_e164,
    remainingToday: remainingToday(account),
  }))

  return (
    <>
      <PageHeader
        title="Hizli gonderim"
        description="Numaralari yapistirin, mesaji ve gorseli ekleyin, gonderin. Arka planda bir kampanya olusturulur ve hemen baslar."
      />

      {senders.length === 0 ? (
        <div className="rounded-[10px] border border-hairline bg-surface">
          <EmptyState
            title="Once bir hat baglayin"
            description="Hizli gonderim icin en az bir bagli WhatsApp hatti gerekiyor. Hesaplar sekmesinden QR ile baglayabilirsiniz."
            action={
              <Link
                href="/hesaplar"
                className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-dim"
              >
                Hesaplara git
              </Link>
            }
          />
        </div>
      ) : (
        <QuickSendForm senders={senders} userId={user.id} />
      )}
    </>
  )
}
