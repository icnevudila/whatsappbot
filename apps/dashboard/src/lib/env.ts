function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Ortam degiskeni eksik: ${name}. apps/dashboard/.env.local dosyasini .env.example'a bakarak doldurun.`,
    )
  }
  return value
}

export const publicEnv = {
  supabaseUrl: required(
    'NEXT_PUBLIC_SUPABASE_URL',
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabasePublishableKey: required(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
  /** Onboarding bitince yonlendirilecek panel (gunluk ops UI). */
  panelUrl: (process.env.NEXT_PUBLIC_PANEL_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  ),
} as const
