'use client'

import { useState } from 'react'
import { Button } from '@/components/ui'

export function BillingCheckoutButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const start = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: 'starter' }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
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
    <div className="flex flex-col gap-1">
      <Button type="button" variant="accent" disabled={loading} onClick={() => void start()}>
        {loading ? 'Stripe…' : 'Paketi yükselt (Stripe)'}
      </Button>
      {error ? <span className="text-[11px] text-danger">{error}</span> : null}
    </div>
  )
}
