import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Card, CardHeader, Notice } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../../settings-shell'
import { DeleteProductButton } from '../delete-button'
import { ProductForm } from '../product-form'

export const metadata: Metadata = { title: 'Ürün' }
export const dynamic = 'force-dynamic'

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  const [{ data: product }, { data: imageRows }] = await Promise.all([
    supabase
      .from('org_products')
      .select('id, name, description, box_contents, is_active')
      .eq('org_id', org.id)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('org_product_images')
      .select('id, public_url')
      .eq('org_id', org.id)
      .eq('product_id', id)
      .order('sort_order', { ascending: true }),
  ])

  if (!product) notFound()

  const canManage = isOrgAdminRole(org.role)
  const images = imageRows ?? []

  return (
    <SettingsPageFrame
      title={product.name}
      description="Ürünü düzenleyin, görselleri önizleyin."
      action={canManage ? <DeleteProductButton id={product.id} name={product.name} /> : undefined}
    >
      {!canManage ? (
        <Notice tone="warn">Görüntülüyorsunuz. Düzenleme için yönetici gerekir.</Notice>
      ) : null}
      <Card>
        <CardHeader title="Düzenle" />
        <ProductForm
          canEdit={canManage}
          images={images}
          product={{
            id: product.id,
            name: product.name,
            description: product.description ?? '',
            boxContents: product.box_contents ?? '',
            isActive: product.is_active,
          }}
        />
      </Card>
    </SettingsPageFrame>
  )
}
