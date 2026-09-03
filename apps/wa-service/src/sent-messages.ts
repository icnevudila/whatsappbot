import type { WAMessage, WAMessageKey, proto } from '@whiskeysockets/baileys'
import { one, query } from './db.js'
import { logger } from './logger.js'

/**
 * getMessage sozlesmesi: WhatsApp bir mesajin yeniden sifrelenmesini
 * istediginde Baileys orijinal icerigi bizden ister. Saglamazsak alicida
 * mesaj "this message can take a while" durumunda kaliyor.
 */
export async function rememberSentMessage(
  accountId: string,
  message: WAMessage,
): Promise<void> {
  const id = message.key?.id
  const remoteJid = message.key?.remoteJid
  if (!id || !remoteJid || !message.message) return

  try {
    await query(
      `insert into wa.sent_messages (account_id, msg_id, remote_jid, message)
       values ($1, $2, $3, $4::jsonb)
       on conflict (account_id, msg_id) do update
         set message = excluded.message`,
      [accountId, id, remoteJid, JSON.stringify(message.message)],
    )
  } catch (error) {
    logger.warn({ err: error, accountId, id }, 'sent_messages yazilamadi')
  }
}

export async function lookupSentMessage(
  accountId: string,
  key: WAMessageKey,
): Promise<proto.IMessage | undefined> {
  if (!key.id) return undefined

  try {
    const row = await one<{ message: unknown }>(
      'select message from wa.sent_messages where account_id = $1 and msg_id = $2',
      [accountId, key.id],
    )
    return (row?.message as proto.IMessage | undefined) ?? undefined
  } catch (error) {
    logger.warn({ err: error, accountId, id: key.id }, 'sent_messages okunamadi')
    return undefined
  }
}
