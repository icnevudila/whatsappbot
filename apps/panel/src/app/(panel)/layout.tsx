import Link from 'next/link'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Wordmark } from '@/components/brand'
import { FeedbackProviders } from '@/components/feedback-providers'
import { LocaleSwitcher } from '@/components/locale-switcher'
import { MessageLiveToast } from '@/components/message-live-toast'
import { RouteProgress } from '@/components/route-progress'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { listUserOrgs, requireActiveOrg } from '@/lib/org'
import { getSetupProgress, isOnboardingAllowedPath } from '@/lib/setup-progress'
import { signOut } from '@/app/giris/actions'
import { Nav } from './nav'
import { OrgSwitcher } from './org-switcher'
import { PushRegistrar } from '@/components/push-registrar'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
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

  const [{ showSetup, allDone }, orgs, { messages }] = await Promise.all([
    getSetupProgress(org.id),
    listUserOrgs(),
    getDictionary(),
  ])
  const t = createT(messages)

  const pathname = (await headers()).get('x-filo-pathname') ?? ''

  // Zorunlu onboarding: hazır değilse yalnızca kurulum yolları.
  // Pathname yoksa (proxy header eksik) bilinen yolu engelleyemeyiz; boşken
  // /kurulum'a redirect etmek sonsuz döngü yapar. Proxy her istekte set eder.
  if (showSetup && pathname && !isOnboardingAllowedPath(pathname)) {
    redirect('/kurulum')
  }

  // Kurulum bittiyse checklist sayfasından kampanyaya yönlendir (yeniden girerse).
  if (allDone && pathname === '/kurulum') {
    redirect('/kampanyalar?hazir=1')
  }

  return (
    <FeedbackProviders>
      <PushRegistrar enabled />
      <MessageLiveToast orgId={org.id} />
      <div className="flex min-h-dvh bg-canvas">
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>

        <aside className="wb-rail hidden w-[248px] shrink-0 flex-col border-r border-hairline bg-surface md:flex">
          <div className="border-b border-hairline px-3 py-3">
            <Link
              href={showSetup ? '/kurulum' : '/ozet'}
              className="flex items-center px-1.5 transition-opacity hover:opacity-80"
            >
              <Wordmark />
            </Link>
            <div className="mt-3">
              <OrgSwitcher orgs={orgs} activeOrgId={org.id} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            <Nav showSetup={showSetup} onboardingLock={showSetup} />
          </div>

          <div className="border-t border-hairline px-3 py-3">
            <div className="mb-2">
              <LocaleSwitcher compact />
            </div>
            <p className="mb-1.5 truncate text-[11px] text-ink-faint" title={email ?? ''}>
              {email}
            </p>
            <form action={signOut}>
              <button
                type="submit"
                className="text-[12px] font-medium text-ink-muted transition-colors hover:text-danger"
              >
                {t('common.signOut')}
              </button>
            </form>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-b border-hairline bg-surface px-3 py-2 md:hidden">
            <div className="mb-2 flex items-center justify-between gap-3">
              <Link href={showSetup ? '/kurulum' : '/ozet'} className="flex items-center">
                <Wordmark />
              </Link>
              <div className="flex items-center gap-2">
                <LocaleSwitcher compact />
                <form action={signOut}>
                  <button
                    type="submit"
                    className="text-[11.5px] text-ink-muted transition-colors hover:text-danger"
                  >
                    {t('common.signOutShort')}
                  </button>
                </form>
              </div>
            </div>
            <div className="mb-2">
              <OrgSwitcher orgs={orgs} activeOrgId={org.id} />
            </div>
            <Nav showSetup={showSetup} onboardingLock={showSetup} orientation="horizontal" />
          </div>

          <header className="wb-topbar hidden h-[52px] shrink-0 items-center justify-between border-b border-hairline bg-surface px-5 md:flex">
            <p className="truncate text-[12.5px] font-medium text-ink-soft">{org.name}</p>
            <div className="flex items-center gap-3">
              <p className="text-[11.5px] text-ink-faint">
                {showSetup ? t('common.setupLocked') : t('common.workbench')}
              </p>
              <LocaleSwitcher compact />
            </div>
          </header>

          {org.suspended_at ? (
            <div
              role="alert"
              className="shrink-0 border-b border-danger/30 bg-[#fff5f4] px-3 py-2.5 text-[13px] text-danger md:px-5"
            >
              Bu işletme askıda
              {org.suspend_reason ? ` (${org.suspend_reason})` : ''}. Gönderim ve kampanyalar
              kapalı. Destek: destek@filo.app
            </div>
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 py-4 md:px-5 md:py-5">
            <div className="mx-auto flex w-full max-w-[1280px] min-h-0 flex-1 flex-col">{children}</div>
          </main>
        </div>
      </div>
    </FeedbackProviders>
  )
}
