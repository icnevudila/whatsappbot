import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Notice, PageHeader } from '@/components/ui'
import { Icon } from '@/components/icon'
import { requireActiveOrg } from '@/lib/org'
import { CONTACT_EMAIL } from '@/lib/contact'
import { SETTINGS_SECTIONS } from './sections'

export const metadata: Metadata = { title: 'Ayarlar' }

export default async function SettingsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string | string[] }>
}) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ org } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const params = await searchParams
  const billingRaw = params.billing
  const billing =
    typeof billingRaw === 'string'
      ? billingRaw
      : Array.isArray(billingRaw)
        ? billingRaw[0]
        : undefined

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      <PageHeader title="Ayarlar" description={`${org.name} · bölüm seçin`} />

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

      <div className="grid gap-2 sm:grid-cols-2">
        {SETTINGS_SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            prefetch
            className="wb-card-lift flex items-start gap-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)] transition-colors hover:border-accent/35 hover:bg-accent-soft/30"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-ink-muted">
              <Icon name={section.icon} className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[14.5px] font-bold text-ink">{section.title}</span>
              <span className="mt-0.5 block text-[12.5px] text-ink-muted">{section.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
