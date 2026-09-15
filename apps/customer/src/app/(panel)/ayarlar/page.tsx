import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Notice, PageHeader } from '@/components/ui'
import { Icon } from '@/components/icon'
import { Wordmark } from '@/components/brand'
import { requireActiveOrg, listUserOrgs } from '@/lib/org'
import { CONTACT_EMAIL } from '@/lib/contact'
import { signOut } from '@/app/giris/actions'
import { OrgSwitcher } from '../org-switcher'
import { SETTINGS_SECTIONS } from './sections'

export const metadata: Metadata = { title: 'Ayarlar' }

const GROUPS = ['Hesap', 'Gizlilik', 'İş', 'Diğer']

export default async function SettingsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string | string[] }>
}) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let email: string | null
  try {
    ;({ org, email } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const orgs = await listUserOrgs()

  const params = await searchParams
  const billingRaw = params.billing
  const billing =
    typeof billingRaw === 'string'
      ? billingRaw
      : Array.isArray(billingRaw)
        ? billingRaw[0]
        : undefined

  return (
    <div className="wb-wa-page wb-wa-settings">
      <PageHeader title="Ayarlar" description="Bölüm seçin" />

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

      <section className="wb-wa-set-group">
        <p className="wb-wa-set-label">İşletme</p>
        <div className="wb-wa-set-card">
          <OrgSwitcher orgs={orgs} activeOrgId={org.id} variant="settings" />
        </div>
      </section>

      {GROUPS.map((group) => {
        const items = SETTINGS_SECTIONS.filter((section) => section.group === group)
        if (items.length === 0) return null
        return (
          <section key={group} className="wb-wa-set-group">
            <p className="wb-wa-set-label">{group}</p>
            <div className="wb-wa-set-card">
              {items.map((section) => (
                <Link key={section.href} href={section.href} prefetch className="wb-wa-set-row">
                  <span className="wb-wa-set-icon" style={{ background: section.color }} aria-hidden>
                    <Icon name={section.icon} className="size-5" />
                  </span>
                  <span className="wb-wa-set-copy">
                    <span className="wb-wa-set-title">{section.title}</span>
                    <span className="wb-wa-set-desc">{section.description}</span>
                  </span>
                  <span className="wb-wa-set-chevron" aria-hidden>
                    ›
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )
      })}

      <section className="wb-wa-set-group">
        <p className="wb-wa-set-label">Oturum</p>
        <div className="wb-wa-set-card">
          <form action={signOut}>
            <button type="submit" className="wb-wa-set-row is-logout">
              <span className="wb-wa-set-icon" aria-hidden>
                <Icon name="logout" className="size-5" />
              </span>
              <span className="wb-wa-set-copy">
                <span className="wb-wa-set-title">Çıkış</span>
                <span className="wb-wa-set-desc">
                  {email ? `${email} · ` : ''}Hatların bağlı kalır, gönderimler durmaz.
                </span>
              </span>
            </button>
          </form>
        </div>
      </section>

      <footer className="wb-wa-set-foot">
        <Wordmark />
      </footer>
    </div>
  )
}
