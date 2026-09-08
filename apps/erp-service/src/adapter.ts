import type { CommerceLookupResult } from '@wa/channels'
import { loadErpConfig, type ErpConfig } from './env.js'

function cfg(overrides?: Partial<ErpConfig>): ErpConfig {
  return loadErpConfig(overrides)
}

export function erpOrderUrl(base: string, orderId: string, provider: string): string {
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

export async function lookupOrder(
  orderId: string,
  config?: Partial<ErpConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: c.provider, orderId, status: 'Open', provider: c.provider },
    }
  }
  if (!c.apiBase) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(erpOrderUrl(c.apiBase, orderId, c.provider), {
      headers: { Authorization: `Bearer ${c.token}`, Accept: 'application/json' },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<ErpConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, mock: true, data: { channel: c.provider, sku, available: 100, provider: c.provider } }
  }
  return { ok: false, error: 'live_stock_provider_specific', mock: false }
}

export function getProvider(config?: Partial<ErpConfig>): string {
  return cfg(config).provider
}

/** @deprecated use getProvider() */
export const provider = getProvider()
