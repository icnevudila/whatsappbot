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

      <Field label="E-posta Adresi">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="ornek@sirketiniz.com"
          className="h-10 text-[14px] bg-canvas focus:bg-surface transition-colors"
        />
      </Field>

      <Field label="Şifre">
        <Input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          minLength={8}
          placeholder="••••••••"
          className="h-10 text-[14px] bg-canvas focus:bg-surface transition-colors"
        />
      </Field>

      <div className="-mt-1 flex items-center justify-end text-[12px]">
        <a
          href="/sifremi-unuttum"
          className="font-medium text-ink-muted transition-colors hover:text-accent"
        >
          Şifremi unuttum
        </a>
      </div>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <Button
        type="submit"
        variant="accent"
        disabled={pending}
        className="h-10 w-full rounded-[10px] text-[14px] font-semibold shadow-sm transition-transform active:scale-[0.99]"
      >
        {pending ? 'Giriş yapılıyor…' : 'Giriş Yap'}
      </Button>

      <p className="pt-1 text-center text-[12px] leading-relaxed text-ink-muted">
        Hesabınız yok mu?{' '}
        <a href={contactMailto()} className="font-semibold text-accent transition-colors hover:underline">
          İletişime geçin
        </a>
        .
      </p>
    </form>
  )
}
