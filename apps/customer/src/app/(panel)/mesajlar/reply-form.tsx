'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSyncBusy } from '@/components/busy'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { Notice } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { replyToConversation, type ReplyState } from './reply-actions'

const COMPOSER_MAX_PX = 120

function fitComposer(el: HTMLTextAreaElement) {
  el.style.overflowY = 'hidden'
  el.style.height = '0px'
  const contentHeight = el.scrollHeight
  const next = Math.min(Math.max(contentHeight, 36), COMPOSER_MAX_PX)
  el.style.height = `${next}px`
  el.style.overflowY = contentHeight > COMPOSER_MAX_PX ? 'auto' : 'hidden'
}

export function ReplyForm({ phone, accountId }: { phone: string; accountId: string }) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToConversation, null)
  const [result, setResult] = useState<{ id: string; error?: string; done?: boolean } | null>(null)
  const [body, setBody] = useState('')
  const router = useRouter()
  const toast = useToast()
  const form = useRef<HTMLFormElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)
  const waiting = !!state?.jobId && result?.id !== state.jobId
  const busy = pending || waiting
  useSyncBusy(
    busy,
    pending ? 'Yanıt sıraya alınıyor…' : 'Yanıt gönderiliyor…',
    phone,
  )

  useEffect(() => {
    if (state?.error) toast(state.error, 'danger')
  }, [state?.error, toast])

  useEffect(() => {
    const id = state?.jobId
    if (!id) return
    let disposed = false
    let checking = false
    const check = async () => {
      if (checking || disposed) return
      checking = true
      try {
        const { data } = await getSupabaseBrowserClient()
          .from('jobs')
          .select('status, error, result')
          .eq('id', Number(id))
          .maybeSingle()
        if (disposed || !data) return
        if (data.status === 'failed' || data.status === 'cancelled') {
          setResult({ id, error: data.error || 'Yanıt gönderilemedi.' })
          toast(data.error || 'Yanıt gönderilemedi.', 'danger')
          clearInterval(timer)
        } else if (data.status === 'done') {
          const payload = data.result as { skipped?: boolean; reason?: string } | null
          if (payload?.skipped) {
            const msg =
              payload.reason === 'blacklist'
                ? 'Numara İstemeyenler’de; gönderilmedi.'
                : 'Numara WhatsApp’ta doğrulanamadı; gönderilmedi.'
            setResult({ id, error: msg })
            toast(msg, 'warn')
          } else {
            setResult({ id, done: true })
            setBody('')
            form.current?.reset()
            if (input.current) fitComposer(input.current)
            toast('Yanıt WhatsApp’a gönderildi.', 'success')
            router.refresh()
          }
          clearInterval(timer)
        }
      } finally {
        checking = false
      }
    }
    const timer = setInterval(() => {
      void check()
    }, 2500)
    void check()
    return () => {
      disposed = true
      clearInterval(timer)
    }
  }, [state?.jobId, router, toast])

  return (
    <form
      ref={form}
      action={action}
      className="wb-chat-composer-bar"
      aria-busy={busy}
    >
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="account_id" value={accountId} />
      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {waiting ? (
        <Notice tone="accent">Yanıt sırada; sonucu bekleyin.</Notice>
      ) : null}
      {result?.id === state?.jobId && result?.error ? (
        <Notice tone="danger">{result.error}</Notice>
      ) : null}
      <div className="wb-chat-composer-row">
        <label className="sr-only" htmlFor="conversation-reply">
          Mesaj
        </label>
        <textarea
          ref={input}
          id="conversation-reply"
          name="body"
          required
          maxLength={4096}
          rows={1}
          placeholder="Mesaj yazın"
          disabled={busy}
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
            fitComposer(event.target)
          }}
          className="wb-chat-composer-input font-sans"
        />
        <button
          type="submit"
          className="wb-chat-composer-send"
          disabled={busy || !body.trim()}
          aria-label={pending ? 'Sıraya alınıyor' : waiting ? 'Gönderim bekleniyor' : 'Gönder'}
          title={pending ? 'Sıraya alınıyor' : waiting ? 'Gönderim bekleniyor' : 'Gönder'}
        >
          <Icon name="send" className="size-4" fill="currentColor" stroke="none" />
        </button>
      </div>
    </form>
  )
}
