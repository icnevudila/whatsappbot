'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Button } from '@/components/ui'

export type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** danger = sil / çıkar; accent = önemli onay */
  tone?: 'danger' | 'accent' | 'default'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

type Pending = ConfirmOptions & { resolve: (value: boolean) => void }

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function useConfirm(): ConfirmFn {
  const fn = useContext(ConfirmContext)
  if (!fn) {
    throw new Error('useConfirm yalnızca FeedbackProviders içinde kullanılabilir.')
  }
  return fn
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve })
    })
  }, [])

  const close = useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value)
      return null
    })
  }, [])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? (
        <ConfirmModal
          title={pending.title}
          description={pending.description}
          confirmLabel={pending.confirmLabel}
          cancelLabel={pending.cancelLabel}
          tone={pending.tone}
          onCancel={() => close(false)}
          onConfirm={() => close(true)}
        />
      ) : null}
    </ConfirmContext.Provider>
  )
}

function ConfirmModal({
  title,
  description,
  confirmLabel = 'Devam',
  cancelLabel = 'Vazgeç',
  tone = 'default',
  onCancel,
  onConfirm,
}: ConfirmOptions & { onCancel: () => void; onConfirm: () => void }) {
  const titleId = useId()
  const descId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const confirmVariant = tone === 'danger' ? 'danger' : tone === 'accent' ? 'accent' : 'accent'

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const node = panelRef.current?.querySelector<HTMLElement>('[data-confirm-primary]')
    node?.focus()

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      previous?.focus?.()
    }
  }, [onCancel])

  return (
    <div className="wb-modal-root" role="presentation">
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        onClick={onCancel}
      />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="wb-modal-panel"
      >
        <h2 id={titleId} className="wb-modal-title">
          {title}
        </h2>
        {description ? (
          <p id={descId} className="wb-modal-desc">
            {description}
          </p>
        ) : null}
        <div className="wb-modal-actions">
          <Button type="button" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            data-confirm-primary
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
