'use client'

import { useState, useTransition } from 'react'
import { Button, Card, CardHeader, Field, Input, Notice } from '@/components/ui'
import { WaMark } from '@/components/wa-mark'
import { checkWhatsAppPhone } from './actions'

export function WaCheckForm() {
  const [phone, setPhone] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ phone: string; exists: boolean } | null>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setResult(null)
    startTransition(async () => {
      const outcome = await checkWhatsAppPhone(phone)
      if (outcome.error) {
        setError(outcome.error)
        return
      }
      if (outcome.phone_e164 && typeof outcome.exists === 'boolean') {
        setResult({ phone: outcome.phone_e164, exists: outcome.exists })
      }
    })
  }

  return (
    <Card>
      <CardHeader
        title="WhatsApp kontrol"
        subtitle="Numara yazın — WhatsApp’ta var mı yok mu hemen görün. Listeye eklemez."
      />
      <form onSubmit={submit} className="space-y-3.5 p-4">
        <Field label="Numara" hint="Örnek: 0532 123 45 67">
          <Input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="0532 123 45 67"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </Field>

        <Button type="submit" variant="accent" disabled={pending || !phone.trim()}>
          {pending ? 'Kontrol ediliyor…' : 'Kontrol et'}
        </Button>

        {error ? <Notice tone="danger">{error}</Notice> : null}

        {result ? (
          <div className="flex items-center gap-3 rounded-md border border-hairline bg-canvas px-3 py-3">
            <WaMark status={result.exists ? 'valid' : 'invalid'} />
            <div className="min-w-0">
              <p className="font-mono text-[13px] tabular text-ink">{result.phone}</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                {result.exists ? 'WhatsApp’ta kayıtlı' : 'WhatsApp’ta yok'}
              </p>
            </div>
          </div>
        ) : null}
      </form>
    </Card>
  )
}
