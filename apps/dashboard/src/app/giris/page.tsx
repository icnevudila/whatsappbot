import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from './auth-form'

export const metadata: Metadata = { title: 'Giriş' }

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-[340px]">
        <div className="mb-7">
          <p className="mb-3 text-[28px] font-semibold tracking-tight">Filo</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">Kuruluma başla</h1>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            Marka, liste ve WhatsApp hattınızı bağlayıp ilk mesajı gönderin.
          </p>
        </div>
        <div className="rounded-[10px] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)]">
          <Suspense fallback={<div className="h-[232px]" />}>
            <AuthForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
