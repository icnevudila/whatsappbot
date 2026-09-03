'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type AuthState = { error: string } | null

function readCredentials(formData: FormData): { email: string; password: string } | string {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email) return 'E-posta adresi gerekli.'
  if (password.length < 8) return 'Sifre en az 8 karakter olmali.'

  return { email, password }
}

export async function signIn(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData)
  if (typeof credentials === 'string') return { error: credentials }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword(credentials)

  if (error) {
    return {
      error:
        error.message === 'Invalid login credentials'
          ? 'E-posta veya sifre hatali.'
          : error.message,
    }
  }

  redirect('/hesaplar')
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData)
  if (typeof credentials === 'string') return { error: credentials }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp(credentials)

  if (error) return { error: error.message }

  // E-posta dogrulamasi acikken oturum donmez; kullaniciya bunu soylemek sart,
  // yoksa "kayit oldum ama giremiyorum" durumunda kalir.
  if (!data.session) {
    return {
      error:
        'Kayit alindi. E-posta adresinize gonderilen dogrulama baglantisina tiklayip tekrar giris yapin.',
    }
  }

  redirect('/hesaplar')
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/giris')
}
