'use client'

import { useActionState, useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Field, Input, Notice } from '@/components/ui'
import { createOrg, switchOrg, type OrgActionState } from './org-actions'

export type OrgOption = {
  id: string
  name: string
  slug: string
  role: string
}

export function OrgSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: OrgOption[]
  activeOrgId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createState, createAction, createPending] = useActionState<OrgActionState, FormData>(
    createOrg,
    null,
  )

  const active = orgs.find((org) => org.id === activeOrgId) ?? orgs[0]

  useEffect(() => {
    if (createState?.ok) {
      setShowCreate(false)
      router.refresh()
    }
  }, [createState, router])

  const onSwitch = (orgId: string) => {
    if (orgId === activeOrgId || orgId === '__new__') return
    setError(null)
    startTransition(async () => {
      const result = await switchOrg(orgId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mb-3 space-y-2">
      <label className="block">
        <span className="mb-1 block text-[10.5px] font-medium tracking-wide text-ink-faint uppercase">
          İşletme
        </span>
        <select
          className="w-full rounded-md border border-hairline-strong bg-canvas px-2 py-1.5 text-[12.5px] text-ink focus:border-accent focus:outline-none"
          value={activeOrgId}
          disabled={pending}
          onChange={(event) => {
            const value = event.target.value
            if (value === '__new__') {
              setShowCreate(true)
              event.target.value = activeOrgId
              return
            }
            onSwitch(value)
          }}
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
          <option value="__new__">+ Yeni işletme…</option>
        </select>
      </label>

      {active ? (
        <p className="truncate text-[10.5px] text-ink-faint" title={active.slug}>
          {active.role === 'owner'
            ? 'Sahip'
            : active.role === 'admin'
              ? 'Yönetici'
              : 'Üye'}
        </p>
      ) : null}

      {error ? <Notice tone="danger">{error}</Notice> : null}

      {showCreate ? (
        <form action={createAction} className="space-y-2 rounded-md border border-hairline bg-canvas p-2">
          <Field label="Yeni işletme adı">
            <Input name="name" placeholder="Firma adı" required minLength={2} />
          </Field>
          {createState?.error ? <Notice tone="danger">{createState.error}</Notice> : null}
          <div className="flex gap-2">
            <Button type="submit" variant="accent" disabled={createPending}>
              {createPending ? 'Oluşturuluyor…' : 'Oluştur'}
            </Button>
            <Button
              type="button"
              variant="quiet"
              onClick={() => setShowCreate(false)}
              disabled={createPending}
            >
              Vazgeç
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
