'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Notice, Textarea } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { replyToConversation, type ReplyState } from './reply-actions'

export function ReplyForm({ phone, accountId }: { phone: string; accountId: string }) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToConversation, null)
  const [result, setResult] = useState<{ id: string; error?: string; done?: boolean } | null>(null)
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const waiting = !!state?.jobId && result?.id !== state.jobId
  useEffect(() => {
    const id = state?.jobId
    if (!id) return
    let disposed = false
    let checking = false
    const check = async () => {
      if (checking || disposed) return
      checking = true
      try {
        const { data } = await getSupabaseBrowserClient().from('jobs').select('status, error, result').eq('id', Number(id)).maybeSingle()
        if (disposed || !data) return
        if (data.status === 'failed' || data.status === 'cancelled') {
          setResult({ id, error: data.error || 'Yanıt gönderilemedi.' })
          clearInterval(timer)
        } else if (data.status === 'done') {
          const payload = data.result as { skipped?: boolean; reason?: string } | null
          if (payload?.skipped) setResult({ id, error: payload.reason === 'blacklist' ? 'Numara kara listede; gönderilmedi.' : 'Numara WhatsApp’ta doğrulanamadı; gönderilmedi.' })
          else { setResult({ id, done: true }); form.current?.reset(); router.refresh() }
          clearInterval(timer)
        }
      } finally { checking = false }
    }
    const timer = setInterval(() => { void check() }, 2500)
    void check()
    return () => { disposed = true; clearInterval(timer) }
  }, [state?.jobId, router])
  return <form ref={form} action={action} className="space-y-3 border-t border-hairline bg-surface p-4" aria-busy={pending || waiting}>
    <input type="hidden" name="phone" value={phone} /><input type="hidden" name="account_id" value={accountId} />
    <label className="block text-xs font-medium text-ink-muted" htmlFor="conversation-reply">Yanıtınız</label>
    <Textarea id="conversation-reply" name="body" required maxLength={4096} rows={3} placeholder="Mesajınızı yazın…" disabled={pending || waiting} className="font-sans" />
    {state?.error && <Notice tone="danger">{state.error}</Notice>}
    {waiting && <Notice tone="accent">Yanıt sırada. Gönderim sonucu geldiğinde burada görünecek; yeniden göndermenize gerek yok.</Notice>}
    {result?.id === state?.jobId && result?.error && <Notice tone="danger">{result.error}</Notice>}
    {result?.id === state?.jobId && result?.done && <Notice tone="success">Yanıt WhatsApp’a gönderildi.</Notice>}
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-ink-muted">Seçili konuşmanın hattından gönderilir.</p><Button type="submit" variant="accent" disabled={pending || waiting}>{pending ? 'Sıraya alınıyor…' : waiting ? 'Gönderim bekleniyor' : 'Yanıtı gönder →'}</Button></div>
  </form>
}
