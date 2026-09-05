'use client'

import { useState } from 'react'
import { PLAN_LABELS, type PlanId } from '@wa/shared'
import { Button, Notice } from '@/components/ui'

const UPGRADE_PLANS: PlanId[] = ['starter', 'pro', 'enterprise']

export function BillingCheckoutButton({
  defaultPlan = 'starter',
}: {
  defaultPlan?: PlanId
}) {
  const [plan, setPlan] = useState<PlanId>(defaultPlan)
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
        body: JSON.stringify({ plan }),
      })
      const data = (await res.json()) as {
        url?: string
        error?: string
        status?: string
      }
      if (res.status === 503 || data.status === 'not_configured') {
        setNotConfigured(true)
        setError(
          data.error ??
            'Faturalama henüz yapılandırılmadı. Stripe anahtarları eklenince paket yükseltme açılır.',
        )
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
        <select
          value={plan}
          onChange={(e) => setPlan(e.target.value as PlanId)}
          className="h-8 rounded-md border border-hairline bg-surface px-2 text-[12.5px]"
          aria-label="Paket"
        >
          {UPGRADE_PLANS.map((id) => (
            <option key={id} value={id}>
              {PLAN_LABELS[id]}
            </option>
          ))}
        </select>
        <Button type="button" variant="accent" disabled={loading} onClick={() => void start()}>
          {loading ? 'Stripe…' : 'Paketi yükselt'}
        </Button>
      </div>
      {notConfigured ? (
        <Notice tone="warn">
          Ödeme altyapısı yapılandırılmadı. Şimdilik deneme planıyla devam edebilirsiniz; Stripe
          bağlanınca yükseltme burada açılır.
        </Notice>
      ) : null}
      {error && !notConfigured ? (
        <span className="text-[11px] text-danger">{error}</span>
      ) : null}
    </div>
  )
}
