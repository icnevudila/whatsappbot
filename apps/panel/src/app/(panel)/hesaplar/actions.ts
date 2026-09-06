'use server'

import { revalidatePath } from 'next/cache'
import { toE164 } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { requireActiveOrg } from '@/lib/org'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ActionState = { error?: string; ok?: string } | null

function revalidateAccounts() {
  revalidatePath('/hesaplar')
  revalidatePath('/kurulum')
}

export async function createAccount(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const label = String(formData.get('label') ?? '').trim()
  if (!label) return { error: 'Hesaba bir ad verin.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  // Kota kontrolu: isletmenin accounts_quota degeri.
  const { count } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)

  const quota = org.accounts_quota
  if ((count ?? 0) >= quota) {
    return {
      error: `Hat kotasi dolu (${count}/${quota}). Yeni hat icin Ayarlar'dan paketi kontrol edin veya kullanilmayan bir hatti silin.`,
    }
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({ org_id: org.id, created_by: userId, label })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Hesap olusur olusmaz baglanti isi kuyruga girer, QR hemen gelsin.
  const { error: jobError } = await enqueueJob({
    type: 'account.connect',
    accountId: account.id,
    priority: 10,
  })
  if (jobError) {
    revalidateAccounts()
    return {
      error: `Hesap oluşturuldu ama bağlantı kuyruğa yazılamadı: ${jobError}`,
    }
  }

  revalidateAccounts()
  return { ok: 'Hesap oluşturuldu, QR kodu hazırlanıyor.' }
}

async function enqueueForAccount(
  accountId: string,
  type: 'account.connect' | 'account.disconnect' | 'account.logout',
): Promise<ActionState> {
  const { error } = await enqueueJob({ type, accountId, priority: 10 })
  if (error) return { error }

  revalidateAccounts()
  return { ok: 'Komut kuyruğa alındı.' }
}

export async function connectAccount(accountId: string): Promise<ActionState> {
  return enqueueForAccount(accountId, 'account.connect')
}

export async function disconnectAccount(accountId: string): Promise<ActionState> {
  return enqueueForAccount(accountId, 'account.disconnect')
}

export async function logoutAccount(accountId: string): Promise<ActionState> {
  return enqueueForAccount(accountId, 'account.logout')
}

/**
 * QR yerine telefona 8 haneli kod gonderir.
 *
 * Numara libphonenumber ile dogrulanir: yanlis uzunluk / fazla rakam
 * WhatsApp'ta "telefon bulunamadi" hatasina yol aciyor.
 */
export async function requestPairingCode(
  accountId: string,
  rawPhone: string,
): Promise<ActionState> {
  const e164 = toE164(rawPhone)
  if (!e164) {
    return {
      error:
        'Gecerli bir WhatsApp numarasi degil. Ornek: +90 545 365 13 19 (ulke koduyla, fazla rakam olmadan)',
    }
  }

  const { error } = await enqueueJob({
    type: 'account.request_pairing_code',
    accountId,
    priority: 10,
    payload: { phone_e164: e164 },
  })
  if (error) return { error }

  revalidateAccounts()
  return { ok: 'Kod isteniyor, birkaç saniye içinde görünecek.' }
}

export async function removeAccount(accountId: string): Promise<ActionState> {
  const supabase = await createSupabaseServerClient()

  // Once servise cikis komutu birakiliyor: satir silinince cascade ile
  // wa.creds de gider, ama WhatsApp tarafinda cihaz bagli kalirdi.
  await enqueueJob({ type: 'account.logout', accountId, priority: 5 })

  const { error } = await supabase.from('accounts').delete().eq('id', accountId)
  if (error) return { error: error.message }

  revalidateAccounts()
  return { ok: 'Hesap silindi.' }
}
