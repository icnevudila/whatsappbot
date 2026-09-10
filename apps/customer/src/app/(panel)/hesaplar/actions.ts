'use server'

import { revalidatePath } from 'next/cache'
import { toE164 } from '@wa/shared'
import { enqueueJob } from '@/lib/jobs'
import { isTrMobileMasked } from '@/lib/onboarding'
import { isOrgAdminRole, requireActiveOrg } from '@/lib/org'

export type ActionState = { error?: string; ok?: string; jobId?: string } | null

function revalidateAccounts() {
  revalidatePath('/hesaplar')
  revalidatePath('/ayarlar/hatlar')
}

export async function createAccount(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const label = String(formData.get('label') ?? '').trim()
  if (!label) return { error: 'Bu hat için bir ad yazın.' }

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
      error: `Hat kotası dolu (${count}/${quota}). Yeni hat için Ayarlar’dan paketi kontrol edin veya kullanılmayan bir hattı silin.`,
    }
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({ org_id: org.id, created_by: userId, label })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Hat oluşur oluşmaz bağlantı işi kuyruğa girer, QR hemen gelsin.
  const { error: jobError } = await enqueueJob({
    type: 'account.connect',
    accountId: account.id,
    priority: 10,
  })
  if (jobError) {
    revalidateAccounts()
    return {
      error: `Hat oluşturuldu ama bağlantı kuyruğa yazılamadı: ${jobError}`,
    }
  }

  revalidateAccounts()
  return { ok: 'Hat oluşturuldu, QR kodu hazırlanıyor.' }
}

export async function createAccountWithPairing(maskedPhone: string): Promise<
  ActionState & { accountId?: string }
> {
  const masked = maskedPhone.trim()
  if (!isTrMobileMasked(masked)) {
    return { error: 'Numara 05XX XXX XX XX formatında olmalı.' }
  }
  const e164 = toE164(masked)
  if (!e164) return { error: 'Geçerli bir Türkiye cep numarası girin.' }

  let userId: string
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  let supabase: Awaited<ReturnType<typeof requireActiveOrg>>['supabase']
  try {
    ;({ userId, org, supabase } = await requireActiveOrg())
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum bulunamadı.' }
  }

  const { count } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', org.id)

  const quota = org.accounts_quota
  if ((count ?? 0) >= quota) {
    return {
      error: `Hat kotası dolu (${count}/${quota}). Kullanılmayan bir hattı silin veya paketi yükseltin.`,
    }
  }

  const { data: account, error } = await supabase
    .from('accounts')
    .insert({
      org_id: org.id,
      created_by: userId,
      label: masked,
      phone_e164: e164,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  const { error: jobError } = await enqueueJob({
    type: 'account.request_pairing_code',
    accountId: account.id,
    priority: 10,
    payload: { phone_e164: e164 },
  })
  if (jobError) {
    revalidateAccounts()
    return {
      error: `Hat oluştu ama eşleştirme kodu istenemedi: ${jobError}`,
      accountId: account.id,
    }
  }

  revalidateAccounts()
  return { ok: 'Eşleştirme kodu isteniyor.', accountId: account.id }
}

export async function sendSelfTest(accountId: string): Promise<ActionState> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { data: account, error } = await supabase
      .from('accounts')
      .select('id, phone_e164, status, enabled, is_locked')
      .eq('id', accountId)
      .eq('org_id', org.id)
      .maybeSingle()

    if (error || !account) return { error: 'Hat bulunamadı.' }
    if (account.status !== 'connected' || !account.enabled || account.is_locked) {
      return { error: 'Test için hattın bağlı olması gerekir.' }
    }
    if (!account.phone_e164) return { error: 'Hattın numarası henüz kayıtlı değil.' }

    const queued = await enqueueJob({
      type: 'message.send',
      accountId,
      payload: {
        phone_e164: account.phone_e164,
        body: 'Bu bir test mesajıdır. WhatsApp hattınız çalışıyor.',
      },
      priority: 5,
    })
    if (queued.error || !queued.id) {
      return { error: queued.error ?? 'Test mesajı gönderilemedi.' }
    }
    revalidateAccounts()
    return { ok: 'Test mesajı gönderildi. WhatsApp’ınızı kontrol edin.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Test gönderilemedi.' }
  }
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
        'Geçerli bir WhatsApp numarası değil. Örnek: +90 545 365 13 19 (ülke koduyla)',
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
  try {
    const { org, supabase } = await requireActiveOrg()
    if (!isOrgAdminRole(org.role)) {
      return { error: 'Hattı yalnızca sahip veya yönetici silebilir.' }
    }

    // Once servise cikis komutu birakiliyor: satir silinince cascade ile
    // wa.creds de gider, ama WhatsApp tarafinda cihaz bagli kalirdi.
    await enqueueJob({ type: 'account.logout', accountId, priority: 5 })

    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', accountId)
      .eq('org_id', org.id)
    if (error) return { error: error.message }

    revalidateAccounts()
    return { ok: 'Hat silindi.' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}

/** WhatsApp rehberinden çek — şifre yok; bağlı hat yeter. */
export async function syncAccountContactsAction(
  accountId: string,
  listName?: string,
): Promise<ActionState> {
  const { id, error } = await enqueueJob({
    type: 'account.sync_contacts',
    accountId,
    priority: 30,
    payload: listName ? { list_name: listName } : {},
  })
  if (error) return { error }
  if (!id) return { error: 'İş kuyruğa alınamadı.' }

  revalidateAccounts()
  revalidatePath('/kisiler')
  return {
    ok: 'WhatsApp’tan kişiler çekiliyor…',
    jobId: id,
  }
}

export type RehberPreviewItem = { phone: string; label: string }

/** Modal canlı listesi — account_contacts’tan son gelenler. */
export async function listRehberPreview(
  accountId: string,
): Promise<{ error?: string; total?: number; items?: RehberPreviewItem[] }> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const { count, error: countError } = await supabase
      .from('account_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id)
      .eq('account_id', accountId)
    if (countError) return { error: countError.message }

    const { data, error } = await supabase
      .from('account_contacts')
      .select('phone_e164, name, notify, updated_at')
      .eq('org_id', org.id)
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false })
      .limit(80)

    if (error) return { error: error.message }

    const items = (data ?? []).map((row) => {
      const name = (row.name ?? row.notify ?? '').trim()
      return {
        phone: row.phone_e164,
        label: name || row.phone_e164,
      }
    })

    return { total: count ?? items.length, items }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}

export type RehberSyncJobResult = {
  imported: number
  listId: string
  listName: string
  fromAccount: number
  fromMessages: number
  phase?: string
  live?: boolean
  seen?: number
  samples?: RehberPreviewItem[]
}

export async function readRehberSyncJob(
  jobId: string,
): Promise<{
  error?: string
  status?: string
  result?: RehberSyncJobResult
  progress?: {
    phase?: string
    live?: boolean
    seen?: number
    samples?: RehberPreviewItem[]
  }
}> {
  try {
    const { org, supabase } = await requireActiveOrg()
    const numericId = Number(jobId)
    if (!Number.isFinite(numericId)) return { error: 'İş kimliği geçersiz.' }

    const { data, error } = await supabase
      .from('jobs')
      .select('status, error, result, org_id')
      .eq('id', numericId)
      .eq('org_id', org.id)
      .maybeSingle()

    if (error) return { error: error.message }
    if (!data) return { error: 'İş bulunamadı.' }
    if (data.status === 'failed' || data.status === 'cancelled') {
      return { error: data.error?.trim() || 'Rehber çekme başarısız.', status: data.status }
    }

    const raw = (data.result ?? {}) as Partial<RehberSyncJobResult> & {
      samples?: Array<{ phone?: string; label?: string }>
    }

    const samples = Array.isArray(raw.samples)
      ? raw.samples
          .filter((s) => s && typeof s.phone === 'string')
          .map((s) => ({
            phone: String(s.phone),
            label: String(s.label || s.phone),
          }))
      : undefined

    const progress = {
      phase: typeof raw.phase === 'string' ? raw.phase : undefined,
      live: typeof raw.live === 'boolean' ? raw.live : undefined,
      seen: typeof raw.seen === 'number' ? raw.seen : undefined,
      samples,
    }

    if (data.status !== 'done') {
      return { status: data.status, progress }
    }

    if (typeof raw.listId !== 'string') {
      return { error: 'İş sonucu okunamadı.', status: 'done' }
    }

    return {
      status: 'done',
      progress,
      result: {
        imported: Number(raw.imported ?? 0),
        listId: raw.listId,
        listName: String(raw.listName ?? 'WhatsApp Rehberi'),
        fromAccount: Number(raw.fromAccount ?? 0),
        fromMessages: Number(raw.fromMessages ?? 0),
        phase: progress.phase,
        live: progress.live,
        seen: progress.seen,
        samples,
      },
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Oturum yok' }
  }
}

/** @deprecated use readRehberSyncJob */
export async function readRehberSyncJobResult(
  jobId: string,
): Promise<{ error?: string; result?: RehberSyncJobResult }> {
  const out = await readRehberSyncJob(jobId)
  if (out.error) return { error: out.error }
  if (out.result) return { result: out.result }
  return {}
}

