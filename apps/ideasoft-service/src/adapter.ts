import type { CommerceLookupResult } from '@wa/channels'
import { loadIdeasoftConfig, type IdeasoftConfig } from './env.js'

function cfg(overrides?: Partial<IdeasoftConfig>): IdeasoftConfig {
  return loadIdeasoftConfig(overrides)
}

export function ideasoftOrderPath(orderId: string): string {
  return `/admin-api/orders/${encodeURIComponent(orderId)}`
}

export function ideasoftStockPath(sku: string): string {
  return `/admin-api/products?sku=${encodeURIComponent(sku)}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<IdeasoftConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'ideasoft', orderId, status: 'waiting', amount: 210 },
    }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}${ideasoftOrderPath(orderId)}`, {
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
  config?: Partial<IdeasoftConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, mock: true, data: { channel: 'ideasoft', sku, stock: 4 } }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}${ideasoftStockPath(sku)}`, {
      headers: { Authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
