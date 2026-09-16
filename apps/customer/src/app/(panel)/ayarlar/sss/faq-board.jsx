'use client'

import { useActionState, useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Button, EmptyState, Field, Input, Notice, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useConfirm } from '@/components/confirm-dialog'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { waAvatarColor, waAvatarLetters } from '@/lib/wa-avatar'
import { deleteFaq, saveFaq } from './actions'

function ProductPicker({ products, value, onChange, name = 'product_id' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const wrapRef = useRef(null)
  const panelRef = useRef(null)
  const buttonRef = useRef(null)
  const selected = products.find((p) => p.id === value)
  const label = !value || value === 'none' ? 'Genel (tüm işletme)' : selected?.name || 'Ürün seç'

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setPos(null)
      return
    }
    const place = () => {
      const rect = buttonRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = Math.max(rect.width, 220)
      const left = Math.min(rect.left, window.innerWidth - width - 8)
      setPos({
        top: rect.bottom + 4,
        left: Math.max(8, left),
        width,
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
    const onDoc = (event) => {
      if (!(event.target instanceof Node)) return
      if (wrapRef.current?.contains(event.target)) return
      if (panelRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('touchstart', onDoc)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('touchstart', onDoc)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  const options = [{ id: 'none', name: 'Genel (tüm işletme)' }, ...products]

  return (
    <>
      <input type="hidden" name={name} value={value || 'none'} />
      <div className="wb-wa-group-picker" ref={wrapRef}>
        <button
          ref={buttonRef}
          type="button"
          className="wb-wa-group-picker-btn wb-wa-group-picker-btn--field"
          aria-label="Ürün"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="wb-wa-group-picker-label">{label}</span>
          <Icon name="outbound" className="wb-wa-group-picker-caret size-3.5" />
        </button>
      </div>
      {open && pos
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-label="Ürün"
              className="wb-wa-menu wb-wa-menu--fixed wb-wa-group-picker-menu"
              style={{ top: pos.top, left: pos.left, width: pos.width, right: 'auto', zIndex: 240 }}
            >
              {options.map((option) => {
                const active = (value || 'none') === option.id
                const isGeneral = option.id === 'none'
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`wb-wa-menu-item${active ? ' is-active' : ''}`}
                    onClick={() => {
                      onChange(option.id)
                      setOpen(false)
                    }}
                  >
                    <span
                      className="wb-wa-avatar wb-wa-avatar--sm"
                      style={{ background: isGeneral ? '#00a884' : waAvatarColor(option.id) }}
                      aria-hidden
                    >
                      {isGeneral ? '?' : waAvatarLetters(option.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    {active ? <Icon name="check" className="size-4 shrink-0 text-[#008069]" /> : null}
                  </button>
                )
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function FaqFormModal({ initial, products, onClose }) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [productId, setProductId] = useState(initial?.product_id ?? 'none')
  const [state, action, pending] = useActionState(saveFaq, null)
  useSyncBusy(pending, initial?.id ? 'Güncelleniyor…' : 'Kaydediliyor…')

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (state?.ok) onClose(true)
  }, [state, onClose])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={() => onClose(false)} />
      <div
        className="wb-modal-panel wb-wa-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              {initial?.id ? 'Soruyu düzenle' : 'Soru ekle'}
            </h2>
            <p className="wb-modal-desc">
              Genel veya ürüne özel soru-cevap. AI yanıtlama bunları kullanır.
            </p>
          </div>
          <button type="button" aria-label="Kapat" className="wb-wa-icon-btn" onClick={() => onClose(false)}>
            <Icon name="close" className="size-4" />
          </button>
        </div>

        <form action={action} className="space-y-3">
          {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
          <Field label="Ürün (opsiyonel)" hint="Ürünle ilgiliyse seçin; değilse Genel bırakın.">
            <ProductPicker products={products} value={productId} onChange={setProductId} />
          </Field>
          <Field label="Soru">
            <Input
              name="question"
              required
              maxLength={500}
              defaultValue={initial?.question ?? ''}
              placeholder="Örn. Bu ürün kaç gram?"
              autoFocus
            />
          </Field>
          <Field label="Cevap">
            <Textarea
              name="answer"
              required
              maxLength={4000}
              rows={5}
              defaultValue={initial?.answer ?? ''}
              placeholder="Kısa ve net bir cevap yazın…"
            />
          </Field>
          {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
          <div className="wb-modal-actions">
            <Button type="button" className="wb-wa-cancel" onClick={() => onClose(false)}>
              Vazgeç
            </Button>
            <Button type="submit" className="wb-wa-submit" disabled={pending}>
              {pending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function FaqItem({ row, productName, canEdit, onEdit }) {
  const confirm = useConfirm()
  const toast = useToast()
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  useSyncBusy(pending, 'Siliniyor…')

  return (
    <li className="wb-wa-faq-item">
      <div className="wb-wa-faq-main">
        {productName ? <span className="wb-wa-faq-tag">{productName}</span> : null}
        <p className="wb-wa-faq-q">{row.question}</p>
        <p className="wb-wa-faq-a">{row.answer}</p>
      </div>
      {canEdit ? (
        <div className="wb-wa-faq-actions">
          <button type="button" className="wb-wa-icon-btn" aria-label="Düzenle" onClick={onEdit}>
            <Icon name="edit" className="size-4" />
          </button>
          <button
            type="button"
            className="wb-wa-icon-btn"
            aria-label="Sil"
            disabled={pending}
            onClick={() => {
              void (async () => {
                const ok = await confirm({
                  title: 'Soru silinsin mi?',
                  description: row.question,
                  confirmLabel: 'Sil',
                  cancelLabel: 'Vazgeç',
                  tone: 'danger',
                })
                if (!ok) return
                startTransition(async () => {
                  const result = await deleteFaq(row.id)
                  if (result.error) toast(result.error, 'danger')
                  else {
                    toast(result.ok ?? 'Silindi.', 'success')
                    router.refresh()
                  }
                })
              })()
            }}
          >
            <Icon name="trash" className="size-4" />
          </button>
        </div>
      ) : null}
    </li>
  )
}

export function FaqBoard({ initial, products, canEdit }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const productNames = new Map(products.map((p) => [p.id, p.name]))

  const close = (saved) => {
    setOpen(false)
    setEditing(null)
    if (saved) router.refresh()
  }

  const openCreate = () => {
    setEditing(null)
    setOpen(true)
  }

  return (
    <div>
      {canEdit ? (
        <div className="wb-wa-faq-cta">
          <button type="button" className="wb-wa-submit w-full sm:w-auto" onClick={openCreate}>
            <Icon name="plus" className="size-4" />
            Soru ekle
          </button>
        </div>
      ) : null}

      {initial.length === 0 ? (
        <EmptyState
          tone="generic"
          title="Henüz soru yok"
          description="İşletmenize veya ürünlerinize özel soru-cevap ekleyin. AI yanıtlama bunları kullanacak."
          action={
            canEdit ? (
              <button type="button" className="wb-wa-submit" onClick={openCreate}>
                <Icon name="plus" className="size-4" />
                İlk soruyu ekle
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="wb-wa-faq-list">
          {initial.map((row) => (
            <FaqItem
              key={row.id}
              row={row}
              productName={row.product_id ? productNames.get(row.product_id) ?? null : null}
              canEdit={canEdit}
              onEdit={() => {
                setEditing(row)
                setOpen(true)
              }}
            />
          ))}
        </ul>
      )}

      {open ? (
        <FaqFormModal initial={editing} products={products} onClose={close} />
      ) : null}
    </div>
  )
}
