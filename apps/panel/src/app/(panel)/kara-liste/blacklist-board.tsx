'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AccentLink,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Notice,
  QuietLink,
  Textarea,
} from '@/components/ui'
import { addToBlacklist, removeFromBlacklist, type BlacklistState } from './actions'

export type BlacklistRow = {
  id: string
  phone_e164: string
  reason: string | null
  created_at: string
}

export function BlacklistBoard({ initial }: { initial: BlacklistRow[] }) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [rows, setRows] = useState(initial)
  const [formKey, setFormKey] = useState(0)
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
    if (state?.ok) {
      formRef.current?.reset()
      setFormKey((key) => key + 1)
      setError(null)
      router.refresh()
    }
  }, [state?.ok, router])

  const remove = (id: string, phone: string) => {
    if (!window.confirm(`${phone} kara listeden kaldırılsın mı?`)) return
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
      <div className="order-2 space-y-4 lg:order-1">
        <Card>
          <CardHeader
            title="Engellenen numaralar"
            subtitle={
              rows.length === 0
                ? 'Kampanya ve hızlı gönderim bu numaraları otomatik atlar'
                : `${rows.length} numara · kampanya ve hızlı gönderimde atlanır`
            }
          />

          {rows.length === 0 ? (
            <EmptyState
              title="Kara liste boş"
              description="Çıkmak isteyen, şikayet eden veya elle engellediğiniz numaraları formdan ekleyin. Servis bu numaralara mesaj göndermez."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <AccentLink href="/gelenler">Gelenlere bak</AccentLink>
                  <QuietLink href="/kisiler">Kişilere git</QuietLink>
                </div>
              }
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
                      {row.reason?.trim() ? row.reason.trim() : 'Sebep belirtilmedi'} ·{' '}
                      {new Date(row.created_at).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    disabled={busyId === row.id}
                    onClick={() => remove(row.id, row.phone_e164)}
                    title="Engeli kaldır — tekrar mesaj alabilir"
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
      </div>

      <div className="order-1 lg:order-2">
        <Card>
          <CardHeader
            title="Numara ekle"
            subtitle="Bir veya birden fazla satır yapıştırın. Sebep isteğe bağlıdır."
          />
          <form key={formKey} ref={formRef} action={formAction} className="space-y-3.5 p-4">
            <Field
              label="Numaralar"
              hint="Her satıra bir numara. Ülke kodu yoksa Türkiye (+90) kabul edilir."
            >
              <Textarea
                name="numbers"
                rows={6}
                required
                placeholder={'0532 123 45 67\n+90 533 234 56 78'}
              />
            </Field>
            <Field
              label="Sebep"
              hint="İsteğe bağlı — çıkış, şikayet veya dahili not."
            >
              <Input name="reason" placeholder="Çıkmak istedi / şikayet" />
            </Field>

            {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
            {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

            <Button type="submit" variant="accent" disabled={pending} className="w-full">
              {pending ? 'Ekleniyor…' : 'Kara listeye ekle'}
            </Button>

            {!state?.error && !state?.ok ? (
              <p className="text-[11.5px] leading-snug text-ink-faint">
                Aynı numara yeniden eklenirse sebep güncellenir. Liste detayından da tek tıkla
                eklenebilir.
              </p>
            ) : null}
          </form>
        </Card>
      </div>
    </div>
  )
}
