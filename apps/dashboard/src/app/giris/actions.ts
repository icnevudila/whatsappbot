'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type AuthState = { error: string } | null

function readCredentials(formData: FormData): { email: string; password: string } | string {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email) return 'E-posta adresi gerekli.'
  if (password.length < 8) return 'Şifre en az 8 karakter olmalı.'
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
          ? 'E-posta veya şifre hatalı.'
          : error.message,
    }
  }

  const devam = String(formData.get('devam') ?? '').trim()
  const safeNext =
    devam.startsWith('/') && !devam.startsWith('//') && !devam.includes('\\')
      ? devam
      : '/onboarding'

  redirect(safeNext)
}

export async function signUp(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData)
  if (typeof credentials === 'string') return { error: credentials }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signUp(credentials)
  if (error) return { error: error.message }

  if (!data.session) {
    return {
      error:
        'Kayıt alındı. E-posta doğrulama bağlantısına tıklayıp tekrar giriş yapın.',
    }
  }

  redirect('/onboarding')
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/giris')
}
