import type { CommerceLookupResult } from '@wa/channels'
import { loadMagentoConfig, type MagentoConfig, CHANNEL } from './env.js'

const primary = Array.isArray(CHANNEL) ? CHANNEL[0]! : CHANNEL

function cfg(overrides?: Partial<MagentoConfig>): MagentoConfig {
  return loadMagentoConfig(overrides)
}

export function magentoOrderPath(orderId: string): string {
  return `/rest/V1/orders/${encodeURIComponent(orderId)}`
}

export function magentoStockPath(sku: string): string {
  return `/rest/V1/stockItems/${encodeURIComponent(sku)}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<MagentoConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: {
        channel: primary,
        orderId,
        status: 'processing',
        grand_total: 320,
        order_currency_code: 'TRY',
        items: [{ sku: 'MG-1', qty_ordered: 1 }],
      },
    }
  }

  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }

  try {
    const res = await fetch(`${base}${magentoOrderPath(orderId)}`, {
      headers: { Authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<MagentoConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, mock: true, data: { channel: primary, sku, qty: 15 } }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}${magentoStockPath(sku)}`, {
      headers: { Authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
