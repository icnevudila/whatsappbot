import type { CommerceLookupResult } from '@wa/channels'
import { loadProjeConfig, type ProjeConfig, CHANNEL } from './env.js'

const primary = Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL

function cfg(overrides?: Partial<ProjeConfig>): ProjeConfig {
  return loadProjeConfig(overrides)
}

export function projeOrderPath(orderId: string): string {
  return `/orders/${encodeURIComponent(orderId)}`
}

export function projeStockPath(sku: string): string {
  return `/stock/${encodeURIComponent(sku)}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<ProjeConfig>,
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
        total: 199.9,
        currency: 'TRY',
      },
    }
  }

  const base = (c.apiBase || 'https://example.invalid').replace(/\/$/, '')
  try {
    const res = await fetch(`${base}${projeOrderPath(orderId)}`, {
      headers: { authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<ProjeConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: primary, sku, available: 12 },
    }
  }
  const base = (c.apiBase || 'https://example.invalid').replace(/\/$/, '')
  try {
    const res = await fetch(`${base}${projeStockPath(sku)}`, {
      headers: { authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
