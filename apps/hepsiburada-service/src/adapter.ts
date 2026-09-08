import { type CommerceLookupResult } from '@wa/channels'
import { loadHepsiburadaConfig, type HepsiburadaConfig } from './env.js'

function cfg(overrides?: Partial<HepsiburadaConfig>): HepsiburadaConfig {
  return loadHepsiburadaConfig(overrides)
}

export function hepsiburadaOrderPath(orderId: string): string {
  return `/orders/${encodeURIComponent(orderId)}`
}

export function hepsiburadaStockPath(sku: string): string {
  return `/listings/stock/${encodeURIComponent(sku)}`
}

export function hepsiburadaQnaAnswerPath(questionId: string): string {
  return `/questions/${encodeURIComponent(questionId)}/answers`
}

export async function lookupOrder(
  orderId: string,
  config?: Partial<HepsiburadaConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'hepsiburada', orderId, status: 'Open' },
    }
  }

  const base = c.apiBase.replace(/\/$/, '')
  try {
    const res = await fetch(`${base}${hepsiburadaOrderPath(orderId)}`, {
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
  config?: Partial<HepsiburadaConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return { ok: true, mock: true, data: { channel: 'hepsiburada', sku, available: 3 } }
  }

  const base = c.apiBase.replace(/\/$/, '')
  try {
    const res = await fetch(`${base}${hepsiburadaStockPath(sku)}`, {
      headers: { Authorization: `Bearer ${c.token}` },
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: (await res.json()) as Record<string, unknown>, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}

export async function answerProductQuestion(
  questionId: string,
  answer: string,
  config?: Partial<HepsiburadaConfig>,
): Promise<CommerceLookupResult> {
  const c = cfg(config)

  if (c.mockMode || !c.liveEnabled || !c.token) {
    return {
      ok: true,
      mock: true,
      data: { channel: 'hepsiburada', questionId, answer },
    }
  }

  const base = c.apiBase.replace(/\/$/, '')
  try {
    const res = await fetch(`${base}${hepsiburadaQnaAnswerPath(questionId)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${c.token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ text: answer }),
    })
    if (!res.ok) return { ok: false, error: `http_${res.status}`, mock: false }
    return { ok: true, data: { questionId, answer }, mock: false }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), mock: false }
  }
}
