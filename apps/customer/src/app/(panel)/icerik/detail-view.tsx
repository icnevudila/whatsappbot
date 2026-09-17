'use client'

import { useEffect, useId, useRef, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AccentLink, Badge, Button, Field, Notice, Textarea } from '@/components/ui'
import { Icon, type IconName } from '@/components/icon'
import { CreativeGenerating } from '@/components/creative-generating'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { VARIATION_PRESETS } from '@/lib/creative/types'
import {
  deleteCreative,
  renameCreative,
  retryCreative,
  startCreativeGeneration,
} from './actions'

const DETAIL_STAGES = [
  { at: 0, label: 'Renk paleti ve tasarım tonu hazırlanıyor…', detail: 'Kampanya stili ve görsel dil parametreleri ayarlanıyor' },
  { at: 10, label: 'Görsel kompozisyonu ve ürün hatları taranıyor…', detail: 'Odak ürün ambalaj formu ve tasarım çizgileri optimize ediliyor' },
  { at: 25, label: 'Kampanya konsepti ve tipografi kurgulanıyor…', detail: 'Metin hiyerarşisi ve dikkat çekici görsel yerleşim tasarlanıyor' },
  { at: 46, label: 'Yüksek çözünürlüklü sahne render ediliyor…', detail: 'Stüdyo aydınlatması, gölgeler ve arka plan detayları işleniyor' },
  { at: 68, label: 'Afiş detayları ve renk dengesi tamamlanıyor…', detail: 'Görsel kontrastı ve son rötuşlar uygulanıyor' },
  { at: 82, label: 'Son kontroller yapılıyor ve kütüphaneye aktarılıyor…', detail: 'Ultra yüksek çözünürlüklü çıktı hazırlanıyor' },
]

const VARIATION_ICONS: Record<(typeof VARIATION_PRESETS)[number]['id'], IconName> = {
  similar: 'copy',
  minimal: 'circle',
  premium: 'gem',
  bold: 'zap',
  layout: 'overview',
}

export type DetailCreative = {
  id: string
  title: string | null
  publicUrl: string | null
  status: string
  source: string
  generationType: string
  createdAt: string
  error: string | null
  parentId: string | null
  brandName: string | null
  format: string
  provider: string | null
  brief: string | null
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
            <a
              role="menuitem"
              href={publicUrl}
              download=""
              className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
              onClick={() => setOpen(false)}
            >
              <Icon name="download" className="size-4 text-ink-muted" />
              İndir
            </a>
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
  const [reviseOpen, setReviseOpen] = useState(Boolean(openRevise))
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [tick, setTick] = useState(0)
  const [pending, startTransition] = useTransition()
  const running = creative.status === 'pending' || creative.status === 'rendering'
  const kicked = useRef(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [busyRender, setBusyRender] = useState(false)
  const shownError = localError || (creative.status === 'failed' ? creative.error : null)
  const spinning = (running && !localError) || busyRender

  async function requestRender() {
    const response = await fetch('/api/icerik/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: creative.id }),
      signal: AbortSignal.timeout(180_000),
    })
    const json = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      return json?.error ?? 'Görsel üretilemedi.'
    }
    return null
  }

  useEffect(() => {
    if (creative.status === 'ready') setLocalError(null)
  }, [creative.status])

  useEffect(() => {
    if (!spinning) {
      setTick(0)
      return
    }
    const timer = setInterval(() => setTick((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [spinning])

  useEffect(() => {
    if (!canManage) return
    if (creative.status !== 'pending' && creative.status !== 'rendering') return
    if (kicked.current) return
    kicked.current = true
    setBusyRender(true)
    setLocalError(null)
    void requestRender()
      .then((error) => {
        if (error) setLocalError(error)
        router.refresh()
      })
      .catch((error: unknown) => {
        const timedOut = error instanceof Error && error.name === 'TimeoutError'
        setLocalError(timedOut ? 'Üretim zaman aşımına uğradı.' : 'Üretim başlatılamadı.')
      })
      .finally(() => setBusyRender(false))
  }, [canManage, creative.id, creative.status, router])

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

  const spawn = (draft: Record<string, unknown>) => {
    const form = new FormData()
    form.set('draft', JSON.stringify(draft))
    startTransition(() => {
      void startCreativeGeneration(null, form)
    })
  }

  const retryNow = () => {
    setLocalError(null)
    setBusyRender(true)
    kicked.current = true
    startTransition(() => {
      void retryCreative(creative.id).then(async (result) => {
        if (result?.error) {
          setLocalError(result.error)
          setBusyRender(false)
          return
        }
        try {
          const error = await requestRender()
          if (error) setLocalError(error)
        } catch (error) {
          const timedOut = error instanceof Error && error.name === 'TimeoutError'
          setLocalError(timedOut ? 'Üretim zaman aşımına uğradı.' : 'Üretim başlatılamadı.')
        }
        router.refresh()
        setBusyRender(false)
      })
    })
  }

  const targetDuration = 78
  const remainingSeconds = Math.max(5, targetDuration - tick)
  const remainingText =
    tick >= targetDuration
      ? 'Birkaç saniye içinde tamamlanıyor'
      : `Tahmini kalan süre: ~${remainingSeconds} sn`
  let currentStage = DETAIL_STAGES[0]
  for (let i = DETAIL_STAGES.length - 1; i >= 0; i--) {
    if (tick >= DETAIL_STAGES[i].at) {
      currentStage = DETAIL_STAGES[i]
      break
    }
  }

  return (
    <div className="space-y-3">
      {spinning ? (
        <div className="wb-craft-panel">
          <CreativeGenerating
            line={currentStage.label}
            detail={`${currentStage.detail} · ${remainingText}`}
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
          <p className="text-[13.5px] font-semibold">Görsel oluşturulamadı</p>
          <p className="mt-1 whitespace-pre-wrap break-words text-[13px]">{shownError}</p>
          {canManage ? (
            <Button
              type="button"
              variant="accent"
              className="wb-wa-submit mt-3"
              disabled={pending || busyRender}
              onClick={retryNow}
            >
              Tekrar dene
            </Button>
          ) : null}
          <QuietLibrary />
        </Notice>
      ) : null}

      {creative.publicUrl && creative.status === 'ready' ? (
        <div className="relative overflow-visible">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Görseli tam boyutta aç"
            className="block w-full cursor-zoom-in rounded-[var(--radius-card)] border border-hairline bg-canvas p-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creative.publicUrl}
              alt={creative.title ?? ''}
              className="w-full rounded-[var(--radius-card)] object-contain"
            />
          </button>
          <DetailImageMenu publicUrl={creative.publicUrl} />
          <ImageLightbox
            open={lightboxOpen}
            src={creative.publicUrl}
            alt={creative.title ?? ''}
            onClose={() => setLightboxOpen(false)}
          />
        </div>
      ) : null}

      {creative.publicUrl && creative.status === 'ready' ? (
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
            href={`/kampanyalar/yeni?gorsel=${encodeURIComponent(creative.publicUrl)}`}
            className="w-full !rounded-full !border-0 !bg-[#00a884] !text-white !shadow-none hover:!bg-[#008069]"
          >
            <Icon name="campaign" className="size-4" />
            Kampanyada kullan
          </AccentLink>
        </div>
      ) : null}

      <p className="text-[12.5px] text-ink-muted">
        {new Date(creative.createdAt).toLocaleString('tr-TR')} · {creative.format}
        {creative.provider ? ` · ${creative.provider}` : ''}
        {creative.generationType ? ` · ${creative.generationType}` : ''}
      </p>
      {creative.brief && creative.brief !== creative.title ? (
        <p className="text-[13px]">{creative.brief}</p>
      ) : null}

      {creative.status === 'ready' && canManage ? (
        <>
          <ReviseModal
            open={reviseOpen}
            pending={pending}
            instruction={instruction}
            previewUrl={creative.publicUrl}
            onClose={() => setReviseOpen(false)}
            onInstruction={setInstruction}
            onSubmit={() =>
              spawn({
                requestKey: crypto.randomUUID(),
                brief: creative.brief || instruction.trim(),
                style: 'auto',
                formatId: formatToId(creative.format),
                textDensity: 'balanced',
                useLogo: true,
                productIds: [],
                phoneIds: [],
                socialIds: [],
                labels: [],
                parentId: creative.id,
                baseCreativeId: creative.id,
                generationType: 'revision',
                instruction: instruction.trim(),
              })
            }
          />
        </>
      ) : null}

      {creative.status === 'ready' && canManage ? (
        <section className="space-y-2 rounded-[var(--radius-card)] border border-hairline bg-surface p-3.5">
          <h2 className="text-[14px] font-bold">Varyasyon oluştur</h2>
          <div className="flex flex-wrap gap-1.5">
            {VARIATION_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                variant="quiet"
                className="h-8 text-[12.5px]"
                disabled={pending}
                onClick={() =>
                  spawn({
                    requestKey: crypto.randomUUID(),
                    brief: creative.brief || creative.title || 'Kampanya görseli varyasyonu',
                    style: preset.id === 'minimal' ? 'minimal' : preset.id === 'premium' ? 'premium' : 'auto',
                    formatId: formatToId(creative.format),
                    textDensity: 'balanced',
                    useLogo: true,
                    productIds: [],
                    phoneIds: [],
                    socialIds: [],
                    labels: [],
                    parentId: creative.id,
                    baseCreativeId: creative.id,
                    generationType: 'variation',
                    variationPreset: preset.id,
                  })
                }
              >
                <Icon name={VARIATION_ICONS[preset.id]} className="size-3.5" />
                {preset.label}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      {versions.length > 1 ? (
        <section>
          <h2 className="mb-2 text-[14px] font-bold">Versiyonlar</h2>
          <ol className="space-y-2">
            {versions.map((row, index) => (
              <li key={row.id}>
                <Link
                  href={`/icerik/${row.id}`}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                    row.id === creative.id ? 'border-accent bg-accent-soft/40' : 'border-hairline bg-surface'
                  }`}
                >
                  {row.publicUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.publicUrl} alt="" className="size-12 rounded object-cover" />
                  ) : (
                    <span className="size-12 rounded bg-canvas" />
                  )}
                  <span>
                    <span className="block text-[13px] font-semibold">
                      v{versions.length - index} {row.title || typeLabel(row.generationType)}
                    </span>
                    <span className="text-[12px] text-ink-muted">
                      {new Date(row.createdAt).toLocaleString('tr-TR')}
                    </span>
                  </span>
                  <Badge>{row.status === 'ready' ? 'Hazır' : row.status}</Badge>
                </Link>
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

function DetailImageMenu({ publicUrl }: { publicUrl: string }) {
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
          <a
            role="menuitem"
            href={publicUrl}
            download=""
            className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-[13px] font-medium text-ink hover:bg-canvas"
            onClick={() => setOpen(false)}
          >
            <Icon name="download" className="size-4 text-ink-muted" />
            İndir
          </a>
        </div>
      ) : null}
    </div>
  )
}

function ReviseModal({
  open,
  pending,
  instruction,
  previewUrl,
  onClose,
  onInstruction,
  onSubmit,
}: {
  open: boolean
  pending: boolean
  instruction: string
  previewUrl: string | null
  onClose: () => void
  onInstruction: (value: string) => void
  onSubmit: () => void
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
            if (instruction.trim().length < 4 || pending) return
            onSubmit()
          }}
        >
          <Field label="Neyi değiştirmek istiyorsunuz?" hint="Kısa ve net yazın: ne kalsın, ne değişsin.">
            <Textarea
              rows={4}
              value={instruction}
              onChange={(event) => onInstruction(event.target.value)}
              placeholder="Marka adını Ayvazoğlu İnşaat yap. Fiyatı 10 TL yaz, yanına sınırlı sayıda ekle. Hemen iletişime geçin yazısını koy."
              autoFocus
            />
          </Field>

          <div className="wb-modal-actions">
            <Button type="button" variant="quiet" disabled={pending} onClick={onClose}>
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="wb-wa-submit"
              disabled={pending || instruction.trim().length < 4}
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
