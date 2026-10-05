import { cookies } from 'next/headers'
import { isOrgId } from '@/lib/active-org-cookie'

/** Özet’teki başlangıç kartını gizleme tercihi (işletme bazlı). */
export const HIDE_SETUP_COOKIE = 'wb_hide_setup'

export function parseHiddenSetupOrgs(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split(',').map((item) => item.trim()).filter(isOrgId)
}

export async function readHiddenSetupOrgs(): Promise<string[]> {
  const jar = await cookies()
  return parseHiddenSetupOrgs(jar.get(HIDE_SETUP_COOKIE)?.value)
}
