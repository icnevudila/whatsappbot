'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useSyncBusy } from '@/components/busy'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { Notice } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { replyToConversation, type ReplyState } from './reply-actions'

const COMPOSER_MAX_PX = 120
const COMPOSER_MIN_PX = 42

function fitComposer(el: HTMLTextAreaElement) {
  el.style.overflowY = 'hidden'
  el.style.height = '0px'
  const contentHeight = el.scrollHeight
  const next = Math.min(Math.max(contentHeight, COMPOSER_MIN_PX), COMPOSER_MAX_PX)
  el.style.height = `${next}px`
  el.style.overflowY = contentHeight > COMPOSER_MAX_PX ? 'auto' : 'hidden'
}

export function ReplyForm({
  phone,
  accountId,
  onQueued,
  onFailed,
}: {
  phone: string
  accountId: string
  onQueued?: (body: string) => void
  onFailed?: () => void
}) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToConversation, null)
  const [result, setResult] = useState<{ id: string; error?: string; done?: boolean } | null>(null)
  const [body, setBody] = useState('')
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
    if (state?.error) {
      toast(state.error, 'danger')
      onFailed?.()
    }
  }, [state?.error, toast, onFailed])

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
          onFailed?.()
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
            onFailed?.()
          } else {
            setResult({ id, done: true })
            setBody('')
            form.current?.reset()
            if (input.current) fitComposer(input.current)
            toast('Yanıt WhatsApp’a gönderildi.', 'success')
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
  }, [state?.jobId, toast, onFailed])

  return (
    <form
      ref={form}
      action={action}
      className="wb-chat-composer-bar"
      aria-busy={busy}
      onSubmit={() => {
        const text = body.trim()
        if (text) onQueued?.(text)
      }}
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
          placeholder="Mesaj"
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
