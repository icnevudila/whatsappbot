'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type ProfileState = { error?: string; ok?: string } | null

export async function updateProfile(
  _previous: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const company = String(formData.get('company') ?? '').trim()

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Oturum bulunamadı.' }

  // plan ve kota alanlari bilincli olarak disarida: bunlari kullanici
  // degistirebilseydi paket siniri anlamsiz olurdu.
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName || null, company: company || null })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/ayarlar')
  return { ok: 'Profil kaydedildi.' }
}
