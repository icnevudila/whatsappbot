'use client'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { replyToConversation } from './reply-actions'

const COMPOSER_MAX_PX = 120
const COMPOSER_MIN_PX = 42
const FOCUS_CLASS = 'wb-composer-focus'

function fitComposer(el: HTMLTextAreaElement) {
  el.style.overflowY = 'hidden'
  el.style.height = '0px'
  const contentHeight = el.scrollHeight
  const next = Math.min(Math.max(contentHeight, COMPOSER_MIN_PX), COMPOSER_MAX_PX)
  el.style.height = `${next}px`
  el.style.overflowY = contentHeight > COMPOSER_MAX_PX ? 'auto' : 'hidden'
}

function setComposerFocus(on: boolean) {
  document.body.classList.toggle(FOCUS_CLASS, on)
}

async function waitForJob(jobId: string) {
  const supabase = getSupabaseBrowserClient()
  for (let i = 0; i < 40; i += 1) {
    const { data } = await supabase
      .from('jobs')
      .select('status, error, result')
      .eq('id', Number(jobId))
      .maybeSingle()
    if (!data) {
      await new Promise((resolve) => window.setTimeout(resolve, 800))
      continue
    }
    if (data.status === 'failed' || data.status === 'cancelled') {
      return { error: data.error || 'Yanıt gönderilemedi.' }
    }
    if (data.status === 'done') {
      const payload = data.result as { skipped?: boolean; reason?: string } | null
      if (payload?.skipped) {
        return {
          error:
            payload.reason === 'blacklist'
              ? 'Numara İstemeyenler’de; gönderilmedi.'
              : 'Numara WhatsApp’ta doğrulanamadı; gönderilmedi.',
        }
      }
      return { ok: true }
    }
    await new Promise((resolve) => window.setTimeout(resolve, 800))
  }
  return { error: 'Yanıt gönderimi zaman aşımına uğradı.' }
}

export function ReplyForm({
  phone,
  accountId,
  onQueued,
  onUpdate,
}: {
  phone: string
  accountId: string
  onQueued?: (body: string, clientKey: string) => void
  onUpdate?: (clientKey: string, patch: { status: string }) => void
}) {
  const [body, setBody] = useState('')
  const toast = useToast()
  const input = useRef<HTMLTextAreaElement>(null)
  const blurTimer = useRef<number>(0)

  useEffect(() => {
    return () => {
      window.clearTimeout(blurTimer.current)
      setComposerFocus(false)
    }
  }, [])

  return (
    <form
      className="wb-chat-composer-bar"
      onSubmit={(event) => {
        event.preventDefault()
        const text = body.trim()
        if (!text) return
        const clientKey = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
        onQueued?.(text, clientKey)
        setBody('')
        window.requestAnimationFrame(() => {
          if (!input.current) return
          fitComposer(input.current)
          input.current.focus()
        })
        void (async () => {
          const formData = new FormData()
          formData.set('phone', phone)
          formData.set('account_id', accountId)
          formData.set('body', text)
          formData.set('client_key', clientKey)
          const queued = await replyToConversation(null, formData)
          if (queued?.error) {
            onUpdate?.(clientKey, { status: 'failed' })
            toast(queued.error, 'danger')
            return
          }
          if (!queued?.jobId) return
          const outcome = await waitForJob(queued.jobId)
          if (outcome.error) {
            onUpdate?.(clientKey, { status: 'failed' })
            toast(outcome.error, 'danger')
            return
          }
          onUpdate?.(clientKey, { status: 'sent' })
        })()
      }}
    >
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
          value={body}
          onChange={(event) => {
            setBody(event.target.value)
            fitComposer(event.target)
          }}
          onFocus={() => {
            window.clearTimeout(blurTimer.current)
            setComposerFocus(true)
          }}
          onBlur={() => {
            window.clearTimeout(blurTimer.current)
            blurTimer.current = window.setTimeout(() => {
              const next = document.activeElement
              if (next === input.current) return
              if (next instanceof HTMLElement && next.closest('.wb-chat-composer')) return
              setComposerFocus(false)
            }, 180)
          }}
          className="wb-chat-composer-input font-sans"
        />
        <button
          type="submit"
          className="wb-chat-composer-send"
          disabled={!body.trim()}
          aria-label="Gönder"
          title="Gönder"
        >
          <Icon name="send" className="size-4" fill="currentColor" stroke="none" />
        </button>
      </div>
    </form>
  )
}
