'use client'

import { useActionState, useState, useTransition } from 'react'
import { useToast } from '@/components/toast'
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Notice,
  Select,
  Textarea,
} from '@/components/ui'
import {
  createAutoReplyRule,
  deleteAutoReplyRule,
  setAutoReplyRuleEnabled,
  type AutoReplyState,
} from './actions'

type Rule = {
  id: string
  name: string
  match_mode: string
  match_pattern: string
  reply_body: string
  cooldown_seconds: number
  enabled: boolean
}

export function AutoReplyManager({ rules, canEdit }: { rules: Rule[]; canEdit: boolean }) {
  const toast = useToast()
  const [state, formAction, pending] = useActionState<AutoReplyState, FormData>(
    createAutoReplyRule,
    null,
  )
  const [busy, startBusy] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)

  const runToggle = (id: string, enabled: boolean) => {
    setActionError(null)
    startBusy(async () => {
      const result = await setAutoReplyRuleEnabled(id, enabled)
      if (result?.error) {
        setActionError(result.error)
        toast(result.error, 'danger')
      } else if (result?.ok) {
        toast(result.ok, 'success')
      }
    })
  }

  const runDelete = (id: string) => {
    setActionError(null)
    startBusy(async () => {
      const result = await deleteAutoReplyRule(id)
      if (result?.error) {
        setActionError(result.error)
        toast(result.error, 'danger')
      } else if (result?.ok) {
        toast(result.ok, 'success')
      }
    })
  }

  return (
    <div className="space-y-2.5">
      <Card>
        <CardHeader
          title="Kurallar"
          subtitle="Gelen metin eşleşince message.send kuyruğa alınır (cooldown uygulanır)."
        />
        {rules.length === 0 ? (
          <EmptyState
            title="Henüz kural yok"
            description="Gelen mesajlara otomatik yanıt vermek için bir kural ekleyin. Eşleşme + yanıt metni yeterli."
            action={
              canEdit ? (
                <a
                  href="#yeni-kural"
                  className="text-[12.5px] font-medium text-accent underline-offset-2 hover:underline"
                >
                  İlk kuralı ekle
                </a>
              ) : undefined
            }
          />
        ) : (
          <ul className="divide-y divide-hairline">
            {rules.map((rule) => (
              <li
                key={rule.id}
                className="flex items-start justify-between gap-2.5 px-3.5 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">
                    {rule.name}
                    {!rule.enabled ? (
                      <span className="ml-2 text-[11px] font-normal text-ink-faint">
                        (kapalı)
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {rule.match_mode}: {rule.match_pattern || '(any)'} · cd{' '}
                    {rule.cooldown_seconds}s
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-ink">
                    {rule.reply_body}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <Button
                      type="button"
                      variant="quiet"
                      disabled={busy}
                      onClick={() => runToggle(rule.id, !rule.enabled)}
                    >
                      {rule.enabled ? 'Kapat' : 'Aç'}
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={busy}
                      onClick={() => runDelete(rule.id)}
                    >
                      Sil
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        {actionError ? (
          <div className="border-t border-hairline px-3.5 py-2.5">
            <Notice tone="danger">{actionError}</Notice>
          </div>
        ) : null}
      </Card>

      {canEdit ? (
        <Card>
          <div id="yeni-kural" className="scroll-mt-6">
            <CardHeader title="Yeni kural" />
          </div>
          <form action={formAction} className="space-y-2.5 p-3.5">
            <Field label="Ad">
              <Input name="name" defaultValue="Karşılama" required />
            </Field>
            <Field label="Eşleşme">
              <Select name="match_mode" defaultValue="contains">
                <option value="contains">İçerir</option>
                <option value="equals">Eşit</option>
                <option value="regex">Regex</option>
                <option value="any">Her mesaj</option>
              </Select>
            </Field>
            <Field label="Desen">
              <Input name="match_pattern" placeholder="fiyat" />
            </Field>
            <Field label="Yanıt">
              <Textarea
                name="reply_body"
                rows={3}
                required
                placeholder="Merhaba, size nasıl yardımcı olabiliriz?"
              />
            </Field>
            <Field label="Cooldownğlama (sn)">
              <Input name="cooldown_seconds" type="number" min={0} defaultValue={3600} />
            </Field>
            {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
            {state?.ok ? <Notice tone="accent">{state.ok}</Notice> : null}
            <Button type="submit" variant="accent" disabled={pending}>
              {pending ? 'Ekleniyor…' : 'Kural ekle'}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  )
}
