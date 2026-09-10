import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Notice } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../settings-shell'
import { SocialBoard } from './social-board'

export const metadata: Metadata = { title: 'Sosyal medya' }
export const dynamic = 'force-dynamic'

export default async function SocialSettingsPage() {
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

  const canEdit = isOrgAdminRole(org.role)
  const { data } = await supabase
    .from('org_social_accounts')
    .select('id, platform, label, url')
    .eq('org_id', org.id)
    .order('created_at', { ascending: false })

  return (
    <SettingsPageFrame
      title="Sosyal medya"
      description="Instagram, web sitesi ve diğer hesaplar. Kampanya görsellerinde kullanılabilir."
    >
      {!canEdit ? (
        <Notice tone="warn">Görüntülüyorsunuz. Düzenleme için yönetici gerekir.</Notice>
      ) : null}
      <SocialBoard initial={data ?? []} canEdit={canEdit} />
    </SettingsPageFrame>
  )
}
