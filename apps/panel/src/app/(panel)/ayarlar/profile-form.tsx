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
      <Field label="E-posta" hint="Giris adresiniz. Degistirmek icin destege yazin.">
        <Input value={email} disabled readOnly />
      </Field>

      <Field label="Ad soyad">
        <Input name="full_name" defaultValue={fullName} placeholder="Adiniz" />
      </Field>

      <Field label="Firma">
        <Input name="company" defaultValue={company} placeholder="Firma adi" />
      </Field>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <Button type="submit" variant="quiet" disabled={pending}>
        {pending ? 'Kaydediliyor...' : 'Kaydet'}
      </Button>
    </form>
  )
}
