import type { CommerceLookupResult } from '@wa/channels'
import { loadCrmConfig, type CrmConfig } from './env.js'

function cfg(overrides?: Partial<CrmConfig>): CrmConfig {
  return loadCrmConfig(overrides)
}

export function crmTicketUrl(base: string, id: string, provider: string): string {
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

export async function lookupOrder(
  orderId: string,
  config?: Partial<CrmConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  // CRM'de "order" = ticket/case alias
  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: c.provider, ticketId: orderId, status: 'open', provider: c.provider },
    }
  }
  if (!c.apiBase) return { ok: false, error: 'missing_api_base' }
  try {
    const res = await fetch(crmTicketUrl(c.apiBase, orderId, c.provider), {
      headers: { Authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function lookupStock(
  sku: string,
  config?: Partial<CrmConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled) {
    return { ok: true, mock: true, data: { channel: c.provider, sku, note: 'crm_has_no_stock' } }
  }
  return { ok: false, error: 'not_applicable', mock: false }
}

export function getProvider(config?: Partial<CrmConfig>): string {
  return cfg(config).provider
}

/** @deprecated use getProvider() */
export const provider = getProvider()
