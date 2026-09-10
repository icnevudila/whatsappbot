'use client'

import { useEffect, useState } from 'react'
import { Button, Notice } from '@/components/ui'
import { CONTACT_EMAIL, contactMailto } from '@/lib/contact'

type BillingStatus = {
  checkoutReady?: boolean
  webhookReady?: boolean
  inviteReady?: boolean
  missing?: string[]
}

export function BillingCheckoutButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<BillingStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/billing/status')
        if (!res.ok) return
        const data = (await res.json()) as BillingStatus
        if (!cancelled) setStatus(data)
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const start = async (plan: 'starter' | 'pro' = 'starter') => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as {
        url?: string
        error?: string
        status?: string
      }
      if (res.status === 503 || data.status === 'not_configured') {
        setStatus((prev) => ({
          ...(prev ?? {}),
          checkoutReady: false,
          missing: prev?.missing?.length
            ? prev.missing
            : ['STRIPE_SECRET_KEY', 'STRIPE_PRICE_STARTER veya STRIPE_PRICE_ID'],
        }))
        return
      }
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Checkout açılamadı')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Ağ hatası')
    } finally {
      setLoading(false)
    }
  }

  const openPortal = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        setError(data.error ?? 'Portal açılamadı')
        return
      }
      window.location.href = data.url
    } catch {
      setError('Ağ hatası')
    } finally {
      setLoading(false)
    }
  }

  const checkoutReady = status?.checkoutReady === true
  const webhookReady = status?.webhookReady === true
  const known = status !== null

  return (
    <div className="flex w-full flex-col gap-2">
      {known && !checkoutReady ? (
        <Notice tone="warn">
          Stripe henüz bağlanmadı — paket yükseltme kapalı.
          {(status.missing?.length ?? 0) > 0 ? (
            <>
              {' '}
              Eksik env: <code className="text-[11px]">{status.missing!.join(', ')}</code>.
            </>
          ) : null}{' '}
          Yazın:{' '}
          <a
            href={contactMailto('Faturalama / paket yükseltme')}
            className="font-medium underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
        </Notice>
      ) : null}

      {known && checkoutReady && !webhookReady ? (
        <Notice tone="warn">
          Checkout açılır ama webhook eksik; ödeme sonrası kota otomatik
          güncellenmeyebilir.
        </Notice>
      ) : null}

      {known && checkoutReady && webhookReady ? (
        <Notice tone="accent">Faturalama hazır. Abonelik Stripe Checkout ile alınır.</Notice>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="accent"
          disabled={loading || (known && !checkoutReady)}
          onClick={() => void start('starter')}
        >
          {loading ? 'Stripe…' : 'Başlangıç’a yükselt'}
        </Button>
        <Button
          type="button"
          variant="quiet"
          disabled={loading || (known && !checkoutReady)}
          onClick={() => void start('pro')}
        >
          Büyüme
        </Button>
        <Button type="button" variant="quiet" disabled={loading} onClick={() => void openPortal()}>
          Kart / iptal (Portal)
        </Button>
      </div>
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </div>
  )
}
