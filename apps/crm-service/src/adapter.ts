import type { CommerceLookupResult } from '@wa/channels'
import { env, CHANNEL } from './env.js'

const providers = Array.isArray(CHANNEL) ? CHANNEL : [CHANNEL]
const provider = (process.env.CRM_PROVIDER?.trim() || providers[0]!) as string

export function crmTicketUrl(base: string, id: string): string {
  const root = base.replace(/\/$/, '')
  switch (provider) {
    case 'hubspot':
      return `${root}/crm/v3/objects/tickets/${encodeURIComponent(id)}`
    case 'zendesk':
      return `${root}/api/v2/tickets/${encodeURIComponent(id)}.json`
    case 'calendar':
      return `${root}/calendars/primary/events/${encodeURIComponent(id)}`
    default:
      return `${root}/tickets/${encodeURIComponent(id)}`
  }
}

export async function lookupOrder(orderId: string): Promise<CommerceLookupResult> {
  // CRM'de "order" = ticket/case alias
  if (env.mockMode || !env.liveEnabled || !env.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: provider, ticketId: orderId, status: 'open', provider },
    }
  }
  const base = env.apiBase
  if (!base) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(crmTicketUrl(base, orderId), {
      headers: { Authorization: `Bearer ${env.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}` }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  }
}

export async function lookupStock(sku: string): Promise<CommerceLookupResult> {
  if (env.mockMode || !env.liveEnabled) {
    return { ok: true, mock: true, data: { channel: provider, sku, note: 'crm_has_no_stock' } }
  }
  return { ok: false, error: 'not_applicable' }
}

export { provider }
