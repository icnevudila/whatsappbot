'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function acceptInvite(
  token: string,
): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı.' }

  const { error } = await supabase.rpc('accept_org_invite', { p_token: token })
  if (error) {
    const msg = error.message
    if (msg.includes('email mismatch')) {
      return { error: 'Davet başka bir e-posta için. Doğru hesapla giriş yapın.' }
    }
    if (msg.includes('expired')) return { error: 'Davetin süresi dolmuş.' }
    if (msg.includes('already accepted')) return { error: 'Davet zaten kabul edilmiş.' }
    if (msg.includes('not found')) return { error: 'Davet bulunamadı.' }
    return { error: msg }
  }
  return { ok: true }
}
