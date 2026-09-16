'use client'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { replyToConversation } from './reply-actions'

const COMPOSER_MAX_PX = 120
const COMPOSER_MIN_PX = 42
const FOCUS_CLASS = 'wb-composer-focus'
type Suggestion = { label: string; text: string }

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

function suggestionKey(phone: string, message: string, history: string) {
  return JSON.stringify([phone.trim(), message.trim(), history.trim()])
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
  lastInbound,
  threadContext,
  onQueued,
  onUpdate,
}: {
  phone: string
  accountId: string
  lastInbound?: string | null
  threadContext?: string
  onQueued?: (body: string, clientKey: string) => void
  onUpdate?: (clientKey: string, patch: { status: string }) => void
}) {
  const [body, setBody] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [preparedKey, setPreparedKey] = useState<string | null>(null)
  const toast = useToast()
  const input = useRef<HTMLTextAreaElement>(null)
  const blurTimer = useRef<number>(0)
  const inFlightKey = useRef<string | null>(null)
  const threadContextRef = useRef(threadContext)

  useEffect(() => {
    threadContextRef.current = threadContext
  }, [threadContext])

  useEffect(() => {
    return () => {
      window.clearTimeout(blurTimer.current)
      setComposerFocus(false)
    }
  }, [])

  useEffect(() => {
    if (lastInbound && phone) {
      setShowSuggestions(true)
      void fetchAiSuggestions({ autoOpen: true })
    }
  }, [phone, lastInbound]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAiSuggestions(options?: {
    force?: boolean
    autoOpen?: boolean
  }) {
    const lastMessage = (lastInbound || body || 'Merhaba').trim()
    const history = threadContextRef.current || ''
    const key = suggestionKey(phone, lastMessage, history)

    if (!options?.force && preparedKey === key && suggestions.length > 0) {
      setShowSuggestions(true)
      return
    }

    if (inFlightKey.current === key) {
      setShowSuggestions(true)
      return
    }

    inFlightKey.current = key
    setIsSuggesting(true)
    setShowSuggestions(true)
    try {
      const res = await fetch('/api/mesajlar/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          lastMessage,
          history,
        }),
      })
      const data = (await res.json()) as {
        success?: boolean
        suggestions?: Suggestion[]
        error?: string
      }
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
        setPreparedKey(key)
        setShowSuggestions(true)
      } else if (!options?.autoOpen) {
        toast(data.error || 'Öneri üretilemedi.', 'warn')
      }
    } catch {
      if (!options?.autoOpen) toast('Öneri servisine erişilemedi.', 'danger')
    } finally {
      if (inFlightKey.current === key) inFlightKey.current = null
      setIsSuggesting(false)
    }
  }

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
        setShowSuggestions(false)
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
      {showSuggestions && (suggestions.length > 0 || isSuggesting) && (
        <div className="wb-ai-suggest-bar">
          <div className="wb-ai-suggest-head">
            <span className="wb-ai-suggest-title">
              <Icon name="sparkles" className="size-3.5 text-accent" />
              Önerilen Cevaplar
            </span>
            <div className="wb-ai-suggest-actions">
              <button
                type="button"
                onClick={() => fetchAiSuggestions({ force: true })}
                disabled={isSuggesting}
                className="wb-ai-suggest-refresh"
                title="Yeni öneriler üret"
                aria-label="Yeni öneriler üret"
              >
                <Icon name="refresh" className={`size-3.5 ${isSuggesting ? 'animate-spin' : ''}`} />
                <span>{isSuggesting ? 'Hazırlanıyor' : 'Yenile'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSuggestions(false)}
                className="wb-ai-suggest-close"
                title="Kapat"
                aria-label="Önerileri kapat"
              >
                <Icon name="close" className="size-3.5" />
              </button>
            </div>
          </div>
          {suggestions.length > 0 ? (
            <div className="wb-ai-suggest-grid">
              {suggestions.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setBody(item.text)
                    window.requestAnimationFrame(() => {
                      if (input.current) {
                        fitComposer(input.current)
                        input.current.focus()
                      }
                    })
                  }}
                  className="wb-ai-suggest-card"
                  title="Bu yanıtı seç"
                >
                  <span className="wb-ai-suggest-meta">
                    <span className="wb-ai-suggest-badge">{item.label}</span>
                    <span className="wb-ai-suggest-pick">Seç</span>
                  </span>
                  <span className="wb-ai-suggest-body">{item.text}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="wb-ai-suggest-loading" role="status" aria-live="polite">
              <span className="wb-ai-suggest-spinner" />
              <span>Önerilen cevaplar hazırlanıyor…</span>
            </div>
          )}
        </div>
      )}

      <div className="wb-chat-composer-row">
        <button
          type="button"
          onClick={() => {
            if (showSuggestions) {
              setShowSuggestions(false)
              return
            }
            setShowSuggestions(true)
            if (suggestions.length === 0) {
              void fetchAiSuggestions()
            }
          }}
          aria-busy={isSuggesting}
          className={`wb-ai-suggest-btn${isSuggesting ? ' is-loading' : ''}`}
          title="Önerilen cevapları gör"
        >
          <Icon name="sparkles" className={`size-3.5 ${isSuggesting ? 'animate-spin' : 'text-accent'}`} />
          <span className="hidden md:inline text-[11.5px] font-semibold text-ink-soft">
            {isSuggesting
              ? 'Hazırlanıyor…'
              : suggestions.length > 0 && !showSuggestions
                ? `Öneriler (${suggestions.length})`
                : 'Önerilen Cevaplar'}
          </span>
        </button>
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
          placeholder="Mesaj yazın veya önerilen cevapları seçin…"
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
