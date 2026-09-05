import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Wordmark } from '@/components/brand'
import { listUserOrgs, requireActiveOrg } from '@/lib/org'
import { signOut } from '@/app/giris/actions'
import { Nav } from './nav'
import { OrgSwitcher } from './org-switcher'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch {
    redirect('/giris')
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Kurulum nav'da yalnizca henuz bitmemisse gorunur. Uc adimin hepsi
  // tamamlandiktan sonra kalabaliklastirmamak icin gizleniyor.
  const [{ count: connectedCount }, { count: contactCount }, { count: campaignCount }, orgs] =
    await Promise.all([
      supabase
        .from('accounts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .eq('status', 'connected'),
      supabase
        .from('contacts')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id),
      supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id),
      listUserOrgs(),
    ])

  const showSetup =
    (connectedCount ?? 0) === 0 ||
    (contactCount ?? 0) === 0 ||
    (campaignCount ?? 0) === 0

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[248px] shrink-0 flex-col justify-between border-r border-hairline bg-surface px-3 py-4 md:flex">
        <div>
          <Link href="/" className="mb-6 flex items-center px-2.5">
            <Wordmark />
          </Link>
          <Nav showSetup={showSetup} />
        </div>

        <div className="px-2.5">
          <OrgSwitcher orgs={orgs} activeOrgId={org.id} />
          <p className="mb-2 truncate text-[11.5px] text-ink-faint" title={user?.email ?? ''}>
            {user?.email}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="text-[12px] text-ink-muted transition-colors hover:text-danger"
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </aside>

      {/* Mobilde ustte marka + yatay gezinme */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-hairline bg-surface px-3 py-2 md:hidden">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Link href="/" className="flex items-center">
              <Wordmark />
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-[11.5px] text-ink-muted transition-colors hover:text-danger"
              >
                Çıkış
              </button>
            </form>
          </div>
          <div className="mb-2">
            <OrgSwitcher orgs={orgs} activeOrgId={org.id} />
          </div>
          <div className="overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Nav showSetup={showSetup} orientation="horizontal" />
          </div>
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="filo-fade-in mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
