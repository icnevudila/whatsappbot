'use client'

import { useActionState, useRef, useState } from 'react'
import { Button, Card, CardHeader, Field, Input, Notice, Textarea } from '@/components/ui'
import { importContacts, type ImportState } from './actions'

export function ImportForm() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importContacts,
    null,
  )
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  /**
   * CSV'yi sunucuya yuklemek yerine tarayicida okuyup metin alanina
   * dokuyoruz: kullanici gonderim oncesi ne aktardigini goruyor ve
   * dosya boyutu sinirlarina takilmiyoruz.
   */
  const readFile = async (file: File) => {
    const textarea = textareaRef.current
    if (!textarea) return

    let text = ''
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
      })
      text = rows
        .map((row) => row.map((cell) => String(cell ?? '').trim()).filter(Boolean).join(', '))
        .filter((line) => line.length > 0)
        .join('\n')
    } else {
      text = await file.text()
    }

    const existing = textarea.value.trim()
    textarea.value = existing ? `${existing}\n${text}` : text
    setFileName(file.name)
  }

  return (
    <Card>
      <CardHeader
        title="Liste oluştur"
        subtitle="Kampanyalarda tekrar seçeceğiniz numaralar için. Tek seferlik mesaj → Hızlı gönderim."
      />

      <form action={formAction} className="space-y-3.5 p-4">
        <Field label="Liste adı">
          <Input name="name" placeholder="Ocak kampanyası - İstanbul" required />
        </Field>

        <Field
          label="Numaralar"
          hint="Başında + olmayan numaralar Türkiye kodu ile yorumlanır. Tekrar edenler otomatik atlanır."
        >
          <Textarea
            ref={textareaRef}
            name="numbers"
            rows={9}
            required
            placeholder={'0532 123 45 67, Ahmet Yılmaz\n+90 533 987 65 43, Ayşe Demir\n5445556677'}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer text-[12.5px] text-ink-muted underline decoration-hairline-strong underline-offset-2 transition-colors hover:text-ink">
            <input
              type="file"
              accept=".csv,.txt,.xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void readFile(file)
              }}
            />
            CSV, TXT veya Excel (.xlsx) dosyası ekle
          </label>

          {fileName ? (
            <span className="text-[11.5px] text-ink-faint">{fileName} okundu</span>
          ) : null}

          <Button type="submit" variant="accent" disabled={pending} className="ml-auto">
            {pending ? 'Aktarılıyor...' : 'Listeyi oluştur'}
          </Button>
        </div>

        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
        {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

        {state?.invalidSamples && state.invalidSamples.length > 0 ? (
          <div className="rounded-md border border-hairline bg-canvas px-3 py-2">
            <p className="text-[11.5px] font-medium text-ink-muted">
              Okunamayan satırlardan örnekler
            </p>
            <ul className="mt-1 space-y-0.5 font-mono text-[11.5px] text-ink-faint">
              {state.invalidSamples.map((sample, index) => (
                <li key={`${sample}-${index}`} className="truncate">
                  {sample}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </Card>
  )
}
