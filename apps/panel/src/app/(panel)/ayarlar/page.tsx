import type { Metadata } from 'next'
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
  QuietLink,
} from '@/components/ui'
import { activeImageProviders } from '@/lib/ai/image'
import { activeTextProviders } from '@/lib/ai/text'
import { capToday } from '@/lib/capacity'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { requireActiveOrg } from '@/lib/org'
import { signOut } from '@/app/giris/actions'
import { MembersPanel, OrgSettingsForm, WebhookSettingsForm } from './org-forms'
import { ProfileForm } from './profile-form'
import { planLabel } from '@wa/shared'
import { BillingCheckoutButton } from './billing-checkout-button'
import { ApiKeyForm } from './api-key-form'

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
  const { messages } = await getDictionary()

  const [
    { data: profile },
    { data: accounts },
    { count: sentThisMonth },
    { data: memberRows },
    { data: apiKeyRows },
  ] = await Promise.all([
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
  const plan = org.plan
  const accountsQuota = org.accounts_quota
  const messageQuota = org.monthly_message_quota
  const usedAccounts = accounts?.length ?? 0
  const usedMessages = sentThisMonth ?? 0
  const connectedCount = (accounts ?? []).filter((a) => a.status === 'connected').length

  const memberIds = (memberRows ?? []).map((row) => row.user_id)
  const { data: memberProfiles } =
    memberIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', memberIds)
      : { data: [] as { id: string; full_name: string | null; email: string | null }[] }

  const profileById = Object.fromEntries(
    (memberProfiles ?? []).map((row) => [row.id, row]),
  )

  const members = (memberRows ?? []).map((row) => {
    const memberProfile = profileById[row.user_id]
    const isSelf = row.user_id === userId
    return {
      userId: row.user_id,
      email: memberProfile?.email ?? (isSelf ? (user.email ?? null) : null),
      fullName:
        memberProfile?.full_name ?? (isSelf ? (profile?.full_name ?? null) : null),
      role: row.role,
    }
  })

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

  const profileIncomplete = !profile?.full_name?.trim()

  return (
    <div className="filo-fade-in">
      <PageHeader
        title={t('pages.ayarlarTitle')}
        description="İşletme adı, ekip, profil ve kota. Gönderim hatları Hesaplar’da; kuyruk Durum’da."
        action={
          <span className="text-[12px] text-ink-muted">
            Rolünüz: {ROLE_HINT[org.role] ?? org.role}
          </span>
        }
      />

      {billing === 'ok' ? (
        <div className="mb-4">
          <Notice tone="success">
            Ödeme tamamlandı. Paketiniz kısa süre içinde güncellenir.
          </Notice>
        </div>
      ) : null}
      {billing === 'cancel' ? (
        <div className="mb-4">
          <Notice tone="warn">Ödeme iptal edildi. Paketiniz değişmedi.</Notice>
        </div>
      ) : null}

      {profileIncomplete || connectedCount === 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-card)] border border-hairline bg-surface px-3.5 py-2.5">
          <span className="text-[11.5px] font-medium tracking-wide text-ink-faint uppercase">
            Kurulum
          </span>
          {connectedCount === 0 ? (
            <Link
              href="/hesaplar"
              className="text-[12.5px] text-ink-muted underline decoration-hairline-strong underline-offset-2 hover:text-ink"
            >
              WhatsApp hattı bağla
            </Link>
          ) : (
            <span className="text-[12.5px] text-ink-faint line-through">
              WhatsApp hattı bağla
            </span>
          )}
          {profileIncomplete ? (
            <a
              href="#profil"
              className="text-[12.5px] text-ink-muted underline decoration-hairline-strong underline-offset-2 hover:text-ink"
            >
              Profili tamamla
            </a>
          ) : (
            <span className="text-[12.5px] text-ink-faint line-through">
              Profili tamamla
            </span>
          )}
          <Link
            href="/marka-kiti"
            className="text-[12.5px] text-ink-muted underline decoration-hairline-strong underline-offset-2 hover:text-ink"
          >
            Marka kitini ayarla
          </Link>
        </div>
      ) : null}

      <div className="grid gap-2.5 lg:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <Card>
            <CardHeader
              title="İşletme"
              subtitle={org.slug}
              action={
                canManage ? null : (
                  <span className="text-[11.5px] text-ink-faint">Salt okunur</span>
                )
              }
            />
            <OrgSettingsForm orgName={org.name} canEdit={canManage} />
          </Card>

          <Card>
            <CardHeader
              title="Entegrasyonlar"
              subtitle="CRM webhook · otomatik yanıt · faturalama"
            />
            <WebhookSettingsForm
              webhookUrl={org.webhook_url ?? null}
              canEdit={canManage}
            />
            <div className="flex flex-wrap gap-2 border-t border-hairline px-3.5 py-2.5">
              <QuietLink href="/ayarlar/otomatik-yanit">Otomatik yanıt kuralları</QuietLink>
              <QuietLink href="/raporlar">Raporlar / CSV</QuietLink>
              {canManage ? <BillingCheckoutButton /> : null}
            </div>
            <ApiKeyForm
              canEdit={canManage}
              keys={(apiKeyRows ?? []) as {
                id: string
                name: string
                key_prefix: string
                last_used_at: string | null
                created_at: string
              }[]}
            />
          </Card>

          <Card>
            <CardHeader
              title="Ekip"
              subtitle={
                members.length === 1
                  ? '1 üye · yalnızca siz'
                  : `${members.length} üye`
              }
            />
            <MembersPanel members={members} canManage={canManage} />
          </Card>

          <div id="profil" className="scroll-mt-6">
            <Card>
              <CardHeader
                title="Profil"
                subtitle="Panelde görünen adınız ve firma bilginiz."
              />
              <ProfileForm
                fullName={profile?.full_name ?? ''}
                company={profile?.company ?? ''}
                email={user.email ?? ''}
              />
            </Card>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <Card>
            <CardHeader
              title="Paket"
              action={<Badge tone="accent">{planLabel(plan)}</Badge>}
            />

            <div className="space-y-2.5 p-3.5">
              <QuotaRow
                label="Hat"
                used={usedAccounts}
                total={accountsQuota}
                detail={
                  connectedCount === 0
                    ? 'Henüz bağlı hat yok — Hesaplar’dan bağlayın'
                    : `${connectedCount} bağlı · paket ${accountsQuota} hatta izin veriyor`
                }
              />
              <QuotaRow
                label="Bu ayki mesaj"
                used={usedMessages}
                total={messageQuota}
                detail="Her ayın 1’inde sıfırlanır"
              />

              <div className="border-t border-hairline pt-2.5">
                <p className="text-[12px] text-ink-muted">
                  Bağlı hatların bugünkü toplam tavanı
                </p>
                {connectedCount === 0 ? (
                  <div className="mt-2">
                    <p className="text-[13px] text-ink-faint">Hat bağlanınca hesaplanır</p>
                    <div className="mt-2.5">
                      <AccentLink href="/hesaplar" className="text-[12.5px]">
                        Hesaplara git
                      </AccentLink>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="tabular mt-1 text-[18px] font-semibold text-accent">
                      {nf.format(dailyCeiling)} mesaj
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-ink-faint">
                      Bu sayı paketinizden değil, hatlarınızın yaşından gelir. Yeni
                      bağlanan hat iki hafta boyunca kademeli açılır.
                    </p>
                  </>
                )}
              </div>
            </div>
          </Card>

          <AiProvidersCard />

          <Card>
            <CardHeader
              title="Gönderim servisi"
              subtitle="Panel komut yazar; gerçek WhatsApp bağlantısı arka planda çalışır."
            />
            <div className="space-y-2.5 p-3.5 text-[12.5px] leading-relaxed text-ink-muted">
              <p>
                Eşleştirme kodu, QR ve otomatik mesaj için WhatsApp servisinin ayakta
                olması gerekir. Servis kapalıyken işler kuyrukta bekler.
              </p>
              <QuietLink href="/durum" className="text-[12.5px]">
                Durum’da kuyruğu izle
              </QuietLink>
            </div>
          </Card>

          <Card>
            <CardHeader title="Oturum" subtitle={user.email ?? undefined} />
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5">
              <p className="max-w-sm text-[12.5px] leading-relaxed text-ink-muted">
                Çıkış yapmak bağlı hatları etkilemez; gönderim sunucuda devam eder.
              </p>
              <form action={signOut}>
                <Button type="submit" variant="danger">
                  Çıkış yap
                </Button>
              </form>
            </div>
          </Card>
        </div>
      </div>
    </div>
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
        subtitle="Anahtarlar sunucuda tutulur; buradan değiştirilmez."
      />

      <div className="space-y-2.5 p-3.5">
        <ProviderRow
          label="Görsel üretimi"
          providers={image.map((provider) => provider.label)}
          fallback="Kapalı — Marka kiti AI arka planı kullanılamaz"
        />

        <ProviderRow
          label="Metin yazdırma"
          providers={text.map((provider) => provider.label)}
          fallback="Kapalı — destekten açtırmanız gerekir"
        />

        <p className="border-t border-hairline pt-2.5 text-[11.5px] leading-relaxed text-ink-faint">
          Sağdaki isimler deneme sırasına göredir: ilki cevap vermezse sonraki
          devreye girer. Hesabınıza tanındığında burada görünür.
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
    <div className="flex items-start justify-between gap-2.5">
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
        <span className="max-w-[240px] text-right text-[11.5px] leading-snug text-ink-faint">
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
