'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'
import { collectImageFiles, readImageFile } from '../upload-image'

export type ProductState = { error?: string; ok?: string } | null

const MAX_IMAGES = 8

function revalidateProducts(id?: string) {
  revalidatePath('/ayarlar/urunler')
  if (id) revalidatePath(`/ayarlar/urunler/${id}`)
}

async function requireCatalogAdmin() {
  const ctx = await requireActiveOrg()
  if (!isOrgAdminRole(ctx.org.role)) {
    throw new Error('Yalnızca sahip veya yönetici ürün yönetebilir.')
  }
  return ctx
}

async function uploadProductImages(options: {
  supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  orgId: string
  productId: string
  files: File[]
  startOrder: number
}) {
  const { supabase, orgId, productId, files, startOrder } = options
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const parsed = await readImageFile(file)
    if ('error' in parsed && parsed.error) return { error: parsed.error }
    if (!('buffer' in parsed)) return { error: 'Görsel okunamadı.' }
    const path = `${orgId}/products/${productId}/${crypto.randomUUID()}.${parsed.ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    })
    if (upError) return { error: upError.message }
    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    const { error } = await supabase.from('org_product_images').insert({
      org_id: orgId,
      product_id: productId,
      storage_path: path,
      public_url: publicUrl.publicUrl,
      sort_order: startOrder + index,
    })
    if (error) return { error: error.message }
  }
  return {}
}

export async function saveProduct(
  _previous: ProductState,
  formData: FormData,
): Promise<ProductState> {
  const id = String(formData.get('id') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const boxContents = String(formData.get('box_contents') ?? '').trim()
  const isActive = String(formData.get('is_active') ?? '') === 'on'
  const files = collectImageFiles(formData, 'images')

  if (!name) return { error: 'Ürün adı yazın.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireCatalogAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const productId = id || crypto.randomUUID()

  const { count: existingImageCount } = id
    ? await supabase
        .from('org_product_images')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('org_id', org.id)
    : { count: 0 }

  const currentCount = existingImageCount ?? 0
  if (currentCount + files.length > MAX_IMAGES) {
    return { error: `Bir üründe en fazla ${MAX_IMAGES} görsel olabilir.` }
  }

  const payload = {
    org_id: org.id,
    created_by: userId,
    name: name.slice(0, 160),
    description: description || null,
    box_contents: boxContents || null,
    is_active: isActive,
  }

  const { error } = id
    ? await supabase
        .from('org_products')
        .update(payload)
        .eq('id', productId)
        .eq('org_id', org.id)
    : await supabase.from('org_products').insert({ ...payload, id: productId })

  if (error) return { error: error.message }

  if (files.length > 0) {
    const uploaded = await uploadProductImages({
      supabase,
      orgId: org.id,
      productId,
      files,
      startOrder: currentCount,
    })
    if (uploaded.error) {
      revalidateProducts(productId)
      return { error: uploaded.error }
    }
  }

  revalidateProducts(productId)
  if (!id) redirect(`/ayarlar/urunler/${productId}`)
  return { ok: 'Ürün kaydedildi.' }
}

export async function deleteProductImage(imageId: string): Promise<{ error?: string }> {
  const trimmed = imageId.trim()
  if (!trimmed) return { error: 'Görsel bulunamadı.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireCatalogAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: image } = await supabase
    .from('org_product_images')
    .select('id, product_id, storage_path')
    .eq('id', trimmed)
    .eq('org_id', org.id)
    .maybeSingle()

  if (!image) return { error: 'Görsel bulunamadı.' }

  if (image.storage_path) {
    await supabase.storage.from('creatives').remove([image.storage_path])
  }

  const { error } = await supabase
    .from('org_product_images')
    .delete()
    .eq('id', trimmed)
    .eq('org_id', org.id)

  if (error) return { error: error.message }

  revalidateProducts(image.product_id)
  return {}
}

export async function deleteProduct(id: string): Promise<{ error?: string }> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Ürün bulunamadı.' }

  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ org, supabase } = await requireCatalogAdmin())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { data: images } = await supabase
    .from('org_product_images')
    .select('storage_path')
    .eq('product_id', trimmed)
    .eq('org_id', org.id)

  const paths = (images ?? []).map((row) => row.storage_path).filter(Boolean)
  if (paths.length > 0) {
    await supabase.storage.from('creatives').remove(paths)
  }

  const { error } = await supabase
    .from('org_products')
    .delete()
    .eq('id', trimmed)
    .eq('org_id', org.id)

  if (error) return { error: error.message }

  revalidateProducts()
  return {}
}
