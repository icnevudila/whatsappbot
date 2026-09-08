import type { CommerceLookupResult } from '@wa/channels'
import { loadTsoftConfig, type TsoftConfig } from './env.js'

function cfg(overrides?: Partial<TsoftConfig>): TsoftConfig {
  return loadTsoftConfig(overrides)
}

export function tsoftOrderPath(orderId: string): string {
  return `/RestApi/Order/GetOrderById?OrderId=${encodeURIComponent(orderId)}`
}

export function tsoftStockPath(sku: string): string {
  return `/RestApi/Product/GetProductByCode?ProductCode=${encodeURIComponent(sku)}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<TsoftConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'tsoft', orderId, Durum: 'Hazirlaniyor', Toplam: 450 },
    }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}${tsoftOrderPath(orderId)}`, {
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
  config?: Partial<TsoftConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, mock: true, data: { channel: 'tsoft', sku, Stok: 22 } }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}${tsoftStockPath(sku)}`, {
      headers: { Authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
