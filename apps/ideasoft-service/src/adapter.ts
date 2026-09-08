import type { CommerceLookupResult } from '@wa/channels'
import { env } from './env.js'

export function ideasoftOrderPath(orderId: string): string {
  return `/admin-api/orders/${encodeURIComponent(orderId)}`
}

export async function lookupOrder(orderId: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'ideasoft', orderId, status: 'waiting', amount: 210 },
    }
  }
  const base = (env.apiBase || '').replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}${ideasoftOrderPath(orderId)}`, {
      headers: { Authorization: `Bearer ${env.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function lookupStock(sku: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return { ok: true, mock: true, data: { channel: 'ideasoft', sku, stock: 4 } }
  }
  const base = (env.apiBase || '').replace(/\/$/, '')
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(`${base}/admin-api/products?sku=${encodeURIComponent(sku)}`, {
      headers: { Authorization: `Bearer ${env.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}
