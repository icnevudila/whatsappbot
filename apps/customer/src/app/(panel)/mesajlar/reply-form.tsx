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
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [mediaName, setMediaName] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'text' | 'image' | 'video' | 'document' | 'audio'>('text')
  const [uploading, setUploading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null)
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
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
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try { mediaRecorderRef.current.stop() } catch {}
      }
      setComposerFocus(false)
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : ''
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
        }
      }

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        const blobType = mimeType || 'audio/ogg'
        const blob = new Blob(audioChunksRef.current, { type: blobType })
        if (blob.size > 0) {
          setRecordedAudioBlob(blob)
          const objUrl = URL.createObjectURL(blob)
          setRecordedAudioUrl(objUrl)
          setMessageType('audio')
          setMediaName('Sesli Mesaj (Kayıt)')
        }
      }

      recorder.start(250)
      setIsRecording(true)
      setRecordingSeconds(0)
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)
    } catch {
      toast('Mikrofon erişim izni alınamadı.', 'danger')
    }
  }

  const stopRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
  }

  const cancelRecording = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
    }
    setIsRecording(false)
    setRecordedAudioBlob(null)
    if (recordedAudioUrl) URL.revokeObjectURL(recordedAudioUrl)
    setRecordedAudioUrl(null)
  }

  useEffect(() => {
    if (!phone) return
    setShowSuggestions(true)
    void fetchAiSuggestions({ autoOpen: true })
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

  const submitText = (textToSend: string) => {
    const text = textToSend.trim()
    if (!text && !mediaUrl && !recordedAudioBlob) return
    const clientKey = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    onQueued?.(
      text || (recordedAudioBlob || messageType === 'audio' ? 'Sesli Mesaj' : messageType === 'document' ? (mediaName || 'Belge (PDF)') : messageType === 'image' ? 'Fotoğraf' : '(ek)'),
      clientKey,
    )

    const pendingAudioBlob = recordedAudioBlob
    const pendingMediaUrl = mediaUrl
    const pendingMediaName = mediaName
    const pendingMessageType = messageType

    setBody('')
    setMediaUrl(null)
    setMediaName(null)
    setMessageType('text')
    setRecordedAudioBlob(null)
    if (recordedAudioUrl) {
      URL.revokeObjectURL(recordedAudioUrl)
      setRecordedAudioUrl(null)
    }
    setShowSuggestions(false)

    window.requestAnimationFrame(() => {
      if (!input.current) return
      fitComposer(input.current)
      input.current.focus()
    })

    void (async () => {
      let finalMediaUrl = pendingMediaUrl
      let finalMessageType = pendingMessageType
      let finalMediaName = pendingMediaName

      if (pendingAudioBlob) {
        setUploading(true)
        try {
          const supabase = getSupabaseBrowserClient()
          const { data: authData } = await supabase.auth.getUser()
          const prefix = authData?.user?.id || 'chat'
          const ext = pendingAudioBlob.type.includes('mp4') ? 'm4a' : 'ogg'
          const path = `${prefix}/${Date.now()}_voice_${crypto.randomUUID()}.${ext}`
          const { error: uploadErr } = await supabase.storage.from('chat-media').upload(path, pendingAudioBlob, {
            contentType: pendingAudioBlob.type || 'audio/ogg',
            upsert: false,
          })
          if (uploadErr) throw uploadErr
          const { data: pubData } = supabase.storage.from('chat-media').getPublicUrl(path)
          finalMediaUrl = pubData.publicUrl
          finalMessageType = 'audio'
          finalMediaName = `ses_kaydi.${ext}`
        } catch (err) {
          onUpdate?.(clientKey, { status: 'failed' })
          toast('Ses kaydı yüklenemedi: ' + (err instanceof Error ? err.message : String(err)), 'danger')
          setUploading(false)
          return
        } finally {
          setUploading(false)
        }
      }

      const formData = new FormData()
      formData.set('phone', phone)
      formData.set('account_id', accountId)
      if (text) formData.set('body', text)
      if (finalMediaUrl) {
        formData.set('media_url', finalMediaUrl)
        formData.set('message_type', finalMessageType)
        if (finalMediaName) formData.set('media_name', finalMediaName)
      }
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
  }

  return (
    <form
      className="wb-chat-composer-bar"
      onSubmit={(event) => {
        event.preventDefault()
        submitText(body)
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
            <div className="wb-ai-suggest-list">
              {suggestions.map((item) => (
                <button
                  key={item.text}
                  type="button"
                  onClick={() => {
                    setBody(item.text)
                    setShowSuggestions(false)
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
                    <span className="flex items-center gap-2">
                      <span className="wb-ai-suggest-pick">Seç</span>
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          submitText(item.text)
                        }}
                        className="wb-ai-suggest-pick font-bold text-accent hover:underline cursor-pointer"
                        title="Bu yanıtı direkt gönder (2-3sn yazıyor efektiyle)"
                      >
                        Gönder ↵
                      </span>
                    </span>
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

      {(mediaUrl || recordedAudioUrl) ? (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-canvas-subtle border-t border-line text-xs">
          {recordedAudioUrl ? (
            <div className="flex items-center gap-2 flex-1">
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              <audio src={recordedAudioUrl} controls className="h-7 max-w-[220px]" />
              <span className="rounded bg-accent/10 px-1 py-0.5 text-[10px] font-bold text-accent uppercase">
                Ses Kaydı (PTT)
              </span>
            </div>
          ) : messageType === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl!} alt="" className="size-8 object-cover rounded border border-line" />
          ) : messageType === 'document' ? (
            <div className="size-8 rounded bg-danger/10 text-danger flex items-center justify-center font-bold text-[10px] shrink-0 border border-danger/20">
              PDF
            </div>
          ) : messageType === 'audio' ? (
            <div className="size-8 rounded bg-accent/10 text-accent flex items-center justify-center font-bold text-[10px] shrink-0 border border-accent/20">
              SES
            </div>
          ) : (
            <Icon name="paperclip" className="size-4 text-ink-muted" />
          )}
          {!recordedAudioUrl && (
            <>
              <span className="truncate max-w-[200px] text-ink font-medium">{mediaName || 'Eklenen Belge'}</span>
              <span className="rounded bg-accent/10 px-1 py-0.5 text-[10px] font-bold text-accent uppercase">
                {messageType === 'document' ? 'PDF' : messageType}
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setMediaUrl(null)
              setMediaName(null)
              setMessageType('text')
              setRecordedAudioBlob(null)
              if (recordedAudioUrl) {
                URL.revokeObjectURL(recordedAudioUrl)
                setRecordedAudioUrl(null)
              }
            }}
            className="ml-auto text-ink-muted hover:text-danger text-[16px] font-semibold leading-none px-1 cursor-pointer"
            title="Kaldır"
          >
            ×
          </button>
        </div>
      ) : null}

      {isRecording ? (
        <div className="wb-chat-composer-row flex items-center justify-between px-3 py-2 bg-danger/5 border-t border-danger/20">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-danger animate-ping" />
            <span className="text-xs font-bold text-danger">
              {Math.floor(recordingSeconds / 60).toString().padStart(2, '0')}:{(recordingSeconds % 60).toString().padStart(2, '0')}
            </span>
            <span className="text-xs text-ink-muted ml-2">Ses kaydediliyor…</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1 text-xs font-medium text-ink-muted hover:text-danger cursor-pointer"
              title="İptal Et"
            >
              İptal
            </button>
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1 bg-danger hover:bg-danger/90 text-white rounded text-xs font-semibold cursor-pointer shadow-xs"
              title="Kaydı Tamamla"
            >
              <Icon name="stop" className="size-3 fill-current" />
              <span>Durdur</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="wb-chat-composer-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,application/pdf,audio/*,.mp3,.ogg,.wav,.m4a"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 30 * 1024 * 1024) {
                toast('Dosya boyutu en fazla 30 MB olabilir.', 'warn')
                return
              }
              setUploading(true)
              try {
                const supabase = getSupabaseBrowserClient()
                const { data: authData } = await supabase.auth.getUser()
                const prefix = authData?.user?.id || 'chat'
                const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
                const path = `${prefix}/${Date.now()}_${crypto.randomUUID()}.${ext}`
                const { error } = await supabase.storage.from('chat-media').upload(path, file, {
                  contentType: file.type || 'application/octet-stream',
                  upsert: false,
                })
                if (error) throw error
                const { data } = supabase.storage.from('chat-media').getPublicUrl(path)
                setMediaUrl(data.publicUrl)
                setMediaName(file.name)
                if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
                  setMessageType('document')
                } else if (file.type.startsWith('audio/') || ['.mp3', '.ogg', '.wav', '.m4a', '.opus'].some((x) => file.name.toLowerCase().endsWith(x))) {
                  setMessageType('audio')
                } else if (file.type.startsWith('image/')) {
                  setMessageType('image')
                } else if (file.type.startsWith('video/')) {
                  setMessageType('video')
                } else {
                  setMessageType('document')
                }
                toast('Dosya eklendi.', 'success')
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
            disabled={uploading}
            className="wb-ai-suggest-btn"
            title="PDF, ses, görsel veya dosya ekle (Maks 30 MB)"
          >
            {uploading ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            ) : (
              <Icon name="paperclip" className="size-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={startRecording}
            disabled={uploading || Boolean(recordedAudioUrl)}
            className="wb-ai-suggest-btn text-accent hover:text-accent/80"
            title="Canlı ses kaydet (Mikrofon)"
          >
            <Icon name="mic" className="size-3.5" />
          </button>
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
            required={!mediaUrl && !recordedAudioBlob}
            maxLength={4096}
            rows={1}
            placeholder={recordedAudioUrl ? 'Ses kaydı eklendi. İsteğe bağlı açıklama yazın…' : mediaUrl ? 'Açıklama yazın (isteğe bağlı)…' : 'Mesaj yaz veya seç'}
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
            disabled={uploading || (!body.trim() && !mediaUrl && !recordedAudioBlob)}
            aria-label="Gönder"
            title="Gönder"
          >
            <Icon name="send" className="size-4" fill="currentColor" stroke="none" />
          </button>
        </div>
      )}
    </form>
  )
}
