import type { CommerceLookupResult } from '@wa/channels'
import { loadTicimaxConfig, type TicimaxConfig } from './env.js'

function cfg(overrides?: Partial<TicimaxConfig>): TicimaxConfig {
  return loadTicimaxConfig(overrides)
}

export function ticimaxOrderPath(orderId: string): string {
  return `/api/siparis/${encodeURIComponent(orderId)}`
}

export function ticimaxStockPath(sku: string): string {
  return `/api/urun?stokKodu=${encodeURIComponent(sku)}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<TicimaxConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'ticimax', orderId, Durumu: 'Onaylandi', ToplamTutar: 780 },
    }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}${ticimaxOrderPath(orderId)}`, {
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
  config?: Partial<TicimaxConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, mock: true, data: { channel: 'ticimax', sku, StokAdedi: 9 } }
  }
  const base = c.apiBase.replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}${ticimaxStockPath(sku)}`, {
      headers: { Authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
