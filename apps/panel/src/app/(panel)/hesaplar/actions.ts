'use server'

import { revalidatePath } from 'next/cache'
import { enqueueJob } from '@/lib/jobs'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ActionState = { error?: string; ok?: string } | null

export async function createAccount(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const label = String(formData.get('label') ?? '').trim()
  if (!label) return { error: 'Hesaba bir ad verin.' }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadi.' }

  // Kota kontrolu: profiles.accounts_quota kullanicinin acabilecegi hesap sayisi.
  const [{ count }, { data: profile }] = await Promise.all([
    supabase.from('accounts').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('accounts_quota').eq('id', user.id).single(),
  ])

  const quota = profile?.accounts_quota ?? 1
  if ((count ?? 0) >= quota) {
    return { error: `Hesap kotaniz dolu (${quota}). Yeni hesap icin paketinizi yukseltin.` }
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({ owner_id: user.id, label })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Hesap olusur olusmaz baglanti isi kuyruga girer, QR hemen gelsin.
  await enqueueJob({ type: 'account.connect', accountId: account.id, priority: 10 })

  revalidatePath('/hesaplar')
  return { ok: 'Hesap olusturuldu, QR kodu hazirlaniyor.' }
}

async function enqueueForAccount(
  accountId: string,
  type: 'account.connect' | 'account.disconnect' | 'account.logout',
): Promise<ActionState> {
  const { error } = await enqueueJob({ type, accountId, priority: 10 })
  if (error) return { error }

  revalidatePath('/hesaplar')
  return { ok: 'Komut kuyruga alindi.' }
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

export async function removeAccount(accountId: string): Promise<ActionState> {
  const supabase = await createSupabaseServerClient()

  // Once servise cikis komutu birakiliyor: satir silinince cascade ile
  // wa.creds de gider, ama WhatsApp tarafinda cihaz bagli kalirdi.
  await enqueueJob({ type: 'account.logout', accountId, priority: 5 })

  const { error } = await supabase.from('accounts').delete().eq('id', accountId)
  if (error) return { error: error.message }

  revalidatePath('/hesaplar')
  return { ok: 'Hesap silindi.' }
}
