import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth-shell'
import { AuthForm } from './auth-form'
import { AuthModeCopy } from './auth-mode-copy'

export const metadata: Metadata = {
  title: 'Giriş Yap · Mesajify',
  description: 'Mesajify WhatsApp Kampanya Platformu müşteri paneline giriş yapın.',
}

export default function LoginPage() {
  return (
    <AuthShell
      asideTitle={
        <>
          WhatsApp ile
          <br />
          <span className="text-[#25D366]">satışlarınızı büyütün.</span>
        </>
      }
      asideLead="WhatsApp hatlarınızı bağlayın, hedef kitlenizi hazırlayın, kişiselleştirilmiş kampanyalarınızı güvenle gönderin."
    >
      <Suspense
        fallback={
          <h1 className="mb-5 text-[22px] font-semibold tracking-[-0.02em]">Giriş yap</h1>
        }
      >
        <div className="mb-5">
          <AuthModeCopy />
        </div>
      </Suspense>
      <Suspense fallback={<div className="h-[260px]" aria-hidden />}>
        <AuthForm />
      </Suspense>
    </AuthShell>
  )
}
