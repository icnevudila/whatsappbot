'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardHeader, EmptyState, Field, Input, Notice, Textarea } from '@/components/ui'
import { addToBlacklist, removeFromBlacklist, type BlacklistState } from './actions'

export type BlacklistRow = {
  id: string
  phone_e164: string
  reason: string | null
  created_at: string
}

export function BlacklistBoard({ initial }: { initial: BlacklistRow[] }) {
  const router = useRouter()
  const [rows, setRows] = useState(initial)
  const [state, formAction, pending] = useActionState<BlacklistState, FormData>(
    addToBlacklist,
    null,
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setRows(initial)
  }, [initial])

  useEffect(() => {
    if (state?.ok) router.refresh()
  }, [state?.ok, router])

  const remove = (id: string) => {
    setError(null)
    setBusyId(id)
    startTransition(async () => {
      const result = await removeFromBlacklist(id)
      if (result.error) {
        setError(result.error)
      } else {
        setRows((current) => current.filter((row) => row.id !== id))
      }
      setBusyId(null)
    })
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <Card>
        <CardHeader
          title="Engellenen numaralar"
          subtitle={`${rows.length} numara · kampanya ve hızlı gönderimde atlanır`}
        />

        {rows.length === 0 ? (
          <EmptyState
            title="Kara liste boş"
            description="Çıkmak isteyen veya elle engellediğiniz numaraları sağdaki formdan ekleyin. Servis bu numaralara mesaj atmaz."
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-[13px] tabular">{row.phone_e164}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-faint">
                    {row.reason ?? 'Sebep yok'} ·{' '}
                    {new Date(row.created_at).toLocaleDateString('tr-TR')}
                  </p>
                </div>
                <Button
                  variant="danger"
                  disabled={busyId === row.id}
                  onClick={() => remove(row.id)}
                >
                  {busyId === row.id ? 'Kaldırılıyor…' : 'Kaldır'}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {error ? (
          <div className="border-t border-hairline p-4">
            <Notice tone="danger">{error}</Notice>
          </div>
        ) : null}
      </Card>

      <Card>
        <CardHeader
          title="Numara ekle"
          subtitle="Birden fazla satır yapıştırabilirsiniz."
        />
        <form action={formAction} className="space-y-3.5 p-4">
          <Field
            label="Numaralar"
            hint="Her satıra bir numara. Ülke kodu yoksa Türkiye kabul edilir."
          >
            <Textarea
              name="numbers"
              rows={6}
              required
              placeholder={'0532 123 45 67\n+90 533 234 56 78'}
            />
          </Field>
          <Field label="Sebep (isteğe bağlı)">
            <Input name="reason" placeholder="Çıkmak istedi / şikayet" />
          </Field>

          {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
          {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

          <Button type="submit" variant="accent" disabled={pending} className="w-full">
            {pending ? 'Ekleniyor…' : 'Kara listeye ekle'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
