import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AuthForm } from './auth-form'

export const metadata: Metadata = { title: 'Giriş' }

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="filo-fade-in w-full max-w-[340px]">
        <div className="mb-7">
          <p className="mb-3 text-[13.5px] font-semibold tracking-[-0.02em]">Filo Admin</p>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
            Platform girişi
          </h1>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            Yalnızca <code className="font-mono text-[12px]">platform_admin</code> yetkili
            hesaplar girebilir.
          </p>
        </div>

        <div className="rounded-[10px] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)]">
          <Suspense fallback={<div className="h-[180px]" />}>
            <AuthForm />
          </Suspense>
        </div>
      </div>
    </main>
  )
}
