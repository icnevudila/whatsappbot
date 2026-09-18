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
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const attachMenuRef = useRef<HTMLDivElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
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
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false)
      }
    }
    if (showAttachMenu) {
      document.addEventListener('pointerdown', handlePointerDown)
    }
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [showAttachMenu])

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

  const uploadMedia = async (fileOrBlob: File | Blob, customName?: string) => {
    setUploading(true)
    try {
      const fd = new FormData()
      if (fileOrBlob instanceof File) {
        fd.set('file', fileOrBlob, fileOrBlob.name)
      } else {
        const ext = fileOrBlob.type.includes('mp4') ? 'm4a' : fileOrBlob.type.includes('webm') ? 'webm' : 'ogg'
        fd.set('file', fileOrBlob, customName || `ses_kaydi.${ext}`)
      }
      const res = await fetch('/api/mesajlar/upload', {
        method: 'POST',
        body: fd,
      })
      const data = (await res.json()) as {
        success?: boolean
        url?: string
        fileName?: string
        messageType?: 'image' | 'video' | 'audio' | 'document'
        error?: string
      }
      if (!res.ok || !data.success || !data.url) {
        throw new Error(data.error || 'Dosya sunucuya yüklenemedi.')
      }
      return data as {
        url: string
        fileName: string
        messageType: 'image' | 'video' | 'audio' | 'document'
      }
    } finally {
      setUploading(false)
    }
  }

  const handleFileSelection = async (file: File | undefined) => {
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast('Dosya boyutu en fazla 50 MB olabilir.', 'warn')
      return
    }
    try {
      const uploaded = await uploadMedia(file)
      setMediaUrl(uploaded.url)
      setMediaName(uploaded.fileName)
      setMessageType(uploaded.messageType)
      toast('Dosya eklendi.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Dosya yüklenemedi.', 'danger')
    } finally {
      if (mediaInputRef.current) mediaInputRef.current.value = ''
      if (docInputRef.current) docInputRef.current.value = ''
    }
  }

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
        try {
          const uploaded = await uploadMedia(pendingAudioBlob, 'ses_kaydi.ogg')
          finalMediaUrl = uploaded.url
          finalMessageType = 'audio'
          finalMediaName = uploaded.fileName
        } catch (err) {
          onUpdate?.(clientKey, { status: 'failed' })
          toast('Ses kaydı yüklenemedi: ' + (err instanceof Error ? err.message : String(err)), 'danger')
          return
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

  const sendBusinessLocation = () => {
    const clientKey = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    onQueued?.('İşletme Konumu (Mamak, Ankara)', clientKey)

    void (async () => {
      const formData = new FormData()
      formData.set('phone', phone)
      formData.set('account_id', accountId)
      formData.set('message_type', 'location')
      formData.set('body', 'İşletme Konumu\nMamak, Ankara')
      formData.set('location_lat', '39.888403')
      formData.set('location_lng', '32.931024')
      formData.set('location_name', 'İşletme Konumu')
      formData.set('location_address', 'Mamak, Ankara')
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
      toast('İşletme konumu gönderildi.', 'success')
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
            <div className="wb-ai-suggest-grid wb-ai-suggest-list">
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
        <div className="wb-chat-composer-row items-center">
          {/* WhatsApp Native Attachment (+) Button & Popup */}
          <div className="relative shrink-0" ref={attachMenuRef}>
            {showAttachMenu && (
              <div className="wb-chat-attach-popup" role="menu" aria-orientation="vertical">
                {/* 1. Belge */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false)
                    docInputRef.current?.click()
                  }}
                  className="wb-chat-attach-item"
                  role="menuitem"
                >
                  <span className="wb-chat-attach-circle bg-[#7f66ff] text-white">
                    <Icon name="file" className="size-4" />
                  </span>
                  <span className="wb-chat-attach-label">Belge</span>
                </button>

                {/* 2. Fotoğraf ve Video */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false)
                    mediaInputRef.current?.click()
                  }}
                  className="wb-chat-attach-item"
                  role="menuitem"
                >
                  <span className="wb-chat-attach-circle bg-[#007bfc] text-white">
                    <Icon name="image" className="size-4" />
                  </span>
                  <span className="wb-chat-attach-label">Fotoğraf ve Video</span>
                </button>

                {/* 3. Konum */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false)
                    sendBusinessLocation()
                  }}
                  className="wb-chat-attach-item"
                  role="menuitem"
                >
                  <span className="wb-chat-attach-circle bg-[#00a884] text-white">
                    <Icon name="location" className="size-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="wb-chat-attach-label">Konum</span>
                    <span className="text-[11px] text-ink-muted -mt-0.5">Mamak, Ankara</span>
                  </div>
                </button>

                {/* 4. Önerilen Cevaplar */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(false)
                    setShowSuggestions(true)
                    if (suggestions.length === 0) {
                      void fetchAiSuggestions()
                    }
                  }}
                  className="wb-chat-attach-item"
                  role="menuitem"
                >
                  <span className="wb-chat-attach-circle bg-[#0284c7] text-white">
                    <Icon name="sparkles" className="size-4" />
                  </span>
                  <div className="flex flex-col">
                    <span className="wb-chat-attach-label">Önerilen Cevaplar</span>
                    <span className="text-[11px] text-ink-muted -mt-0.5">Yapay zeka hazır yanıtları</span>
                  </div>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAttachMenu((prev) => !prev)}
              disabled={uploading}
              className="wb-chat-attach-btn"
              title="Ekle"
              aria-label="Ekle"
            >
              {uploading ? (
                <span className="size-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              ) : (
                <Icon
                  name="plus"
                  className={`size-5 transition-transform duration-200 ${showAttachMenu ? 'rotate-45 text-accent' : ''}`}
                />
              )}
            </button>
          </div>

          {/* Hidden File Inputs */}
          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => void handleFileSelection(e.target.files?.[0])}
          />
          <input
            ref={docInputRef}
            type="file"
            accept="application/pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            className="hidden"
            onChange={(e) => void handleFileSelection(e.target.files?.[0])}
          />

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
            placeholder={
              recordedAudioUrl
                ? 'Ses kaydı eklendi. İsteğe bağlı açıklama yazın…'
                : mediaUrl
                  ? 'Açıklama yazın (isteğe bağlı)…'
                  : 'Bir mesaj yazın'
            }
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

          {/* Right Action: Send Button if text/media, Mic Button if empty */}
          {body.trim() || mediaUrl || recordedAudioBlob ? (
            <button
              type="submit"
              className="wb-chat-composer-send"
              disabled={uploading}
              aria-label="Gönder"
              title="Gönder"
            >
              <Icon name="send" className="size-4" fill="currentColor" stroke="none" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              disabled={uploading}
              className="wb-chat-attach-btn text-ink-muted hover:text-accent"
              aria-label="Sesli Mesaj Kaydet"
              title="Sesli Mesaj Kaydet (Mikrofon)"
            >
              <Icon name="mic" className="size-5" />
            </button>
          )}
        </div>
      )}
    </form>
  )
}
