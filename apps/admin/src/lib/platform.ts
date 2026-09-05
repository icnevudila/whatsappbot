import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export function isPlatformAdminUser(user: User | null | undefined): boolean {
  if (!user) return false
  const flag = user.app_metadata?.platform_admin
  return flag === true || flag === 'true'
}

/**
 * Platform süper yöneticisi zorunlu.
 * app_metadata.platform_admin true veya 'true' olmali; aksi halde /giris.
 */
export async function requirePlatformAdmin(): Promise<{
  user: User
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
}> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/giris')
  }

  if (!isPlatformAdminUser(user)) {
    await supabase.auth.signOut()
    redirect('/giris')
  }

  return { user, supabase }
}
