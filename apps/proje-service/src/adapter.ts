import type { CommerceLookupResult } from '@wa/channels'
import { env, CHANNEL } from './env.js'

const primary = Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL

export async function lookupOrder(orderId: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
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

  try {
    const base = env.apiBase || 'https://example.invalid'
    const res = await fetch(`${base}/orders/${encodeURIComponent(orderId)}`, {
      headers: { authorization: `Bearer ${env.token}` },
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

export async function lookupStock(sku: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: primary, sku, available: 12 },
    }
  }
  try {
    const base = env.apiBase || 'https://example.invalid'
    const res = await fetch(`${base}/stock/${encodeURIComponent(sku)}`, {
      headers: { authorization: `Bearer ${env.token}` },
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
