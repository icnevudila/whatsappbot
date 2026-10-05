'use server'

import { cookies } from 'next/headers'
import { requireActiveOrg } from '@/lib/org'
import { HIDE_SETUP_COOKIE, parseHiddenSetupOrgs } from '@/lib/setup-guide-cookie'

export async function dismissSetupGuide() {
  let org: Awaited<ReturnType<typeof requireActiveOrg>>['org']
  try {
    ;({ org } = await requireActiveOrg())
  } catch {
    return
  }

  const jar = await cookies()
  const ids = new Set(parseHiddenSetupOrgs(jar.get(HIDE_SETUP_COOKIE)?.value))
  ids.add(org.id)
  jar.set(HIDE_SETUP_COOKIE, [...ids].join(','), {
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
    sameSite: 'lax',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  })
}
