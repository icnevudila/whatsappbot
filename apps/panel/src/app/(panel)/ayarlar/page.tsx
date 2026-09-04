import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Badge, Card, CardHeader, Meter, PageHeader } from '@/components/ui'
import { activeImageProviders } from '@/lib/ai/image'
import { activeTextProviders } from '@/lib/ai/text'
import { capToday } from '@/lib/capacity'
import { requireActiveOrg } from '@/lib/org'
import { signOut } from '@/app/giris/actions'
import { MembersPanel, OrgSettingsForm } from './org-forms'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = { title: 'Ayarlar' }

const PLAN_LABELS: Record<string, string> = {
  free: 'Deneme',
  starter: 'Başlangıç',
  pro: 'Büyüme',
  enterprise: 'Ajans',
}

const nf = new Intl.NumberFormat('tr-TR')

export default async function SettingsPage() {
  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/giris')

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const canManage = org.role === 'owner' || org.role === 'admin'

  const [{ data: profile }, { data: accounts }, { count: sentThisMonth }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('full_name, company')
        .eq('id', userId)
        .single(),
      supabase
        .from('accounts')
        .select('id, status, daily_send_limit, warmup_started_at')
        .eq('org_id', org.id),
      supabase
        .from('message_log')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('direction', 'out')
        .gte('created_at', monthStart.toISOString()),
      supabase
        .from('organization_members')
        .select('user_id, role')
        .eq('org_id', org.id)
        .order('created_at', { ascending: true }),
    ])

  const plan = org.plan
  const accountsQuota = org.accounts_quota
  const messageQuota = org.monthly_message_quota
  const usedAccounts = accounts?.length ?? 0
  const usedMessages = sentThisMonth ?? 0

  const members = (memberRows ?? []).map((row) => ({
    userId: row.user_id,
    email: row.user_id === userId ? (user.email ?? null) : null,
    fullName: row.user_id === userId ? (profile?.full_name ?? null) : null,
    role: row.role,
  }))

  // Günlük teorik tavan: paketin değil, bağlı hatların gerçek toplamı.
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
        description="İşletme, ekip, profil ve kota kullanımınız."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="İşletme" subtitle={org.slug} />
            <OrgSettingsForm orgName={org.name} canEdit={canManage} />
          </Card>

          <Card>
            <CardHeader title="Ekip" subtitle={`${members.length} üye`} />
            <MembersPanel members={members} canManage={canManage} />
          </Card>

          <Card>
            <CardHeader title="Profil" />
            <ProfileForm
              fullName={profile?.full_name ?? ''}
              company={profile?.company ?? ''}
              email={user.email ?? ''}
            />
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader
              title="Paket"
              action={<Badge tone="accent">{PLAN_LABELS[plan] ?? plan}</Badge>}
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
                detail="Her ayın 1'inde sıfırlanır"
              />

              <div className="border-t border-hairline pt-3.5">
                <p className="text-[12px] text-ink-muted">
                  Bağlı hatların bugünkü toplam tavanı
                </p>
                <p className="tabular mt-1 text-[18px] font-semibold text-accent">
                  {nf.format(dailyCeiling)} mesaj
                </p>
                <p className="mt-1 text-[11.5px] text-ink-faint">
                  Bu sayı paketinizden değil, hatlarınızın yaşından geliyor. Yeni
                  bağlanan hat iki hafta boyunca kademeli olarak açılır.
                </p>
              </div>
            </div>
          </Card>

          <AiProvidersCard />

          <Card>
            <CardHeader
              title="Gönderim servisi"
              subtitle="Panel komut yazar; gerçek WhatsApp bağlantısı arka planda çalışır."
            />
            <div className="space-y-2 p-4 text-[12.5px] leading-relaxed text-ink-muted">
              <p>
                Eşleştirme kodu, QR ve otomatik mesaj göndermek için WhatsApp
                servisinin ayakta olması gerekir. Servis kapalıyken işler
                kuyrukta bekler.
              </p>
              <p className="text-[11.5px] text-ink-faint">
                Canlı izleme: Durum sayfasındaki kuyruk ve hat özeti.
              </p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Oturum" />
            <div className="flex items-center justify-between gap-4 p-4">
              <p className="text-[12.5px] text-ink-muted">
                Çıkış yapmak bağlı hatları etkilemez; gönderim sunucuda devam eder.
              </p>
              <form action={signOut}>
                <button
                  type="submit"
                  className="inline-flex h-8 shrink-0 items-center rounded-md border border-danger/40 px-3 text-[12.5px] font-medium text-danger transition-colors hover:bg-danger/10"
                >
                  Çıkış yap
                </button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}

/**
 * Hangi yapay zeka sağlayıcılarının açık olduğunu gösterir.
 *
 * Anahtarlar sunucu tarafında, çevre değişkeninde tutuluyor; buradan
 * düzenlenmiyor. Amaç "görsel neden üretilmiyor" ya da "metin yazdırma
 * düğmesi nerede" sorusuna bakılacak tek bir yer olması.
 */
function AiProvidersCard() {
  const image = activeImageProviders()
  const text = activeTextProviders()

  return (
    <Card>
      <CardHeader
        title="Yapay zeka"
        subtitle="Anahtarlar sunucuda tutulur, buradan değiştirilmez."
      />

      <div className="space-y-3.5 p-4">
        <ProviderRow
          label="Görsel üretimi"
          providers={image.map((provider) => provider.label)}
          fallback="Kapalı"
        />

        <ProviderRow
          label="Metin yazdırma"
          providers={text.map((provider) => provider.label)}
          fallback="Kapalı — destekten açtırmanız gerekir"
        />

        <p className="border-t border-hairline pt-3 text-[11.5px] leading-relaxed text-ink-faint">
          Sağdaki isimler deneme sırasına göre listelenir: ilki cevap vermezse
          sonraki devreye girer. Metin yazdırma ve görsel üretimi hesabınıza
          tanındığında burada görünür.
        </p>
      </div>
    </Card>
  )
}

function ProviderRow({
  label,
  providers,
  fallback,
}: {
  label: string
  providers: string[]
  fallback: string
}) {
  const active = providers.length > 0

  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[12.5px]">{label}</span>

      {active ? (
        <span className="flex flex-wrap justify-end gap-1.5">
          {providers.map((name, index) => (
            <span
              key={name}
              className={`rounded-full border px-2 py-0.5 text-[11.5px] font-medium ${
                index === 0
                  ? 'border-accent/35 bg-accent/10 text-accent'
                  : 'border-hairline-strong bg-surface-raised text-ink-muted'
              }`}
            >
              {name}
            </span>
          ))}
        </span>
      ) : (
        <span className="max-w-[220px] text-right text-[11.5px] text-ink-faint">
          {fallback}
        </span>
      )}
    </div>
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
