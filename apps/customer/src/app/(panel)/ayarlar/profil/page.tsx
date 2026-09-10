import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Button, Card, CardHeader } from '@/components/ui'
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
        <div className="flex flex-wrap items-center justify-between gap-2 p-3.5">
          <p className="text-[12.5px] text-ink-muted">
            Çıkış hatları kesmez; gönderim sunucuda sürer.
          </p>
          <form action={signOut}>
            <Button type="submit" variant="danger">
              Çıkış yap
            </Button>
          </form>
        </div>
      </Card>
    </SettingsPageFrame>
  )
}
