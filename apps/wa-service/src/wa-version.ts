import { fetchLatestBaileysVersion, type WAVersion } from '@whiskeysockets/baileys'
import { logger } from './logger.js'

let cached: WAVersion | undefined
let resolved = false

/**
 * WA Web surumu bir kez, servis acilisinda cozulur.
 * Her connect'te fetch etmek acilisi yavaslatiyor ve WhatsApp tarafinda
 * gereksiz trafik uretiyor. Fetch basarisiz olursa Baileys'in paketle gelen
 * varsayilani kullanilir (undefined donmek bunu saglar).
 */
export async function resolveWaVersion(): Promise<WAVersion | undefined> {
  if (resolved) return cached

  try {
    const { version, isLatest } = await fetchLatestBaileysVersion()
    cached = version
    logger.info({ version, isLatest }, 'WA Web surumu cozuldu')
  } catch (error) {
    logger.warn(
      { err: error },
      'WA Web surumu alinamadi, Baileys varsayilani kullanilacak',
    )
    cached = undefined
  }

  resolved = true
  return cached
}
