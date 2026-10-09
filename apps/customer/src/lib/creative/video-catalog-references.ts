import { resolvePreviewUrl } from '@/lib/media-url'
import type { SupabaseClient } from '@supabase/supabase-js'

export class VideoCatalogError extends Error {
  constructor(public code: string, message: string, public status = 400) {
    super(message)
  }
}

/** URL ownership comes from tenant catalog rows, never from the caller's manifest. */
export async function loadVideoCatalogReferences(supabase: SupabaseClient, orgId: string, input: {
  productId: string
  logoUrl: string
  productUrl: string
  brandKitId?: string
}) {
  if (!input.productId) throw new VideoCatalogError('PRODUCT_ID_REQUIRED', 'Katalog ürünü seçin.')
  const [product, image, organization, kit] = await Promise.all([
    supabase.from('org_products').select('id, name, description, box_contents').eq('org_id', orgId)
      .eq('id', input.productId).eq('is_active', true).maybeSingle(),
    supabase.from('org_product_images').select('public_url').eq('org_id', orgId)
      .eq('product_id', input.productId).order('sort_order', {ascending:true}).limit(1).maybeSingle(),
    supabase.from('organizations').select('name, about, address, logo_path').eq('id', orgId).maybeSingle(),
    input.brandKitId
      ? supabase.from('brand_kits').select('id, name, tone, colors, fonts, logo_path').eq('org_id', orgId).eq('id', input.brandKitId).maybeSingle()
      : supabase.from('brand_kits').select('id, name, tone, colors, fonts, logo_path').eq('org_id', orgId)
        .order('is_default', {ascending:false}).limit(1).maybeSingle(),
  ])
  if ([product, image, organization, kit].some(result => result.error)) {
    throw new VideoCatalogError('CATALOG_LOOKUP_FAILED', 'Ürün ve marka kayıtları doğrulanamadı. Tekrar deneyin.', 503)
  }
  if (!product.data) throw new VideoCatalogError('PRODUCT_NOT_IN_ORG', 'Bu işletme için aktif katalog ürünü seçin.', 403)
  if (input.brandKitId && !kit.data) throw new VideoCatalogError('BRAND_KIT_NOT_IN_ORG', 'Bu işletmeye ait marka kimliğini seçin.', 403)
  const logoUrl = resolvePreviewUrl(kit.data?.logo_path || organization.data?.logo_path, 'brand-assets')
  const productUrl = resolvePreviewUrl(image.data?.public_url, 'creatives')
  if (!logoUrl) throw new VideoCatalogError('LOGO_ASSET_NOT_READY', 'İşletme logosunu ekleyin.')
  if (!productUrl) throw new VideoCatalogError('PRODUCT_ASSET_NOT_READY', 'Seçili ürüne gerçek ürün veya arayüz görseli ekleyin.')
  const pathname = new URL(productUrl, 'https://reference.invalid').pathname
  if (/^\/(brand|logos)\//i.test(pathname) || productUrl === logoUrl) {
    throw new VideoCatalogError('PRODUCT_REFERENCE_IS_LOGO', 'Ürün görseli işletme logosuyla aynı. Gerçek ürün veya arayüz görseli ekleyin.')
  }
  if (resolvePreviewUrl(input.logoUrl, 'brand-assets') !== logoUrl ||
      resolvePreviewUrl(input.productUrl, 'creatives') !== productUrl) {
    throw new VideoCatalogError('ASSET_REFERENCE_CHANGED', 'Ürün veya logo kaydı değişmiş. Sayfayı yenileyip tekrar seçin.', 409)
  }
  return { product: product.data as {id:string; name:string; description:string|null; box_contents?:string|null},
    kit: kit.data as {id:string; name:string; tone:string|null; colors:unknown; fonts:unknown; logo_path:string|null} | null,
    organization: organization.data as {name?:string; about?:string|null; address?:string|null} | null, logoUrl, productUrl }
}
