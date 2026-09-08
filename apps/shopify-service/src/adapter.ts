import type { CommerceLookupResult } from '@wa/channels'
import { boolEnv, isMockMode, requiredEnv } from '@wa/channel-runtime'

export type ShopifyConfig = {
  mockMode: boolean
  liveEnabled: boolean
  token: string
  shop: string
  apiVersion: string
  orgId: string
  accountId: string
}

export function loadShopifyConfig(overrides: Partial<ShopifyConfig> = {}): ShopifyConfig {
  return {
    mockMode: isMockMode(true),
    liveEnabled: boolEnv('LIVE_ENABLED', false),
    token: process.env.CHANNEL_TOKEN?.trim() || '',
    shop: (process.env.API_BASE || process.env.SHOPIFY_SHOP || '').replace(/^https?:\/\//, '').replace(/\/$/, ''),
    apiVersion: process.env.SHOPIFY_API_VERSION?.trim() || '2024-10',
    orgId: requiredEnv('DEFAULT_ORG_ID', '00000000-0000-0000-0000-000000000001'),
    accountId: requiredEnv('DEFAULT_ACCOUNT_ID', '00000000-0000-0000-0000-000000000002'),
    ...overrides,
  }
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

export function shopifyGraphqlUrl(shop: string, apiVersion = '2024-10'): string {
  const host = shop.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `https://${host}/admin/api/${apiVersion}/graphql.json`
}

/** Test mock server için path-only URL builder */
export function shopifyGraphqlPath(apiVersion = '2024-10'): string {
  return `/admin/api/${apiVersion}/graphql.json`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<ShopifyConfig>,
): Promise<CommerceLookupResult> {
  const c = loadShopifyConfig(config)

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

  if (!c.shop) return { ok: false, error: 'missing_shop_domain' }

  const isGid = orderId.includes('gid://')
  const url = c.shop.startsWith('127.0.0.1') || c.shop.startsWith('localhost') || c.shop.includes('://')
    ? `${c.shop.replace(/\/$/, '')}${shopifyGraphqlPath(c.apiVersion)}`
    : shopifyGraphqlUrl(c.shop, c.apiVersion)

  try {
    const res = await fetch(url, {
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
  const c = loadShopifyConfig(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'shopify', sku, available: 12, title: 'Demo varyant' },
    }
  }

  if (!c.shop) return { ok: false, error: 'missing_shop_domain' }

  const url = c.shop.startsWith('http')
    ? `${c.shop.replace(/\/$/, '')}${shopifyGraphqlPath(c.apiVersion)}`
    : shopifyGraphqlUrl(c.shop, c.apiVersion)

  try {
    const res = await fetch(url, {
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
