export type FastJwtClaims = {
  sub: string
  email?: string | null
  exp: number
  app_metadata?: {
    platform_admin?: boolean | string | number
    [key: string]: unknown
  }
  user_metadata?: Record<string, unknown>
  role?: string
}

export type FastAuthSession = {
  claims: FastJwtClaims
  token: string
}

function base64UrlDecode(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'base64url').toString('utf8')
  }
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

function decodeJwtPayload(token: string): FastJwtClaims | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const json = base64UrlDecode(parts[1])
    return JSON.parse(json) as FastJwtClaims
  } catch {
    return null
  }
}

/**
 * Supabase auth cookie'lerinden yerel (0ms) JWT çözümlemesi yapar.
 * Supabase Auth sunucusuna HTTP isteği atılmasını engeller, gecikmeyi ortadan kaldırır.
 * Token süresi dolmuşsa veya geçersizse null döner; bu durumda getUser() çağrılabilir.
 */
export function getFastSessionClaims(
  cookies: Iterable<{ name: string; value: string }>,
): FastAuthSession | null {
  const cookieList = Array.from(cookies)
  const cookie = cookieList.find(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'),
  )
  if (!cookie) return null

  const baseName = cookie.name.replace(/\.\d+$/, '')
  const exact = cookieList.find((c) => c.name === baseName)
  let rawVal = ''

  if (exact) {
    rawVal = exact.value
  } else {
    for (let i = 0; ; i++) {
      const chunk = cookieList.find((c) => c.name === `${baseName}.${i}`)
      if (!chunk) break
      rawVal += chunk.value
    }
  }

  if (!rawVal) return null

  let jsonStr = rawVal
  if (jsonStr.startsWith('base64-')) {
    try {
      jsonStr = base64UrlDecode(jsonStr.slice(7))
    } catch {
      return null
    }
  }

  try {
    const parsed = JSON.parse(jsonStr)
    const token = Array.isArray(parsed) ? parsed[0] : parsed?.access_token
    if (typeof token !== 'string') return null

    const claims = decodeJwtPayload(token)
    if (!claims || !claims.sub || !claims.exp) return null

    // Süresi dolmuş tokenları kabul etme (15 saniyelik güvenlik marjı ile)
    if (claims.exp * 1000 <= Date.now() + 15_000) {
      return null
    }

    return { claims, token }
  } catch {
    return null
  }
}
