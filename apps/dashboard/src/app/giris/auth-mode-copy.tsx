'use client'

import { useSearchParams } from 'next/navigation'

export function AuthModeCopy() {
  const searchParams = useSearchParams()
  const signup = searchParams.get('mod') === 'kayit'

  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        {signup ? 'Kuruluma başla' : 'Devam et'}
      </h1>
      <p className="mt-1 text-[12.5px] text-ink-muted">
        {signup
          ? 'Marka, liste ve WhatsApp hattını bağlayıp ilk mesajı gönderin.'
          : 'Kaldığınız adımdan kuruluma devam edin.'}
      </p>
    </>
  )
}
