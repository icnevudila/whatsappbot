import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Card, CardHeader, Notice } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../../settings-shell'
import { ProductForm } from '../product-form'

export const metadata: Metadata = { title: 'Ürün ekle' }

export default async function NewProductPage() {
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
    <SettingsPageFrame title="Yeni ürün" description="Ad, açıklama, kutu içeriği ve görseller.">
      {!canManage ? (
        <Notice tone="warn">Yalnızca sahip veya yönetici ürün ekleyebilir.</Notice>
      ) : (
        <Card>
          <CardHeader title="Ürün bilgileri" />
          <ProductForm canEdit />
        </Card>
      )}
    </SettingsPageFrame>
  )
}
