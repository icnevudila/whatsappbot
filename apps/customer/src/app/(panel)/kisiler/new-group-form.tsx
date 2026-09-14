'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_HARD_LIMIT,
  parsePhoneList,
  parsePhoneRows,
  type ImportedRow,
} from '@wa/shared'
import { Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import {
  createContactListForImport,
  createEmptyList,
  importContactChunk,
  importContacts,
} from './actions'

export function NewGroupButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" variant="accent" className={className} onClick={() => setOpen(true)}>
        + Grup
      </Button>
      {open ? <NewGroupModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export function NewGroupModal({ onClose }: { onClose: () => void }) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root wb-modal-root--fill" role="presentation">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="wb-modal-panel wb-modal-panel--fill"
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              Yeni grup
            </h2>
            <p className="wb-modal-desc">Excel yükleyin, numaraları yapıştırın veya boş grup açın.</p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-canvas hover:text-ink"
          >
            <Icon name="close" className="size-4" />
          </button>
        </div>
        <NewGroupForm embedded fill onDone={onClose} />
      </div>
    </div>,
    document.body,
  )
}

/** Tek form: Excel/yapıştır veya boş grup. */
export function NewGroupForm({
  embedded = false,
  fill = false,
  onDone,
}: {
  embedded?: boolean
  fill?: boolean
  onDone?: () => void
}) {
  const router = useRouter()
  const toast = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState('empty')
  const [name, setName] = useState('')
  const [pending, startTransition] = useTransition()
  const [fileName, setFileName] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    valid: number
    duplicates: number
    invalid: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useSyncBusy(pending, progress ?? 'Grup kaydediliyor…')

  useEffect(() => {
    if (error) toast(error, 'danger')
  }, [error, toast])

  const readFile = async (file: File) => {
    const textarea = textareaRef.current
    if (!textarea) return
    setError(null)

    const lower = file.name.toLowerCase()

    if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) {
        setFileName(null)
        return
      }
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      }) as unknown[][]
      const parsed = parsePhoneRows(rows)
      textarea.value = parsed.valid
        .map((r) => (r.name ? `${r.phone_e164},${r.name}` : r.phone_e164))
        .join('\n')
      ;(textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] }).__parsedRows =
        parsed.valid
      setPreview({
        valid: parsed.valid.length,
        duplicates: parsed.duplicates,
        invalid: parsed.invalid.length,
      })
      setFileName(file.name)
      return
    }

    const text = await file.text()
    textarea.value = text
    const parsed = parsePhoneList(text)
    ;(textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] }).__parsedRows =
      parsed.valid
    setPreview({
      valid: parsed.valid.length,
      duplicates: parsed.duplicates,
      invalid: parsed.invalid.length,
    })
    setFileName(file.name)
  }

  const submitEmpty = () => {
    setError(null)
    startTransition(async () => {
      const result = await createEmptyList(name)
      if (result.error) {
        setError(result.error)
        return
      }
      toast(result.ok ?? 'Grup oluşturuldu.', 'success')
      setName('')
      onDone?.()
      if (result.listId) router.push(`/kisiler/${result.listId}`)
      else router.refresh()
    })
  }

  const submitFill = () => {
    setError(null)
    const textarea = textareaRef.current
    if (!textarea?.value.trim()) {
      setError('En az bir numara girin veya Excel yükleyin.')
      return
    }

    const cached = (textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] })
      .__parsedRows
    const parsed = cached?.length
      ? { valid: cached }
      : parsePhoneList(textarea.value)

    if (parsed.valid.length === 0) {
      setError('Geçerli numara bulunamadı.')
      return
    }
    if (parsed.valid.length > IMPORT_HARD_LIMIT) {
      setError(`En fazla ${IMPORT_HARD_LIMIT.toLocaleString('tr-TR')} numara.`)
      return
    }

    startTransition(async () => {
      const trimmedName = name.trim()
      if (!trimmedName) {
        setError('Gruba bir ad verin.')
        return
      }

      if (parsed.valid.length <= IMPORT_CHUNK_SIZE) {
        setProgress('Grup oluşturuluyor…')
        const fd = new FormData()
        fd.set('name', trimmedName)
        fd.set('numbers', textarea.value)
        const result = await importContacts(null, fd)
        if (result?.error) {
          setError(result.error)
          setProgress(null)
          return
        }
        toast(result?.ok ?? 'Grup oluşturuldu.', 'success')
        setProgress(null)
        setName('')
        textarea.value = ''
        setPreview(null)
        setFileName(null)
        onDone?.()
        router.refresh()
        return
      }

      const created = await createContactListForImport(trimmedName)
      if (created.error || !created.listId) {
        setError(created.error ?? 'Grup açılamadı.')
        return
      }
      let linkedTotal = 0
      for (let i = 0; i < parsed.valid.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = parsed.valid.slice(i, i + IMPORT_CHUNK_SIZE)
        const isLast = i + IMPORT_CHUNK_SIZE >= parsed.valid.length
        setProgress(
          `Yükleniyor… ${Math.min(i + chunk.length, parsed.valid.length).toLocaleString('tr-TR')} / ${parsed.valid.length.toLocaleString('tr-TR')}`,
        )
        const result = await importContactChunk({
          listId: created.listId,
          rows: chunk,
          finalize: isLast,
        })
        if (result.error) {
          setError(result.error)
          setProgress(null)
          return
        }
        linkedTotal += result.linked ?? 0
        if (isLast) {
          toast(
            result.ok ?? `${linkedTotal.toLocaleString('tr-TR')} numara eklendi.`,
            'success',
          )
        }
      }
      setProgress(null)
      onDone?.()
      router.push(`/kisiler/${created.listId}`)
    })
  }

  return (
    <div
      className={
        fill
          ? 'flex min-h-0 flex-1 flex-col gap-2.5'
          : embedded
            ? 'space-y-2.5'
            : 'space-y-2.5 p-3.5'
      }
    >
      <div className="flex gap-1 rounded-md border border-hairline bg-canvas p-0.5">
        <button
          type="button"
          className={`flex-1 rounded-[5px] px-2 py-1.5 text-[12px] font-semibold ${
            mode === 'empty' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'
          }`}
          onClick={() => setMode('empty')}
        >
          Boş grup
        </button>
        <button
          type="button"
          className={`flex-1 rounded-[5px] px-2 py-1.5 text-[12px] font-semibold ${
            mode === 'fill' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'
          }`}
          onClick={() => setMode('fill')}
        >
          Excel / yapıştır
        </button>
      </div>

      <Field label="Grup adı">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Örn. Mahalle müşterileri"
          maxLength={120}
        />
      </Field>

      {mode === 'fill' ? (
        <>
          <label className={fill ? 'flex min-h-0 flex-1 flex-col' : 'block'}>
            <span className="mb-1.5 block text-[13px] font-semibold text-ink-muted">Numaralar</span>
            <Textarea
              ref={textareaRef}
              rows={fill ? 8 : 6}
              className={fill ? 'min-h-0 flex-1 !resize-none' : undefined}
              placeholder={'05321234567,Ali\n+905321112233'}
            />
          </label>
          <label className="inline-flex cursor-pointer items-center gap-2 text-[12.5px] text-accent">
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void readFile(file)
                e.target.value = ''
              }}
            />
            CSV / Excel seç
          </label>
          {fileName ? (
            <span className="text-[11.5px] text-ink-faint">{fileName}</span>
          ) : null}
          {preview ? (
            <p className="text-[12px] text-ink-muted tabular">
              {preview.valid.toLocaleString('tr-TR')} geçerli
              {preview.duplicates > 0 ? ` · ${preview.duplicates} tekrar` : ''}
              {preview.invalid > 0 ? ` · ${preview.invalid} geçersiz` : ''}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-[12px] text-ink-muted">
          Sonra gruba numara eklersin veya kişilerden taşırsın.
        </p>
      )}

      {progress ? <Notice tone="accent">{progress}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Button
        type="button"
        variant="accent"
        className={fill ? 'mt-auto w-full' : undefined}
        disabled={pending || name.trim().length < 2}
        onClick={() => (mode === 'empty' ? submitEmpty() : submitFill())}
      >
        {pending ? 'Kaydediliyor…' : 'Grubu oluştur'}
      </Button>
    </div>
  )
}
