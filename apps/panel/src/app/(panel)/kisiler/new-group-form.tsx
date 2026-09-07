'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_HARD_LIMIT,
  parsePhoneList,
  parsePhoneRows,
  type ImportedRow,
} from '@wa/shared'
import { Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import {
  createContactListForImport,
  createEmptyList,
  importContactChunk,
  importContacts,
} from './actions'

const TEMPLATE_CSV = `telefon,ad
05321234567,Örnek Kişi
+905321112233,Başka Kişi
`

/** Tek form: Excel/yapıştır veya boş grup. */
export function NewGroupForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [mode, setMode] = useState<'fill' | 'empty'>('fill')
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

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'filo-kisi-sablon.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

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
      router.push(`/kisiler/${created.listId}`)
    })
  }

  return (
    <div className={embedded ? 'space-y-2.5' : 'space-y-2.5 p-3.5'}>
      <div className="flex gap-1 rounded-md border border-hairline bg-canvas p-0.5">
        <button
          type="button"
          className={`flex-1 rounded-[5px] px-2 py-1.5 text-[12px] font-semibold ${
            mode === 'fill' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'
          }`}
          onClick={() => setMode('fill')}
        >
          Excel / yapıştır
        </button>
        <button
          type="button"
          className={`flex-1 rounded-[5px] px-2 py-1.5 text-[12px] font-semibold ${
            mode === 'empty' ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted'
          }`}
          onClick={() => setMode('empty')}
        >
          Boş grup
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
          <p className="text-[11.5px] text-ink-faint">
            Şablon:{' '}
            <button
              type="button"
              onClick={downloadTemplate}
              className="font-semibold text-accent underline underline-offset-2"
            >
              CSV indir
            </button>
            · üst sınır {IMPORT_HARD_LIMIT.toLocaleString('tr-TR')}
          </p>
          <Field label="Numaralar">
            <Textarea
              ref={textareaRef}
              rows={6}
              placeholder={'05321234567,Ali\n+905321112233'}
            />
          </Field>
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
          Sonra gruba numara eklersin veya defterden taşırsın.
        </p>
      )}

      {progress ? <Notice tone="accent">{progress}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}

      <Button
        type="button"
        variant="accent"
        disabled={pending || name.trim().length < 2}
        onClick={() => (mode === 'empty' ? submitEmpty() : submitFill())}
      >
        {pending ? 'Kaydediliyor…' : 'Grubu oluştur'}
      </Button>
    </div>
  )
}
