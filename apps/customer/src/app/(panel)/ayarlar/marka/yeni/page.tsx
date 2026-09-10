import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, CardHeader, Notice } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../../settings-shell'
import { BrandKitForm } from '../brand-kit-form'

export const metadata: Metadata = { title: 'Marka kiti ekle' }

export default async function NewBrandKitPage() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ org } = await requireActiveOrg())
  } catch (error) {
    if (error instanceof Error && error.message === 'NO_ORGANIZATION') {
      redirect('/erisim-yok')
    }
    redirect('/giris')
  }

  const canManage = isOrgAdminRole(org.role)

  return (
    <SettingsPageFrame title="Yeni marka kiti" description="Renk, logo ve yazım tonu.">
      {!canManage ? (
        <Notice tone="warn">Yalnızca sahip veya yönetici kit ekleyebilir.</Notice>
      ) : (
        <Card>
          <CardHeader title="Kit bilgileri" />
          <BrandKitForm canEdit />
        </Card>
      )}
    </SettingsPageFrame>
  )
}
