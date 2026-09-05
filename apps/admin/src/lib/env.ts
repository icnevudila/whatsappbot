function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Ortam degiskeni eksik: ${name}. apps/admin/.env.local dosyasini .env.example'a bakarak doldurun.`,
    )
  }
  return value
}

/**
 * NEXT_PUBLIC_ ile baslayan degiskenler tarayiciya gomulur.
 * Yalnizca publishable key; secret anahtar admin uygulamasina girmez.
 */
export const publicEnv = {
  supabaseUrl: required(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabasePublishableKey: required(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
} as const
