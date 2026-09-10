'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import { updateProfile, type ProfileState } from './actions'

export function ProfileForm({
  fullName,
  company,
  email,
  compact = false,
}: {
  fullName: string
  company: string
  email: string
  compact?: boolean
}) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    null,
  )

  return (
    <form action={formAction} className="space-y-2.5 p-3.5">
      {!compact ? (
        <Field label="E-posta" hint="Değiştirmek için desteğe yazın.">
          <Input value={email} disabled readOnly />
        </Field>
      ) : null}

      <Field label="Ad soyad">
        <Input
          name="full_name"
          defaultValue={fullName}
          placeholder="Örn. Ayşe Yılmaz"
          autoComplete="name"
        />
      </Field>

      {compact ? (
        <details className="text-[12.5px]">
          <summary className="cursor-pointer text-ink-muted">Firma (isteğe bağlı)</summary>
          <div className="mt-2">
            <Input
              name="company"
              defaultValue={company}
              placeholder="Örn. Filo Ticaret"
              autoComplete="organization"
            />
          </div>
        </details>
      ) : (
        <Field label="Firma" hint="İsteğe bağlı.">
          <Input
            name="company"
            defaultValue={company}
            placeholder="Örn. Filo Ticaret"
            autoComplete="organization"
          />
        </Field>
      )}

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? 'Kaydediliyor…' : 'Kaydet'}
      </Button>
    </form>
  )
}
