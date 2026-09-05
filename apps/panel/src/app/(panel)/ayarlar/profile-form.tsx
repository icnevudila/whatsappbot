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
    <form action={formAction} className="space-y-2.5 p-3.5">
      <Field
        label="E-posta"
        hint="Giriş adresiniz. Değiştirmek için desteğe yazın."
      >
        <Input value={email} disabled readOnly />
      </Field>

      <Field label="Ad soyad" hint="Ekip listesinde ve bildirimlerde görünür.">
        <Input
          name="full_name"
          defaultValue={fullName}
          placeholder="Örn. Ayşe Yılmaz"
          autoComplete="name"
        />
      </Field>

      <Field label="Firma" hint="İsteğe bağlı.">
        <Input
          name="company"
          defaultValue={company}
          placeholder="Örn. Filo Ticaret"
          autoComplete="organization"
        />
      </Field>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Profili kaydet'}
      </Button>
    </form>
  )
}
