import type { CommerceLookupResult } from '@wa/channels'
import { env } from './env.js'

/** token "key:secret" → Basic header */
export function parseWooAuthHeader(token: string): string {
  if (token.includes(':')) {
    return `Basic ${Buffer.from(token).toString('base64')}`
  }
  return `Bearer ${token}`
}

export async function lookupOrder(orderId: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
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

  const base = (env.apiBase || '').replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }

  try {
    const res = await fetch(`${base}/wp-json/wc/v3/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: parseWooAuthHeader(env.token) },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(sku: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return { ok: true, mock: true, data: { channel: 'woocommerce', sku, stock_quantity: 8 } }
  }

  const base = (env.apiBase || '').replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }

  try {
    const res = await fetch(
      `${base}/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}`,
      { headers: { Authorization: parseWooAuthHeader(env.token) } },
    )
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as unknown
    return { ok: true, data: { items: data }, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
