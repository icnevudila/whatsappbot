'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import { updateProfile, type ProfileState } from './actions'

export function ProfileForm({
  fullName,
  company,
  email,
}: {
  fullName: string
  company: string
  email: string
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    null,
  )

  return (
    <form action={formAction} className="space-y-4 p-4">
      <Field label="E-posta" hint="Giriş adresiniz. Değiştirmek için desteğe yazın.">
        <Input value={email} disabled readOnly />
      </Field>

      <Field label="Ad soyad">
        <Input name="full_name" defaultValue={fullName} placeholder="Adınız" />
      </Field>

      <Field label="Firma">
        <Input name="company" defaultValue={company} placeholder="Firma adı" />
      </Field>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <Button type="submit" variant="quiet" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Kaydet'}
      </Button>
    </form>
  )
}
