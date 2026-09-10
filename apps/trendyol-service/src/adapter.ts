import { type CommerceLookupResult } from '@wa/channels'
import { loadTrendyolConfig, type TrendyolConfig } from './env.js'

function cfg(overrides?: Partial<TrendyolConfig>): TrendyolConfig {
  return loadTrendyolConfig(overrides)
}

export function trendyolAuthHeader(c: TrendyolConfig): string {
  const key = c.token || 'key'
  const secret = c.apiSecret || 'secret'
  return `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`
}

export function trendyolOrdersPath(sellerId: string): string {
  return `/integration/order/sellers/${sellerId}/orders`
}

export function trendyolQnaAnswerPath(sellerId: string, questionId: string): string {
  return `/integration/qna/sellers/${sellerId}/questions/${encodeURIComponent(questionId)}/answers`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<TrendyolConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled) {
    return {
      ok: true,
      mock: true,
      data: {
        channel: 'trendyol',
        orderId,
        status: 'Created',
        sellerId: c.sellerId || 'mock-seller',
      },
    }
  }

  if (!c.sellerId) return { ok: false, error: 'missing_seller_id' }

  try {
    const res = await fetch(
      `${c.apiBase.replace(/\/$/, '')}${trendyolOrdersPath(c.sellerId)}?orderNumber=${encodeURIComponent(orderId)}`,
      { headers: { Authorization: trendyolAuthHeader(c) } },
    )
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<TrendyolConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled) {
    return { ok: true, mock: true, data: { channel: 'trendyol', sku, available: 5 } }
  }
  return { ok: false, error: 'live_stock_not_wired', mock: false }
}

export async function answerProductQuestion(
  questionId: string,
  answer: string,
  config?: Partial<TrendyolConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'trendyol', questionId, answer, answeredAt: new Date().toISOString() },
    }
  }

  if (!c.sellerId) return { ok: false, error: 'missing_seller_id' }

  try {
    const res = await fetch(
      `${c.apiBase.replace(/\/$/, '')}${trendyolQnaAnswerPath(c.sellerId, questionId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: trendyolAuthHeader(c),
          'content-type': 'application/json',
        },
        body: JSON.stringify({ text: answer }),
      },
    )
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: { questionId }, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
