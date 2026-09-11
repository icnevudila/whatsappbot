'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { enqueueJob } from '@/lib/jobs'
import { hasImageProvider } from '@/lib/ai/image'
import { processCreativeGeneration } from '@/lib/creative/process'
import { createSupabaseServiceClient, siteOriginFromEnv } from '@/lib/supabase/service'
import {
  titleFromBrief,
  type CreativePayload,
  type CreativeSnapshot,
  type ProductFieldKey,
} from '@/lib/creative/types'
import { collectImageFiles, readImageFile } from '@/app/(panel)/ayarlar/upload-image'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'
import { DEFAULT_INCLUDE, formatFromId, type ProductCard } from './wizard-types'

export type CreativeActionState = { error?: string; ok?: string; id?: string } | null

function revalidateLibrary(id?: string) {
  revalidatePath('/icerik')
  if (id) revalidatePath(`/icerik/${id}`)
}

function asRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  )
}

function parseIds(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean)
    } catch {
      return raw.split(',').map((part) => part.trim()).filter(Boolean)
    }
  }
  return []
}

async function kickGeneration(creativeId: string) {
  after(async () => {
    const service = createSupabaseServiceClient()
    if (!service) return
    const result = await processCreativeGeneration(creativeId, service)
    if (!result.ok && !result.busy) {
      console.error('[creative.kick]', creativeId, result.error)
    }
  })

  const origin = siteOriginFromEnv('http://127.0.0.1:3003')
  const secret = process.env.JOB_INTERNAL_SECRET?.trim()
  if (origin && secret) {
    after(async () => {
      try {
        await fetch(`${origin}/api/internal/creative-render`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({ creativeId }),
        })
      } catch (error) {
        console.error('[creative.kick.http]', creativeId, error)
      }
    })
  }

  const queued = await enqueueJob({
    type: 'creative.render',
    payload: { creative_id: creativeId },
    priority: 40,
  })
  if (queued.error) {
    console.error('[creative.kick.job]', creativeId, queued.error)
  }
}

export async function startCreativeGeneration(
  _previous: CreativeActionState,
  formData: FormData,
): Promise<CreativeActionState> {
  const raw = String(formData.get('draft') ?? '')
  let draft: Record<string, unknown>
  try {
    draft = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return { error: 'Form okunamadı. Sayfayı yenileyip tekrar deneyin.' }
  }

  const requestKey = String(draft.requestKey ?? '').trim()
  let brief = String(draft.brief ?? '').trim()

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  if (!isOrgAdminRole(org.role)) {
    return { error: 'Görsel üretmek için yönetici olmalısınız.' }
  }
  if (org.suspended_at) return { error: 'İşletme askıda.' }
  if (!hasImageProvider()) {
    return { error: 'Görsel üretimi kapalı. Sunucuda sağlayıcı anahtarı yok.' }
  }

  if (requestKey) {
    const { data: existing } = await supabase
      .from('creatives')
      .select('id, status')
      .eq('org_id', org.id)
      .contains('payload', { requestKey })
      .in('status', ['pending', 'rendering', 'ready'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (existing?.id) {
      if (existing.status === 'pending' || existing.status === 'rendering') {
        await kickGeneration(existing.id)
      }
      revalidateLibrary(existing.id)
      redirect(`/icerik/${existing.id}`)
    }
  }

  const format = formatFromId(String(draft.formatId ?? 'wa'))
  const kitId = String(draft.brandKitId ?? '').trim() || null
  const productIds = parseIds(draft.productIds)
  const phoneIds = parseIds(draft.phoneIds)
  const socialIds = parseIds(draft.socialIds)
  const baseCreativeId = String(draft.baseCreativeId ?? '').trim() || null
  const parentId = String(draft.parentId ?? '').trim() || null
  const rawType = String(draft.generationType ?? '')
  const generationType =
    rawType === 'revision' || rawType === 'variation' || rawType === 'derived' || rawType === 'new'
      ? rawType
      : baseCreativeId
        ? 'derived'
        : 'new'

  let kitRow: {
    id: string
    name: string
    tone: string | null
    colors: unknown
    fonts: unknown
    logo_path: string | null
  } | null = null
  if (kitId) {
    const { data } = await supabase
      .from('brand_kits')
      .select('id, name, tone, colors, fonts, logo_path')
      .eq('org_id', org.id)
      .eq('id', kitId)
      .maybeSingle()
    kitRow = data
    if (!kitRow) return { error: 'Marka kiti bulunamadı.' }
  } else {
    const { data } = await supabase
      .from('brand_kits')
      .select('id, name, tone, colors, fonts, logo_path')
      .eq('org_id', org.id)
      .eq('is_default', true)
      .maybeSingle()
    kitRow = data
  }

  if (baseCreativeId) {
    const { data: base } = await supabase
      .from('creatives')
      .select('id')
      .eq('id', baseCreativeId)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!base) return { error: 'Kaynak görsel bu işletmeye ait değil.' }
  }

  let parentPayload: CreativePayload | null = null
  if (parentId) {
    const { data: parent } = await supabase
      .from('creatives')
      .select('id, payload')
      .eq('id', parentId)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!parent) return { error: 'Üst görsel bulunamadı.' }
    parentPayload = parent.payload as CreativePayload
    if (brief.length < 8 && parentPayload?.brief) brief = parentPayload.brief.trim()
    if (parentPayload?.brandKit && !kitId) {
      kitRow = {
        id: parentPayload.brandKit.id,
        name: parentPayload.brandKit.name,
        tone: parentPayload.brandKit.tone,
        colors: parentPayload.brandKit.colors,
        fonts: parentPayload.brandKit.fonts,
        logo_path: parentPayload.brandKit.logoPath,
      }
    }
  }

  const extras = (draft.productExtras ?? {}) as Record<
    string,
    {
      imageUrl?: string
      price?: string
      oldPrice?: string
      promo?: string
      extra?: string
      include?: Partial<Record<ProductFieldKey, boolean>>
    }
  >

  const products: CreativeSnapshot['products'] = []
  if (productIds.length > 0) {
    const { data: productRows } = await supabase
      .from('org_products')
      .select('id, name, description, box_contents')
      .eq('org_id', org.id)
      .in('id', productIds)
    const { data: imageRows } = await supabase
      .from('org_product_images')
      .select('product_id, public_url, sort_order')
      .eq('org_id', org.id)
      .in('product_id', productIds)
      .order('sort_order', { ascending: true })

    const firstImage = new Map<string, string>()
    for (const image of imageRows ?? []) {
      if (!firstImage.has(image.product_id)) firstImage.set(image.product_id, image.public_url)
    }

    const byId = new Map((productRows ?? []).map((row) => [row.id, row]))
    for (const id of productIds) {
      const product = byId.get(id)
      if (!product) continue
      const extra = extras[id] ?? {}
      const include = { ...DEFAULT_INCLUDE, ...(extra.include ?? {}) }
      const chosenImage =
        extra.imageUrl &&
        (imageRows ?? []).some((row) => row.product_id === id && row.public_url === extra.imageUrl)
          ? extra.imageUrl
          : firstImage.get(id) ?? null
      products.push({
        id: product.id,
        name: product.name,
        description: product.description,
        boxContents: product.box_contents,
        imageUrl: chosenImage,
        price: extra.price?.trim() || null,
        oldPrice: extra.oldPrice?.trim() || null,
        promo: extra.promo?.trim() || null,
        extra: extra.extra?.trim() || null,
        include,
      })
    }
  }

  const phones: CreativeSnapshot['phones'] = []
  if (phoneIds.length > 0) {
    const { data } = await supabase
      .from('accounts')
      .select('id, label, phone_e164')
      .eq('org_id', org.id)
      .in('id', phoneIds)
    for (const row of data ?? []) {
      if (!row.phone_e164) continue
      phones.push({ id: row.id, label: row.label, phone: row.phone_e164 })
    }
  }

  const socials: CreativeSnapshot['socials'] = []
  if (socialIds.length > 0) {
    const { data } = await supabase
      .from('org_social_accounts')
      .select('id, platform, label, url')
      .eq('org_id', org.id)
      .in('id', socialIds)
    for (const row of data ?? []) {
      socials.push({ id: row.id, platform: row.platform, label: row.label, url: row.url })
    }
  }

  if (brief.length < 8) return { error: 'Görselde ne anlatmak istediğinizi bir cümleyle yazın.' }

  const labels = parseIds(draft.labels).map((label) => label.slice(0, 48)).slice(0, 8)
  if (parentPayload) {
    if (products.length === 0 && parentPayload.products?.length) products.push(...parentPayload.products)
    if (phones.length === 0 && parentPayload.phones?.length) phones.push(...parentPayload.phones)
    if (socials.length === 0 && parentPayload.socials?.length) socials.push(...parentPayload.socials)
    if (labels.length === 0 && parentPayload.labels?.length) labels.push(...parentPayload.labels)
  }
  const title = titleFromBrief(String(draft.instruction ?? '').trim() || brief)
  const snapshot: CreativePayload = {
    brief,
    style: String(draft.style ?? 'auto'),
    formatId: format.id,
    aspect: format.aspect,
    textDensity: (['low', 'balanced', 'detailed'].includes(String(draft.textDensity))
      ? draft.textDensity
      : 'balanced') as CreativeSnapshot['textDensity'],
    useLogo: Boolean(kitRow) && draft.useLogo !== false,
    labels,
    cta: String(draft.cta ?? '').trim() || null,
    address: String(draft.address ?? '').trim() || null,
    website: String(draft.website ?? '').trim() || null,
    dateRange: String(draft.dateRange ?? '').trim() || null,
    customText: String(draft.customText ?? '').trim() || null,
    phones,
    socials,
    brandKit: kitRow
      ? {
          id: kitRow.id,
          name: kitRow.name,
          tone: kitRow.tone,
          colors: asRecord(kitRow.colors),
          fonts: asRecord(kitRow.fonts),
          logoPath: kitRow.logo_path,
        }
      : null,
    products,
    baseCreativeId,
    instruction: String(draft.instruction ?? '').trim() || null,
    variationPreset: String(draft.variationPreset ?? '').trim() || null,
    title,
    requestKey: requestKey || undefined,
    cost: { imageCount: 1 },
  }

  const { data: inserted, error } = await supabase
    .from('creatives')
    .insert({
      org_id: org.id,
      created_by: userId,
      brand_kit_id: kitRow?.id ?? null,
      parent_id: parentId || baseCreativeId,
      title,
      source: 'ai',
      generation_type: generationType,
      template: 'ai_library',
      format: format.format,
      payload: snapshot,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !inserted) return { error: error?.message ?? 'Kayıt açılamadı.' }

  await kickGeneration(inserted.id)
  revalidateLibrary(inserted.id)
  redirect(`/icerik/${inserted.id}`)
}

export async function retryCreative(id: string): Promise<CreativeActionState> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt yok.' }
  try {
    const { org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }
    const { data } = await supabase
      .from('creatives')
      .select('id, status, source')
      .eq('id', trimmed)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!data) return { error: 'Görsel bulunamadı.' }
    if (data.source !== 'ai') return { error: 'Yalnızca AI üretimleri yenilenebilir.' }
    await supabase
      .from('creatives')
      .update({ status: 'pending', error: null })
      .eq('id', trimmed)
      .eq('org_id', org.id)
    revalidateLibrary(trimmed)
    return { ok: 'Üretim yeniden başlatıldı.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

export async function renameCreative(formData: FormData): Promise<CreativeActionState> {
  const id = String(formData.get('id') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim().slice(0, 180)
  if (!id || !title) return { error: 'Başlık yazın.' }
  try {
    const { org, supabase } = await requireActiveOrg()
    const { error } = await supabase
      .from('creatives')
      .update({ title })
      .eq('id', id)
      .eq('org_id', org.id)
    if (error) return { error: error.message }
    revalidateLibrary(id)
    return { ok: 'Ad güncellendi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

export async function deleteCreative(id: string): Promise<CreativeActionState> {
  const trimmed = id.trim()
  if (!trimmed) return { error: 'Kayıt yok.' }
  try {
    const { org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }
    const { data } = await supabase
      .from('creatives')
      .select('id, storage_path')
      .eq('id', trimmed)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!data) return { error: 'Görsel bulunamadı.' }
    if (data.storage_path) {
      await supabase.storage.from('creatives').remove([data.storage_path])
    }
    const { error } = await supabase.from('creatives').delete().eq('id', trimmed).eq('org_id', org.id)
    if (error) return { error: error.message }
    revalidateLibrary()
    return { ok: 'Silindi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

export async function uploadLibraryImage(formData: FormData): Promise<CreativeActionState> {
  const files = collectImageFiles(formData, 'file')
  const file = files[0]
  if (!file) return { error: 'PNG, JPG veya WEBP seçin (en fazla 5 MB).' }
  const parsed = await readImageFile(file)
  if ('error' in parsed && parsed.error) return { error: parsed.error }
  if (!('buffer' in parsed)) return { error: 'Dosya okunamadı.' }

  try {
    const { userId, org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) return { error: 'Yetki yok.' }
    const path = `${org.id}/${crypto.randomUUID()}.${parsed.ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    })
    if (upError) return { error: upError.message }
    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    const title = file.name.replace(/\.[^.]+$/, '').slice(0, 80) || 'Yüklenen görsel'
    const { data, error } = await supabase
      .from('creatives')
      .insert({
        org_id: org.id,
        created_by: userId,
        title,
        source: 'upload',
        generation_type: 'upload',
        template: 'upload',
        format: 'square',
        status: 'ready',
        storage_path: path,
        public_url: publicUrl.publicUrl,
        payload: { title, source: 'upload' },
      })
      .select('id')
      .single()
    if (error || !data) return { error: error?.message ?? 'Kayıt açılamadı.' }
    revalidateLibrary(data.id)
    return { ok: 'Görsel yüklendi.', id: data.id }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok.' }
  }
}

/** Kampanya görsel sihirbazından ayrılmadan hızlı ürün ekleme */
export async function quickCreateProduct(
  formData: FormData,
): Promise<{ error?: string; product?: ProductCard }> {
  let ctx: Awaited<ReturnType<typeof requireActiveOrg>>
  try {
    ctx = await requireActiveOrg()
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }
  const { org, supabase, userId } = ctx
  if (!isOrgAdminRole(org.role)) {
    return { error: 'Yalnızca sahip veya yönetici ürün ekleyebilir.' }
  }

  const name = String(formData.get('name') ?? '').trim()
  if (!name) return { error: 'Ürün adı zorunludur.' }

  const description = String(formData.get('description') ?? '').trim()
  const boxContents = String(formData.get('box_contents') ?? '').trim()
  const productId = crypto.randomUUID()

  const { error: insertError } = await supabase.from('org_products').insert({
    id: productId,
    org_id: org.id,
    created_by: userId,
    name: name.slice(0, 160),
    description: description || null,
    box_contents: boxContents || null,
    is_active: true,
  })

  if (insertError) return { error: insertError.message }

  const files = collectImageFiles(formData, 'images')
  const images: { id: string; url: string }[] = []

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const parsed = await readImageFile(file)
    if ('error' in parsed && parsed.error) continue
    if (!('buffer' in parsed)) continue
    const path = `${org.id}/products/${productId}/${crypto.randomUUID()}.${parsed.ext}`
    const { error: upError } = await supabase.storage.from('creatives').upload(path, parsed.buffer, {
      contentType: parsed.mime,
      upsert: false,
    })
    if (upError) continue
    const { data: publicUrl } = supabase.storage.from('creatives').getPublicUrl(path)
    const imgId = crypto.randomUUID()
    const { error: imgError } = await supabase.from('org_product_images').insert({
      id: imgId,
      org_id: org.id,
      product_id: productId,
      storage_path: path,
      public_url: publicUrl.publicUrl,
      sort_order: index,
    })
    if (!imgError) {
      images.push({ id: imgId, url: publicUrl.publicUrl })
    }
  }

  revalidatePath('/icerik/yeni')
  revalidatePath('/ayarlar/urunler')

  return {
    product: {
      id: productId,
      name,
      description: description || null,
      boxContents: boxContents || null,
      images,
    },
  }
}
