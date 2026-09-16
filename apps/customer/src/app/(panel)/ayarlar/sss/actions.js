'use server'

import { revalidatePath } from 'next/cache'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'

export async function saveFaq(_previous, formData) {
  const id = String(formData.get('id') ?? '').trim()
  const question = String(formData.get('question') ?? '').trim()
  const answer = String(formData.get('answer') ?? '').trim()
  const productRaw = String(formData.get('product_id') ?? '').trim()
  const productId = productRaw && productRaw !== 'none' ? productRaw : null

  if (question.length < 1 || question.length > 500) {
    return { error: 'Soru 1–500 karakter olmalı.' }
  }
  if (answer.length < 1 || answer.length > 4000) {
    return { error: 'Cevap 1–4000 karakter olmalı.' }
  }

  let userId
  let org
  let supabase
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
    if (!isOrgAdminRole(org.role)) {
      return { error: 'Yalnızca sahip veya yönetici düzenleyebilir.' }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  if (productId) {
    const { data: product } = await supabase
      .from('org_products')
      .select('id')
      .eq('id', productId)
      .eq('org_id', org.id)
      .maybeSingle()
    if (!product) return { error: 'Seçilen ürün bulunamadı.' }
  }

  if (id) {
    const { error } = await supabase
      .from('org_faqs')
      .update({ question, answer, product_id: productId })
      .eq('id', id)
      .eq('org_id', org.id)
    if (error) return { error: error.message }
  } else {
    const { data: last } = await supabase
      .from('org_faqs')
      .select('sort_order')
      .eq('org_id', org.id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()
    const sortOrder = (last?.sort_order ?? -1) + 1
    const { error } = await supabase.from('org_faqs').insert({
      org_id: org.id,
      created_by: userId,
      product_id: productId,
      question,
      answer,
      sort_order: sortOrder,
      is_active: true,
    })
    if (error) return { error: error.message }
  }

  revalidatePath('/ayarlar/sss')
  return { ok: id ? 'Güncellendi.' : 'Eklendi.' }
}

export async function deleteFaq(id) {
  const trimmed = String(id ?? '').trim()
  if (!trimmed) return { error: 'Kayıt bulunamadı.' }

  let org
  let supabase
  try {
    ;({ org, supabase } = await requireActiveOrg())
    if (!isOrgAdminRole(org.role)) {
      return { error: 'Yalnızca sahip veya yönetici silebilir.' }
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { error } = await supabase
    .from('org_faqs')
    .delete()
    .eq('id', trimmed)
    .eq('org_id', org.id)

  if (error) return { error: error.message }

  revalidatePath('/ayarlar/sss')
  return { ok: 'Silindi.' }
}
