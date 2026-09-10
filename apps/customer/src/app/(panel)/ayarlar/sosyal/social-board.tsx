'use client'

import { useActionState, useCallback, useEffect, useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { Button, EmptyState, Field, Input, Notice } from '@/components/ui'
import { deleteSocialAccount, saveSocialAccount, type SocialState } from './actions'

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', hint: 'instagram.com/isletme' },
  { id: 'facebook', label: 'Facebook', hint: 'facebook.com/isletme' },
  { id: 'tiktok', label: 'TikTok', hint: 'tiktok.com/@isletme' },
  { id: 'youtube', label: 'YouTube', hint: 'youtube.com/@isletme' },
  { id: 'x', label: 'X', hint: 'x.com/isletme' },
  { id: 'linkedin', label: 'LinkedIn', hint: 'linkedin.com/company/isletme' },
  { id: 'website', label: 'Web sitesi', hint: 'ornek.com' },
  { id: 'other', label: 'Diğer', hint: 'https://…' },
] as const

type PlatformId = (typeof PLATFORMS)[number]['id']

export const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map((row) => [row.id, row.label]),
)

export type SocialRow = {
  id: string
  platform: string
  label: string | null
  url: string
}

function isPlatform(value: string): value is PlatformId {
  return PLATFORMS.some((row) => row.id === value)
}

function hintFor(platform: string) {
  return PLATFORMS.find((row) => row.id === platform)?.hint ?? 'https://…'
}

function displayUrl(url: string) {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')
    const path = parsed.pathname.replace(/\/+$/, '')
    if (!path || path === '/') return host
    return `${host}${path}`
  } catch {
    return url
  }
}

export function SocialBoard({
  initial,
  canEdit,
}: {
  initial: SocialRow[]
  canEdit: boolean
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<SocialRow | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setEditing(null)
  }, [])

  return (
    <div className="space-y-3">
      {canEdit && initial.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="accent"
            onClick={() => {
              setEditing(null)
              setOpen(true)
            }}
          >
            Hesap ekle
          </Button>
        </div>
      ) : null}

      {initial.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-hairline bg-surface">
          <EmptyState
            tone="brand"
            title="Henüz hesap yok"
            description="Instagram, web sitesi veya diğer kanalları ekleyin. Kampanya görsellerinde kullanılabilir."
            action={
              canEdit ? (
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => {
                    setEditing(null)
                    setOpen(true)
                  }}
                >
                  Hesap ekle
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="divide-y divide-hairline rounded-[var(--radius-card)] border border-hairline bg-surface">
          {initial.map((row) => (
            <SocialItem
              key={row.id}
              row={row}
              canEdit={canEdit}
              onEdit={() => {
                setEditing(row)
                setOpen(true)
              }}
            />
          ))}
        </ul>
      )}

      {open && canEdit ? (
        <SocialModal key={editing?.id ?? 'new'} initial={editing} onClose={close} />
      ) : null}
    </div>
  )
}

function SocialModal({
  initial,
  onClose,
}: {
  initial?: SocialRow | null
  onClose: () => void
}) {
  const titleId = useId()
  const descId = useId()
  const router = useRouter()
  const toast = useToast()
  const [platform, setPlatform] = useState<PlatformId>(
    initial?.platform && isPlatform(initial.platform) ? initial.platform : 'instagram',
  )
  const [state, formAction, pending] = useActionState<SocialState, FormData>(
    saveSocialAccount,
    null,
  )

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, pending])

  useEffect(() => {
    if (!state?.ok) return
    toast(state.ok, 'success')
    onClose()
    router.refresh()
  }, [state?.ok, onClose, router, toast])

  return (
    <div className="wb-modal-root" role="presentation">
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="wb-modal-panel"
      >
        <h2 id={titleId} className="wb-modal-title">
          {initial?.id ? 'Hesabı düzenle' : 'Hesap ekle'}
        </h2>
        <p id={descId} className="wb-modal-desc">
          Platformu seçin, bağlantıyı yapıştırın.
        </p>

        <form action={formAction} className="mt-4 space-y-3">
          {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
          <input type="hidden" name="platform" value={platform} />

          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium text-ink-muted">Platform</legend>
            <div className="grid grid-cols-4 gap-1.5">
              {PLATFORMS.map((row) => {
                const active = platform === row.id
                return (
                  <button
                    key={row.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setPlatform(row.id)}
                    className={`flex flex-col items-center gap-1.5 rounded-md border px-1.5 py-2 text-center transition-colors ${
                      active
                        ? 'border-accent bg-accent-soft/50 text-ink'
                        : 'border-hairline bg-canvas text-ink-muted hover:border-hairline-strong hover:text-ink'
                    }`}
                  >
                    <SocialMark platform={row.id} className="size-5" />
                    <span className="text-[10.5px] font-semibold leading-tight">{row.label}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Field label="Bağlantı">
            <Input
              name="url"
              defaultValue={initial?.url ?? ''}
              required
              autoComplete="url"
              inputMode="url"
              placeholder={hintFor(platform)}
            />
          </Field>
          <Field label="Not" hint="İsteğe bağlı">
            <Input
              name="label"
              defaultValue={initial?.label ?? ''}
              placeholder="Örn. resmi hesap"
            />
          </Field>

          {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}

          <div className="wb-modal-actions">
            <Button type="button" variant="quiet" disabled={pending} onClick={onClose}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Kaydediliyor…' : initial?.id ? 'Kaydet' : 'Ekle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SocialItem({
  row,
  canEdit,
  onEdit,
}: {
  row: SocialRow
  canEdit: boolean
  onEdit: () => void
}) {
  const confirm = useConfirm()
  const router = useRouter()
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const name = PLATFORM_LABELS[row.platform] ?? row.platform

  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-hairline bg-canvas text-ink">
        <SocialMark platform={row.platform} className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-semibold text-ink">
          {name}
          {row.label ? <span className="ml-1 font-normal text-ink-muted">· {row.label}</span> : null}
        </p>
        <a
          href={row.url}
          target="_blank"
          rel="noreferrer"
          className="mt-0.5 block truncate text-[12.5px] text-ink-muted underline-offset-2 hover:text-accent hover:underline"
        >
          {displayUrl(row.url)}
        </a>
      </div>
      {canEdit ? (
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="quiet" className="h-8 text-[12.5px]" onClick={onEdit}>
            Düzenle
          </Button>
          <Button
            type="button"
            variant="danger"
            className="h-8 text-[12.5px]"
            disabled={pending}
            onClick={() => {
              void (async () => {
                const ok = await confirm({
                  title: 'Hesabı sil',
                  description: `${name} kaydı kaldırılacak.`,
                  confirmLabel: 'Sil',
                  tone: 'danger',
                })
                if (!ok) return
                startTransition(() => {
                  void deleteSocialAccount(row.id).then((result) => {
                    if (result.error) toast(result.error, 'danger')
                    else router.refresh()
                  })
                })
              })()
            }}
          >
            {pending ? '…' : 'Sil'}
          </Button>
        </div>
      ) : null}
    </li>
  )
}

function SocialMark({ platform, className }: { platform: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {platform === 'instagram' ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.4" cy="6.6" r="0.8" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {platform === 'facebook' ? (
        <path d="M14 8h3V5h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.5l.5-3H13v-1c0-.6.4-1 1-1Z" />
      ) : null}
      {platform === 'tiktok' ? (
        <path d="M14 4v9.2a3.8 3.8 0 1 1-3.2-3.75V12a1.6 1.6 0 1 0 1.6 1.6V4h4.2A5.4 5.4 0 0 0 20 8.4" />
      ) : null}
      {platform === 'youtube' ? (
        <>
          <rect x="2.5" y="6" width="19" height="12" rx="3.5" />
          <path d="m10 9.5 6 2.5-6 2.5V9.5Z" fill="currentColor" stroke="none" />
        </>
      ) : null}
      {platform === 'x' ? <path d="m5 5 14 14 M19 5 5 19" /> : null}
      {platform === 'linkedin' ? (
        <>
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M8 10.5V17 M8 7.2h.01 M12 17v-3.6c0-1 .8-1.6 1.7-1.6s1.6.7 1.6 1.6V17" />
        </>
      ) : null}
      {platform === 'website' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18 M12 3c3 3.2 4.5 6.5 4.5 9S15 17.8 12 21c-3-3.2-4.5-6.5-4.5-9S9 6.2 12 3Z" />
        </>
      ) : null}
      {platform === 'other' || !isPlatform(platform) ? (
        <path d="M10 14a4 4 0 0 0 6 0l2-2a4 4 0 0 0-6-6l-1 1 M14 10a4 4 0 0 0-6 0l-2 2a4 4 0 1 0 6 6l1-1" />
      ) : null}
    </svg>
  )
}
