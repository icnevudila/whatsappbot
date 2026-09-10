'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_HARD_LIMIT,
  parsePhoneList,
  parsePhoneRows,
  type ImportedRow,
} from '@wa/shared'
import { Button, Field, Notice, Textarea } from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { importContactChunk } from '../actions'

/** Mevcut gruba Excel / yapıştır ile numara ekle. */
export function AddToGroupForm({ listId }: { listId: string }) {
  const router = useRouter()
  const toast = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [pending, startTransition] = useTransition()
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  useSyncBusy(pending, progress ?? 'Numaralar ekleniyor…')

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
      if (!sheet) return
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
      setPreview(`${parsed.valid.length} geçerli`)
      return
    }

    const text = await file.text()
    textarea.value = text
    const parsed = parsePhoneList(text)
    ;(textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] }).__parsedRows =
      parsed.valid
    setPreview(`${parsed.valid.length} geçerli`)
  }

  const submit = () => {
    setError(null)
    const textarea = textareaRef.current
    if (!textarea?.value.trim()) {
      setError('Numara girin veya Excel yükleyin.')
      return
    }
    const cached = (textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] })
      .__parsedRows
    const parsed = cached?.length ? { valid: cached } : parsePhoneList(textarea.value)
    if (parsed.valid.length === 0) {
      setError('Geçerli numara yok.')
      return
    }
    if (parsed.valid.length > IMPORT_HARD_LIMIT) {
      setError(`En fazla ${IMPORT_HARD_LIMIT.toLocaleString('tr-TR')} numara.`)
      return
    }

    startTransition(async () => {
      let linked = 0
      for (let i = 0; i < parsed.valid.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = parsed.valid.slice(i, i + IMPORT_CHUNK_SIZE)
        const isLast = i + IMPORT_CHUNK_SIZE >= parsed.valid.length
        setProgress(
          `${Math.min(i + chunk.length, parsed.valid.length).toLocaleString('tr-TR')} / ${parsed.valid.length.toLocaleString('tr-TR')}`,
        )
        const result = await importContactChunk({
          listId,
          rows: chunk,
          finalize: isLast,
        })
        if (result.error) {
          setError(result.error)
          setProgress(null)
          return
        }
        linked += result.linked ?? 0
      }
      setProgress(null)
      toast(`${linked.toLocaleString('tr-TR')} numara eklendi.`, 'success')
      textarea.value = ''
      setPreview(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-2.5 p-3.5">
      <Field label="Numaralar" hint="Bu gruba eklenir · deftere de yazılır">
        <Textarea ref={textareaRef} rows={5} placeholder={'05321234567,Ali\n+90532…'} />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer text-[12.5px] font-semibold text-accent">
          <input
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void readFile(f)
              e.target.value = ''
            }}
          />
          Excel / CSV
        </label>
        {preview ? <span className="text-[11.5px] text-ink-faint">{preview}</span> : null}
      </div>
      {progress ? <Notice tone="accent">{progress}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Button type="button" variant="accent" disabled={pending} onClick={submit}>
        {pending ? 'Ekleniyor…' : 'Gruba ekle'}
      </Button>
    </div>
  )
}
