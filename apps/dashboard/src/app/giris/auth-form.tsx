'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Field, Input, Notice } from '@/components/ui'
import { signIn, type AuthState } from './actions'

export function AuthForm() {
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null)
  const noOrg = searchParams.get('hata') === 'uye'

  return (
    <form action={formAction} className="space-y-4">
      {searchParams.get('devam') ? (
        <input type="hidden" name="devam" value={searchParams.get('devam') ?? ''} />
      ) : null}

      {noOrg ? (
        <Notice tone="danger">
          Hesabınız henüz bir işletmeye atanmamış. Erişim için{' '}
          <a href="mailto:destek@filo.app" className="underline underline-offset-2">
            iletişime geçin
          </a>
          .
        </Notice>
      ) : null}

      <Field label="E-posta">
        <Input name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Şifre">
        <Input name="password" type="password" autoComplete="current-password" required minLength={8} />
      </Field>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <Button type="submit" variant="accent" disabled={pending} className="w-full">
        {pending ? 'Bekleyin…' : 'Giriş yap'}
      </Button>

      <p className="text-center text-[12px] text-ink-muted">
        Hesap yoksa{' '}
        <a href="mailto:destek@filo.app" className="underline underline-offset-2">
          iletişime geçin
        </a>
        .
      </p>
    </form>
  )
}
