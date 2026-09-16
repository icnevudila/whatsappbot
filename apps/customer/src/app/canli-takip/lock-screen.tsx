'use client'

import { useState } from 'react'
import { LogoMark, BRAND_NAME } from '@/components/brand'

export function LockScreen() {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/canli-takip/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()
      if (data.success) {
        window.location.reload()
      } else {
        setError(data.error || 'Hatalı şifre. Giriş reddedildi.')
      }
    } catch {
      setError('Bağlantı hatası oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-canvas px-4 py-12 font-sans text-ink">
      <div className="w-full max-w-sm rounded-[var(--radius-card)] border border-hairline bg-surface p-7 shadow-[var(--shadow-md)] sm:p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3.5 flex size-12 items-center justify-center rounded-full border border-accent/20 bg-accent-soft text-accent">
            <LogoMark className="size-6" />
          </div>
          <h1 className="text-[18px] font-bold tracking-tight text-ink">
            {BRAND_NAME} Operasyon Paneli
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            Yetkili sistem yöneticisi erişimi için güvenlik şifrenizi girin.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-[12.5px] font-semibold text-ink-soft uppercase tracking-wider"
            >
              Yönetici Şifresi
            </label>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
                placeholder="Şifreyi girin..."
                className="w-full rounded-[var(--radius-sm)] border border-hairline-strong bg-canvas px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint transition focus:border-accent focus:bg-surface focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-[12px] font-medium text-ink-muted hover:text-ink"
              >
                {showPassword ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-[var(--radius-sm)] border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-[13px] text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-[var(--radius-sm)] bg-accent px-4 py-2.5 text-[14px] font-semibold text-accent-ink shadow-sm transition hover:bg-accent-dim disabled:opacity-50"
          >
            {loading ? 'Doğrulanıyor...' : 'Panele Giriş Yap'}
          </button>
        </form>

        <div className="mt-6 border-t border-hairline pt-4 text-center">
          <p className="text-[12px] text-ink-faint">
            Bu ekran gizli yönetim ağına bağlıdır ve harici menülerde listelenmez.
          </p>
        </div>
      </div>
    </div>
  )
}
