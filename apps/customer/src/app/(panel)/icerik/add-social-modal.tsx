'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Button, Field, Input, Notice } from '@/components/ui'
import { useToast } from '@/components/toast'
import { SOCIAL_PLATFORMS, SocialMark } from '../ayarlar/sosyal/social-board'
import { quickCreateSocialAccount } from './actions'
import type { SocialOption } from './wizard-types'

type PlatformId = (typeof SOCIAL_PLATFORMS)[number]['id']

function hintFor(platform: string) {
  return SOCIAL_PLATFORMS.find((row) => row.id === platform)?.hint ?? 'https://…'
}

export function AddSocialModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean
  onClose: () => void
  onSuccess: (social: SocialOption) => void
}) {
  const titleId = useId()
  const toast = useToast()
  const [mounted, setMounted] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState<PlatformId>('instagram')
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) {
      setError('Bağlantı yazın.')
      return
    }

    setError(null)
    const formData = new FormData()
    formData.set('platform', platform)
    formData.set('url', trimmed)
    if (label.trim()) formData.set('label', label.trim())

    startTransition(async () => {
      const result = await quickCreateSocialAccount(formData)
      if (result.error || !result.social) {
        setError(result.error ?? 'Hesap eklenemedi.')
        toast(result.error ?? 'Hesap eklenemedi.', 'danger')
        return
      }

      toast('Hesap eklendi ve seçildi.', 'success')
      onSuccess(result.social)
      setUrl('')
      setLabel('')
      setPlatform('instagram')
      onClose()
    })
  }

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="wb-modal-panel"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="wb-modal-title">
            Sosyal medya ekle
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-sm text-ink-muted hover:bg-canvas hover:text-ink"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <p className="wb-modal-desc">
          Sihirbazda kalırsınız. Hesap görsele işlenmek üzere seçilir.
        </p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <fieldset>
            <legend className="mb-2 text-[12.5px] font-medium text-ink-muted">Platform</legend>
            <div className="grid grid-cols-4 gap-1.5">
              {SOCIAL_PLATFORMS.map((row) => {
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
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              autoComplete="url"
              inputMode="url"
              placeholder={hintFor(platform)}
            />
          </Field>
          <Field label="Not" hint="İsteğe bağlı">
            <Input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Örn. resmi hesap"
            />
          </Field>

          {error ? <Notice tone="danger">{error}</Notice> : null}

          <div className="wb-modal-actions pt-2">
            <Button type="button" onClick={onClose} disabled={pending}>
              Vazgeç
            </Button>
            <Button type="submit" variant="accent" disabled={pending || !url.trim()}>
              {pending ? 'Ekleniyor…' : 'Kaydet ve seç'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}
