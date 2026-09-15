import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, CardHeader } from '@/components/ui'
import { Icon } from '@/components/icon'
import { requireActiveOrg } from '@/lib/org'
import { signOut } from '@/app/giris/actions'
import { ProfileForm } from '../profile-form'
import { SettingsPageFrame } from '../settings-shell'

export const metadata: Metadata = { title: 'Profil' }

export default async function ProfileSettingsPage() {
  let userId: string
  let email: string | null
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, email, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company')
    .eq('id', userId)
    .single()

  return (
    <SettingsPageFrame title="Profil" description="Kişisel bilgiler ve oturum.">
      <Card>
        <CardHeader title="Hesap" subtitle={email ?? undefined} />
        <ProfileForm
          fullName={profile?.full_name ?? ''}
          company={profile?.company ?? ''}
          email={email ?? ''}
        />
      </Card>

      <Card>
        <CardHeader title="Oturum" />
        <form action={signOut}>
          <button type="submit" className="wb-wa-set-row is-logout">
            <span className="wb-wa-set-icon" aria-hidden>
              <Icon name="logout" className="size-5" />
            </span>
            <span className="wb-wa-set-copy">
              <span className="wb-wa-set-title">Çıkış</span>
              <span className="wb-wa-set-desc">Hatların bağlı kalır, gönderimler durmaz.</span>
            </span>
          </button>
        </form>
      </Card>
    </SettingsPageFrame>
  )
}
