'use client'

import { useActionState, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Field, Input, Notice } from '@/components/ui'
import { signIn, signUp, type AuthState } from './actions'

export function AuthForm() {
  // Landing'deki "Ücretsiz dene" butonları ?mod=kayit ile geliyor.
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mod') === 'kayit' ? 'signup' : 'signin',
  )
  const action = mode === 'signin' ? signIn : signUp

  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-3.5">
      {searchParams.get('devam') ? (
        <input type="hidden" name="devam" value={searchParams.get('devam') ?? ''} />
      ) : null}

      <Field label="E-posta">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="siz@sirketiniz.com"
        />
      </Field>

      <Field
        label="Şifre"
        hint={mode === 'signup' ? 'En az 8 karakter.' : undefined}
      >
        <Input
          name="password"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={8}
        />
      </Field>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <Button type="submit" variant="accent" disabled={pending} className="w-full">
        {pending ? 'Bekleyin…' : mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}
      </Button>

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="w-full text-[12.5px] text-ink-muted transition-colors hover:text-ink"
      >
        {mode === 'signin'
          ? 'Hesabınız yok mu? Kayıt olun'
          : 'Hesabınız var mı? Giriş yapın'}
      </button>
    </form>
  )
}
