import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Badge, Card, CardHeader, Meter, PageHeader } from '@/components/ui'
import { activeImageProviders } from '@/lib/ai/image'
import { activeTextProviders } from '@/lib/ai/text'
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

          <AiProvidersCard />

          <Card>
            <CardHeader
              title="Gonderim servisi"
              subtitle="Panel komut yazar; gercek WhatsApp baglantisi wa-service uzerinden gider."
            />
            <div className="space-y-2 p-4 text-[12.5px] leading-relaxed text-ink-muted">
              <p>
                Eslestirme kodu, QR ve otomatik mesaj gondermek icin WhatsApp
                servisinin ayakta olmasi gerekir. Servis kapaliyken isler
                kuyrukta bekler.
              </p>
              <p className="text-[11.5px] text-ink-faint">
                Yerel: <code className="text-ink">npm run dev:service</code>
                {' · '}
                Canli izleme: Genel durum sayfasindaki kuyruk uyarisi.
              </p>
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

/**
 * Hangi yapay zeka saglayicilarinin acik oldugunu gosterir.
 *
 * Anahtarlar sunucu tarafinda, cevre degiskeninde tutuluyor; buradan
 * duzenlenmiyor. Amac "gorsel neden uretilmiyor" ya da "metin yazdirma
 * dugmesi nerede" sorusuna bakilacak tek bir yer olmasi -- yoksa cevap
 * sunucu gunluklerine gomulu kaliyor.
 */
function AiProvidersCard() {
  const image = activeImageProviders()
  const text = activeTextProviders()

  return (
    <Card>
      <CardHeader
        title="Yapay zeka"
        subtitle="Anahtarlar sunucuda tutulur, buradan degistirilmez."
      />

      <div className="space-y-3.5 p-4">
        <ProviderRow
          label="Gorsel uretimi"
          providers={image.map((provider) => provider.label)}
          // Pollinations anahtar istemedigi icin bu liste hicbir zaman bos
          // kalmiyor; gorsel uretimi her kurulumda calisir durumda.
          fallback="Kapali"
        />

        <ProviderRow
          label="Metin yazdirma"
          providers={text.map((provider) => provider.label)}
          fallback="Kapali — OPENAI_API_KEY veya GEMINI_API_KEY ekleyin"
        />

        <p className="border-t border-hairline pt-3 text-[11.5px] leading-relaxed text-ink-faint">
          Sagdaki isimler deneme sirasina gore listelenir: ilki cevap vermezse
          sonraki devreye girer. Anahtar eklemek icin sunucunun ortam
          degiskenlerini guncelleyip yeniden baslatmak yeterli.
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
