/**
 * Vendor-shaped local sandbox — tek catch-all router (createMockHttp onAny tek key tutar).
 * Tokens: SAMPLE_CREDENTIALS (gerçek production secret değil).
 */
import { createMockHttp, SAMPLE_CREDENTIALS } from './mock-http.js'

export async function startVendorSandbox() {
  const mock = createMockHttp()

  mock.onAny('POST', (req) => {
    const p = req.pathname

    if (p.includes(`/bot${SAMPLE_CREDENTIALS.telegramToken}/sendMessage`) || p.endsWith('/sendMessage')) {
      const body = JSON.parse(req.body || '{}') as { chat_id?: string | number; text?: string }
      return {
        json: {
          ok: true,
          result: {
            message_id: 9001,
            chat: { id: Number(body.chat_id) || 0 },
            text: body.text ?? '',
          },
        },
      }
    }

    if (p.endsWith('/messages') || p.includes('/messages')) {
      return { json: { message_id: 'mid.sample-meta-9001' } }
    }

    if (p.includes('/v2/bot/message/push')) {
      return { status: 200, json: {} }
    }

    if (p.includes('/cgi-bin/message/custom/send')) {
      return { json: { errcode: 0, errmsg: 'ok' } }
    }

    if (p.includes('/agentMessages')) {
      return { json: { name: 'phones/sample/agentMessages/9001' } }
    }

    if (p === '/send' || p.endsWith('/send')) {
      return { json: { ok: true, id: 'webchat-9001' } }
    }

    if (p.includes('/graphql.json') || p.includes('/graphql')) {
      const q = req.body || ''
      if (q.includes('productVariants') || q.includes('inventoryQuantity')) {
        return {
          json: {
            data: {
              productVariants: {
                edges: [
                  {
                    node: {
                      id: 'gid://shopify/ProductVariant/1',
                      sku: 'SKU-1',
                      inventoryQuantity: 7,
                      title: 'Sample',
                      product: { title: 'Sample Product' },
                    },
                  },
                ],
              },
            },
          },
        }
      }
      return {
        json: {
          data: {
            orders: {
              edges: [
                {
                  node: {
                    id: 'gid://shopify/Order/1',
                    name: '#1001',
                    displayFinancialStatus: 'PAID',
                    displayFulfillmentStatus: 'FULFILLED',
                    totalPriceSet: { shopMoney: { amount: '10.00', currencyCode: 'TRY' } },
                    customer: { email: 'sample@example.com', displayName: 'Sample' },
                    lineItems: { edges: [] },
                  },
                },
              ],
            },
          },
        },
      }
    }

    // Generic commerce POST
    return { json: { ok: true, id: 'sandbox-9001' } }
  })

  mock.onAny('GET', (req) => {
    const p = req.pathname
    if (p.includes('/wp-json/wc/v3/orders')) {
      return { json: { id: 1001, status: 'processing', total: '10.00' } }
    }
    if (p.includes('/wp-json/wc/v3/products')) {
      return { json: [{ id: 1, sku: 'SKU-1', stock_quantity: 3 }] }
    }
    if (p.includes('/orders') || p.includes('/shipment') || p.includes('/packages')) {
      return {
        json: {
          content: [{ orderNumber: 'TY-1001', status: 'Created', totalPrice: 10 }],
        },
      }
    }
    return { json: { ok: true, sandbox: true } }
  })

  const listening = await mock.listen()
  return {
    base: listening.base,
    calls: mock.calls,
    credentials: {
      ...SAMPLE_CREDENTIALS,
      metaPageId: 'sample-page-id',
      verifyToken: SAMPLE_CREDENTIALS.metaVerifyToken,
    },
    async close() {
      await listening.close()
    },
  }
}
