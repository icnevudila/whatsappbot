'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, Input, StatusPill } from '@/components/ui'

export type AdminOrgRow = {
  id: string
  name: string
  slug: string
  plan: string
  accounts_quota: number
  monthly_message_quota?: number
  suspended_at?: string | null
  member_count?: number
  connected: number
  accountsTotal: number
  locked: number
}

export function AdminOrgList({ orgs }: { orgs: AdminOrgRow[] }) {
  const [query, setQuery] = useState('')
  const [onlySuspended, setOnlySuspended] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr-TR')
    return orgs.filter((org) => {
      if (onlySuspended && !org.suspended_at) return false
      if (!q) return true
      const hay = `${org.name} ${org.slug} ${org.plan}`.toLocaleLowerCase('tr-TR')
      return hay.includes(q)
    })
  }, [orgs, onlySuspended, query])

  return (
    <Card>
      <CardHeader
        title="İşletmeler"
        subtitle={`${filtered.length}/${orgs.length} görünür · detay / kota / üyeler`}
      />
      <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-3.5 py-2.5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İşletme ara…"
          className="min-w-[180px] flex-1"
        />
        <label className="flex items-center gap-1.5 text-[12px] text-ink-muted">
          <input
            type="checkbox"
            checked={onlySuspended}
            onChange={(e) => setOnlySuspended(e.target.checked)}
            className="size-3.5 accent-[var(--color-accent)]"
          />
          Yalnız askıda
        </label>
      </div>
      {filtered.length === 0 ? (
        <p className="p-3.5 text-[13px] text-ink-muted">Eşleşen işletme yok.</p>
      ) : (
        <ul className="divide-y divide-hairline">
          {filtered.map((org) => (
            <li key={org.id}>
              <Link
                href={`/admin/${org.id}`}
                className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-3 transition-colors hover:bg-surface-raised"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ink">
                    {org.name}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-ink-faint">
                    {org.slug} · {org.member_count ?? 0} üye · hat{' '}
                    {org.connected}/{org.accountsTotal}
                    {org.locked > 0 ? ` · ${org.locked} kilitli` : ''} · kota{' '}
                    {org.accounts_quota}
                    {org.monthly_message_quota != null
                      ? ` · aylık ${org.monthly_message_quota}`
                      : ''}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {org.suspended_at ? <StatusPill status="stopped" /> : null}
                  <span className="rounded-sm border border-hairline px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-muted">
                    {org.plan}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
