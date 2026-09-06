'use client'

import { useState } from 'react'
import { Button, Notice } from '@/components/ui'
import { CONTACT_EMAIL, contactMailto } from '@/lib/contact'

export function BillingCheckoutButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)

  const start = async () => {
    setLoading(true)
    setError(null)
    setNotConfigured(false)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
      const data = (await res.json()) as {
        url?: string
        error?: string
        status?: string
      }
      if (res.status === 503 || data.status === 'not_configured') {
        setNotConfigured(true)
        setError(null)
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

  return (
    <div className="flex w-full flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="accent" disabled={loading} onClick={() => void start()}>
          {loading ? 'Stripe…' : 'Paketi yükselt'}
        </Button>
        <span className="text-[11.5px] text-ink-faint">
          Tek abonelik planı — Stripe Checkout
        </span>
      </div>
      {notConfigured ? (
        <Notice tone="warn">
          Faturalama henüz etkin değil. Paket yükseltme için Filo ile iletişime geçin:{' '}
          <a
            href={contactMailto('Faturalama / paket yükseltme')}
            className="font-medium underline underline-offset-2"
          >
            {CONTACT_EMAIL}
          </a>
        </Notice>
      ) : null}
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </div>
  )
}
