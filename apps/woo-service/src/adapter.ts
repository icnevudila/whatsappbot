import type { CommerceLookupResult } from '@wa/channels'
import { loadWooConfig, type WooConfig } from './env.js'

function cfg(overrides?: Partial<WooConfig>): WooConfig {
  return loadWooConfig(overrides)
}

/** token "key:secret" → Basic header */
export function parseWooAuthHeader(token: string): string {
  if (token.includes(':')) {
    return `Basic ${Buffer.from(token).toString('base64')}`
  }
  return `Bearer ${token}`
}

export function wooOrderPath(orderId: string): string {
  return `/wp-json/wc/v3/orders/${encodeURIComponent(orderId)}`
}

export function wooStockPath(sku: string): string {
  return `/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<WooConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

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
    const res = await fetch(`${base}${wooOrderPath(orderId)}`, {
      headers: { Authorization: parseWooAuthHeader(c.token) },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<WooConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, mock: true, data: { channel: 'woocommerce', sku, stock_quantity: 8 } }
  }

  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }

  try {
    const res = await fetch(`${base}${wooStockPath(sku)}`, {
      headers: { Authorization: parseWooAuthHeader(c.token) },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as unknown
    return { ok: true, data: { items: data }, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
