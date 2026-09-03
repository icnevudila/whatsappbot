function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Ortam degiskeni eksik: ${name}. apps/panel/.env.local dosyasini .env.example'a bakarak doldurun.`,
    )
  }
  return value
}

/**
 * NEXT_PUBLIC_ ile baslayan degiskenler tarayiciya gomulur.
 * Bu yuzden burada yalnizca publishable key var; secret anahtar panele hic girmiyor.
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
