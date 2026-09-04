'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { parsePhoneList } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type QuickSendState = {
  error?: string
  invalidSamples?: string[]
} | null

/** Supabase istegi basina satir siniri; buyuk yapistirmalar parcalanir. */
const CHUNK = 500

/**
 * Tek ekranda: numaralari yapistir, mesaji yaz, gonder.
 *
 * Normal kampanya akisi once liste olusturmayi zorunlu tutuyor. Burada ayni
 * seyi arka planda yapiyoruz (kampanya motoru listelerden hedef uretiyor,
 * baska yolu yok) ama kullaniciya iki ayri adim olarak gostermiyoruz.
 *
 * Dogrulama beklenmiyor: gonderim aninda her hedef zaten onWhatsApp ile
 * tek tek kontrol ediliyor, o yuzden kampanya hemen baslatilabilir.
 */
export async function quickSend(
  _previous: QuickSendState,
  formData: FormData,
): Promise<QuickSendState> {
  const raw = String(formData.get('numbers') ?? '')
  const body = String(formData.get('body') ?? '').trim()
  const mediaUrl = String(formData.get('media_url') ?? '').trim()
  const accountIds = formData.getAll('accounts').map(String).filter(Boolean)

  if (!raw.trim()) return { error: 'En az bir numara girin.' }
  if (!body && !mediaUrl) return { error: 'Mesaj metni veya bir gorsel gerekli.' }
  if (accountIds.length === 0) return { error: 'En az bir gonderen hat secin.' }

  const parsed = parsePhoneList(raw)
  if (parsed.valid.length === 0) {
    return {
      error: 'Gecerli numara bulunamadi. Ornek: 0532 123 45 67 veya +905321234567',
      invalidSamples: parsed.invalid.slice(0, 5),
    }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadi.' }

  // Kampanya motoru hedefleri listelerden uretir; bu ara liste Kisiler'de
  // source=quick_send ile gizlenir. Kullaniciya ayri "liste olustur" adimi yok.
  const stamp = new Intl.DateTimeFormat('tr-TR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(new Date())
  const campaignName = `Hizli gonderim · ${stamp}`

  const { data: list, error: listError } = await supabase
    .from('contact_lists')
    .insert({
      owner_id: user.id,
      name: campaignName,
      source: 'quick_send',
      description: 'Hizli gonderim ara kaydi — Kisiler listesinde gosterilmez.',
    })
    .select('id')
    .single()

  if (listError) return { error: listError.message }

  let linked = 0

  for (let index = 0; index < parsed.valid.length; index += CHUNK) {
    const chunk = parsed.valid.slice(index, index + CHUNK)

    const { data: contacts, error: contactError } = await supabase
      .from('contacts')
      .upsert(
        chunk.map((row) => ({
          owner_id: user.id,
          phone_e164: row.phone_e164,
          name: row.name,
          source: 'manual' as const,
        })),
        {
          onConflict: 'owner_id,phone_e164',
          // Cakisan satirlarda guncelleme yok: INSERT yetkisi yeter, UPDATE kolon
          // haklarina bagimli kalmadan ayni numarayi tekrar kullanabiliyoruz.
          ignoreDuplicates: true,
        },
      )
      .select('id, phone_e164')

    if (contactError) return { error: contactError.message }

    // ignoreDuplicates seciliyken cakisan satirlar donmeyebilir; id'leri
    // numaradan tekrar cekiyoruz ki liste uyeligi eksik kalmasin.
    const phones = chunk.map((row) => row.phone_e164)
    const { data: resolved, error: resolveError } = await supabase
      .from('contacts')
      .select('id')
      .in('phone_e164', phones)

    if (resolveError) return { error: resolveError.message }

    const contactIds = (resolved ?? contacts ?? []).map((contact) => contact.id)

    const { error: memberError } = await supabase.from('contact_list_members').upsert(
      contactIds.map((contactId) => ({
        owner_id: user.id,
        list_id: list.id,
        contact_id: contactId,
      })),
      { onConflict: 'list_id,contact_id', ignoreDuplicates: true },
    )

    if (memberError) return { error: memberError.message }
    linked += contactIds.length
  }

  await supabase.from('contact_lists').update({ contact_count: linked }).eq('id', list.id)

  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .insert({
      owner_id: user.id,
      name: campaignName,
      body: body || null,
      media_url: mediaUrl || null,
      message_type: mediaUrl ? 'image' : 'text',
      source_list_ids: [list.id],
      min_delay_seconds: 8,
      max_delay_seconds: 25,
      daily_cap_per_account: 250,
      status: 'draft',
    })
    .select('id')
    .single()

  if (campaignError) return { error: campaignError.message }

  const { error: linkError } = await supabase.from('campaign_accounts').insert(
    accountIds.map((accountId) => ({
      owner_id: user.id,
      campaign_id: campaign.id,
      account_id: accountId,
    })),
  )

  if (linkError) return { error: linkError.message }

  const { error: jobError } = await enqueueJob({
    type: 'campaign.start',
    campaignId: campaign.id,
    priority: 10,
  })

  if (jobError) return { error: jobError }

  revalidatePath('/kampanyalar')
  revalidatePath('/hizli-gonderim')
  redirect(`/kampanyalar/${campaign.id}`)
}
