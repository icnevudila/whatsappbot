'use client'

import { useActionState, useState } from 'react'
import { Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { DEFAULT_COLORS } from '@/lib/creative-templates'
import { saveBrandKit, type BrandKitState } from './actions'

const COLOR_FIELDS = [
  { name: 'primary', label: 'Ana renk' },
  { name: 'accent', label: 'Vurgu' },
  { name: 'secondary', label: 'İkincil' },
  { name: 'background', label: 'Zemin' },
  { name: 'text', label: 'Metin' },
] as const

export function BrandKitForm({
  kit,
  canEdit,
}: {
  kit?: {
    id: string
    name: string
    tone: string
    logoPreview: string | null
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

      <Field label="Logo" hint="PNG, JPG veya WEBP. En fazla 5 MB.">
        {kit?.logoPreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={kit.logoPreview}
            alt=""
            className="mb-2 h-16 w-16 rounded-md border border-hairline object-contain bg-canvas"
          />
        ) : null}
        <Input name="logo" type="file" accept="image/png,image/jpeg,image/webp" disabled={!canEdit} />
      </Field>

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
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? 'Kaydediliyor…' : kit?.id ? 'Kaydet' : 'Oluştur'}
        </Button>
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
