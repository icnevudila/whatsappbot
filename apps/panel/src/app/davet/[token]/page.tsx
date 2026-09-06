import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Wordmark } from '@/components/brand'
import { QuietLink } from '@/components/ui'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AcceptInviteButton } from './accept-button'

export const metadata: Metadata = { title: 'Davet' }

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/giris?devam=${encodeURIComponent(`/davet/${token}`)}`)
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md rounded-lg border border-hairline bg-surface p-6 shadow-[var(--shadow-card)]">
        <Wordmark />
        <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-ink">
          İşletme daveti
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
          Daveti kabul ederek işletmeye katılın. Oturum e-postanız davetle eşleşmeli.
        </p>
        <div className="mt-5">
          <AcceptInviteButton token={token} />
        </div>
        <div className="mt-6">
          <QuietLink href="/ozet">Panele dön</QuietLink>
        </div>
        <p className="mt-3 text-[12px] text-ink-faint">
          Oturum: {user.email} ·{' '}
          <Link href="/yardim" className="underline">
            Yardım
          </Link>
        </p>
      </div>
    </main>
  )
}
