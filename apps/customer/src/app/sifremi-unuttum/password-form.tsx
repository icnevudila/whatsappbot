'use client'
import { useActionState } from 'react'
import Link from 'next/link'
import { Button, Field, Input, Notice } from '@/components/ui'
import { requestPasswordReset, updatePassword, type AuthState } from '../giris/actions'

export function PasswordForm({ update = false }: { update?: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(update ? updatePassword : requestPasswordReset, null)
  return <form action={action} className="space-y-5" aria-busy={pending}>
    <div><h1 className="text-3xl font-semibold">{update ? 'Yeni şifrenizi belirleyin.' : 'Şifrenizi yenileyelim.'}</h1><p className="mt-3 text-sm text-ink-muted">{update ? 'Hesabınız için en az 8 karakterli yeni bir şifre seçin.' : 'Hesabınıza bağlı e-posta adresini yazın. Size bir yenileme bağlantısı gönderelim.'}</p></div>
    {update ? <><Field label="Yeni şifre"><Input name="password" type="password" autoComplete="new-password" minLength={8} required className="h-11" /></Field><Field label="Yeni şifre (tekrar)"><Input name="confirm" type="password" autoComplete="new-password" minLength={8} required className="h-11" /></Field></> : <Field label="E-posta adresi"><Input name="email" type="email" autoComplete="email" required placeholder="siz@sirketiniz.com" className="h-11" /></Field>}
    {state?.error && <Notice tone="danger">{state.error}</Notice>}
    {state?.success && <Notice tone="success">{state.success}</Notice>}
    <Button variant="accent" type="submit" className="h-11 w-full" disabled={pending || !!state?.success}>{pending ? 'İşlem yapılıyor…' : update ? 'Şifreyi güncelle' : 'Yenileme bağlantısı gönder'}</Button>
    <Link href={update && state?.success ? '/ozet' : '/giris'} className="block text-center text-sm text-accent">{update && state?.success ? 'Çalışma alanına git →' : '← Giriş ekranına dön'}</Link>
  </form>
}
