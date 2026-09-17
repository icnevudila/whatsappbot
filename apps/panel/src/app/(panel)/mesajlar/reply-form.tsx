'use client'
import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSyncBusy } from '@/components/busy'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { Button, Notice } from '@/components/ui'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { replyToConversation, type ReplyState } from './reply-actions'

type Suggestion = { label: string; text: string }

function suggestionKey(phone: string, message: string, history: string) {
  return JSON.stringify([phone.trim(), message.trim(), history.trim()])
}

export function ReplyForm({
  phone,
  accountId,
  lastInbound,
  threadContext,
}: {
  phone: string
  accountId: string
  lastInbound?: string | null
  threadContext?: string
}) {
  const [state, action, pending] = useActionState<ReplyState, FormData>(replyToConversation, null)
  const [result, setResult] = useState<{ id: string; error?: string; done?: boolean } | null>(null)
  const [body, setBody] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaName, setMediaName] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'document'>('text')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [preparedKey, setPreparedKey] = useState<string | null>(null)
  const router = useRouter()
  const toast = useToast()
  const inFlightKey = useRef<string | null>(null)
  const waiting = !!state?.jobId && result?.id !== state.jobId

  useSyncBusy(
    pending || waiting,
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
            setMediaUrl(null)
            setMediaName(null)
            setMessageType('text')
            setShowSuggestions(false)
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

  async function fetchAiSuggestions(options?: {
    background?: boolean
    force?: boolean
    shouldApply?: () => boolean
  }) {
    const lastMessage = (lastInbound || body || 'Merhaba').trim()
    const history = threadContext || ''
    const key = suggestionKey(phone, lastMessage, history)

    if (!options?.force && preparedKey === key && suggestions.length > 0) {
      if (!options?.background) setShowSuggestions(true)
      return
    }
    if (inFlightKey.current === key) {
      if (!options?.background) setShowSuggestions(true)
      return
    }

    inFlightKey.current = key
    setIsSuggesting(true)
    if (!options?.background) setShowSuggestions(true)
    try {
      const res = await fetch('/api/mesajlar/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, lastMessage, history }),
      })
      const data = (await res.json()) as {
        success?: boolean
        suggestions?: Suggestion[]
        error?: string
      }
      if (options?.shouldApply && !options.shouldApply()) return
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions)
        setPreparedKey(key)
        setShowSuggestions(true)
      } else if (!options?.background) {
        toast(data.error || 'Yapay zeka önerisi üretilemedi.', 'warn')
      }
    } catch {
      if (!options?.background) toast('Öneri servisine erişilemedi.', 'danger')
    } finally {
      if (inFlightKey.current === key) inFlightKey.current = null
      setIsSuggesting(false)
    }
  }

  useEffect(() => {
    if (!lastInbound || !phone) return
    let active = true
    void fetchAiSuggestions({ background: true, shouldApply: () => active })
    return () => {
      active = false
    }
  }, [phone, lastInbound, threadContext]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={action} className="space-y-2.5 p-3" aria-busy={pending || waiting}>
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="media_url" value={mediaUrl || ''} />
      <input type="hidden" name="message_type" value={messageType} />

      {showSuggestions && (suggestions.length > 0 || isSuggesting) ? (
        <div className="wb-ai-suggest-bar">
          <div className="wb-ai-suggest-head">
            <span className="wb-ai-suggest-title">
              Hazır Cevaplar
            </span>
            <div className="wb-ai-suggest-actions">
              <button
                type="button"
                onClick={() => fetchAiSuggestions()}
                disabled={isSuggesting}
                className="wb-ai-suggest-refresh"
                title="Hazır cevapları kontrol et"
                aria-label="Hazır cevapları kontrol et"
              >
                <Icon name="refresh" className="size-3.5" />
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
                  onClick={() => setBody(item.text)}
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
              <span>Öneriler hazırlanıyor</span>
            </div>
          )}
        </div>
      ) : null}

      {mediaUrl ? (
        <div className="flex items-center gap-2 rounded border border-hairline bg-surface-muted px-2.5 py-1.5 text-[12.5px]">
          <Icon name="paperclip" className="size-3.5 text-accent shrink-0" />
          <span className="truncate text-ink font-medium">{mediaName || 'Eklenen Medya'}</span>
          <span className="rounded bg-accent/10 px-1 text-[10px] font-bold text-accent uppercase">
            {messageType}
          </span>
          <button
            type="button"
            onClick={() => {
              setMediaUrl(null)
              setMediaName(null)
              setMessageType('text')
            }}
            className="ml-auto text-ink-muted hover:text-danger text-[14px] font-semibold leading-none px-1"
            title="Kaldır"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            if (file.size > 16 * 1024 * 1024) {
              toast('Dosya boyutu en fazla 16 MB olabilir.', 'warn')
              return
            }
            setUploading(true)
            try {
              const supabase = getSupabaseBrowserClient()
              const ext = file.name.split('.').pop() || 'bin'
              const path = `chat/${Date.now()}_${crypto.randomUUID()}.${ext}`
              const { error } = await supabase.storage.from('creatives').upload(path, file, {
                contentType: file.type,
                upsert: false,
              })
              if (error) throw error
              const { data } = supabase.storage.from('creatives').getPublicUrl(path)
              setMediaUrl(data.publicUrl)
              setMediaName(file.name)
              if (file.type.startsWith('image/')) setMessageType('image')
              else if (file.type.startsWith('video/')) setMessageType('video')
              else setMessageType('document')
              toast('Medya eklendi.', 'success')
            } catch (err) {
              toast(err instanceof Error ? err.message : 'Dosya yüklenemedi.', 'danger')
            } finally {
              setUploading(false)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || pending || waiting}
          className="wb-ai-suggest-btn"
          title="Görsel veya dosya ekle (Maks 16 MB)"
        >
          {uploading ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          ) : (
            <Icon name="paperclip" className="size-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            const lastMessage = (lastInbound || body || 'Merhaba').trim()
            const key = suggestionKey(phone, lastMessage, threadContext || '')
            if (suggestions.length > 0 && preparedKey === key && !showSuggestions) {
              setShowSuggestions(true)
            } else {
              void fetchAiSuggestions()
            }
          }}
          aria-busy={isSuggesting}
          className={`wb-ai-suggest-btn${isSuggesting ? ' is-loading' : ''}`}
          title="Hazır cevapları gör"
        >
          <Icon name="inbox" className="size-3.5" />
        </button>
        <label className="sr-only" htmlFor="conversation-reply">
          Yanıtınız
        </label>
        <textarea
          id="conversation-reply"
          name="body"
          required={!mediaUrl}
          maxLength={4096}
          rows={2}
          placeholder={mediaUrl ? 'Açıklama yazın (isteğe bağlı)…' : 'Mesaj yazın veya önerilen cevapları seçin…'}
          disabled={pending || waiting}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          className="wb-chat-composer-input font-sans"
        />
        <Button
          type="submit"
          variant="accent"
          disabled={pending || waiting || (!body.trim() && !mediaUrl)}
        >
          {pending ? 'Sırada…' : waiting ? 'Bekliyor' : 'Gönder'}
        </Button>
      </div>

      {state?.error ? <Notice tone="danger">{state.error}</Notice> : null}
      {waiting ? (
        <Notice tone="accent">
          Yanıt sırada. Gönderim sonucu geldiğinde burada görünecek; yeniden göndermenize gerek yok.
        </Notice>
      ) : null}
      {result?.id === state?.jobId && result?.error ? (
        <Notice tone="danger">{result.error}</Notice>
      ) : null}
      {result?.id === state?.jobId && result?.done ? (
        <Notice tone="success">Yanıt WhatsApp’a gönderildi.</Notice>
      ) : null}
    </form>
  )
}
