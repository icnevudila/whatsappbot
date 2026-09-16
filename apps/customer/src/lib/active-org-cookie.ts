import { cookies } from 'next/headers'

/** Cihaz/tarayıcı bazlı aktif işletme tercihi — profiles.active_org_id senkronize edilmez. */
export const ACTIVE_ORG_COOKIE = 'wb_active_org'

const ORG_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isOrgId(value: string | null | undefined): value is string {
  return Boolean(value && ORG_ID_RE.test(value))
}

export async function readActiveOrgCookie(): Promise<string | null> {
  const jar = await cookies()
  const raw = jar.get(ACTIVE_ORG_COOKIE)?.value?.trim() ?? ''
  return isOrgId(raw) ? raw : null
}

export async function writeActiveOrgCookie(orgId: string): Promise<void> {
  if (!isOrgId(orgId)) return
  try {
    const jar = await cookies()
    jar.set(ACTIVE_ORG_COOKIE, orgId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 400,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    })
  } catch {
    // Server Component / RSC render içinde cookie yazılamaz.
  }
}

export async function clearActiveOrgCookie(): Promise<void> {
  try {
    const jar = await cookies()
    jar.delete(ACTIVE_ORG_COOKIE)
  } catch {
    /* ignore */
  }
}
