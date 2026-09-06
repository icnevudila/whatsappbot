'use client'

import { useActionState } from 'react'
import { Button, Field, Input, Notice } from '@/components/ui'
import type { OrgAiKeyMasks } from '@/lib/ai/org-keys'
import { saveOrgAiKeys, type AiKeysState } from './ai-keys-actions'

export function AiKeysForm({
  canEdit,
  masks,
}: {
  canEdit: boolean
  masks: OrgAiKeyMasks
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
        mevcut değeri korur.
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

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Kaydediliyor…' : 'Anahtarları kaydet'}
            </Button>
            <p className="text-[11.5px] text-ink-faint">
              Silmek için alana <code className="text-ink-muted">__clear__</code> yazıp kaydedin.
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
