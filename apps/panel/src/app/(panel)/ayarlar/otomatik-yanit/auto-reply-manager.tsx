'use client'

import { useActionState, useTransition } from 'react'
import { Button, Card, CardHeader, Field, Input, Notice, Select, Textarea } from '@/components/ui'
import {
  createAutoReplyRule,
  deleteAutoReplyRule,
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
  const [state, formAction, pending] = useActionState<AutoReplyState, FormData>(
    createAutoReplyRule,
    null,
  )
  const [deleting, startDelete] = useTransition()

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Kurallar"
          subtitle="Gelen metin eşleşince message.send kuyruğa alınır (cooldown uygulanır)."
        />
        <ul className="divide-y divide-hairline">
          {rules.length === 0 ? (
            <li className="px-4 py-6 text-[12.5px] text-ink-muted">Henüz kural yok.</li>
          ) : (
            rules.map((rule) => (
              <li key={rule.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium">{rule.name}</p>
                  <p className="text-[11.5px] text-ink-muted">
                    {rule.match_mode}: {rule.match_pattern || '(any)'} · cd {rule.cooldown_seconds}s
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[12.5px] text-ink">{rule.reply_body}</p>
                </div>
                {canEdit ? (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={deleting}
                    onClick={() => startDelete(() => void deleteAutoReplyRule(rule.id))}
                  >
                    Sil
                  </Button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </Card>

      {canEdit ? (
        <Card>
          <CardHeader title="Yeni kural" />
          <form action={formAction} className="space-y-3 p-4">
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
              <Textarea name="reply_body" rows={3} required placeholder="Merhaba, size nasıl yardımcı olabiliriz?" />
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
