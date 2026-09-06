import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Wordmark } from '@/components/brand'
import { QuietLink } from '@/components/ui'
import { contactMailto, CONTACT_EMAIL } from '@/lib/contact'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Davet' }

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token: _token } = await params
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/giris')
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md rounded-lg border border-hairline bg-surface p-6 shadow-[var(--shadow-card)]">
        <Wordmark />
        <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-ink">
          Davetler şu an kapalı
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
          İşletme daveti kabulü geçici olarak devre dışı. Hesap veya erişim için Filo’ya
          yazın.
        </p>
        <p className="mt-4 text-[12.5px] text-ink-muted">
          <a
            href={contactMailto('Filo işletme erişimi')}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
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
