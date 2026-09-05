'use client'

import { useState, useTransition } from 'react'
import { AccentLink, Button, Card, CardHeader, Field, Input, Notice, QuietLink } from '@/components/ui'
import { WaMark } from '@/components/wa-mark'
import { checkWhatsAppPhone, type PhoneCheckResult } from './actions'

export function WaCheckForm() {
  const [phone, setPhone] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<PhoneCheckResult['code']>(undefined)
  const [result, setResult] = useState<{ phone: string; exists: boolean } | null>(null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setErrorCode(undefined)
    setResult(null)

    if (!phone.trim()) {
      setError('Numara girin. Örnek: 0532 123 45 67')
      setErrorCode('invalid_phone')
      return
    }

    startTransition(async () => {
      const outcome = await checkWhatsAppPhone(phone)
      if (outcome.error) {
        setError(outcome.error)
        setErrorCode(outcome.code)
        return
      }
      if (outcome.phone_e164 && typeof outcome.exists === 'boolean') {
        setResult({ phone: outcome.phone_e164, exists: outcome.exists })
      } else {
        setError('Beklenmeyen yanıt. Tekrar deneyin.')
        setErrorCode('failed')
      }
    })
  }

  return (
    <Card>
      <CardHeader
        title="WhatsApp kontrol"
        subtitle="Tek numara — listede var mı yok mu hemen görün. Deftere eklemez."
      />
      <form onSubmit={submit} className="space-y-3.5 p-4">
        <Field label="Numara" hint="Ülke kodu yoksa Türkiye (+90) kabul edilir.">
          <Input
            value={phone}
            onChange={(event) => {
              setPhone(event.target.value)
              if (error) {
                setError(null)
                setErrorCode(undefined)
              }
              if (result) setResult(null)
            }}
            placeholder="0532 123 45 67"
            inputMode="tel"
            autoComplete="tel"
            required
            aria-invalid={Boolean(error)}
          />
        </Field>

        <Button type="submit" variant="accent" disabled={pending || !phone.trim()} className="w-full">
          {pending ? 'Kontrol ediliyor…' : 'Kontrol et'}
        </Button>

        {pending ? (
          <div className="flex items-center gap-3 rounded-md border border-hairline bg-canvas px-3 py-3">
            <WaMark status="pending" />
            <div className="min-w-0">
              <p className="text-[13px] text-ink">Bağlı hat üzerinden sorgulanıyor</p>
              <p className="mt-0.5 text-[12px] text-ink-muted">
                Genelde birkaç saniye sürer. Sonuç burada görünür.
              </p>
            </div>
          </div>
        ) : null}

        {error && !pending ? (
          <div className="space-y-2">
            <Notice tone="danger">{error}</Notice>
            {errorCode === 'no_line' ? (
              <QuietLink href="/hesaplar">Hesaplara git</QuietLink>
            ) : null}
          </div>
        ) : null}

        {result && !pending ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-md border border-hairline bg-canvas px-3 py-3">
              <WaMark status={result.exists ? 'valid' : 'invalid'} showLabel />
              <div className="min-w-0">
                <p className="font-mono text-[13px] tabular text-ink">{result.phone}</p>
                <p className="mt-0.5 text-[12px] text-ink-muted">
                  {result.exists
                    ? 'Bu numara WhatsApp’ta kayıtlı — mesaj gönderilebilir.'
                    : 'WhatsApp’ta yok — kampanya ve hızlı gönderim bu numarayı atlar.'}
                </p>
              </div>
            </div>
            {result.exists ? (
              <AccentLink
                href={`/hizli-gonderim?tel=${encodeURIComponent(result.phone)}`}
                className="w-full"
              >
                Hızlı gönderime taşı
              </AccentLink>
            ) : null}
          </div>
        ) : null}

        {!pending && !error && !result ? (
          <p className="text-[11.5px] leading-snug text-ink-faint">
            Bağlı hat gerekir. Sonuç yalnızca burada görünür; deftere veya listeye yazılmaz.
          </p>
        ) : null}
      </form>
    </Card>
  )
}
