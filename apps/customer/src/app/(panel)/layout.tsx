import Link from 'next/link'
import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Wordmark } from '@/components/brand'
import { FeedbackProviders } from '@/components/feedback-providers'
import { MessageLiveToast } from '@/components/message-live-toast'
import { RouteProgress } from '@/components/route-progress'
import { listUserOrgs, requireActiveOrg } from '@/lib/org'
import { loadOnboardingSnapshot } from '@/lib/onboarding-state'
import { signOut } from '@/app/giris/actions'
import { Nav } from './nav'
import { OrgSwitcher } from './org-switcher'
import { MobileChrome } from './mobile-chrome'

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let email: string | null
  let isOnboarded = false
  try {
    const res = await requireActiveOrg()
    org = res.org
    email = res.email
    isOnboarded = res.isOnboarded
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  // Kullanıcı onboarding'i tamamlamışsa ağır snapshot sorgularını atla
  const [orgs, onboarding] = await Promise.all([
    listUserOrgs(),
    isOnboarded ? Promise.resolve(null) : loadOnboardingSnapshot(),
  ])
  if (onboarding && !onboarding.complete) {
    redirect(`/erisim-yok?adim=${onboarding.furthest}`)
  }

  return (
    <FeedbackProviders>
      <MessageLiveToast orgId={org.id} />
      <div className="flex min-h-dvh bg-canvas">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>

        <aside className="wb-rail hidden w-[220px] shrink-0 flex-col border-r border-hairline bg-surface md:flex">
          <div className="flex h-[52px] shrink-0 items-center border-b border-hairline px-3">
            <Link href="/ozet" className="flex items-center px-1.5 transition-opacity hover:opacity-80">
              <Wordmark />
            </Link>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            <Nav />
          </div>

          <div className="border-t border-hairline px-3 py-3">
            <p className="mb-1.5 truncate text-[11px] text-ink-faint" title={email ?? ''}>
              {email}
            </p>
            <form action={signOut}>
              <button
                type="submit"
                className="text-[12px] font-medium text-ink-muted transition-colors hover:text-danger"
              >
                Çıkış
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <MobileChrome
            homeHref="/ozet"
            orgName={org.name}
            email={email}
            orgs={orgs}
            activeOrgId={org.id}
            signOutAction={signOut}
          />

          <header className="wb-topbar hidden h-[52px] shrink-0 items-center justify-between gap-3 border-b border-hairline bg-surface px-5 md:flex">
            <OrgSwitcher orgs={orgs} activeOrgId={org.id} />
            <p className="shrink-0 text-[12px] text-ink-faint">Müşteri paneli</p>
          </header>

          {org.suspended_at ? (
            <div
              role="alert"
              className="shrink-0 border-b border-danger/30 bg-[#fff5f4] px-3 py-2.5 text-[13px] text-danger md:px-5"
            >
              Bu işletme askıda
              {org.suspend_reason ? ` (${org.suspend_reason})` : ''}. Gönderim kapalı. Destek:
              destek@filo.app
            </div>
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-4 md:px-5 md:py-5">
            <div className="mx-auto flex w-full max-w-[960px] min-h-0 flex-1 flex-col">{children}</div>
          </main>
        </div>
      </div>
    </FeedbackProviders>
  )
}
