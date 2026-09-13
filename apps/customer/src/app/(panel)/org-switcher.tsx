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

function AdminMark({ role }: { role?: string }) {
  if (role !== 'admin') return null
  return <span className="shrink-0 text-[11px] font-medium text-ink-faint">Admin</span>
}

export function OrgSwitcher({
  orgs,
  activeOrgId,
  compact = false,
  variant = 'default',
}: {
  orgs: OrgOption[]
  activeOrgId: string
  compact?: boolean
  variant?: 'default' | 'header'
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const active = orgs.find((org) => org.id === activeOrgId) ?? orgs[0]
  const canSwitch = orgs.length > 1

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

  if (variant === 'header') {
    const typeClass =
      'truncate text-[13.5px] font-semibold tracking-[-0.02em] text-ink'
    if (!canSwitch) {
      return (
        <p className={`${typeClass} text-right`} title={active?.name}>
          {active?.name ?? '—'}
        </p>
      )
    }

    return (
      <div className="min-w-0">
        <div className="relative min-w-0">
          <select
            className={`w-full min-w-0 appearance-none bg-transparent py-0.5 pr-5 text-right focus:outline-none disabled:opacity-60 ${typeClass}`}
            value={activeOrgId}
            disabled={pending}
            aria-label="İşletme seç"
            onChange={(event) => onSwitch(event.target.value)}
          >
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
          <span
            className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-[10px] text-ink-faint"
            aria-hidden
          >
            ▾
          </span>
        </div>
        {error ? <p className="mt-0.5 truncate text-right text-[11px] text-danger">{error}</p> : null}
      </div>
    )
  }

  if (!canSwitch) {
    if (compact) {
      return (
        <div className="space-y-1.5">
          <span className="block text-[10.5px] font-medium tracking-wide text-ink-faint uppercase">
            İşletme
          </span>
          <p className="truncate text-[13px] font-medium text-ink" title={active?.name}>
            {active?.name ?? '—'}
          </p>
        </div>
      )
    }
    return (
      <div className="flex min-w-0 items-baseline gap-2">
        <p className="truncate text-[13px] font-medium text-ink-soft" title={active?.name}>
          {active?.name ?? '—'}
        </p>
        <AdminMark role={active?.role} />
      </div>
    )
  }

  return (
    <div className={`min-w-0 ${compact ? 'space-y-1.5' : 'flex items-center gap-2'}`}>
      <label className="block min-w-0">
        {compact ? (
          <span className="mb-1 block text-[10.5px] font-medium tracking-wide text-ink-faint uppercase">
            İşletme
          </span>
        ) : (
          <span className="sr-only">İşletme</span>
        )}
        <select
          className={
            compact
              ? 'w-full rounded-md border border-hairline-strong bg-canvas px-2 py-1.5 text-[12.5px] text-ink focus:border-accent focus:outline-none'
              : 'max-w-[240px] truncate rounded-md border border-hairline bg-canvas px-2.5 py-1 text-[13px] font-medium text-ink-soft focus:border-accent focus:outline-none'
          }
          value={activeOrgId}
          disabled={pending}
          aria-label="İşletme seç"
          onChange={(event) => onSwitch(event.target.value)}
        >
          {orgs.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
      </label>

      <AdminMark role={active?.role} />

      {error ? <Notice tone="danger">{error}</Notice> : null}
    </div>
  )
}
