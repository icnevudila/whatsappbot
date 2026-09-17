'use client'

import { useEffect, useRef, useState, useActionState } from 'react'
import { Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import { saveBrandKit, type BrandKitState } from './actions'

const COLOR_FIELDS = [
  { name: 'primary', label: 'Ana renk' },
  { name: 'accent', label: 'Vurgu' },
  { name: 'secondary', label: 'İkincil' },
  { name: 'background', label: 'Zemin' },
  { name: 'text', label: 'Metin' },
] as const

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const IMAGE_MAX = 5 * 1024 * 1024

export function BrandKitForm({
  kit,
  canEdit,
}: {
  kit?: {
    id: string
    name: string
    tone: string
    samplePreview: string | null
    isDefault: boolean
    colors: {
      primary: string
      secondary: string
      accent: string
      background: string
      text: string
    }
  }
  canEdit: boolean
}) {
  const [state, formAction, pending] = useActionState<BrandKitState, FormData>(saveBrandKit, null)
  const colors = kit?.colors ?? DEFAULT_COLORS
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [over, setOver] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)

  useEffect(() => {
    if (!file) {
      setLocalPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setLocalPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const takeFile = (next: File | null | undefined) => {
    if (!next || !canEdit) return
    if (next.size > IMAGE_MAX) {
      setFileError('Görsel en fazla 5 MB olabilir.')
      return
    }
    if (!IMAGE_TYPES.includes(next.type) && !/\.(png|jpe?g|webp)$/i.test(next.name)) {
      setFileError('PNG, JPG veya WEBP yükleyin.')
      return
    }
    setFileError(null)
    setFile(next)
    if (inputRef.current) {
      const transfer = new DataTransfer()
      transfer.items.add(next)
      inputRef.current.files = transfer.files
    }
  }

  const preview = localPreview ?? kit?.samplePreview ?? null

  return (
    <form action={formAction} className="space-y-3 p-3.5">
      {kit?.id ? <input type="hidden" name="id" value={kit.id} /> : null}

      <Field label="Kit adı">
        <Input
          name="name"
          defaultValue={kit?.name ?? ''}
          required
          maxLength={80}
          disabled={!canEdit}
          placeholder="Örn. Filo yaz kampanyası"
        />
      </Field>

      <Field label="Yazım tonu" hint="Kampanya metinlerinde kullanılır.">
        <Textarea
          name="tone"
          rows={3}
          defaultValue={kit?.tone ?? ''}
          disabled={!canEdit}
          placeholder="Sade, güvenilir ve net."
        />
      </Field>

      <fieldset>
        <legend className="mb-2.5 text-[13px] font-semibold text-ink-muted">Renkler</legend>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {COLOR_FIELDS.map((field) => (
            <ColorDot
              key={field.name}
              name={field.name}
              label={field.label}
              defaultValue={colors[field.name]}
              disabled={!canEdit}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <span className="mb-1.5 block text-[13px] font-semibold text-ink-muted">Örnek görsel</span>
        <p className="mb-2 text-[12.5px] text-ink-muted">
          Stil referansı için. İşletme logosu ayrıdır; logo marka kitleri sayfasından yüklenir.
        </p>
        <div
          onDragEnter={(event) => {
            if (!canEdit) return
            event.preventDefault()
            dragDepth.current += 1
            setOver(true)
          }}
          onDragOver={(event) => {
            if (!canEdit) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'copy'
          }}
          onDragLeave={() => {
            dragDepth.current = Math.max(0, dragDepth.current - 1)
            if (dragDepth.current === 0) setOver(false)
          }}
          onDrop={(event) => {
            if (!canEdit) return
            event.preventDefault()
            dragDepth.current = 0
            setOver(false)
            takeFile(event.dataTransfer.files?.[0])
          }}
          className={`relative overflow-hidden rounded-md border border-dashed transition-colors ${
            over ? 'border-accent bg-accent-soft/40' : 'border-hairline-strong bg-canvas'
          } ${!canEdit ? 'opacity-70' : ''}`}
        >
          <input
            ref={inputRef}
            type="file"
            name="sample"
            accept="image/png,image/jpeg,image/webp"
            disabled={!canEdit}
            className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
            aria-label="Örnek görsel yükle"
            onChange={(event) => {
              takeFile(event.target.files?.[0])
            }}
          />
          {preview ? (
            <div className="pointer-events-none flex min-h-[140px] items-center justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="" className="max-h-[160px] w-full object-contain" />
            </div>
          ) : (
            <div className="pointer-events-none flex min-h-[140px] flex-col items-center justify-center gap-1.5 px-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full border border-hairline bg-surface text-ink-muted">
                <Icon name="image" className="size-5" />
              </span>
              <p className="text-[13.5px] font-semibold text-ink">
                {canEdit ? 'Örnek görseli sürükleyin veya seçin' : 'Örnek görsel yok'}
              </p>
              <p className="text-[12px] text-ink-faint">PNG, JPG, WEBP · en fazla 5 MB</p>
            </div>
          )}
        </div>
        {file && canEdit ? (
          <button
            type="button"
            className="mt-1.5 text-[12.5px] font-medium text-ink-muted hover:text-ink"
            onClick={() => {
              setFile(null)
              setFileError(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
          >
            Seçimi kaldır
          </button>
        ) : null}
        {fileError ? (
          <div className="mt-2">
            <Notice tone="danger">{fileError}</Notice>
          </div>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-[13px]">
        <input
          type="checkbox"
          name="is_default"
          defaultChecked={kit?.isDefault ?? true}
          disabled={!canEdit}
        />
        Varsayılan kit
      </label>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}

      {canEdit ? (
        <div className="flex justify-center pt-1">
          <Button
            type="submit"
            variant="accent"
            className="wb-wa-submit w-full max-w-sm !min-w-[12rem] sm:w-auto sm:min-w-[14rem]"
            disabled={pending}
          >
            {pending ? 'Kaydediliyor…' : kit?.id ? 'Kaydet' : 'Oluştur'}
          </Button>
        </div>
      ) : null}
    </form>
  )
}

function ColorDot({
  name,
  label,
  defaultValue,
  disabled,
}: {
  name: string
  label: string
  defaultValue: string
  disabled: boolean
}) {
  const [value, setValue] = useState(defaultValue)

  return (
    <label className={`flex flex-col items-center gap-1.5 ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <span className="relative size-12">
        <span
          className="block size-12 rounded-full border-2 border-hairline-strong shadow-[var(--shadow-card)]"
          style={{ backgroundColor: value }}
          aria-hidden
        />
        <input
          type="color"
          name={name}
          value={value}
          disabled={disabled}
          onChange={(event) => setValue(event.target.value)}
          aria-label={label}
          className="absolute inset-0 size-12 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </span>
      <span className="text-[12px] font-semibold text-ink">{label}</span>
      <span className="font-mono text-[11px] tabular text-ink-muted">{value}</span>
    </label>
  )
}
