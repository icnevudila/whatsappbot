import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth-shell'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { AuthForm } from './auth-form'
import { AuthModeCopy } from './auth-mode-copy'

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'Filo paneline giriş yapın veya ücretsiz hesap oluşturun.',
}

export default async function LoginPage() {
  const { messages } = await getDictionary()
  const t = createT(messages)

  return (
    <AuthShell
      backHref="/"
      backLabel={t('auth.backHome')}
      footerLabel={t('auth.footer')}
      privacyLabel={t('auth.privacy')}
      termsLabel={t('auth.terms')}
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
        fallback={
          <h1 className="mb-5 text-[22px] font-semibold tracking-[-0.02em]">{t('auth.signIn')}</h1>
        }
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
