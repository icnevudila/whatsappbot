import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Wordmark } from '@/components/brand'
import { contactMailto, CONTACT_EMAIL } from '@/lib/contact'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { signOut } from '@/app/giris/actions'
import { CreateOrgForm } from './create-org-form'

export const metadata: Metadata = {
  title: 'Erişim bekleniyor',
  description: 'Hesabınız henüz bir işletmeye atanmamış.',
}

export default async function NoAccessPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/giris')

  const { data: membership } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle()

  if (membership) redirect('/ozet')

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-canvas px-5">
      <div className="w-full max-w-md rounded-lg border border-hairline bg-surface p-6 shadow-[var(--shadow-card)]">
        <Wordmark />
        <h1 className="mt-5 text-[20px] font-semibold tracking-[-0.02em] text-ink">
          İşletmenizi oluşturun
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
          <span className="font-medium text-ink">{user.email}</span> ile giriş yaptınız. Kendi
          işletmenizi ücretsiz oluşturabilir veya size gelen davet linkini kullanabilirsiniz.
        </p>
        <CreateOrgForm />
        <p className="mt-4 text-[12.5px] text-ink-muted">
          Yardım:{' '}
          <a href={contactMailto()} className="font-medium text-accent underline-offset-2 hover:underline">
            {CONTACT_EMAIL}
          </a>
        </p>
        <div className="mt-4">
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-md border border-hairline-strong px-3.5 text-[12.5px] font-medium text-ink-muted hover:bg-surface-raised hover:text-ink"
            >
              Çıkış yap
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
