import { Suspense } from 'react'
import Link from 'next/link'
import { Wordmark } from '@/components/brand'
import { AuthForm } from './auth-form'

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-[340px]">
        <div className="mb-7">
          <Link href="/" className="mb-4 inline-flex">
            <Wordmark />
          </Link>
          <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
            Kampanya paneli
          </h1>
          <p className="mt-1.5 text-[12.5px] text-ink-muted">
            Çoklu hat bağlayın, listelerinizi doğrulayın, kampanyayı sunucuda
            7/24 çalıştırın.
          </p>
        </div>

        <div className="rounded-[10px] border border-hairline bg-surface p-4 shadow-[var(--shadow-card)]">
          <Suspense fallback={<div className="h-[232px]" />}>
            <AuthForm />
          </Suspense>
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">
          Gönderim yalnızca WhatsApp’ta kayıtlı numaralara yapılır ve hat başına
          günlük kota uygulanır. Bu sınırlar hattınızın kısıtlanmasını önlemek
          içindir.
        </p>
      </div>
    </main>
  )
}
