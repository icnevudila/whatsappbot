import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { requireActiveOrg } from '@/lib/org'
import { BlacklistBoard } from '../../kara-liste/blacklist-board'
import { SettingsPageFrame } from '../settings-shell'

export const metadata: Metadata = { title: 'Engellenen numaralar' }
export const dynamic = 'force-dynamic'

export default async function BlockedNumbersPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const { data } = await supabase
    .from('blacklist')
    .select('id, phone_e164, reason, created_at')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <SettingsPageFrame wide title="Engellenen numaralar">
      <BlacklistBoard initial={data ?? []} />
    </SettingsPageFrame>
  )
}
