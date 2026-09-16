'use client'

import { useActionState, useState } from 'react'
import { loginCanliTakip, type AuthActionResult } from './actions'

export function LockScreen() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    loginCanliTakip,
    null,
  )
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#0b1120] px-4 py-12 text-slate-100">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 shadow-inner">
            <svg
              className="size-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">Canlı Operasyon Paneli</h1>
          <p className="mt-1 text-xs text-slate-400">
            Yetkili yönetici erişimi için güvenlik şifresini girin.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Erişim Şifresi
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoFocus
                placeholder="Şifrenizi girin..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-xs text-slate-400 hover:text-slate-200"
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </div>

          {state?.error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2.5 text-xs text-rose-400">
              {state.error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isPending ? 'Doğrulanıyor...' : 'Panele Giriş Yap'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-4 text-center">
          <p className="text-[11px] text-slate-500">
            Bu ekran gizli operasyon ağına bağlıdır.
          </p>
        </div>
      </div>
    </div>
  )
}
