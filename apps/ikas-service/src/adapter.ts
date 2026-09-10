import type { CommerceLookupResult } from '@wa/channels'
import { loadIkasConfig, type IkasConfig, CHANNEL } from './env.js'

const primary = Array.isArray(CHANNEL) ? CHANNEL[0] : CHANNEL

function cfg(overrides?: Partial<IkasConfig>): IkasConfig {
  return loadIkasConfig(overrides)
}

export function buildIkasOrderQuery(orderId: string) {
  return {
    query: `query IkasOrder($id: String!) {
  order(id: $id) {
    id
    orderNumber
    status
    totalAmount
    currency
    customer { email fullName }
    lineItems { sku name quantity price }
  }
}`,
    variables: { id: orderId },
  }
}

export function buildIkasStockQuery(sku: string) {
  return {
    query: `query IkasStock($sku: String!) {
  productVariant(sku: $sku) {
    sku
    stock
    product { name }
  }
}`,
    variables: { sku },
  }
}

export function ikasGraphqlPath(): string {
  return '/api/v1/admin/graphql'
}

export function ikasGraphqlUrl(apiBase: string): string {
  return `${apiBase.replace(/\/$/, '')}${ikasGraphqlPath()}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<IkasConfig>,
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
        customerEmail: 'ikas-mock@example.com',
        lineItems: [{ sku: 'IKAS-SKU-1', name: 'Ikas Product', quantity: 1 }],
      },
    }
  }

  try {
    const res = await fetch(ikasGraphqlUrl(c.apiBase), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${c.token}`,
      },
      body: JSON.stringify(buildIkasOrderQuery(orderId)),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const payload = (await res.json()) as {
      data?: { order?: Record<string, unknown> }
      errors?: unknown[]
    }
    if (payload.errors?.length) {
      return { ok: false, error: 'graphql_error', mock: false }
    }
    const order = payload.data?.order
    if (!order) return { ok: false, error: 'order_not_found', mock: false }
    return { ok: true, data: { channel: primary, orderId, ...order }, mock: false }
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
  config?: Partial<IkasConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: primary, sku, available: 12, productName: 'Ikas Mock Product' },
    }
  }

  try {
    const res = await fetch(ikasGraphqlUrl(c.apiBase), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${c.token}`,
      },
      body: JSON.stringify(buildIkasStockQuery(sku)),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const payload = (await res.json()) as {
      data?: { productVariant?: Record<string, unknown> }
      errors?: unknown[]
    }
    if (payload.errors?.length) {
      return { ok: false, error: 'graphql_error', mock: false }
    }
    const variant = payload.data?.productVariant
    if (!variant) return { ok: false, error: 'sku_not_found', mock: false }
    return {
      ok: true,
      data: { channel: primary, sku, available: variant.stock, ...variant },
      mock: false,
    }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      mock: false,
    }
  }
}
