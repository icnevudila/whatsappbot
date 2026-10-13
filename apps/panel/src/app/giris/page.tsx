import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth-shell'
import { createT } from '@/lib/i18n'
import { getDictionary } from '@/lib/i18n/server'
import { AuthForm } from './auth-form'
import { AuthModeCopy } from './auth-mode-copy'

export const metadata: Metadata = {
  title: 'Giriş Yap · Mesajify',
  description: 'Mesajify WhatsApp Kampanya Platformu paneline giriş yapın.',
}

export default async function LoginPage() {
  const { messages } = await getDictionary()
  const t = createT(messages)

  return (
    <AuthShell
      backHref="/"
      backLabel={t('auth.backHome')}
      footerLabel="Mesajify · WhatsApp Kampanya Platformu"
      privacyLabel="Gizlilik Politikası"
      termsLabel="Kullanım Koşulları"
      asideTitle={
        <>
          WhatsApp ile
          <br />
          <span className="bg-gradient-to-r from-[#25D366] via-[#00A884] to-[#25D366] bg-clip-text text-transparent">
            satışlarınızı büyütün.
          </span>
        </>
      }
      asideLead="WhatsApp hatlarınızı bağlayın, hedef kitlenizi hazırlayın, kişiselleştirilmiş kampanyalarınızı güvenle gönderin."
    >
      <Suspense
        fallback={
          <div className="mb-6">
            <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#0A0A0A]">Panele Giriş Yap</h1>
          </div>
        }
      >
        <div className="mb-6">
          <AuthModeCopy />
        </div>
      </Suspense>
      <Suspense fallback={<div className="h-[260px]" aria-hidden />}>
        <AuthForm />
      </Suspense>
    </AuthShell>
  )
}
