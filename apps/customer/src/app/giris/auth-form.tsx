'use client'

import { useActionState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Field, Input, Notice } from '@/components/ui'
import { contactMailto } from '@/lib/contact'
import { signIn, type AuthState } from './actions'

/** `?hata=` kodları — auth/callback, auth/confirm ve org kapıları. */
const AUTH_HATA_NOTICES: Record<string, ReactNode> = {
  uye: (
    <>
      Hesabınız henüz bir işletmeye atanmamış. Erişim için{' '}
      <a href={contactMailto()} className="underline underline-offset-2">
        iletişime geçin
      </a>
      .
    </>
  ),
  baglanti:
    'Davet veya onay bağlantısı geçersiz ya da süresi dolmuş. Yeni bir bağlantı isteyin veya tekrar giriş deneyin.',
}

export function AuthForm() {
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null)
  const hata = searchParams.get('hata')
  const hataNotice = hata ? AUTH_HATA_NOTICES[hata] : null

  return (
    <form action={formAction} className="space-y-4">
      {searchParams.get('devam') ? (
        <input type="hidden" name="devam" value={searchParams.get('devam') ?? ''} />
      ) : null}

      {hataNotice ? <Notice tone="danger">{hataNotice}</Notice> : null}

      <Field label="E-posta">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="siz@sirketiniz.com"
        />
      </Field>

      <Field label="Şifre">
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
        />
      </Field>

      <p className="-mt-2 text-right text-[12px]">
        <a
          href="/sifremi-unuttum"
          className="text-ink-muted underline-offset-2 hover:text-ink hover:underline"
        >
          Şifremi unuttum
        </a>
      </p>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <Button type="submit" variant="accent" disabled={pending} className="w-full">
        {pending ? 'Bekleyin…' : 'Giriş yap'}
      </Button>

      <p className="text-center text-[12px] leading-relaxed text-ink-muted">
        Hesabınız yok mu?{' '}
        <a href={contactMailto()} className="font-medium text-ink underline-offset-2 hover:underline">
          İletişime geçin
        </a>
        — kayıtlar yalnızca Filo tarafından açılır.
      </p>
    </form>
  )
}
