'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import { provisionCustomer, type ProvisionState } from './org-actions'

export function ProvisionCustomerForm() {
  const [state, formAction, pending] = useActionState<ProvisionState, FormData>(
    provisionCustomer,
    null,
  )

  return (
    <form action={formAction} className="space-y-3 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="İşletme adı" hint="Müşteri firması">
          <Input name="org_name" required minLength={2} placeholder="Örn. Anadolu Klinik" />
        </Field>
        <Field label="Sahip e-posta" hint="Davet gider; self-signup yok">
          <Input name="email" type="email" required placeholder="yetkili@firma.com" />
        </Field>
      </div>
      <Field label="Plan">
        <select
          name="plan"
          defaultValue="starter"
          className="h-9 w-full rounded-[8px] border border-hairline bg-canvas px-2.5 text-[13px]"
        >
          <option value="free">Deneme</option>
          <option value="starter">Başlangıç</option>
          <option value="pro">Büyüme</option>
          <option value="enterprise">Ajans</option>
        </select>
      </Field>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? 'Açılıyor…' : 'Müşteri + işletme aç'}
      </Button>
    </form>
  )
}
