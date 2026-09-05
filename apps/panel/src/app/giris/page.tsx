import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth-shell'
import { AuthForm } from './auth-form'
import { AuthModeCopy } from './auth-mode-copy'

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'Filo paneline giriş yapın veya ücretsiz hesap oluşturun.',
}

export default function LoginPage() {
  return (
    <AuthShell
      backHref="/"
      backLabel="← Ana sayfa"
      asideTitle={
        <>
          Panele gir,
          <br />
          <span className="text-[#9db8f5]">gönderimi yönet.</span>
        </>
      }
      asideLead="Hesabınızla hatları, listeleri ve kampanyaları tek yerden yönetin. Deneme sürümü kredi kartı istemez."
    >
      <Suspense
        fallback={<h1 className="mb-5 text-[22px] font-semibold tracking-[-0.02em]">Giriş yap</h1>}
      >
        <div className="mb-5">
          <AuthModeCopy />
        </div>
      </Suspense>
      <Suspense fallback={<div className="h-[260px]" aria-hidden />}>
        <AuthForm />
      </Suspense>
      <p className="mt-5 text-[11.5px] leading-relaxed text-ink-faint">
        Gönderim yalnızca WhatsApp’ta kayıtlı numaralara yapılır; hat başına günlük kota uygulanır.
      </p>
    </AuthShell>
  )
}
