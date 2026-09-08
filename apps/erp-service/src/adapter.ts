import type { CommerceLookupResult } from '@wa/channels'
import { env, CHANNEL } from './env.js'

const providers = Array.isArray(CHANNEL) ? CHANNEL : [CHANNEL]
const provider = (process.env.ERP_PROVIDER?.trim() || providers[0]!) as string

export function erpOrderUrl(base: string, orderId: string): string {
  const root = base.replace(/\/$/, '')
  switch (provider) {
    case 'sap':
      return `${root}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder('${encodeURIComponent(orderId)}')`
    case 'oracle':
      return `${root}/fscmRestApi/resources/latest/salesOrders/${encodeURIComponent(orderId)}`
    case 'ifs':
      return `${root}/main/ifsapplications/projection/v1/CustomerOrderHandling.svc/CustomerOrderSet(OrderNo='${encodeURIComponent(orderId)}')`
    case 'nebim':
      return `${root}/api/orders/${encodeURIComponent(orderId)}`
    default:
      return `${root}/orders/${encodeURIComponent(orderId)}`
  }
}

export async function lookupOrder(orderId: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: provider, orderId, status: 'Open', provider },
    }
  }
  const base = env.apiBase
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(erpOrderUrl(base, orderId), {
      headers: { Authorization: `Bearer ${env.token}`, Accept: 'application/json' },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function lookupStock(sku: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return { ok: true, mock: true, data: { channel: provider, sku, available: 100, provider } }
  }
  return { ok: false, error: 'live_stock_provider_specific' }
}

export { provider }
