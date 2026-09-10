'use client'

import Link from 'next/link'
import { useEffect, useId, useState } from 'react'
import { Wordmark } from '@/components/brand'
import { Nav } from './nav'
import { OrgSwitcher, type OrgOption } from './org-switcher'

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className="relative block size-5" aria-hidden>
      <span
        className={`absolute left-0 block h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ease-[var(--ease-out)] ${
          open ? 'top-[9px] rotate-45' : 'top-[4px] rotate-0'
        }`}
      />
      <span
        className={`absolute left-0 top-[9px] block h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ease-[var(--ease-out)] ${
          open ? 'scale-x-0 opacity-0' : 'scale-x-100 opacity-100'
        }`}
      />
      <span
        className={`absolute left-0 block h-[1.5px] w-5 rounded-full bg-current transition-all duration-300 ease-[var(--ease-out)] ${
          open ? 'top-[9px] -rotate-45' : 'top-[14px] rotate-0'
        }`}
      />
    </span>
  )
}

export function MobileChrome({
  homeHref,
  orgName,
  email,
  orgs,
  activeOrgId,
  signOutAction,
}: {
  homeHref: string
  orgName: string
  email: string | null
  orgs: OrgOption[]
  activeOrgId: string
  signOutAction: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const titleId = useId()

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setOpen(false)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const close = () => setOpen(false)

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-hairline bg-surface/95 backdrop-blur-md md:hidden">
        <div className="flex h-14 items-center gap-3 px-3">
          <Link href={homeHref} className="min-w-0 shrink-0" onClick={close}>
            <Wordmark />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-semibold text-ink">{orgName}</p>
          </div>
          <button
            type="button"
            className={`inline-flex size-10 items-center justify-center rounded-md border transition-colors ${
              open
                ? 'border-accent/35 bg-accent-soft text-accent'
                : 'border-hairline bg-canvas text-ink-muted hover:border-hairline-strong hover:bg-surface-raised hover:text-ink'
            }`}
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? 'Menüyü kapat' : 'Menü'}
            onClick={() => setOpen((v) => !v)}
          >
            <MenuIcon open={open} />
          </button>
        </div>
      </header>

      <div
        className={`fixed inset-0 z-[70] md:hidden ${
          open ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-[color-mix(in_srgb,var(--color-ink)_38%,transparent)] transition-opacity duration-300 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
          aria-label="Menüyü kapat"
          onClick={close}
        />

        <aside
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={`absolute inset-y-0 right-0 flex w-[min(100vw-2.5rem,19.5rem)] flex-col border-l border-hairline bg-surface shadow-[var(--shadow-md)] transition-transform duration-300 ease-[var(--ease-out)] ${
            open ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-hairline px-3.5">
            <p id={titleId} className="text-[13.5px] font-bold tracking-[-0.02em] text-ink">
              Menü
            </p>
            <button
              type="button"
              className="inline-flex size-9 items-center justify-center rounded-md text-ink-muted hover:bg-canvas hover:text-ink"
              onClick={close}
              aria-label="Menüyü kapat"
            >
              <MenuIcon open />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-3">
            <div className="mb-3 rounded-md border border-hairline bg-canvas px-2.5 py-2">
              <OrgSwitcher orgs={orgs} activeOrgId={activeOrgId} compact />
            </div>
            <Nav onNavigate={close} />
          </div>

          <div className="shrink-0 space-y-2.5 border-t border-hairline px-3.5 py-3">
            {email ? (
              <p className="truncate text-[11.5px] text-ink-faint" title={email}>
                {email}
              </p>
            ) : null}
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex h-10 w-full items-center justify-center rounded-md border border-hairline text-[13px] font-medium text-ink-muted transition-colors hover:border-danger/30 hover:bg-[#fff5f4] hover:text-danger"
              >
                Çıkış
              </button>
            </form>
          </div>
        </aside>
      </div>
    </>
  )
}
