'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Notice, Select } from '@/components/ui'
import type { OrgAiKeyMasks, OrgAiModelPrefs } from '@/lib/ai/org-keys'
import {
  GEMINI_IMAGE_MODELS,
  GEMINI_TEXT_MODELS,
  IMAGE_PROVIDER_CHOICES,
  OPENAI_IMAGE_MODELS,
  OPENAI_TEXT_MODELS,
  TEXT_PROVIDER_CHOICES,
  type ModelOption,
} from '@/lib/ai/models'
import { saveOrgAiKeys, type AiKeysState } from './ai-keys-actions'

function optionLabel(option: { label: string; cost: string }) {
  return `${option.label} — ${option.cost}`
}

function ModelSelect({
  name,
  options,
  defaultValue,
  disabled,
}: {
  name: string
  options: ModelOption[] | { value: string; label: string; cost: string }[]
  defaultValue: string
  disabled: boolean
}) {
  return (
    <Select name={name} defaultValue={defaultValue} disabled={disabled}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {optionLabel(option)}
        </option>
      ))}
    </Select>
  )
}

export function AiKeysForm({
  canEdit,
  masks,
  prefs,
}: {
  canEdit: boolean
  masks: OrgAiKeyMasks
  prefs: OrgAiModelPrefs
}) {
  const [state, formAction, pending] = useActionState<AiKeysState, FormData>(
    saveOrgAiKeys,
    null,
  )

  return (
    <div className="space-y-3 border-t border-hairline p-3.5">
      <p className="text-[12.5px] leading-relaxed text-ink-muted">
        OpenAI (ChatGPT / görsel), Gemini ve Cloudflare anahtarlarını buraya yazın.
        Kayıtlıysa üretimde önce bunlar, yoksa sunucu env kullanılır. Boş bırakmak
        mevcut değeri korur. Model yanında yaklaşık görsel / istek maliyeti yazar.
      </p>

      <form action={formAction} className="space-y-3">
        <Field
          label="OpenAI API key"
          hint={
            masks.openai
              ? `Kayıtlı: ${masks.openai} · platform.openai.com/api-keys`
              : 'platform.openai.com/api-keys — metin + görsel'
          }
        >
          <Input
            name="openai_api_key"
            type="password"
            autoComplete="off"
            placeholder={masks.openai ? 'Yeni anahtar (değiştirmek için)' : 'sk-…'}
            disabled={!canEdit}
            readOnly={!canEdit}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="OpenAI görsel modeli"
            hint="gpt-image-1.5 ~$0.14 civarı; DALL·E 2 en ucuz"
          >
            <ModelSelect
              name="openai_image_model"
              options={OPENAI_IMAGE_MODELS}
              defaultValue={prefs.openaiImageModel}
              disabled={!canEdit}
            />
          </Field>
          <Field label="OpenAI metin modeli" hint="Mesaj / kreatif yazımı">
            <ModelSelect
              name="openai_text_model"
              options={OPENAI_TEXT_MODELS}
              defaultValue={prefs.openaiTextModel}
              disabled={!canEdit}
            />
          </Field>
        </div>

        <Field
          label="Gemini API key"
          hint={
            masks.gemini
              ? `Kayıtlı: ${masks.gemini} · aistudio.google.com/apikey`
              : 'aistudio.google.com/apikey — metin + görsel'
          }
        >
          <Input
            name="gemini_api_key"
            type="password"
            autoComplete="off"
            placeholder={masks.gemini ? 'Yeni anahtar (değiştirmek için)' : 'AIza…'}
            disabled={!canEdit}
            readOnly={!canEdit}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Gemini görsel modeli" hint="Genelde ücretsiz kota / düşük maliyet">
            <ModelSelect
              name="gemini_image_model"
              options={GEMINI_IMAGE_MODELS}
              defaultValue={prefs.geminiImageModel}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Gemini metin modeli">
            <ModelSelect
              name="gemini_text_model"
              options={GEMINI_TEXT_MODELS}
              defaultValue={prefs.geminiTextModel}
              disabled={!canEdit}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Cloudflare Account ID"
            hint={masks.cloudflareAccountId ? `Kayıtlı: ${masks.cloudflareAccountId}` : 'İsteğe bağlı'}
          >
            <Input
              name="cloudflare_account_id"
              autoComplete="off"
              placeholder={masks.cloudflareAccountId ? 'Değiştir…' : 'hesap id'}
              disabled={!canEdit}
              readOnly={!canEdit}
            />
          </Field>
          <Field
            label="Cloudflare API token"
            hint={
              masks.cloudflareToken
                ? `Kayıtlı: ${masks.cloudflareToken}`
                : 'Workers AI — isteğe bağlı'
            }
          >
            <Input
              name="cloudflare_api_token"
              type="password"
              autoComplete="off"
              placeholder={masks.cloudflareToken ? 'Yeni token…' : 'token'}
              disabled={!canEdit}
              readOnly={!canEdit}
            />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field
            label="Görsel sağlayıcı sırası"
            hint="İlk seçilen denenir; başarısız olursa sonrakiler"
          >
            <ModelSelect
              name="preferred_image_provider"
              options={IMAGE_PROVIDER_CHOICES}
              defaultValue={prefs.preferredImageProvider}
              disabled={!canEdit}
            />
          </Field>
          <Field label="Metin sağlayıcı sırası">
            <ModelSelect
              name="preferred_text_provider"
              options={TEXT_PROVIDER_CHOICES}
              defaultValue={prefs.preferredTextProvider}
              disabled={!canEdit}
            />
          </Field>
        </div>

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Kaydediliyor…' : 'AI ayarlarını kaydet'}
            </Button>
            <p className="text-[11.5px] text-ink-faint">
              Anahtar silmek için alana <code className="text-ink-muted">__clear__</code>{' '}
              yazıp kaydedin.
            </p>
          </div>
        ) : (
          <p className="text-[11.5px] text-ink-faint">
            Anahtar girmek için sahip veya yönetici olmanız gerekir.
          </p>
        )}

        {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
        {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
      </form>
    </div>
  )
}
