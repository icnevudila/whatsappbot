'use client'

import { useEffect, useRef, useState } from 'react'
import { Button, Field, Input, Notice, Select } from '@/components/ui'

const STYLES = [
  { value: 'urun', label: 'Ürün / teklif' },
  { value: 'duyuru', label: 'Duyuru / indirim' },
  { value: 'minimal', label: 'Sade / minimal' },
  { value: 'fotograf', label: 'Gerçekçi foto' },
] as const

export type BrandKitOption = {
  id: string
  name: string
  isDefault: boolean
}

function pickDefaultKitId(kits: BrandKitOption[]): string {
  return kits.find((kit) => kit.isDefault)?.id ?? kits[0]?.id ?? ''
}

import { TypewriterText } from '@/components/typewriter-text'

const LOADING_MESSAGES = [
  'Kompozisyon hazırlanıyor…',
  'Marka renkleri uygulanıyor…',
  'Görsel oluşturuluyor…',
  'Detaylar ekleniyor…',
  'Son rötuşlar yapılıyor…',
  'Neredeyse hazır…',
]

/**
 * Kampanya / hızlı gönderim için AI görsel üretimi.
 * Varsa marka kiti renk/ton/ad ile üretir; birden fazla kitte seçim sunar.
 */
export function AiImage({
  enabled,
  brandKits = [],
  brand,
  onApply,
}: {
  enabled: boolean
  brandKits?: BrandKitOption[]
  /** Kit yoksa yedek marka adı. */
  brand?: string
  onApply: (url: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [brief, setBrief] = useState('')
  const [style, setStyle] = useState<string>('duyuru')
  const [brandKitId, setBrandKitId] = useState(() => pickDefaultKitId(brandKits))
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busyTick, setBusyTick] = useState(0)
  const pendingRequest = useRef<{ requestId: string; requestScope: string; brief: string; style: string; brandKitId: string | null; brand?: string } | null>(null)
  const [hasPendingRequest, setHasPendingRequest] = useState(false)
  const [requestScope, setRequestScope] = useState<string | null>(null)
  const [canStartNew, setCanStartNew] = useState(false)
  const requestStorageKey = requestScope ? `mesajify:quick-image:${requestScope}` : null
  useEffect(() => {
    let mounted = true
    fetch('/api/gorsel-uret', { cache: 'no-store' }).then(async response => {
      const value = await response.json()
      if (!response.ok || typeof value.requestScope !== 'string') throw new Error('Üretim oturumu doğrulanamadı.')
      if (mounted) setRequestScope(value.requestScope)
    }).catch(() => { if (mounted) setError('Üretim oturumu doğrulanamadı. Sayfayı yenileyin; üretim başlatılmadı.') })
    return () => { mounted = false }
  }, [])
  useEffect(() => {
    if (!requestStorageKey) return
    pendingRequest.current = null
    setHasPendingRequest(false)
    try {
      const stored = sessionStorage.getItem(requestStorageKey)
      if (stored) {
        const value = JSON.parse(stored)
        if (typeof value.requestId === 'string' && typeof value.brief === 'string' && value.requestScope === requestScope) {
          pendingRequest.current = value
          setHasPendingRequest(true)
          setBrief(value.brief)
          setStyle(typeof value.style === 'string' ? value.style : 'duyuru')
          setBrandKitId(typeof value.brandKitId === 'string' ? value.brandKitId : '')
        }
      }
    } catch { /* Keep the same identity in memory if session storage is unavailable. */ }
    setCanStartNew(false)
  }, [requestStorageKey])

  useEffect(() => {
    if (!busy) { setBusyTick(0); return }
    const timer = setInterval(() => setBusyTick((v) => v + 1), 3000)
    return () => clearInterval(timer)
  }, [busy])

  const selectedKit = brandKits.find((kit) => kit.id === brandKitId)

  const generate = async () => {
    if (!requestStorageKey || !requestScope) return
    setCanStartNew(false)
    setBusy(true)
    setError(null)

    try {
      // Org/account switching can preserve this client component. Verify its
      // scope before reusing a locally restored production identity.
      const scopeResponse = await fetch('/api/gorsel-uret', { cache: 'no-store' })
      const scope = await scopeResponse.json()
      if (!scopeResponse.ok || typeof scope.requestScope !== 'string') throw new Error('Üretim oturumu doğrulanamadı.')
      if (scope.requestScope !== requestScope) {
        setRequestScope(scope.requestScope)
        return
      }
      if (!pendingRequest.current) {
        pendingRequest.current = { requestId: crypto.randomUUID(), requestScope, brief, style,
          brandKitId: brandKitId || null, brand: brandKitId ? undefined : brand }
        setHasPendingRequest(true)
        try { sessionStorage.setItem(requestStorageKey, JSON.stringify(pendingRequest.current)) } catch { /* Identity is retained in memory. */ }
      }
      const frozenRequest = pendingRequest.current
      const deadline = Date.now() + 10 * 60_000
      while (Date.now() < deadline) {
        const response = await fetch('/api/gorsel-uret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(frozenRequest),
          signal: AbortSignal.timeout(Math.min(180_000, deadline - Date.now())),
        })

        const json = (await response.json()) as { url?: string; error?: string; pending?: boolean; creativeId?: string; retryAfterSeconds?: number; canRetryNew?: boolean }
        if (!response.ok) {
          setCanStartNew(json.canRetryNew === true)
          throw new Error(json.error ?? `Hata ${response.status}`)
        }
        if (response.status === 202 && json.pending && json.creativeId === frozenRequest.requestId) {
          await new Promise(resolve => setTimeout(resolve, Math.max(3, Math.min(30, json.retryAfterSeconds || 5)) * 1000))
          continue
        }
        if (!json.url) throw new Error('Görsel URL dönmedi.')

        setPreview(json.url)
        pendingRequest.current = null
        setHasPendingRequest(false)
        setCanStartNew(false)
        try { sessionStorage.removeItem(requestStorageKey) } catch { /* Never automatically start another production. */ }
        return
      }
      throw new Error('Sonuç takibi beklenenden uzun sürdü. Mevcut işi kontrol edin; ikinci üretim başlatılmadı.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Görsel üretilemedi.')
    } finally {
      setBusy(false)
    }
  }

  if (!enabled) {
    return (
      <p className="text-[11.5px] leading-relaxed text-ink-faint">
        Yapay zeka ile görsel üretme bu hesapta kapalı. Açılması için destekle iletişime geçin.
      </p>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-medium text-accent underline underline-offset-2 hover:text-accent-dim"
      >
        Yapay zeka ile görsel üret
        {selectedKit ? ` · ${selectedKit.name}` : ''}
      </button>
    )
  }

  return (
    <div className="space-y-3 rounded-md border border-hairline bg-canvas p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] font-medium text-ink">Yapay zeka ile görsel üret</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[11.5px] text-ink-muted hover:text-ink"
        >
          kapat
        </button>
      </div>

      {brandKits.length > 0 ? (
        <Field
          label="Marka kiti"
          hint={
            brandKits.length === 1
              ? 'Kayıtlı kitiniz renk ve ton için kullanılacak.'
              : 'Varsayılan kit seçili; isterseniz başka kit seçin.'
          }
        >
          <Select
            value={brandKitId}
            disabled={busy || hasPendingRequest}
            onChange={(event) => setBrandKitId(event.target.value)}
          >
            {brandKits.map((kit) => (
              <option key={kit.id} value={kit.id}>
                {kit.name}
                {kit.isDefault ? ' (varsayılan)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <p className="text-[11.5px] leading-relaxed text-ink-faint">
          Marka kiti yok — genel üretim yapılır.
          {brand ? ` · şimdilik “${brand}” adı kullanılıyor` : null}
        </p>
      )}

      <Field
        label="Ne çizilsin?"
        hint="Ürün, indirim veya atmosferi yazın. Metin balonda ayrı gider; görselde uzun yazı istemeyin."
      >
        <Input
          value={brief}
          disabled={busy || hasPendingRequest}
          onChange={(event) => setBrief(event.target.value)}
          placeholder="Kış montu, %30 indirim, sıcak mağaza vitrini"
        />
      </Field>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[140px]">
          <Field label="Stil">
            <Select value={style} disabled={busy || hasPendingRequest} onChange={(event) => setStyle(event.target.value)}>
              {STYLES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Button
          type="button"
          onClick={() => void generate()}
          disabled={busy || !requestScope || brief.trim().length < 8}
        >
          {busy ? 'Mevcut iş takip ediliyor…' : hasPendingRequest ? 'Mevcut işi kontrol et' : preview ? 'Tekrar üret' : 'Üret'}
        </Button>
      </div>

      {busy ? (
        <div className="rounded-md border border-accent/30 bg-accent-soft/40 px-3 py-2 text-[12.5px] text-accent">
          <TypewriterText text={LOADING_MESSAGES[busyTick % LOADING_MESSAGES.length] ?? ''} />
        </div>
      ) : null}

      {error ? <Notice tone="danger">{error}</Notice> : null}
      {canStartNew && !busy ? (
        <Button type="button" onClick={() => {
          pendingRequest.current = null
          setHasPendingRequest(false)
          setCanStartNew(false)
          setError(null)
          if (requestStorageKey) { try { sessionStorage.removeItem(requestStorageKey) } catch { /* Explicit reset only after server proof. */ } }
        }}>Yeni bir üretim hazırla</Button>
      ) : null}

      {preview ? (
        <div className="space-y-2">
          <p className="text-[11.5px] font-medium text-ink-faint">Önizleme</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Üretilen kampanya görseli"
            className="max-h-56 w-full max-w-xs rounded-md border border-hairline object-cover"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="accent"
              onClick={() => {
                onApply(preview)
                setOpen(false)
              }}
            >
              Bunu kullan
            </Button>
            <Button type="button" onClick={() => void generate()} disabled={busy}>
              {hasPendingRequest ? 'Mevcut işi kontrol et' : 'Başka bir tane'}
            </Button>
          </div>

          <p className="text-[11.5px] leading-relaxed text-ink-faint">
            Süre sağlayıcı ve kuyruğa göre değişir. Bağlantı kesilirse aynı iş takip edilir; belirsiz sonuç için ikinci üretim başlatılmaz.
          </p>
        </div>
      ) : null}
    </div>
  )
}
