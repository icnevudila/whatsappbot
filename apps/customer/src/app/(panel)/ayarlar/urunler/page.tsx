import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { EmptyState } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../settings-shell'
import { ProductsBoard } from './products-board'

export const metadata: Metadata = { title: 'Ürünlerim' }
export const dynamic = 'force-dynamic'

export default async function ProductsPage() {
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

  const canManage = isOrgAdminRole(org.role)
  const [{ data: products }, { data: imageRows }] = await Promise.all([
    supabase
      .from('org_products')
      .select('id, name, description, is_active, created_at')
      .eq('org_id', org.id)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false }),
    supabase
      .from('org_product_images')
      .select('product_id, public_url, sort_order')
      .eq('org_id', org.id)
      .order('sort_order', { ascending: true }),
  ])

  const list = products ?? []
  const imagesByProduct = new Map()
  for (const image of imageRows ?? []) {
    if (!imagesByProduct.has(image.product_id)) {
      imagesByProduct.set(image.product_id, image.public_url)
    }
  }

  const cards = list.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    is_active: product.is_active,
    thumb: imagesByProduct.get(product.id) ?? null,
  }))

  return (
    <SettingsPageFrame
      wide
      title="Ürünlerim"
      description="Görsel üretmede kullanacağınız tüm ürünleri buraya ekleyin."
      action={
        canManage ? (
          <Link href="/ayarlar/urunler/yeni" className="wb-wa-text-btn">
            Ürün ekle
          </Link>
        ) : undefined
      }
    >
      {cards.length === 0 ? (
        <EmptyState
          tone="generic"
          title="Henüz ürün yok"
          description="Kampanya görseli üretirken kullanılacak ürünleri ekleyin."
          action={
            canManage ? (
              <Link href="/ayarlar/urunler/yeni" className="wb-wa-text-btn">
                İlk ürünü ekle
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ProductsBoard products={cards} canManage={canManage} />
      )}
    </SettingsPageFrame>
  )
}
