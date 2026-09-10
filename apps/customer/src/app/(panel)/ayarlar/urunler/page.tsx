import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AccentLink, Badge, Card, EmptyState } from '@/components/ui'
import { requireActiveOrg, isOrgAdminRole } from '@/lib/org'
import { SettingsPageFrame } from '../settings-shell'
import { DeleteProductButton } from './delete-button'

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
      .select('id, name, description, is_active')
      .eq('org_id', org.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('org_product_images')
      .select('product_id, public_url, sort_order')
      .eq('org_id', org.id)
      .order('sort_order', { ascending: true }),
  ])

  const list = products ?? []
  const imagesByProduct = new Map<string, string>()
  for (const image of imageRows ?? []) {
    if (!imagesByProduct.has(image.product_id)) {
      imagesByProduct.set(image.product_id, image.public_url)
    }
  }

  return (
    <SettingsPageFrame
      wide
      title="Ürünlerim"
      description="Katalog: ad, açıklama, kutu içeriği ve görseller."
      action={canManage ? <AccentLink href="/ayarlar/urunler/yeni">Ürün ekle</AccentLink> : undefined}
    >
      {list.length === 0 ? (
        <Card>
          <EmptyState
            tone="generic"
            title="Henüz ürün yok"
            description="Ürün ekleyin, birden fazla görsel yükleyin ve aktif / pasif durumunu yönetin."
            action={canManage ? <AccentLink href="/ayarlar/urunler/yeni">İlk ürünü ekle</AccentLink> : undefined}
          />
        </Card>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((product) => {
            const thumb = imagesByProduct.get(product.id)
            return (
              <li key={product.id}>
                <div className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-surface shadow-[var(--shadow-card)]">
                  <Link href={`/ayarlar/urunler/${product.id}`} className="block">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" className="h-36 w-full object-cover bg-canvas" />
                    ) : (
                      <div className="flex h-36 items-center justify-center bg-canvas text-[12px] text-ink-faint">
                        Görsel yok
                      </div>
                    )}
                    <div className="space-y-1 p-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-ink">{product.name}</p>
                        <Badge tone={product.is_active ? 'accent' : 'neutral'}>
                          {product.is_active ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-[12.5px] text-ink-muted">
                        {product.description || 'Açıklama yok'}
                      </p>
                    </div>
                  </Link>
                  {canManage ? (
                    <div className="flex justify-end gap-2 border-t border-hairline px-3.5 py-2">
                      <AccentLink href={`/ayarlar/urunler/${product.id}`} className="h-8 text-[12.5px]">
                        Düzenle
                      </AccentLink>
                      <DeleteProductButton id={product.id} name={product.name} />
                    </div>
                  ) : null}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </SettingsPageFrame>
  )
}
