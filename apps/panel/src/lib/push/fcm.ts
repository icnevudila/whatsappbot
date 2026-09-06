import { createSupabaseServiceClient } from '@/lib/supabase/service'

export type PushPayload = {
  title: string
  body: string
  /** In-app path, e.g. /mesajlar?tel=+90… */
  path?: string
}

/**
 * Org üyelerinin cihazlarına FCM gönderir.
 * FIREBASE_SERVICE_ACCOUNT_JSON yoksa no-op (APK yine çalışır).
 */
export async function notifyOrgUsers(
  orgId: string,
  payload: PushPayload,
): Promise<{ sent: number; skipped: string | null }> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return { sent: 0, skipped: 'FIREBASE_SERVICE_ACCOUNT_JSON yok' }

  const admin = createSupabaseServiceClient()
  if (!admin) return { sent: 0, skipped: 'service role yok' }

  const { data: rows, error } = await admin
    .from('device_push_tokens' as never)
    .select('token' as never)
    .eq('org_id' as never, orgId as never)

  if (error) return { sent: 0, skipped: error.message }
  const tokenRows = (rows as unknown as { token: string }[] | null) ?? []
  const tokens = [...new Set(tokenRows.map((r) => r.token).filter(Boolean))]
  if (tokens.length === 0) return { sent: 0, skipped: 'token yok' }

  let credentials: { client_email: string; private_key: string; project_id: string }
  try {
    credentials = JSON.parse(raw) as typeof credentials
  } catch {
    return { sent: 0, skipped: 'Firebase JSON parse hatası' }
  }

  const accessToken = await getGoogleAccessToken(credentials)
  if (!accessToken) return { sent: 0, skipped: 'FCM access token alınamadı' }

  let sent = 0
  for (const token of tokens) {
    const ok = await sendFcm(credentials.project_id, accessToken, token, payload)
    if (ok) sent += 1
  }
  return { sent, skipped: null }
}

async function getGoogleAccessToken(credentials: {
  client_email: string
  private_key: string
}): Promise<string | null> {
  // Minimal JWT for FCM scope — avoids firebase-admin heavy dep in panel.
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = b64url(
    JSON.stringify({
      iss: credentials.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  )
  const unsigned = `${header}.${claim}`
  const key = credentials.private_key.replace(/\\n/g, '\n')
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned),
  )
  const jwt = `${unsigned}.${b64url(sig)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) return null
  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

async function sendFcm(
  projectId: string,
  accessToken: string,
  token: string,
  payload: PushPayload,
): Promise<boolean> {
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.path ? { path: payload.path } : {},
        android: {
          priority: 'HIGH',
          notification: { click_action: 'OPEN_APP', sound: 'default' },
        },
      },
    }),
  })
  return res.ok
}

function b64url(input: string | ArrayBuffer): string {
  const bytes =
    typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const raw = atob(b64)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}
