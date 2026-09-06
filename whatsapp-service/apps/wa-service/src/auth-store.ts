import {
  BufferJSON,
  initAuthCreds,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataSet,
  type SignalDataTypeMap,
  type SignalKeyStore,
} from '@whiskeysockets/baileys'
import type { PoolClient } from 'pg'
import { one, query, tx } from './db.js'
import { logger } from './logger.js'
import { env } from './env.js'
import { AUTH_SCHEMA_VERSION } from './auth-schema.js'

export { AUTH_SCHEMA_VERSION } from './auth-schema.js'

/**
 * wa.auth_state / wa.creds icindeki formatin surumu.
 * Baileys v8 auth formatini degistiriyor ve migrate edilmemis hesaplar v8'de
 * hic baglanmiyor; bu kolon toplu migrasyonu bastan mumkun kiliyor.
 */

/**
 * jsonb'ye yazarken Buffer'lar BufferJSON.replacer ile
 * { type: 'Buffer', data: [...] } seklinde isaretlenir.
 */
function serialize(value: unknown): string {
  return JSON.stringify(value, BufferJSON.replacer)
}

/**
 * pg jsonb'yi hazir nesne olarak dondurur, yani BufferJSON.reviver hic
 * calismamis olur ve Buffer'lar duz nesne kalir. Tekrar metne cevirip
 * reviver ile parse etmek isaretleri geri Buffer'a donusturur.
 */
function deserialize<T>(raw: unknown): T {
  return JSON.parse(JSON.stringify(raw), BufferJSON.reviver) as T
}

/**
 * Kira baskasindaysa bu process bir zombi: yazmasi no-op olmali, yoksa
 * Signal ratchet'i geriler ve mesru sahip "Bad MAC" alir.
 *
 * Kiranin YOKLUGU yazmayi engellemez. Engellerse kira yenilenme penceresinde
 * mesru guncellemeler sessizce kaybolur.
 */
async function leaseBelongsToSomeoneElse(
  client: PoolClient,
  accountId: string,
  epoch: number,
): Promise<boolean> {
  const { rows } = await client.query(
    `select 1
       from wa.session_lease
      where account_id = $1
        and (holder_id <> $2 or epoch <> $3)
      limit 1`,
    [accountId, env.workerId, epoch],
  )
  return rows.length > 0
}

export type AuthHandle = {
  state: AuthenticationState
  /** Baileys'in creds.update olayina baglanir. */
  saveCreds: () => Promise<void>
  /** Yalnizca gercek logout'ta cagrilir. Yeniden baglanma dongusunde ASLA. */
  clear: () => Promise<void>
}

/**
 * Hesabin auth state'ini Postgres'te tutan SignalKeyStore.
 * epoch, kira citidir: yazmalar bu epoch hala bizimken gecerli sayilir.
 */
export async function createAuthHandle(
  accountId: string,
  epoch: number,
): Promise<AuthHandle> {
  const log = logger.child({ accountId, scope: 'auth-store' })

  const credsRow = await one<{ value: unknown }>(
    'select value from wa.creds where account_id = $1',
    [accountId],
  )

  const creds: AuthenticationCreds = credsRow
    ? deserialize<AuthenticationCreds>(credsRow.value)
    : initAuthCreds()

  if (!credsRow) {
    log.info('Kayitli kimlik bilgisi yok, yeni auth creds uretildi')
  }

  const keys: SignalKeyStore = {
    async get<T extends keyof SignalDataTypeMap>(type: T, ids: string[]) {
      const result: { [id: string]: SignalDataTypeMap[T] } = {}
      if (ids.length === 0) return result

      // Baileys ids dizisi gonderir; tek sorgu ile aliyoruz, N+1 yok.
      const rows = await query<{ key_id: string; value: unknown }>(
        `select key_id, value
           from wa.auth_state
          where account_id = $1
            and type = $2
            and key_id = any($3::text[])`,
        [accountId, type, ids],
      )

      for (const row of rows) {
        const value = deserialize<SignalDataTypeMap[T]>(row.value)

        // Kolayca atlanan bir hata: app-state-sync-key okumada protobuf
        // nesnesine geri canlandirilmak zorunda, yoksa app state senkronu bozulur.
        result[row.key_id] =
          type === 'app-state-sync-key' && value
            ? (proto.Message.AppStateSyncKeyData.fromObject(
                value as object,
              ) as unknown as SignalDataTypeMap[T])
            : value
      }

      return result
    },

    async set(data: SignalDataSet) {
      const upsertTypes: string[] = []
      const upsertIds: string[] = []
      const upsertValues: string[] = []
      const deleteTypes: string[] = []
      const deleteIds: string[] = []

      for (const [type, entries] of Object.entries(data)) {
        if (!entries) continue
        for (const [id, value] of Object.entries(entries)) {
          // null "sil" demektir, "uzerine yaz" degil.
          if (value === null || value === undefined) {
            deleteTypes.push(type)
            deleteIds.push(id)
          } else {
            upsertTypes.push(type)
            upsertIds.push(id)
            upsertValues.push(serialize(value))
          }
        }
      }

      if (upsertTypes.length === 0 && deleteTypes.length === 0) return

      // set() donmeden once veri kalici olmali. Fire-and-forget yazilirsa
      // Signal ratchet'i ilerler ama diske inmez; sonraki acilista "Bad MAC".
      await tx(async (client) => {
        if (await leaseBelongsToSomeoneElse(client, accountId, epoch)) {
          log.warn(
            { epoch },
            "Kira baska bir process'e ait, auth yazimi atlandi (zombi koruma)",
          )
          return
        }

        if (deleteTypes.length > 0) {
          await client.query(
            `delete from wa.auth_state
              where account_id = $1
                and (type, key_id) in (select * from unnest($2::text[], $3::text[]))`,
            [accountId, deleteTypes, deleteIds],
          )
        }

        if (upsertTypes.length > 0) {
          await client.query(
            `insert into wa.auth_state (account_id, type, key_id, value, schema_version)
             select $1, t.type, t.key_id, t.value::jsonb, $5
               from unnest($2::text[], $3::text[], $4::text[]) as t(type, key_id, value)
             on conflict (account_id, type, key_id) do update
               set value = excluded.value,
                   schema_version = excluded.schema_version,
                   updated_at = now()`,
            [accountId, upsertTypes, upsertIds, upsertValues, AUTH_SCHEMA_VERSION],
          )
        }
      })
    },
  }

  async function saveCreds(): Promise<void> {
    await tx(async (client) => {
      if (await leaseBelongsToSomeoneElse(client, accountId, epoch)) {
        log.warn({ epoch }, "Kira baska bir process'e ait, saveCreds atlandi")
        return
      }

      await client.query(
        `insert into wa.creds (account_id, value, schema_version)
         values ($1, $2::jsonb, $3)
         on conflict (account_id) do update
           set value = excluded.value,
               schema_version = excluded.schema_version,
               updated_at = now()`,
        [accountId, serialize(creds), AUTH_SCHEMA_VERSION],
      )
    })
  }

  async function clear(): Promise<void> {
    log.warn('Auth state siliniyor, hesap yeniden QR okutmak zorunda kalacak')
    await tx(async (client) => {
      await client.query('delete from wa.auth_state where account_id = $1', [accountId])
      await client.query('delete from wa.creds where account_id = $1', [accountId])
    })
  }

  return {
    // Sadece makeCacheableSignalKeyStore ile sariyoruz.
    // addTransactionCapability elle sarilmayacak: makeWASocket bunu kendi
    // icinde uyguluyor, ustune bir kat daha koymak yaygin ama yanlis.
    state: { creds, keys },
    saveCreds,
    clear,
  }
}
