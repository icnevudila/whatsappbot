'use client'

import { useActionState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button, Field, Input, Notice } from '@/components/ui'
import { signIn, type AuthState } from './actions'

export function AuthForm() {
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null)

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
          placeholder="admin@filo.app"
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

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}

      <Button type="submit" variant="accent" disabled={pending} className="w-full">
        {pending ? 'Bekleyin…' : 'Giriş yap'}
      </Button>
    </form>
  )
}
