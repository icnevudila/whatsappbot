'use client'

import { useActionState, useState } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import { signIn, signUp, type AuthState } from './actions'

export function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const action = mode === 'signin' ? signIn : signUp

  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null)

  return (
    <form action={formAction} className="space-y-3.5">
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
        label="Sifre"
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
        {pending ? 'Bekleyin...' : mode === 'signin' ? 'Giris yap' : 'Hesap olustur'}
      </Button>

      <button
        type="button"
        onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        className="w-full text-[12.5px] text-ink-muted transition-colors hover:text-ink"
      >
        {mode === 'signin'
          ? 'Hesabiniz yok mu? Kayit olun'
          : 'Hesabiniz var mi? Giris yapin'}
      </button>
    </form>
  )
}
