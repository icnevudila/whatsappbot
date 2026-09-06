'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Notice } from '@/components/ui'
import { switchOrg } from './org-actions'

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

  const active = orgs.find((org) => org.id === activeOrgId) ?? orgs[0]

  const onSwitch = (orgId: string) => {
    if (orgId === activeOrgId) return
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

  if (orgs.length <= 1) {
    return (
      <div className="mb-3 space-y-1">
        <p className="text-[10.5px] font-medium tracking-wide text-ink-faint uppercase">İşletme</p>
        <p className="truncate text-[12.5px] font-medium text-ink" title={active?.name}>
          {active?.name ?? '—'}
        </p>
        {active ? (
          <p className="truncate text-[10.5px] text-ink-faint">
            {active.role === 'owner' ? 'Sahip' : active.role === 'admin' ? 'Yönetici' : 'Üye'}
          </p>
        ) : null}
      </div>
    )
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
          onChange={(event) => onSwitch(event.target.value)}
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
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
    </div>
  )
}
