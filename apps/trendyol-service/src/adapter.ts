import type { CommerceLookupResult } from '@wa/channels'
import { boolEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export type TrendyolConfig = {
  mockMode: boolean
  liveEnabled: boolean
  apiKey: string
  apiSecret: string
  sellerId: string
  apiBase: string
  orgId: string
  accountId: string
}

export function loadTrendyolConfig(overrides: Partial<TrendyolConfig> = {}): TrendyolConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    apiKey: process.env.CHANNEL_TOKEN?.trim() || process.env.TRENDYOL_API_KEY?.trim() || '',
    apiSecret: process.env.TRENDYOL_API_SECRET?.trim() || '',
    sellerId: process.env.TRENDYOL_SELLER_ID?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || 'https://apigw.trendyol.com',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    ...overrides,
  }
}

export function trendyolAuthHeader(apiKey: string, apiSecret: string): string {
  return `Basic ${Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')}`
}

export function trendyolOrdersPath(sellerId: string, orderId: string): string {
  return `/integration/order/sellers/${sellerId}/orders?orderNumber=${encodeURIComponent(orderId)}`
}

export function trendyolAnswerPath(sellerId: string, questionId: string): string {
  return `/integration/qna/sellers/${sellerId}/questions/${questionId}/answers`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<TrendyolConfig>,
): Promise<CommerceLookupResult> {
  const c = loadTrendyolConfig(config)
  if (c.mockMode || !c.liveEnabled) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'trendyol', orderId, status: 'Created', sellerId: c.sellerId || 'mock-seller' },
    }
  }
  if (!c.sellerId || !c.apiKey || !c.apiSecret) {
    return { ok: false, error: 'missing_trendyol_credentials' }
  }

  try {
    const res = await fetch(`${c.apiBase.replace(/\/$/, '')}${trendyolOrdersPath(c.sellerId, orderId)}`, {
      headers: {
        Authorization: trendyolAuthHeader(c.apiKey, c.apiSecret),
        'User-Agent': 'SelfIntegration',
      },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<TrendyolConfig>,
): Promise<CommerceLookupResult> {
  const c = loadTrendyolConfig(config)
  if (c.mockMode || !c.liveEnabled) {
    return { ok: true, mock: true, data: { channel: 'trendyol', sku, available: 5 } }
  }
  return { ok: false, error: 'live_stock_use_product_endpoint' }
}

export async function answerProductQuestion(
  questionId: string,
  answer: string,
  config?: Partial<TrendyolConfig>,
): Promise<CommerceLookupResult> {
  const c = loadTrendyolConfig(config)
  if (c.mockMode || !c.liveEnabled) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'trendyol', questionId, answer, answeredAt: new Date().toISOString() },
    }
  }
  if (!c.sellerId || !c.apiKey || !c.apiSecret) {
    return { ok: false, error: 'missing_trendyol_credentials' }
  }

  try {
    const res = await fetch(
      `${c.apiBase.replace(/\/$/, '')}${trendyolAnswerPath(c.sellerId, questionId)}`,
      {
        method: 'POST',
        headers: {
          Authorization: trendyolAuthHeader(c.apiKey, c.apiSecret),
          'content-type': 'application/json',
          'User-Agent': 'SelfIntegration',
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
