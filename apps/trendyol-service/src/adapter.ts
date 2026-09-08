import {
  type CommerceLookupResult,
} from '@wa/channels'
import { env } from './env.js'

function authHeader(): string {
  const sellerId = process.env.TRENDYOL_SELLER_ID?.trim() || 'seller'
  const key = env.token || 'key'
  const secret = process.env.TRENDYOL_API_SECRET?.trim() || 'secret'
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
}

export async function lookupOrder(orderId: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled) {
    return {
      ok: true,
      mock: true,
      data: {
        channel: 'trendyol',
        orderId,
        status: 'Created',
        sellerId: process.env.TRENDYOL_SELLER_ID ?? 'mock-seller',
      },
    }
  }

  const base = env.apiBase || 'https://apigw.trendyol.com'
  const sellerId = process.env.TRENDYOL_SELLER_ID?.trim()
  if (!sellerId) return { ok: false, error: 'missing_seller_id' }

  try {
    const res = await fetch(
      `${base}/integration/order/sellers/${sellerId}/orders?orderNumber=${encodeURIComponent(orderId)}`,
      { headers: { Authorization: authHeader() } },
    )
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function lookupStock(sku: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled) {
    return { ok: true, mock: true, data: { channel: 'trendyol', sku, available: 5 } }
  }
  return { ok: false, error: 'live_stock_not_wired' }
}

export async function answerProductQuestion(
  questionId: string,
  answer: string,
): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'trendyol', questionId, answer, answeredAt: new Date().toISOString() },
    }
  }

  const base = env.apiBase || 'https://apigw.trendyol.com'
  const sellerId = process.env.TRENDYOL_SELLER_ID?.trim()
  if (!sellerId) return { ok: false, error: 'missing_seller_id' }

  try {
    const res = await fetch(`${base}/integration/qna/sellers/${sellerId}/questions/${questionId}/answers`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(),
        'content-type': 'application/json',
      },
      body: JSON.stringify({ text: answer }),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    return { ok: true, data: { questionId }, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
