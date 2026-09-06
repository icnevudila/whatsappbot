'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import { createOrg, type OrgActionState } from '@/app/(panel)/org-actions'

export function CreateOrgForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState<OrgActionState, FormData>(createOrg, null)

  useEffect(() => {
    if (state?.ok) {
      router.push('/kurulum')
      router.refresh()
    }
  }, [state?.ok, router])

  return (
    <form action={action} className="mt-5 space-y-3 border-t border-hairline pt-5">
      <p className="text-[13px] font-semibold text-ink">Yeni işletme oluştur</p>
      <p className="text-[12.5px] text-ink-muted">
        Deneme planı: 1 hat, aylık 1.000 mesaj. En fazla 3 işletmenin sahibi olabilirsiniz.
      </p>
      <Field label="İşletme adı">
        <Input name="name" required minLength={2} maxLength={80} placeholder="Şirket veya marka adı" />
      </Field>
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      <Button type="submit" variant="accent" disabled={pending}>
        {pending ? 'Oluşturuluyor…' : 'Ücretsiz başla'}
      </Button>
    </form>
  )
}
