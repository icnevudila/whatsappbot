import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, CardHeader, Meter, PageHeader } from '@/components/ui'
import { capToday } from '@/lib/capacity'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/app/giris/actions'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = { title: 'Ayarlar' }

const PLAN_LABELS: Record<string, string> = {
  free: 'Deneme',
  starter: 'Baslangic',
  pro: 'Buyume',
  enterprise: 'Ajans',
}

const nf = new Intl.NumberFormat('tr-TR')

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [{ data: profile }, { data: accounts }, { count: sentThisMonth }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, company, plan, accounts_quota, monthly_message_quota')
        .eq('id', user.id)
        .single(),
      supabase
        .from('accounts')
        .select('id, status, daily_send_limit, warmup_started_at'),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'out')
        .gte('created_at', monthStart.toISOString()),
    ])

  const plan = profile?.plan ?? 'free'
  const accountsQuota = profile?.accounts_quota ?? 1
  const messageQuota = profile?.monthly_message_quota ?? 1_000
  const usedAccounts = accounts?.length ?? 0
  const usedMessages = sentThisMonth ?? 0

  // Gunluk teorik tavan: paketin degil, bagli hatlarin gercek toplami.
  const dailyCeiling = (accounts ?? [])
    .filter((account) => account.status === 'connected')
    .reduce(
      (total, account) =>
        total +
        capToday({
          daily_send_limit: account.daily_send_limit,
          sent_today: 0,
          sent_today_on: null,
          warmup_started_at: account.warmup_started_at,
        }),
      0,
    )

  return (
    <>
      <PageHeader
        title="Ayarlar"
        description="Profil bilgileri, paketiniz ve kota kullaniminiz."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profil" />
          <ProfileForm
            fullName={profile?.full_name ?? ''}
            company={profile?.company ?? ''}
            email={user.email ?? ''}
          />
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Paket"
              action={
                <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-0.5 text-[11.5px] font-medium text-accent">
                  {PLAN_LABELS[plan] ?? plan}
                </span>
              }
            />

            <div className="space-y-4 p-4">
              <QuotaRow
                label="Hat"
                used={usedAccounts}
                total={accountsQuota}
                detail={`Paketiniz ${accountsQuota} hatta izin veriyor`}
              />
              <QuotaRow
                label="Bu ayki mesaj"
                used={usedMessages}
                total={messageQuota}
                detail="Her ayin 1'inde sifirlanir"
              />

              <div className="border-t border-hairline pt-3.5">
                <p className="text-[12px] text-ink-muted">
                  Bagli hatlarin bugunku toplam tavani
                </p>
                <p className="tabular mt-1 text-[18px] font-semibold text-accent">
                  {nf.format(dailyCeiling)} mesaj
                </p>
                <p className="mt-1 text-[11.5px] text-ink-faint">
                  Bu sayi paketinizden degil, hatlarinizin yasindan geliyor. Yeni
                  baglanan hat iki hafta boyunca kademeli olarak acilir.
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Oturum" />
            <div className="flex items-center justify-between gap-4 p-4">
              <p className="text-[12.5px] text-ink-muted">
                Cikis yapmak bagli hatlari etkilemez; gonderim sunucuda devam eder.
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-8 shrink-0 items-center rounded-md border border-danger/40 px-3 text-[12.5px] font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  Cikis yap
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

function QuotaRow({
  label,
  used,
  total,
  detail,
}: {
  label: string
  used: number
  total: number
  detail: string
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
      <p className="mt-1 text-[11.5px] text-ink-faint">{detail}</p>
    </div>
  )
}
