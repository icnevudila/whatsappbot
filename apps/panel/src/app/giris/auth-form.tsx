'use client'

import { useActionState, useState, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { Notice } from '@/components/ui'
import { contactMailto } from '@/lib/contact'
import { signIn, type AuthState } from './actions'

/** `?hata=` kodları — auth/callback, auth/confirm ve org kapıları. */
const AUTH_HATA_NOTICES: Record<string, ReactNode> = {
  uye: (
    <>
      Hesabınız henüz bir işletmeye atanmamış. Erişim için{' '}
      <a href={contactMailto()} className="underline underline-offset-2 font-medium">
        iletişime geçin
      </a>
      .
    </>
  ),
  baglanti:
    'Davet veya onay bağlantısı geçersiz ya da süresi dolmuş. Yeni bir bağlantı isteyin veya tekrar giriş deneyin.',
}

export function AuthForm() {
  const searchParams = useSearchParams()
  const [state, formAction, pending] = useActionState<AuthState, FormData>(signIn, null)
  const [showPassword, setShowPassword] = useState(false)
  const hata = searchParams.get('hata')
  const hataNotice = hata ? AUTH_HATA_NOTICES[hata] : null

  return (
    <form action={formAction} className="space-y-4">
      {searchParams.get('devam') ? (
        <input type="hidden" name="devam" value={searchParams.get('devam') ?? ''} />
      ) : null}

      {hataNotice ? <Notice tone="danger">{hataNotice}</Notice> : null}

      {/* E-posta */}
      <div>
        <label htmlFor="panel-email" className="mb-1.5 block text-[13px] font-semibold text-[#374151]">
          E-posta Adresi
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9CA3AF]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
              <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
              <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
            </svg>
          </span>
          <input
            id="panel-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="ornek@sirketiniz.com"
            className="h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-3.5 text-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-all duration-150 focus:border-[#0A0A0A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-black/[0.04]"
          />
        </div>
      </div>

      {/* Şifre */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="panel-password" className="text-[13px] font-semibold text-[#374151]">
            Şifre
          </label>
          <a
            href="/sifremi-unuttum"
            className="text-[12.5px] font-medium text-[#6B7280] transition-colors hover:text-[#0A0A0A]"
          >
            Şifremi unuttum
          </a>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-[#9CA3AF]">
            <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
              <path
                fillRule="evenodd"
                d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            id="panel-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            minLength={8}
            placeholder="••••••••"
            className="h-11 w-full rounded-[12px] border border-[#E5E7EB] bg-[#F9FAFB] pl-10 pr-10 text-[14px] text-[#0A0A0A] placeholder:text-[#9CA3AF] transition-all duration-150 focus:border-[#0A0A0A] focus:bg-white focus:outline-none focus:ring-4 focus:ring-black/[0.04]"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#9CA3AF] transition-colors hover:text-[#0A0A0A]"
            aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
          >
            {showPassword ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M3.28 2.22a.75.75 0 0 0-1.06 1.06l14.5 14.5a.75.75 0 1 0 1.06-1.06l-1.745-1.745a10.029 10.029 0 0 0 3.3-4.38 1.651 1.651 0 0 0 0-1.185A10.004 10.004 0 0 0 9.999 3a9.956 9.956 0 0 0-4.744 1.194L3.28 2.22ZM7.752 6.69l1.092 1.092a2.5 2.5 0 0 1 3.374 3.375l1.091 1.091a4 4 0 0 0-5.557-5.557Z"
                  clipRule="evenodd"
                />
                <path d="m10.748 13.93 2.523 2.523a9.987 9.987 0 0 1-3.27.547c-4.258 0-7.894-2.66-9.337-6.41a1.651 1.651 0 0 1 0-1.186A10.007 10.007 0 0 1 2.839 6.02L6.07 9.252a4 4 0 0 0 4.678 4.678Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden>
                <path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
                <path
                  fillRule="evenodd"
                  d="M.664 10.59a1.651 1.651 0 0 1 0-1.186A10.004 10.004 0 0 1 10 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0 1 10 17c-4.257 0-7.893-2.66-9.336-6.41ZM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      {/* Giriş Yap Butonu */}
      <div className="pt-1">
        <button
          type="submit"
          disabled={pending}
          className="group relative flex h-11 w-full items-center justify-center gap-2 rounded-[12px] bg-[#0A0A0A] px-5 text-[14.5px] font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#1F2937] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <span className="size-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
              <span>Giriş yapılıyor…</span>
            </>
          ) : (
            <>
              <span>Giriş Yap</span>
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </>
          )}
        </button>
      </div>

      <p className="pt-2 text-center text-[13px] leading-relaxed text-[#6B7280]">
        Hesabınız yok mu?{' '}
        <a
          href={contactMailto()}
          className="font-semibold text-[#0A0A0A] transition-colors hover:underline underline-offset-2"
        >
          İletişime geçin
        </a>
      </p>
    </form>
  )
}
