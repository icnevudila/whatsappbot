'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { markWaConnected } from './actions'

type AccountSnap = {
  id: string
  status: string
  qr_code: string | null
  qr_expires_at: string | null
  pairing_code: string | null
}

export function HatConnect({
  orgId,
  accountId,
  onConnected,
}: {
  orgId: string
  accountId: string
  onConnected: () => void
}) {
  const [account, setAccount] = useState<AccountSnap | null>(null)
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()

    void supabase
      .from('accounts')
      .select('id, status, qr_code, qr_expires_at, pairing_code')
      .eq('id', accountId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAccount(data as AccountSnap)
      })

    const channel = supabase
      .channel(`onboard-account-${accountId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `id=eq.${accountId}`,
        },
        (payload) => {
          const next = payload.new as AccountSnap
          setAccount(next)
        },
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [accountId, orgId])

  useEffect(() => {
    if (!account?.qr_code) {
      setDataUrl(null)
      return
    }
    let cancelled = false
    void QRCode.toDataURL(account.qr_code, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 6,
      color: { dark: '#000000', light: '#ffffff' },
    }).then((url) => {
      if (!cancelled) setDataUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [account?.qr_code])

  useEffect(() => {
    if (account?.status !== 'connected') return
    void markWaConnected().then(() => onConnected())
  }, [account?.status, onConnected])

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div className="flex aspect-square w-[140px] shrink-0 items-center justify-center border border-hairline bg-surface shadow-[var(--shadow-card)]">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt="WhatsApp QR" className="size-[120px]" />
        ) : (
          <p className="px-2 text-center text-[11.5px] text-ink-faint">
            {account?.status === 'connected' ? 'Bağlı' : 'QR bekleniyor…'}
          </p>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-[13px] leading-relaxed text-ink-muted">
          WhatsApp → Bağlı cihazlar → Cihaz bağla. QR okutulunca adım otomatik
          ilerler.
        </p>
        <p className="text-[12px] text-ink-faint">
          Durum:{' '}
          <span className="font-medium text-ink">{account?.status ?? '…'}</span>
          {account?.pairing_code ? ` · Kod: ${account.pairing_code}` : null}
        </p>
      </div>
    </div>
  )
}
