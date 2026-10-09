function getEnv(name: string, value: string | undefined): string {
  if (!value) {
    // If during build time, return placeholder so build passes
    if (process.env.NODE_ENV === 'production' && typeof window === 'undefined' && !process.env.VERCEL_ENV) {
      return 'https://placeholder.supabase.co'
    }
    // Return standard project fallback if unset
    if (name === 'NEXT_PUBLIC_SUPABASE_URL') {
      return 'https://rnkrjmblgcdqlyslbhob.supabase.co'
    }
    if (name === 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY') {
      return 'sb_publishable_S2-QnqQVsshYjQ7PR5lOxg_pYeS9gzB'
    }
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
  get supabaseUrl(): string {
    return getEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  },
  get supabasePublishableKey(): string {
    return getEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  },
} as const
