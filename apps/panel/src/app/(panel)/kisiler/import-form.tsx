'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  IMPORT_CHUNK_SIZE,
  IMPORT_HARD_LIMIT,
  IMPORT_WARN_LIMIT,
  parsePhoneList,
  parsePhoneRows,
  type ImportedRow,
} from '@wa/shared'
import { Button, Card, CardHeader, Field, Input, Notice, Textarea } from '@/components/ui'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import {
  createContactListForImport,
  importContactChunk,
  importContacts,
} from './actions'

const TEMPLATE_CSV = `telefon,ad
05321234567,Örnek Kişi
+905321112233,Başka Kişi
`

export function ImportForm({ embedded = false }: { embedded?: boolean }) {
  const router = useRouter()
  const toast = useToast()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [fileName, setFileName] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    valid: number
    duplicates: number
    invalid: number
    samples: string[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  useSyncBusy(pending, progress ?? 'Numaralar kaydediliyor…')

  useEffect(() => {
    if (error) toast(error, 'danger')
    if (ok) toast(ok, 'success')
  }, [error, ok, toast])

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
    setOk(null)

    let rows: unknown[][] = []
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
      rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      })
    } else {
      const text = await file.text()
      rows = text
        .split(/\r?\n/)
        .filter((line) => line.trim())
        .map((line) => line.split(/[,;\t|]/).map((c) => c.trim()))
    }

    const parsed = parsePhoneRows(rows, { hasHeader: true })
    setFileName(file.name)
    setPreview({
      valid: parsed.valid.length,
      duplicates: parsed.duplicates,
      invalid: parsed.invalid.length,
      samples: parsed.invalid.slice(0, 5),
    })

    // Textarea'ya telefon,ad satırları — küçük listelerde klasik form da çalışsın.
    const asText = parsed.valid
      .map((row) => (row.name ? `${row.phone_e164},${row.name}` : row.phone_e164))
      .join('\n')
    textarea.value = asText
    // Büyük listelerde chunk için dataset
    ;(textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] }).__parsedRows =
      parsed.valid
  }

  const runImport = () => {
    setError(null)
    setOk(null)
    const name = nameRef.current?.value?.trim() ?? ''
    const textarea = textareaRef.current
    if (!name) {
      setError('Gruba bir ad verin.')
      return
    }
    if (!textarea?.value.trim()) {
      setError('En az bir numara girin veya Excel yükleyin.')
      return
    }

    const cached = (textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] })
      .__parsedRows
    const parsed = cached?.length
      ? {
          valid: cached,
          duplicates: preview?.duplicates ?? 0,
          invalid: preview?.samples ?? [],
        }
      : parsePhoneList(textarea.value)

    if (parsed.valid.length === 0) {
      setError('Geçerli numara bulunamadı.')
      return
    }
    if (parsed.valid.length > IMPORT_HARD_LIMIT) {
      setError(`Tek seferde en fazla ${IMPORT_HARD_LIMIT.toLocaleString('tr-TR')} numara.`)
      return
    }

    startTransition(async () => {
      // Küçük: klasik server action (textarea form).
      if (parsed.valid.length <= IMPORT_CHUNK_SIZE) {
        setProgress('Grup oluşturuluyor…')
        const fd = new FormData()
        fd.set('name', name)
        fd.set('numbers', textarea.value)
        const result = await importContacts(null, fd)
        if (result?.error) {
          setError(result.error)
          setProgress(null)
          return
        }
        setOk(result?.ok ?? 'Tamam')
        setProgress(null)
        textarea.value = ''
        ;(textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] }).__parsedRows =
          undefined
        setPreview(null)
        setFileName(null)
        router.refresh()
        return
      }

      // Büyük: chunk’lı
      setProgress(`Grup oluşturuluyor… (0 / ${parsed.valid.length})`)
      const created = await createContactListForImport(name)
      if (created.error || !created.listId) {
        setError(created.error ?? 'Grup açılamadı.')
        setProgress(null)
        return
      }

      let linkedTotal = 0
      const listId = created.listId
      for (let i = 0; i < parsed.valid.length; i += IMPORT_CHUNK_SIZE) {
        const chunk = parsed.valid.slice(i, i + IMPORT_CHUNK_SIZE)
        const isLast = i + IMPORT_CHUNK_SIZE >= parsed.valid.length
        setProgress(
          `Yükleniyor… ${Math.min(i + chunk.length, parsed.valid.length).toLocaleString('tr-TR')} / ${parsed.valid.length.toLocaleString('tr-TR')}`,
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
        linkedTotal += result.linked ?? 0
        if (isLast) {
          setOk(
            result.ok ??
              `${linkedTotal.toLocaleString('tr-TR')} numara eklendi.`,
          )
        }
      }

      setProgress(null)
      textarea.value = ''
      ;(textarea as HTMLTextAreaElement & { __parsedRows?: ImportedRow[] }).__parsedRows =
        undefined
      setPreview(null)
      setFileName(null)
      router.refresh()
    })
  }

  const body = (
    <div className={embedded ? 'space-y-2.5' : 'space-y-2.5 p-3.5'}>
      <Notice tone="accent">
        Önerilen sütunlar: <strong>telefon</strong>, <strong>ad</strong> (isteğe bağlı). Şablon:{' '}
        <button
          type="button"
          onClick={downloadTemplate}
          className="font-semibold underline underline-offset-2"
        >
          CSV indir
        </button>
        . 0532… veya +90… kabul. Tekrarlar atlanır. Üst sınır{' '}
        {IMPORT_HARD_LIMIT.toLocaleString('tr-TR')}; {IMPORT_WARN_LIMIT.toLocaleString('tr-TR')}+
        için parçalı yükleme kullanılır.
      </Notice>

      <Field label="Grup adı">
        <Input ref={nameRef} name="name" placeholder="Örn. Mahalle müşterileri" required />
      </Field>

      <Field
        label="Numaralar"
        hint="Yapıştır veya dosya seç. İsim|telefon|şehir gibi karışık satırlar da olur."
      >
        <Textarea
          ref={textareaRef}
          name="numbers"
          rows={8}
          placeholder={'05321234567,Ali\n+905321112233'}
        />
      </Field>

      <div className="flex flex-wrap items-center gap-2">
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
          <span className="text-[11.5px] text-ink-faint">{fileName} okundu</span>
        ) : null}
      </div>

      {preview ? (
        <p className="text-[12px] text-ink-muted tabular">
          Önizleme: {preview.valid.toLocaleString('tr-TR')} geçerli
          {preview.duplicates > 0
            ? ` · ${preview.duplicates.toLocaleString('tr-TR')} tekrar`
            : ''}
          {preview.invalid > 0
            ? ` · ${preview.invalid.toLocaleString('tr-TR')} geçersiz`
            : ''}
          {preview.valid >= IMPORT_WARN_LIMIT
            ? ' · büyük liste, parçalı yüklenecek'
            : ''}
        </p>
      ) : null}

      {preview?.samples && preview.samples.length > 0 ? (
        <div className="rounded-md border border-hairline bg-canvas px-3 py-2">
          <p className="text-[11.5px] font-medium text-ink-muted">Geçersiz örnekler</p>
          <ul className="mt-1 space-y-0.5 font-mono text-[11px] text-ink-faint">
            {preview.samples.map((sample) => (
              <li key={sample} className="truncate">
                {sample}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {progress ? <Notice tone="accent">{progress}</Notice> : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      {ok ? <Notice tone="accent">{ok}</Notice> : null}

      <Button type="button" variant="accent" disabled={pending} onClick={runImport}>
        {pending ? 'Aktarılıyor…' : 'Grubu oluştur'}
      </Button>
    </div>
  )

  if (embedded) return body

  return (
    <Card>
      <CardHeader
        title="Grup oluştur"
        subtitle="Excel / CSV / yapıştır. Telefon hangi sütunda olursa olsun bulunur."
      />
      {body}
    </Card>
  )
}
