import { one, query } from './db.js'
import { env } from './env.js'

export type LeaseResult =
  | { acquired: true; epoch: number }
  | { acquired: false; epoch: number | null; holderId: string | null }

type AcquireRow = {
  result: { acquired: boolean; epoch: number | null; holder_id?: string | null }
}

/**
 * Kira alinmadan socket acilmaz. Ayni hesap iki process'te acilirsa WhatsApp
 * connectionReplaced (440) dongusune ve device_removed'a gidiyor.
 */
export async function acquireLease(accountId: string): Promise<LeaseResult> {
  const row = await one<AcquireRow>('select wa.acquire_lease($1, $2, $3) as result', [
    accountId,
    env.workerId,
    env.leaseTtlSeconds,
  ])

  const result = row?.result
  if (result?.acquired && result.epoch !== null && result.epoch !== undefined) {
    return { acquired: true, epoch: Number(result.epoch) }
  }

  return {
    acquired: false,
    epoch: result?.epoch === null || result?.epoch === undefined ? null : Number(result.epoch),
    holderId: result?.holder_id ?? null,
  }
}

/**
 * false: kira baskasina gecmis, socket derhal atilmali.
 * throw: veritabanina ulasilamiyor. Bu durumda socket ATILMAZ; gecici bir
 * kesinti kendi kendine yaratilmis bir arizaya donusmemeli.
 */
export async function renewLease(accountId: string, epoch: number): Promise<boolean> {
  const row = await one<{ ok: boolean }>('select wa.renew_lease($1, $2, $3, $4) as ok', [
    accountId,
    env.workerId,
    epoch,
    env.leaseTtlSeconds,
  ])
  return row?.ok === true
}

/**
 * Kapanis sirasi kritik: once sock.end(), ANCAK socket kapandiktan sonra burasi.
 * Ters sirada yeni sahip eski socket hala acikken baglanir ve tam olarak
 * kacinmaya calistigimiz 440 dongusu tetiklenir.
 */
export async function releaseLease(accountId: string, epoch: number): Promise<boolean> {
  const row = await one<{ ok: boolean }>('select wa.release_lease($1, $2, $3) as ok', [
    accountId,
    env.workerId,
    epoch,
  ])
  return row?.ok === true
}

/** Kira kimde? 440 geldiginde geri calmamak icin bakilir. */
export async function readLeaseHolder(accountId: string): Promise<string | null> {
  const row = await one<{ holder_id: string }>(
    'select holder_id from wa.session_lease where account_id = $1 and expires_at > now()',
    [accountId],
  )
  return row?.holder_id ?? null
}

/** Bu process'in acik biraktigi eski kiralari temizler (cokme sonrasi yeniden acilis). */
export async function releaseOwnStaleLeases(): Promise<number> {
  const rows = await query<{ account_id: string }>(
    'delete from wa.session_lease where holder_id = $1 returning account_id',
    [env.workerId],
  )
  return rows.length
}
