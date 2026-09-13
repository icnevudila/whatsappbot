import { one } from './db.js'

export type OrgSendGate = {
  ok: boolean
  reason?: string
  quota?: number
  used?: number
  window_start?: string
  window_end?: string
}

/** Suspend + aylık kota + gönderim saati (DB FOR UPDATE). service_role org_send_gate. */
export async function checkOrgSendGate(orgId: string): Promise<OrgSendGate> {
  const row = await one<{ g: OrgSendGate | string }>(
    `select public.org_send_gate($1::uuid) as g`,
    [orgId],
  )
  if (!row?.g) return { ok: false, reason: 'org_not_found' }
  const g = typeof row.g === 'string' ? (JSON.parse(row.g) as OrgSendGate) : row.g
  return {
    ok: Boolean(g.ok),
    reason: g.reason ?? undefined,
    quota: g.quota ?? undefined,
    used: g.used ?? undefined,
    window_start: g.window_start ?? undefined,
    window_end: g.window_end ?? undefined,
  }
}

export function orgSendGateMessage(gate: OrgSendGate): string {
  if (gate.reason === 'suspended') {
    return 'İşletme askıya alındı; gönderim kapalı.'
  }
  if (gate.reason === 'monthly_quota') {
    return `Aylık mesaj kotası doldu (${gate.used ?? '?'}/${gate.quota ?? '?'})`
  }
  if (gate.reason === 'send_window') {
    const start = gate.window_start ?? '08:00'
    const end = gate.window_end ?? '18:00'
    return `Mesaj gönderme saat aralığı bekleniyor (${start}–${end})`
  }
  return gate.reason ? `Gönderim engellendi: ${gate.reason}` : 'Gönderim engellendi'
}
