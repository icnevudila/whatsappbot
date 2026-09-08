import { type CommerceLookupResult } from '@wa/channels'
import { env } from './env.js'

export async function lookupOrder(orderId: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'hepsiburada', orderId, status: 'Open' },
    }
  }
  return { ok: false, error: 'live_not_wired' }
}

export async function lookupStock(sku: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled) {
    return { ok: true, mock: true, data: { channel: 'hepsiburada', sku, available: 3 } }
  }
  return { ok: false, error: 'live_not_wired' }
}

export async function answerProductQuestion(
  questionId: string,
  answer: string,
): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'hepsiburada', questionId, answer },
    }
  }
  return { ok: false, error: 'live_not_wired' }
}
