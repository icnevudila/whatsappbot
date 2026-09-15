'use client'

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Notice } from '@/components/ui'
import { Icon } from '@/components/icon'
import { switchOrg } from './org-actions'
import { waAvatarColor, waAvatarLetters } from '@/lib/wa-avatar'

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
  variant?: 'default' | 'header' | 'settings'
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

  if (variant === 'settings') {
    return (
      <SettingsOrgSwitcher
        orgs={orgs}
        activeOrgId={activeOrgId}
        active={active}
        canSwitch={canSwitch}
        pending={pending}
        error={error}
        onSwitch={onSwitch}
      />
    )
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
          <p className="truncate text-[16px] font-medium text-[#111b21]" title={active?.name}>
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
        {compact ? null : (
          <span className="sr-only">İşletme</span>
        )}
        <select
          className={
            compact
              ? 'w-full appearance-none rounded-none border-0 bg-transparent px-0 py-1 text-[16px] font-medium text-[#111b21] focus:outline-none'
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

function SettingsOrgSwitcher({
  orgs,
  activeOrgId,
  active,
  canSwitch,
  pending,
  error,
  onSwitch,
}: {
  orgs: OrgOption[]
  activeOrgId: string
  active: OrgOption | undefined
  canSwitch: boolean
  pending: boolean
  error: string | null
  onSwitch: (orgId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuPanelRef = useRef<HTMLDivElement>(null)
  const name = active?.name ?? '—'

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) {
      setMenuPos(null)
      return
    }
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return
      setMenuPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) return
      if (triggerRef.current?.contains(event.target)) return
      if (menuPanelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const menu =
    open && menuPos && canSwitch
      ? createPortal(
          <div
            ref={menuPanelRef}
            role="listbox"
            aria-label="İşletmeler"
            className="wb-wa-org-menu"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          >
            {orgs.map((org) => {
              const selected = org.id === activeOrgId
              return (
                <button
                  key={org.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={pending}
                  className={`wb-wa-org-option${selected ? ' is-active' : ''}`}
                  onClick={() => {
                    setOpen(false)
                    onSwitch(org.id)
                  }}
                >
                  <span
                    className="wb-wa-avatar wb-wa-org-option-avatar"
                    style={{ background: waAvatarColor(org.id) }}
                    aria-hidden
                  >
                    {waAvatarLetters(org.name)}
                  </span>
                  <span className="wb-wa-org-option-copy">
                    <span className="wb-wa-org-option-name">{org.name}</span>
                    {org.role === 'admin' ? (
                      <span className="wb-wa-org-option-meta">Admin</span>
                    ) : null}
                  </span>
                  {selected ? (
                    <Icon name="check" className="size-4 shrink-0 text-[#008069]" />
                  ) : null}
                </button>
              )
            })}
          </div>,
          document.body,
        )
      : null

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        className={`wb-wa-set-row wb-wa-org-switch${canSwitch ? '' : ' is-disabled'}`}
        disabled={!canSwitch || pending}
        aria-label="İşletme seç"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!canSwitch) return
          setOpen((value) => !value)
        }}
      >
        <span
          className="wb-wa-avatar"
          style={{ background: waAvatarColor(active?.id ?? activeOrgId) }}
          aria-hidden
        >
          {waAvatarLetters(name)}
        </span>
        <span className="wb-wa-set-copy">
          <span className="wb-wa-set-title">{name}</span>
          <span className="wb-wa-set-desc">
            {canSwitch ? 'İşletmeyi değiştir' : 'Aktif işletme'}
          </span>
        </span>
        {canSwitch ? (
          <span className={`wb-wa-org-caret${open ? ' is-open' : ''}`} aria-hidden />
        ) : null}
      </button>
      {menu}
      {error ? (
        <p className="px-4 pb-2 text-[12px] text-danger">{error}</p>
      ) : null}
    </div>
  )
}
