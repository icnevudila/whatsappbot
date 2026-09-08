import type { CommerceLookupResult } from '@wa/channels'
import { boolEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export type WooConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  apiBase: string
  orgId: string
  accountId: string
}

export function loadWooConfig(overrides: Partial<WooConfig> = {}): WooConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    apiBase: process.env.API_BASE?.trim() || '',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    ...overrides,
  }
}

export function parseWooAuthHeader(token: string): string {
  if (token.includes(':')) {
    return `Basic ${Buffer.from(token).toString('base64')}`
  }
  return `Bearer ${token}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<WooConfig>,
): Promise<CommerceLookupResult> {
  const c = loadWooConfig(config)
  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: {
        channel: 'woocommerce',
        orderId,
        status: 'processing',
        total: '249.00',
        currency: 'TRY',
        billing: { email: 'musteri@ornek.com' },
      },
    }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }

  try {
    const res = await fetch(`${base}/wp-json/wc/v3/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: parseWooAuthHeader(c.token) },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<WooConfig>,
): Promise<CommerceLookupResult> {
  const c = loadWooConfig(config)
  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, mock: true, data: { channel: 'woocommerce', sku, stock_quantity: 8 } }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}`, {
      headers: { Authorization: parseWooAuthHeader(c.token) },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: { items: await res.json() }, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
