'use client'

import { useActionState, useEffect, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button, Field, Input, Notice } from '@/components/ui'
import { signIn, signUp, type AuthState } from './actions'

export function AuthForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mod') === 'kayit' ? 'signup' : 'signin',
  )
  const action = mode === 'signin' ? signIn : signUp
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, null)

  useEffect(() => {
    const next = searchParams.get('mod') === 'kayit' ? 'signup' : 'signin'
    setMode(next)
  }, [searchParams])

  function switchMode(next: 'signin' | 'signup') {
    setMode(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'signup') params.set('mod', 'kayit')
    else params.delete('mod')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  return (
    <form action={formAction} className="space-y-4">
      {searchParams.get('devam') ? (
        <input type="hidden" name="devam" value={searchParams.get('devam') ?? ''} />
      ) : null}

      <div
        className="grid grid-cols-2 gap-1 rounded-md border border-hairline bg-canvas p-1"
        role="tablist"
        aria-label="Oturum türü"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          onClick={() => switchMode('signin')}
          className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            mode === 'signin'
              ? 'bg-surface text-ink shadow-[var(--shadow-card)]'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Giriş
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          onClick={() => switchMode('signup')}
          className={`rounded-[var(--radius-sm)] px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            mode === 'signup'
              ? 'bg-surface text-ink shadow-[var(--shadow-card)]'
              : 'text-ink-muted hover:text-ink'
          }`}
        >
          Kayıt
        </button>
      </div>

      <Field label="E-posta">
        <Input
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="siz@sirketiniz.com"
        />
      </Field>

      <Field label="Şifre" hint={mode === 'signup' ? 'En az 8 karakter.' : undefined}>
        <Input
          name="password"
          type="password"
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          required
          minLength={8}
        />
      </Field>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <Button type="submit" variant="accent" disabled={pending} className="w-full">
        {pending
          ? 'Bekleyin…'
          : mode === 'signin'
            ? 'Giriş yap'
            : '7 gün ücretsiz başla'}
      </Button>

      {mode === 'signup' ? (
        <p className="text-[11.5px] leading-relaxed text-ink-faint">
          Kayıt olarak{' '}
          <a href="/kosullar" className="underline underline-offset-2 hover:text-ink-muted">
            kullanım koşullarını
          </a>{' '}
          ve{' '}
          <a href="/kvkk" className="underline underline-offset-2 hover:text-ink-muted">
            KVKK aydınlatma metnini
          </a>{' '}
          kabul etmiş olursunuz. Kredi kartı gerekmez.
        </p>
      ) : null}
    </form>
  )
}
