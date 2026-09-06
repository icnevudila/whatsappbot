'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { safeInternalPath } from '@/lib/auth-redirect'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type AuthState = { error?: string; ok?: string; success?: string } | null

async function callbackUrl(next: string): Promise<string> {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || (await headers()).get('origin')
  if (!origin) throw new Error('Site adresi yapılandırılmamış.')
  const url = new URL('/auth/callback', origin)
  url.searchParams.set('devam', next)
  return url.toString()
}

function authError(code?: string): string {
  if (code === 'invalid_credentials') return 'E-posta veya şifre hatalı.'
  if (code === 'email_not_confirmed') return 'Önce e-postanızdaki doğrulama bağlantısını açın.'
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit') {
    return 'Çok fazla deneme yapıldı. Biraz bekleyip tekrar deneyin.'
  }
  if (code === 'weak_password') return 'Daha güçlü bir şifre seçin; harf, rakam ve simge kullanın.'
  return 'İşlem tamamlanamadı. Bilgilerinizi kontrol edip tekrar deneyin.'
}

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
          : authError(error.code) || error.message,
    }
  }

  const safeNext = safeInternalPath(String(formData.get('devam') ?? '').trim(), '')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let needsSetup = true
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('active_org_id, is_platform_admin')
      .eq('id', user.id)
      .maybeSingle()

    const jwtAdmin =
      user.app_metadata?.platform_admin === true ||
      user.app_metadata?.platform_admin === 'true' ||
      user.app_metadata?.platform_admin === '1'
    const emailAdmin = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
      .split(',')
      .map((part) => part.trim().toLowerCase())
      .includes((user.email ?? '').trim().toLowerCase())
    const isPlatformAdmin =
      Boolean(jwtAdmin) || Boolean(profile?.is_platform_admin) || emailAdmin

    // Filo admin müşteri kurulumuna zorlanmaz.
    if (isPlatformAdmin) {
      needsSetup = false
    } else if (profile?.active_org_id) {
      const orgId = profile.active_org_id
      const [brand, contacts, connected, valid] = await Promise.all([
        supabase
          .from('brand_kits')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId),
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId),
        supabase
          .from('accounts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('status', 'connected'),
        supabase
          .from('contacts')
          .select('id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('wa_status', 'valid'),
      ])
      needsSetup = !(
        (brand.count ?? 0) > 0 &&
        (contacts.count ?? 0) > 0 &&
        (connected.count ?? 0) > 0 &&
        (valid.count ?? 0) > 0
      )
    }
  }

  if (needsSetup) {
    redirect('/kurulum')
  }

  redirect(safeNext || '/ozet')
}

/** Self-signup kapalı — hesaplar yalnızca yönetici / VT üzerinden açılır. */
export async function signUp(): Promise<AuthState> {
  return {
    error: 'Kayıt kapalı. Erişim için iletişime geçin: destek@filo.app',
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function requestPasswordReset(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Geçerli bir e-posta adresi girin.' }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: await callbackUrl('/sifre-yenile'),
  })
  if (error) return { error: authError(error.code) }
  return {
    success:
      'Bu adresle bir hesabınız varsa şifre yenileme bağlantısını gönderdik. Gelen kutusunu ve spam klasörünü kontrol edin.',
  }
}

export async function updatePassword(_previous: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  if (password.length < 8) return { error: 'Şifre en az 8 karakter olmalı.' }
  if (password !== formData.get('confirm')) return { error: 'Şifreler eşleşmiyor.' }
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Bağlantının süresi dolmuş. Yeni bir şifre yenileme bağlantısı isteyin.' }
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: authError(error.code) }
  return { success: 'Şifreniz güncellendi. Yeni şifrenizle hesabınızı kullanabilirsiniz.' }
}
