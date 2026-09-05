'use client'

import { useSearchParams } from 'next/navigation'

/** URL ?mod=kayit ile başlık senkronu. */
export function AuthModeCopy() {
  const searchParams = useSearchParams()
  const signup = searchParams.get('mod') === 'kayit'

  return (
    <>
      <h1 className="text-[22px] font-semibold tracking-[-0.02em]">
        {signup ? 'Hesap oluştur' : 'Panele giriş'}
      </h1>
      <p className="mt-1 text-[12.5px] text-ink-muted">
        {signup
          ? '7 gün ücretsiz. Hat bağlayın, liste yükleyin, kampanyayı sunucuda çalıştırın.'
          : 'Çoklu hat, doğrulanmış listeler ve arka planda çalışan kampanyalar.'}
      </p>
    </>
  )
}
