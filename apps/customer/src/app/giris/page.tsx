import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthShell } from '@/components/auth-shell'
import { AuthForm } from './auth-form'
import { AuthModeCopy } from './auth-mode-copy'

export const metadata: Metadata = {
  title: 'Giriş',
  description: 'Filo müşteri paneline giriş yapın.',
}

export default function LoginPage() {
  return (
    <AuthShell
      asideTitle={
        <>
          Panele gir,
          <br />
          <span className="text-[#9db8f5]">gönderimi yönet.</span>
        </>
      }
      asideLead="Hattını, kişilerini ve kampanyalarını tek yerden yönet. Yeni hesap için iletişime geçin."
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
