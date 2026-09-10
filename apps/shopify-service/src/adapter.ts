import type { CommerceLookupResult } from '@wa/channels'
import { loadShopifyConfig, type ShopifyConfig } from './env.js'

function cfg(overrides?: Partial<ShopifyConfig>): ShopifyConfig {
  return loadShopifyConfig(overrides)
}

export function buildShopifyOrderQuery(orderId: string): string {
  const isGid = orderId.includes('gid://')
  if (isGid) {
    return `query($id: ID!) {
      order(id: $id) {
        id name displayFinancialStatus displayFulfillmentStatus
        totalPriceSet { shopMoney { amount currencyCode } }
        customer { email displayName }
        lineItems(first: 20) { edges { node { title quantity sku } } }
      }
    }`
  }
  return `query($query: String!) {
    orders(first: 1, query: $query) {
      edges {
        node {
          id name displayFinancialStatus displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { email displayName }
          lineItems(first: 20) { edges { node { title quantity sku } } }
        }
      }
    }
  }`
}

export function buildShopifyStockQuery(): string {
  return `query($query: String!) {
    productVariants(first: 5, query: $query) {
      edges { node { id sku inventoryQuantity title product { title } } }
    }
  }`
}

export function shopifyGraphqlPath(): string {
  return '/admin/api/2024-10/graphql.json'
}

export function shopifyGraphqlUrl(shopDomain: string): string {
  const trimmed = shopDomain.replace(/\/$/, '')
  if (/^https?:\/\//i.test(trimmed)) {
    return `${trimmed}${shopifyGraphqlPath()}`
  }
  const host = trimmed.replace(/^https?:\/\//, '')
  return `https://${host}${shopifyGraphqlPath()}`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<ShopifyConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: {
        channel: 'shopify',
        orderId,
        status: 'processing',
        total: 199.9,
        currency: 'TRY',
        customerEmail: 'musteri@ornek.com',
        lineItems: [{ title: 'Demo Ürün', quantity: 1, sku: 'SKU-1' }],
      },
    }
  }

  const shop = c.apiBase || process.env.SHOPIFY_SHOP?.trim()
  if (!shop) return { ok: false, error: 'missing_shop_domain' }

  try {
    const isGid = orderId.includes('gid://')
    const res = await fetch(shopifyGraphqlUrl(shop), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Shopify-Access-Token': c.token,
      },
      body: JSON.stringify({
        query: buildShopifyOrderQuery(orderId),
        variables: isGid ? { id: orderId } : { query: `name:${orderId}` },
      }),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<ShopifyConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'shopify', sku, available: 12, title: 'Demo varyant' },
    }
  }

  const shop = c.apiBase || process.env.SHOPIFY_SHOP?.trim()
  if (!shop) return { ok: false, error: 'missing_shop_domain' }

  try {
    const res = await fetch(shopifyGraphqlUrl(shop), {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'X-Shopify-Access-Token': c.token,
      },
      body: JSON.stringify({
        query: buildShopifyStockQuery(),
        variables: { query: `sku:${sku}` },
      }),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    const data = (await res.json()) as Record<string, unknown>
    return { ok: true, data, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
