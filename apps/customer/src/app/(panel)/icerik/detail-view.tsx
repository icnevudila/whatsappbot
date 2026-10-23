'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AccentLink, Badge, Button, Field, Input, Notice, Textarea } from '@/components/ui'
import { Icon, type IconName } from '@/components/icon'
import { CreativeGenerating } from '@/components/creative-generating'
import { CreativeDownload } from '@/components/creative-download'
import { videoFailureUserMessage } from '@/lib/creative/job-failure-message'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { STYLE_MODES, normalizeStyleMode, type CreativeStyleMode } from '@/lib/creative/style-mode'
import { detailRenderState, hasConfirmedRenderResult, renderRemainingText } from '@/lib/creative/detail-render-state'
import {
  deleteCreative,
  renameCreative,
  retryCreative,
  reconcileCreative,
  startCreativeGeneration,
  approveReviewedImage,
} from './actions'

const DETAIL_STAGES = [
  { at: 0, label: 'Renk paleti ve tasarım tonu hazırlanıyor…', detail: 'Kampanya stili ve görsel dil parametreleri ayarlanıyor' },
  { at: 10, label: 'Görsel kompozisyonu ve ürün hatları taranıyor…', detail: 'Odak ürün ambalaj formu ve tasarım çizgileri optimize ediliyor' },
  { at: 25, label: 'Kampanya konsepti ve tipografi kurgulanıyor…', detail: 'Metin hiyerarşisi ve dikkat çekici görsel yerleşim tasarlanıyor' },
  { at: 46, label: 'Yüksek çözünürlüklü sahne render ediliyor…', detail: 'Stüdyo aydınlatması, gölgeler ve arka plan detayları işleniyor' },
  { at: 68, label: 'Afiş detayları ve renk dengesi tamamlanıyor…', detail: 'Görsel kontrastı ve son rötuşlar uygulanıyor' },
  { at: 82, label: 'Son kontroller yapılıyor ve kütüphaneye aktarılıyor…', detail: 'Ultra yüksek çözünürlüklü çıktı hazırlanıyor' },
]

import { getSafeMediaUrl } from '@/lib/media-url'
export { getSafeMediaUrl }

export type DetailCreative = {
  imageReviewRequired?: boolean
  imageReconciliationRequired?: boolean
  submissionRequestKey?: string | null
  id: string
  title: string | null
  publicUrl: string | null
  status: string
  source: string
  generationType: string
  createdAt: string
  productionStartedAt?: string | null
  error: string | null
  parentId: string | null
  brandName: string | null
  format: string
  provider: string | null
  brief: string | null
  thumbnailUrl?: string | null
  cleanPublicUrl?: string | null
  recoverableImageJob?: boolean
  campaignMessage?: string | null
  artDirectionSource?: string | null
  styleMode?: CreativeStyleMode
  heroProductId?: string | null
}

export type VersionRow = {
  id: string
  title: string | null
  status: string
  generationType: string
  createdAt: string
  publicUrl: string | null
}

export function CreativeMoreMenu({
  creativeId,
  canManage,
  publicUrl,
}: {
  creativeId: string
  canManage: boolean
  publicUrl?: string | null
}) {
  const router = useRouter()
  const toast = useToast()
  const confirm = useConfirm()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!canManage && !publicUrl) return null

  const removeCreative = () => {
    void (async () => {
      const ok = await confirm({
        title: 'Görseli sil',
        confirmLabel: 'Sil',
        tone: 'danger',
      })
      if (!ok) return
      startTransition(() => {
        void deleteCreative(creativeId).then((result) => {
          if (result?.error) toast(result.error, 'danger')
          else router.push('/icerik')
        })
      })
    })()
  }

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        aria-label="Daha fazla"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
        className="wb-wa-icon-btn inline-flex size-8 items-center justify-center"
      >
        <Icon name="ellipsis" className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[11.5rem] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
        >
          {publicUrl ? (
            <CreativeDownload
              creativeId={creativeId} role="menuitem"
              className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
              onStarted={() => setOpen(false)}
            />
          ) : null}
          {canManage ? (
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-danger hover:bg-canvas disabled:opacity-50"
              onClick={() => {
                setOpen(false)
                removeCreative()
              }}
            >
              <Icon name="trash" className="size-4" />
              Sil
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function CreativeTitleEdit({ id, title }: { id: string; title: string }) {
  const router = useRouter()
  const toast = useToast()
  const titleId = useId()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(title)
  const [pending, startTransition] = useTransition()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) setValue(title)
  }, [open, title])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, pending])

  const close = () => {
    if (!pending) setOpen(false)
  }

  const save = () => {
    const next = value.trim()
    if (!next || pending) return
    const formData = new FormData()
    formData.set('id', id)
    formData.set('title', next)
    startTransition(() => {
      void renameCreative(formData).then((result) => {
        if (result?.error) {
          toast(result.error, 'danger')
          return
        }
        toast(result?.ok ?? 'Ad güncellendi.', 'success')
        setOpen(false)
        router.refresh()
      })
    })
  }

  return (
    <>
      <button
        type="button"
        aria-label="Görsel adını düzenle"
        title="Düzenle"
        onClick={() => setOpen(true)}
        className="inline-flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-surface-raised hover:text-ink"
      >
        <Icon name="edit" className="size-4" />
      </button>
      {open && mounted
        ? createPortal(
            <div className="wb-modal-root" role="presentation">
              <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={close} />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                className="wb-modal-panel"
              >
                <h2 id={titleId} className="wb-modal-title">
                  Görsel adını düzenle
                </h2>
                <p className="wb-modal-desc">Kütüphanede ve kampanyada bu ad görünür.</p>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault()
                    save()
                  }}
                >
                  <Field label="Görsel adı">
                    <Textarea
                      name="title"
                      rows={4}
                      value={value}
                      maxLength={180}
                      onChange={(event) => setValue(event.target.value)}
                      autoFocus
                    />
                  </Field>
                  <div className="wb-modal-actions">
                    <Button type="button" variant="quiet" disabled={pending} onClick={close}>
                      Vazgeç
                    </Button>
                    <Button type="submit" variant="accent" disabled={pending || !value.trim()}>
                      {pending ? 'Kaydediliyor…' : 'Kaydet'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

export function CreativeDetail({
  orgId,
  creative,
  versions,
  canManage,
  openRevise,
}: {
  orgId: string
  creative: DetailCreative
  versions: VersionRow[]
  canManage: boolean
  openRevise?: boolean
}) {
  const router = useRouter()
  const [instruction, setInstruction] = useState('')
  const [variationStyleMode, setVariationStyleMode] = useState<'inherit' | CreativeStyleMode>('inherit')
  const [variationInstruction, setVariationInstruction] = useState('')
  const variationDraftKey = `wa.customer.creative-variation.v1.${orgId}.${creative.id}`
  const [variationDraftReady, setVariationDraftReady] = useState<string | null>(null)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setVariationInstruction(localStorage.getItem(variationDraftKey) || '')
        const savedStyle = localStorage.getItem(`${variationDraftKey}.style`)
        setVariationStyleMode(savedStyle && savedStyle !== 'inherit' ? normalizeStyleMode(savedStyle) : 'inherit')
      }
      catch { setVariationInstruction('') }
      setVariationDraftReady(variationDraftKey)
    })
    return () => cancelAnimationFrame(frame)
  }, [variationDraftKey])
  useEffect(() => {
    if (variationDraftReady !== variationDraftKey) return
    try {
      localStorage.setItem(variationDraftKey, variationInstruction)
      localStorage.setItem(`${variationDraftKey}.style`, variationStyleMode)
    }
    catch { /* Keep the editable draft usable when storage is unavailable. */ }
  }, [variationDraftReady, variationDraftKey, variationInstruction, variationStyleMode])
  useEffect(() => {
    if (!creative.submissionRequestKey) return
    try {
      const key = `wa.customer.creative-studio.v2.${orgId}.submission.image`
      const saved = JSON.parse(localStorage.getItem(key) || 'null')
      if (saved?.id === creative.submissionRequestKey) localStorage.removeItem(key)
    } catch { /* persisted creative proves acceptance even when storage is unavailable */ }
  }, [creative.submissionRequestKey, orgId])
  type ServerProgressInfo = {
    elapsedSeconds: number
    remainingSeconds: number
    progressPercent: number
    stage: string
    stageLabel: string
    stageDetail: string
  }

  const [reviseOpen, setReviseOpen] = useState(Boolean(openRevise))
  const [revisionCopy, setRevisionCopy] = useState({ headline: '', supporting: '', cta: '' })
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const confirm = useConfirm()
  const toast = useToast()
  const [tick, setTick] = useState(0)
  const [pending, startTransition] = useTransition()
  const running = creative.status === 'pending' || creative.status === 'rendering'
  const kicked = useRef(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [busyRender, setBusyRender] = useState(false)
  const [livePublicUrl, setLivePublicUrl] = useState<string | null>(creative.publicUrl)
  const [liveThumbnailUrl, setLiveThumbnailUrl] = useState<string | null>(creative.thumbnailUrl ?? null)
  const [serverProgress, setServerProgress] = useState<ServerProgressInfo | null>(null)

  const displayPublicUrl = livePublicUrl || creative.publicUrl
  const displayThumbnailUrl = liveThumbnailUrl || creative.thumbnailUrl
  const renderState = detailRenderState({ status: creative.status, publicUrl: creative.publicUrl, error: creative.error, livePublicUrl, localError, busyRender })
  const isReady = renderState.ready
  const shownError = renderState.error
  const spinning = renderState.spinning

  async function requestRender(): Promise<{
    error: string | null
    pending: boolean
    ready?: boolean
    publicUrl?: string | null
    thumbnailUrl?: string | null
    retryAfterSeconds?: number
    progressInfo?: ServerProgressInfo | null
  }> {
    const response = await fetch('/api/icerik/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: creative.id }),
      signal: AbortSignal.timeout(120_000),
    })
    const json = (await response.json().catch(() => null)) as {
      ok?: boolean
      pending?: boolean
      ready?: boolean
      needsReview?: boolean
      publicUrl?: string | null
      thumbnailUrl?: string | null
      retryAfterSeconds?: number
      progressInfo?: ServerProgressInfo | null
      error?: string
    } | null
    if (!response.ok || json?.ok === false || json?.error) {
      return { error: isVideo ? videoFailureUserMessage(json?.error) : json?.error ?? 'Görsel üretilemedi.', pending: false }
    }
    if (json?.pending || response.status === 202) {
      return {
        error: null,
        pending: true,
        retryAfterSeconds: json?.retryAfterSeconds ?? 3,
        progressInfo: json?.progressInfo ?? null,
      }
    }
    if (json?.needsReview) return isVideo
      ? {error:'Video dosyası doğrulanamadı veya bir sorun tespit edildi. Kampanyada kullanmadan önce yeniden oluşturun.',pending:false}
      : { error: null, pending: false, publicUrl: json.publicUrl }
    if (!hasConfirmedRenderResult({ ready: json?.ready, publicUrl: json?.publicUrl })) {
      return { error: null, pending: true, retryAfterSeconds: 5 }
    }
    return {
      error: null,
      pending: false,
      ready: true,
      publicUrl: json?.publicUrl || null,
      thumbnailUrl: json?.thumbnailUrl || null,
    }
  }

  useEffect(() => {
    if (creative.status === 'ready' || creative.status === 'failed' || creative.status === 'needs_review') {
      setBusyRender(false)
      setLocalError(null)
      setServerProgress(null)
    }
  }, [creative.status])

  useEffect(() => {
    if (!spinning) {
      setTick(0)
      return
    }
    const timer = setInterval(() => {
      setTick(Math.max(0, Math.floor((Date.now() - Date.parse(creative.productionStartedAt || creative.createdAt)) / 1000)) || 0)
      setServerProgress((prev) => {
        if (!prev) return null
        return {
          ...prev,
          elapsedSeconds: prev.elapsedSeconds + 1,
          remainingSeconds: Math.max(0, prev.remainingSeconds - 1),
        }
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [spinning, creative.productionStartedAt, creative.createdAt])

  const shouldObserveRender = creative.status === 'pending' || creative.status === 'rendering' ||
    Boolean(creative.status === 'failed' && creative.recoverableImageJob)
  useEffect(() => {
    if (!canManage || !shouldObserveRender) return
    if (kicked.current) return
    setBusyRender(true)
    setLocalError(null)

    let isMounted = true
    let pollTimer: ReturnType<typeof setTimeout> | null = null
    const startTime = Date.now()
    const SLOW_POLL_AFTER_MS = 6 * 60 * 1000

    async function pollLoop() {
      if (!isMounted) return
      try {
        const res = await requestRender()
        if (!isMounted) return

        if (res.error) {
          setLocalError(res.error)
          setBusyRender(false)
          router.refresh()
          return
        }

        if (res.progressInfo) {
          setServerProgress(res.progressInfo)
        }

        if (res.ready || res.publicUrl) {
          if (res.publicUrl) setLivePublicUrl(res.publicUrl)
          if (res.thumbnailUrl) setLiveThumbnailUrl(res.thumbnailUrl)
          setServerProgress(null)
          setLocalError(null)
          setBusyRender(false)
          router.refresh()
          return
        }

        if (res.pending) {
          if (!isVideo && Date.now() - startTime > 5 * 60 * 1000) {
            setBusyRender(false)
            setLocalError('Görsel üretimi durumu doğrulanamıyor, işlem inceleniyor. Çift ücretlendirme yapılmadı.')
            router.refresh()
            return
          }
          const delay = (res.retryAfterSeconds || 3) * 1000
          pollTimer = setTimeout(pollLoop, Math.max(Date.now() - startTime > SLOW_POLL_AFTER_MS ? 15000 : 2500, delay))
        } else {
          setServerProgress(null)
          setLocalError(null)
          setBusyRender(false)
          router.refresh()
        }
      } catch (err: unknown) {
        if (!isMounted) return
        console.warn('[detail-view] poll error:', err)
        if (!isVideo && Date.now() - startTime > 5 * 60 * 1000) {
          setBusyRender(false)
          setLocalError('Görsel üretimi durumu doğrulanamıyor, işlem inceleniyor. Çift ücretlendirme yapılmadı.')
          router.refresh()
          return
        }
        pollTimer = setTimeout(pollLoop, Date.now() - startTime > SLOW_POLL_AFTER_MS ? 15000 : 4000)
      }
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isMounted && shouldObserveRender) {
        if (pollTimer) clearTimeout(pollTimer)
        void pollLoop()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    queueMicrotask(() => {
      if (!isMounted) return
      kicked.current = true
      void pollLoop()
    })

    return () => {
      isMounted = false
      kicked.current = false
      if (pollTimer) clearTimeout(pollTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  // A pending -> rendering refresh must not tear down the owning poll loop.
  // Cleanup releases ownership so a replay can resume the same job.
  }, [canManage, creative.id, router, shouldObserveRender])

  useEffect(() => {
    const supabase = getSupabaseBrowserClient()
    const channel = supabase
      .channel(`creative-${creative.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'creatives', filter: `id=eq.${creative.id}` },
        () => router.refresh(),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [creative.id, orgId, router])

  // Realtime yayını kapalı/gecikmiş olsa dahi Flow sonucu DB'ye yazıldığında
  // ekran kendini yeniler; kullanıcı manuel yenilemeye bağlı kalmaz.
  useEffect(() => {
    if (!running || (canManage && shouldObserveRender)) return
    const timer = window.setInterval(() => router.refresh(), 5_000)
    return () => window.clearInterval(timer)
  }, [running, canManage, shouldObserveRender, router])

  const spawn = (draft: Record<string, unknown>) => {
    const form = new FormData()
    form.set('draft', JSON.stringify(creative.format !== 'video' && draft.generationType === 'variation' && variationStyleMode !== 'inherit' ? { ...draft, styleMode: variationStyleMode } : draft))
    startTransition(async () => {
      const res = await startCreativeGeneration(null, form)
      if (res?.error) {
        toast(res.error, 'danger')
        return
      }
      if (res?.id) {
        setReviseOpen(false)
        router.push(`/icerik/${res.id}`)
      }
    })
  }

  const retryNow = () => {
    setLocalError(null)
    setBusyRender(true)
    startTransition(() => {
      void retryCreative(creative.id).then(async (result) => {
        if (result?.error) {
          setLocalError(result.error)
          setBusyRender(false)
          return
        }
        kicked.current = false
        router.refresh()
      })
    })
  }

  const isVideo =
    creative.format === 'video' ||
    Boolean(creative.publicUrl?.endsWith('.mp4')) ||
    Boolean(displayPublicUrl?.endsWith('.mp4')) ||
    Boolean(creative.publicUrl?.includes('/api/ai-media/outputs/')) ||
    Boolean(displayPublicUrl?.includes('/api/ai-media/outputs/'))
  let stageLabel = 'Sunucudan üretim sonucu bekleniyor…'
  let stageDetail = 'Çıktının hazır olduğu henüz doğrulanmadı'

  if (serverProgress && (isVideo || serverProgress.stage === 'reconciliation')) {
    stageLabel = serverProgress.stageLabel
    stageDetail = serverProgress.stageDetail
  }

  const remainingText = `Geçen süre: ${tick} sn`
  const imageStageIndex = tick < 8 ? 1 : tick < 20 ? 2 : tick < 40 ? 3 : 4

  return (
    <div className="space-y-3">
      {spinning ? (
        <div className="wb-craft-panel">
          <CreativeGenerating
            kind={isVideo ? 'video' : 'image'}
            stageIndex={isVideo ? undefined : imageStageIndex}
            title={isVideo ? 'Sinematik kampanya videonuz hazırlanıyor' : 'Görseliniz hazırlanıyor'}
            line={stageLabel}
            detail={`${stageDetail} · ${remainingText}`}
          >
            <div className="wb-craft-action">
              <AccentLink
                href="/icerik"
                className="!h-9 !rounded-full !border-0 !bg-[#00a884] !px-4 !text-[13.5px] !text-white !shadow-none hover:!bg-[#008069]"
              >
                Arka planda devam et
              </AccentLink>
            </div>
          </CreativeGenerating>
        </div>
      ) : null}

      {shownError && !spinning ? (
        <Notice tone="danger">
          <p className="text-[13.5px] font-semibold">{isVideo ? 'Video kullanıma hazır değil' : 'Görsel oluşturulamadı'}</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[13px]">{shownError}</p>
          {canManage ? (
            <Button
              type="button"
              variant="accent"
              className="wb-wa-submit mt-3"
              disabled={pending || busyRender}
              onClick={async () => {
                if (creative.imageReconciliationRequired) {
                  setBusyRender(true)
                  const res = await reconcileCreative(creative.id)
                  if (res?.error) toast(res.error, 'danger')
                  else {
                    toast(res?.ok || 'Mevcut üretimin durumu güncellendi.', 'success')
                    router.refresh()
                  }
                  setBusyRender(false)
                } else {
                  await retryNow()
                }
              }}
            >
              {creative.imageReconciliationRequired ? 'Mevcut Üretimi Kontrol Et' : 'Tekrar dene'}
            </Button>
          ) : null}
          <QuietLibrary />
        </Notice>
      ) : null}

      {creative.status === 'needs_review' ? (
        <Notice tone="warn">
          <p className="text-[13.5px] font-semibold">{isVideo ? 'Video kullanıma hazır değil' : 'Görsel inceleme bekliyor'}</p>
          <p className="mt-1 text-[13px]">{isVideo ? 'Videoda bir sorun tespit edildi veya dosya doğrulaması tamamlanamadı. Kampanyada kullanmadan önce yeniden oluşturun.' : 'Dosya oluşturuldu. Gerçek ürün, logo, metin ve ticari bilgilerin doğruluğu onaylanmadan kampanyada kullanılamaz.'}</p>
          {!isVideo && creative.imageReviewRequired && canManage && <form className="mt-3 space-y-2" action={async (form) => {
            form.set('id',creative.id)
            const result = await approveReviewedImage(form)
            if (result?.error) toast(result.error,'danger')
            else router.refresh()
          }}>
            <label className="block"><input type="checkbox" name="identity" required /> Gerçek ürünü, logoyu ve marka renklerini görselde kontrol ettim.</label>
            <label className="block"><input type="checkbox" name="commerce" required /> Fiyat, teklif, başlık ve çağrı doğru; uydurma iddia yok.</label>
            <Button type="submit">İnceledim, kampanyada kullanımını onayla</Button>
          </form>}
        </Notice>
      ) : null}

      {displayPublicUrl && (isReady || creative.status === 'needs_review') ? (
        <div className="relative overflow-visible">
          {isVideo ? (
            <div className="overflow-hidden rounded-[var(--radius-card)] border border-hairline bg-black shadow-lg">
              <video
                src={getSafeMediaUrl(displayPublicUrl)}
                poster={getSafeMediaUrl(displayThumbnailUrl || undefined)}
                controls
                autoPlay
                playsInline
                preload="auto"
                className="max-h-[640px] w-full object-contain"
              />
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                aria-label="Görseli tam boyutta aç"
                className="block w-full cursor-zoom-in rounded-[var(--radius-card)] border border-hairline bg-canvas p-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getSafeMediaUrl(displayPublicUrl)}
                  alt={creative.title ?? ''}
                  className="w-full rounded-[var(--radius-card)] object-contain"
                />
              </button>
              <DetailImageMenu creativeId={creative.id} />
              <ImageLightbox
                open={lightboxOpen}
                src={getSafeMediaUrl(displayPublicUrl) || displayPublicUrl}
                alt={creative.title ?? ''}
                onClose={() => setLightboxOpen(false)}
              />
            </>
          )}
        </div>
      ) : null}

      {creative.campaignMessage ? (
        <div className="rounded-[var(--radius-card)] border border-[#b7e4d5] bg-[#f1fbf7] p-4 text-[13px] text-[#111b21] space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-[#006b58] flex items-center gap-1.5">
              <Icon name="campaign" className="size-4 text-[#00a884]" />
              Kampanya Metni
            </span>
            <button
              type="button"
              onClick={() => {
                if (creative.campaignMessage) {
                  void navigator.clipboard.writeText(creative.campaignMessage)
                  toast('Kampanya metni panoya kopyalandı.', 'success')
                }
              }}
              className="text-[12px] font-semibold text-[#008069] hover:underline flex items-center gap-1"
            >
              <Icon name="copy" className="size-3.5" />
              Metni Kopyala
            </button>
          </div>
          <div className="font-sans leading-relaxed text-[#111b21] bg-white p-3.5 rounded-lg border border-[#d1ebd9] space-y-1">
            {creative.campaignMessage.split('\n').map((line, idx) => {
              const trimmed = line.trim()
              if (!trimmed) return <div key={idx} className="h-1.5" />
              // Main header: *Title*
              if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.slice(1, -1).includes('*')) {
                return (
                  <div key={idx} className="font-bold text-[14px] text-[#006b58] pb-0.5">
                    {trimmed.slice(1, -1)}
                  </div>
                )
              }
              // Bullet item: • *Label:* Value
              if (trimmed.startsWith('•')) {
                const rest = trimmed.slice(1).trim()
                const labelMatch = rest.match(/^\*([^*]+):\*\s*(.*)$/)
                if (labelMatch) {
                  let [, label, value] = labelMatch
                  if (label === 'Teslimat' && /taksit|kredi\s*kart|kart|peşin|havale|ödeme/i.test(value)) {
                    label = 'Ödeme/Taksit'
                  }
                  if (label === 'Fiyat') {
                    value = value.replace(/(?:^|\s)(\d+)(?=\s*(?:_|\(|$))/g, (match, digits) => {
                      const num = Number(digits)
                      return ` ${num >= 1000 ? num.toLocaleString('tr-TR') : digits} TL`
                    }).replace(/\s+/g, ' ').trim()
                  }
                  const parts = value.split(/(_[^_]+_|\([^\)]+\))/g)
                  return (
                    <div key={idx} className="flex items-start gap-2 py-0.5 text-[13px]">
                      <span className="text-[#00a884] font-bold select-none">•</span>
                      <div>
                        <span className="font-semibold text-[#111b21]">{label}: </span>
                        <span className="text-[#3b4a54]">
                          {parts.map((p, pIdx) => {
                            const trimmedPart = p.trim()
                            if ((trimmedPart.startsWith('_') && trimmedPart.endsWith('_')) || (trimmedPart.startsWith('(') && trimmedPart.endsWith(')'))) {
                              const inner = trimmedPart.replace(/[_()]/g, '').trim()
                              return <span key={pIdx} className="text-[#667781] text-[12px] italic"> ({inner})</span>
                            }
                            return p
                          })}
                        </span>
                      </div>
                    </div>
                  )
                }
                return (
                  <div key={idx} className="flex items-start gap-2 py-0.5 text-[13px] text-[#3b4a54]">
                    <span className="text-[#00a884] font-bold select-none">•</span>
                    <span>{rest}</span>
                  </div>
                )
              }
              // Subheading: *Kampanya Detayları:*
              if (trimmed.startsWith('*') && trimmed.endsWith('*')) {
                return (
                  <div key={idx} className="font-semibold text-[13px] text-[#006b58] pt-1.5">
                    {trimmed.slice(1, -1)}
                  </div>
                )
              }
              return (
                <div key={idx} className="text-[13px] text-[#3b4a54]">
                  {trimmed}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {displayPublicUrl && isReady ? (
        <div className={`grid gap-2 ${canManage ? 'grid-cols-2' : ''}`}>
          {canManage ? (
            <Button
              type="button"
              variant="quiet"
              className="w-full !rounded-full"
              onClick={() => setReviseOpen(true)}
            >
              <Icon name="sparkles" className="size-4" />
              AI ile revize et
            </Button>
          ) : null}
          <AccentLink
            href={`/kampanyalar/yeni?creative_id=${encodeURIComponent(creative.id)}`}
            className="w-full !rounded-full !border-0 !bg-[#00a884] !text-white !shadow-none hover:!bg-[#008069]"
          >
            <Icon name="campaign" className="size-4" />
            Kampanyada kullan
          </AccentLink>
        </div>
      ) : null}

      <p className="text-[12.5px] text-ink-muted">
        {new Date(creative.createdAt).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })} · {creative.format}
        {creative.provider ? ` · ${creative.provider}` : ''}
        {creative.generationType ? ` · ${creative.generationType}` : ''}
        {creative.format !== 'video' && creative.styleMode ? ` · ${STYLE_MODES.find(mode => mode.id === creative.styleMode)?.label}` : ''}
        {creative.artDirectionSource === 'AI_PRECOMPUTED' ? ' · AI Planlama' : creative.artDirectionSource === 'DETERMINISTIC_FALLBACK' ? ' · Tasarım Kılavuzu' : ''}
      </p>
      {creative.brief && creative.brief !== creative.title ? (
        <p className="text-[13px]">{creative.brief}</p>
      ) : null}

      {isReady && canManage ? (
        <>
          <ReviseModal
            open={reviseOpen}
            pending={pending}
            instruction={instruction}
            copy={revisionCopy}
            onCopy={(field, value) => setRevisionCopy(current => ({ ...current, [field]: value }))}
            previewUrl={displayPublicUrl}
            onClose={() => setReviseOpen(false)}
            onInstruction={setInstruction}
            onSubmit={({ keepBaseScene }) =>
              spawn({
                requestKey: crypto.randomUUID(),
                brief: creative.brief || instruction.trim(),
                style: 'auto',
                formatId: formatToId(creative.format),
                textDensity: 'balanced',
                useLogo: true,
                productIds: creative.heroProductId ? [creative.heroProductId] : [],
                phoneIds: [],
                socialIds: [],
                labels: [],
                parentId: creative.id,
                baseCreativeId: keepBaseScene ? creative.id : null,
                keepBaseScene,
                lockCopyOverlay: keepBaseScene,
                generationType: 'revision',
                instruction: instruction.trim() || 'Yalnız onaylı reklam metinlerini değiştir; mevcut sahne, kadraj, ışık, insan, ürün ve logo aynen korunsun.',
                ...(revisionCopy.headline.trim() ? {customHeadline: revisionCopy.headline.trim()} : {}),
                ...(revisionCopy.supporting.trim() ? {customSupporting: revisionCopy.supporting.trim()} : {}),
                ...(revisionCopy.cta.trim() ? {cta: revisionCopy.cta.trim()} : {}),
              })
            }
          />
        </>
      ) : null}

      {isReady && canManage ? (
        <section className="space-y-3 rounded-[var(--radius-card)] border border-hairline bg-surface p-4">
          <div className="space-y-1">
            <h2 className="text-[14px] font-bold text-[#111b21] flex items-center gap-1.5">
              <Icon name="sparkles" className="size-4 text-[#008069]" />
              <span>Akıllı Varyasyon</span>
            </h2>
            <p className="text-[11.5px] text-[#667781]">
              Prompt yazmadan tek tıkla yeni bir kompozisyon deneyin veya mevcut yönü koruyarak tasarımı geliştirin.
            </p>
          </div>

          {creative.format !== 'video' ? (
            <div className="space-y-1.5">
              <label className="block text-[12px] font-semibold text-[#111b21]">
                Reklam Modu / Tarzı
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => setVariationStyleMode('inherit')}
                  className={`rounded-lg border px-2.5 py-1.5 text-center text-[11px] font-medium transition-all ${
                    variationStyleMode === 'inherit'
                      ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-bold ring-1 ring-[#008069]'
                      : 'border-[#e9edef] bg-white text-[#667781] hover:text-[#111b21]'
                  }`}
                >
                  Mevcut Mod
                </button>
                {STYLE_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setVariationStyleMode(mode.id)}
                    className={`rounded-lg border px-2.5 py-1.5 text-center text-[11px] font-medium transition-all ${
                      variationStyleMode === mode.id
                        ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-bold ring-1 ring-[#008069]'
                        : 'border-[#e9edef] bg-white text-[#667781] hover:text-[#111b21]'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="variation-instruction-input" className="block text-[12px] font-semibold text-[#111b21]">
              Bu tasarımda neyi değiştirelim? <span className="font-normal text-[#667781]">(İsteğe bağlı)</span>
            </label>
            <Textarea
              id="variation-instruction-input"
              rows={2}
              value={variationInstruction}
              onChange={(e) => setVariationInstruction(e.target.value)}
              placeholder="Örn: Kadın işletme sahibi ve farklı cihazlarda Mesajify arayüzü... (Boş bırakabilirsiniz)"
              className="text-[12.5px] leading-relaxed bg-white"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
            <Button
              type="button"
              variant="quiet"
              disabled={pending}
              className="h-9 text-[12px] px-3 font-semibold flex items-center justify-center gap-1.5 border border-[#c3c7c9] hover:bg-[#f0f2f5] rounded-lg"
              onClick={() => setReviseOpen(true)}
            >
              <Icon name="edit" className="size-3.5 text-[#667781]" />
              <span>Bu Tasarımı Düzenle</span>
            </Button>

            <Button
              type="button"
              variant="quiet"
              disabled={pending}
              className="h-9 text-[12px] px-3.5 font-semibold flex items-center justify-center gap-1.5 border border-[#008069]/40 bg-[#e7f8f2]/40 text-[#008069] hover:bg-[#e7f8f2] rounded-lg"
              onClick={() =>
                spawn({
                  requestKey: crypto.randomUUID(),
                  brief: creative.brief || creative.title || 'Kampanya görseli varyasyonu',
                  style: 'auto',
                  formatId: formatToId(creative.format),
                  textDensity: 'balanced',
                  useLogo: true,
                  productIds: creative.heroProductId ? [creative.heroProductId] : [],
                  phoneIds: [],
                  socialIds: [],
                  labels: [],
                  parentId: creative.id,
                  baseCreativeId: creative.id,
                  generationType: 'variation',
                  variationMode: 'new_composition',
                  instruction: variationInstruction.trim(),
                })
              }
            >
              <Icon name="refresh" className="size-3.5 text-[#008069]" />
              <span>Başka Tasarım Dene</span>
            </Button>

            <Button
              type="button"
              disabled={pending}
              className="!bg-[#008069] !text-white hover:!bg-[#006b58] h-9 text-[12px] px-4 font-semibold flex items-center justify-center gap-1.5 rounded-lg shadow-xs"
              onClick={() =>
                spawn({
                  requestKey: crypto.randomUUID(),
                  brief: creative.brief || creative.title || 'Kampanya görseli varyasyonu',
                  style: 'auto',
                  formatId: formatToId(creative.format),
                  textDensity: 'balanced',
                  useLogo: true,
                  productIds: creative.heroProductId ? [creative.heroProductId] : [],
                  phoneIds: [],
                  socialIds: [],
                  labels: [],
                  parentId: creative.id,
                  baseCreativeId: creative.id,
                  generationType: 'variation',
                  variationMode: 'enhance',
                  instruction: variationInstruction.trim(),
                })
              }
            >
              <Icon name="sparkles" className="size-3.5" />
              <span>Bu Tasarımı Geliştir</span>
            </Button>
          </div>
        </section>
      ) : null}

      {versions.length > 1 ? (
        <section>
          <h2 className="mb-2 text-[14px] font-bold">Versiyonlar</h2>
          <ol className="space-y-2">
            {versions.map((row, index) => (
              <li key={row.id} className="group relative">
                <div
                  className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 ${
                    row.id === creative.id ? 'border-accent bg-accent-soft/40' : 'border-hairline bg-surface'
                  }`}
                >
                  <Link
                    href={`/icerik/${row.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    {row.publicUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getSafeMediaUrl(row.publicUrl)} alt="" className="size-12 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="size-12 shrink-0 rounded bg-canvas" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">
                        v{versions.length - index} {row.title || typeLabel(row.generationType)}
                      </span>
                      <span className="text-[12px] text-ink-muted">
                        {new Date(row.createdAt).toLocaleString('tr-TR')}
                      </span>
                    </span>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge>{row.status === 'ready' ? 'Hazır' : row.status}</Badge>
                    {canManage ? (
                      <button
                        type="button"
                        aria-label={`v${versions.length - index} sil`}
                        title="Bu versiyonu sil"
                        className="inline-flex size-7 items-center justify-center rounded text-ink-muted opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          void (async () => {
                            const ok = await confirm({
                              title: `v${versions.length - index} versiyonunu sil`,
                              confirmLabel: 'Sil',
                              tone: 'danger',
                            })
                            if (!ok) return
                            startTransition(() => {
                              void deleteCreative(row.id).then((result) => {
                                if (result?.error) {
                                  toast(result.error, 'danger')
                                } else {
                                  toast('Versiyon silindi.', 'success')
                                  if (row.id === creative.id) {
                                    const nextTarget = versions.find((v) => v.id !== row.id)
                                    if (nextTarget) router.push(`/icerik/${nextTarget.id}`)
                                    else router.push('/icerik')
                                  } else {
                                    router.refresh()
                                  }
                                }
                              })
                            })
                          })()
                        }}
                      >
                        <Icon name="trash" className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  )
}

function QuietLibrary() {
  return (
    <p className="mt-4">
      <AccentLink href="/icerik">Kütüphaneye dön</AccentLink>
    </p>
  )
}

function ImageLightbox({
  open,
  src,
  alt,
  onClose,
}: {
  open: boolean
  src: string
  alt: string
  onClose: () => void
}) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation" style={{ padding: 0 }}>
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        onClick={onClose}
        style={{ background: 'rgba(8, 10, 16, 0.88)' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex h-full w-full max-h-none max-w-none cursor-zoom-out items-center justify-center p-3 sm:p-8"
        onClick={onClose}
      >
        <p id={titleId} className="sr-only">
          {alt || 'Görsel önizleme'}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-3 top-3 z-[2] inline-flex size-9 items-center justify-center rounded-full border border-white/20 bg-black/50 text-white shadow-sm hover:bg-black/70 sm:right-5 sm:top-5"
        >
          <Icon name="close" className="size-4" />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={(event) => event.stopPropagation()}
          className="max-h-[min(100dvh,100%)] max-w-full cursor-default object-contain"
        />
      </div>
    </div>,
    document.body,
  )
}

function DetailImageMenu({ creativeId }: { creativeId: string }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="absolute right-2 top-2 z-20" ref={menuRef}>
      <button
        type="button"
        aria-label="Görsel işlemleri"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex size-8 items-center justify-center rounded-full border border-hairline bg-surface/95 text-ink shadow-sm backdrop-blur-sm hover:bg-surface"
      >
        <Icon name="ellipsis" className="size-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 min-w-[11.5rem] rounded-md border border-hairline bg-surface p-1 shadow-[var(--shadow-md)]"
        >
          <CreativeDownload
            creativeId={creativeId} role="menuitem"
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
            onStarted={() => setOpen(false)}
          />
        </div>
      ) : null}
    </div>
  )
}

function ReviseModal({
  open,
  pending,
  instruction,
  copy,
  onCopy,
  previewUrl,
  onClose,
  onInstruction,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  instruction: string
  copy: { headline: string; supporting: string; cta: string }
  onCopy: (field: 'headline' | 'supporting' | 'cta', value: string) => void
  previewUrl: string | null
  onClose: () => void
  onInstruction: (value: string) => void
  onSubmit: (options: { keepBaseScene: boolean }) => void
}) {
  const titleId = useId()
  const [keepBaseScene, setKeepBaseScene] = useState(false)
  const [mounted, setMounted] = useState(false)
  const hasCopyChange = Object.values(copy).some(value => value.trim().length > 0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !pending) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, pending, onClose])

  if (!open || !mounted) return null

  return createPortal(
    <div className="wb-modal-root" role="presentation">
      <button
        type="button"
        className="wb-modal-backdrop"
        aria-label="Kapat"
        disabled={pending}
        onClick={() => {
          if (!pending) onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="wb-modal-panel wb-wa-modal"
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="wb-modal-title">
            AI ile revize et
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded p-1 text-sm text-ink-muted hover:bg-canvas hover:text-ink"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>
        <p className="wb-modal-desc">
          Mevcut görsel korunur. Yeni bir revizyon üretilir.
        </p>

        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="mt-3 max-h-36 w-full rounded-md border border-hairline bg-canvas object-contain"
          />
        ) : null}

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            if ((!hasCopyChange && instruction.trim().length < 4) || pending) return
            onSubmit({ keepBaseScene: keepBaseScene || hasCopyChange })
          }}
        >
          <Field label="Neyi değiştirmek istiyorsunuz?" hint="Kısa ve net yazın: ne kalsın, ne değişsin.">
            <Textarea
              rows={3}
              value={instruction}
              onChange={(event) => onInstruction(event.target.value)}
              placeholder="Başlığı kısalt; sahneyi, insanı, ürünü ve orijinal logoyu koru."
              autoFocus
            />
          </Field>

          <div className="rounded-lg border border-hairline bg-canvas/60 p-2.5 space-y-1.5">
            <p className="text-[12px] font-semibold text-ink">Sahne Kurgusu</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setKeepBaseScene(true)}
                className={`rounded border p-2 text-left transition-all ${
                  keepBaseScene
                    ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-semibold ring-1 ring-[#008069]'
                    : 'border-hairline bg-surface text-ink-muted hover:border-[#008069]/30'
                }`}
              >
                <span className="block text-[12px] font-bold">🔒 Sahneyi Koru</span>
                <span className="block text-[10.5px] opacity-80 mt-0.5">Aynı kompozisyonda sadece metin veya küçük detay değiştirir.</span>
              </button>
              <button
                type="button"
                onClick={() => setKeepBaseScene(false)}
                className={`rounded border p-2 text-left transition-all ${
                  !keepBaseScene
                    ? 'border-[#008069] bg-[#e7f8f2] text-[#008069] font-semibold ring-1 ring-[#008069]'
                    : 'border-hairline bg-surface text-ink-muted hover:border-[#008069]/30'
                }`}
              >
                <span className="block text-[12px] font-bold">✨ Yeni Sahne / Açı</span>
                <span className="block text-[10.5px] opacity-80 mt-0.5">Eski sahneye takılmaz, taze kompozisyon kurar.</span>
              </button>
            </div>
          </div>

          <details className="rounded-lg border border-hairline p-3">
            <summary className="cursor-pointer text-sm font-medium focus-visible:outline-2">Reklam metinlerini doğrudan değiştir (isteğe bağlı)</summary>
            <p className="mt-2 text-xs text-ink-muted">Boş bıraktığınız metinler aynı kalır. Yeni metinler görselde ve kampanya kaydında birlikte kullanılır.</p>
            <div className="mt-3 space-y-3">
              <Field label="Yeni ana başlık">
                <Input value={copy.headline} onChange={event => onCopy('headline',event.target.value)} disabled={pending} maxLength={180} />
              </Field>
              <Field label="Yeni kısa açıklama">
                <Input value={copy.supporting} onChange={event => onCopy('supporting',event.target.value)} disabled={pending} maxLength={300} />
              </Field>
              <Field label="Yeni buton yazısı">
                <Input value={copy.cta} onChange={event => onCopy('cta',event.target.value)} disabled={pending} maxLength={60} />
              </Field>
            </div>
          </details>

          <div className="wb-modal-actions">
            <Button type="button" variant="quiet" disabled={pending} onClick={onClose}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="wb-wa-submit"
              disabled={pending || (!hasCopyChange && instruction.trim().length < 4)}
            >
              <Icon name="sparkles" className="size-4" />
              {pending ? 'Üretiliyor…' : 'Revizyon üret'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}

function formatToId(format: string) {
  if (format === 'story') return 'story'
  if (format === 'feed') return 'feed'
  if (format === 'banner') return 'banner'
  return 'wa'
}

function typeLabel(type: string) {
  if (type === 'revision') return 'Revizyon'
  if (type === 'variation') return 'Varyasyon'
  if (type === 'derived') return 'Türetme'
  if (type === 'upload') return 'Yükleme'
  return 'İlk üretim'
}
