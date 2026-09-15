import { Redis } from '@upstash/redis'

/**
 * Upstash Redis Client
 * UPSTASH_REDIS_REST_URL ve UPSTASH_REDIS_REST_TOKEN ortam degiskenlerini otomatik okur.
 */
export const redis = Redis.fromEnv()

export function getRedis(): Redis | null {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      return null
    }
    return redis
  } catch (err) {
    console.error('[Redis] Baslatma hatasi:', err)
    return null
  }
}
