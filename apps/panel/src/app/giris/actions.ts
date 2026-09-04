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
          ? 'E-posta veya şifre hatalı.'
          : error.message,
    }
  }

  // Hat yoksa dogrudan kuruluma; dolu hesapta izleme paneline.
  const { count: connectedCount } = await supabase
    .from('accounts')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'connected')

  if ((connectedCount ?? 0) === 0) {
    redirect('/kurulum')
  }

  redirect('/durum')
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

  // Yeni kullanici dogrudan panele degil kuruluma gider: bagli hat yokken
  // genel durum ekrani bos ve ne yapmasi gerektigi belirsiz.
  redirect('/kurulum')
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/')
}
