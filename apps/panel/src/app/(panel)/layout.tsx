import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/app/giris/actions'
import { Nav } from './nav'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Middleware zaten koruyor; burasi ikinci kapi (dogrudan render edilirse).
  if (!user) redirect('/giris')

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-[196px] shrink-0 flex-col justify-between border-r border-hairline px-3 py-4 md:flex">
        <div>
          <div className="mb-6 flex items-center gap-2 px-2.5">
            <span className="size-2 rounded-full bg-accent" />
            <span className="text-[12.5px] font-semibold">Toplu Gonderim</span>
          </div>
          <Nav />
        </div>

        <div className="px-2.5">
          <p className="mb-2 truncate text-[11.5px] text-ink-faint" title={user.email ?? ''}>
            {user.email}
          </p>
          <form action={signOut}>
            <button
              type="submit"
              className="text-[12px] text-ink-muted transition-colors hover:text-danger"
            >
              Cikis yap
            </button>
          </form>
        </div>
      </aside>

      {/* Mobilde ustte yatay gezinme. */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 border-b border-hairline px-3 py-2 md:hidden">
          <Nav />
        </div>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
