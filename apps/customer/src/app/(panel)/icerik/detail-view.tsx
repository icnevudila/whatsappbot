'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AccentLink, Badge, Button, Field, Notice, Textarea } from '@/components/ui'
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

const STAGES = [
  'Markanızı analiz ediyoruz…',
  'Ürünleri kompozisyona yerleştiriyoruz…',
  'Kampanya tasarımınız hazırlanıyor…',
  'Son dokunuşlar yapılıyor…',
]

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
  const toast = useToast()
  const confirm = useConfirm()
  const [instruction, setInstruction] = useState('')
  const [title, setTitle] = useState(creative.title ?? '')
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
      signal: AbortSignal.timeout(120_000),
    })
    const json = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      return json?.error ?? 'Görsel üretilemedi.'
    }
    return null
  }

  useEffect(() => {
    setTitle(creative.title ?? '')
  }, [creative.title])

  useEffect(() => {
    if (creative.status === 'ready') setLocalError(null)
  }, [creative.status])

  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setTick((value) => value + 1), 2800)
    return () => clearInterval(timer)
  }, [running])

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

  return (
    <div className="space-y-3">
      {spinning ? (
        <div className="rounded-[var(--radius-card)] border border-accent/30 bg-accent-soft/40 px-4 py-8 text-center">
          <p className="text-[14.5px] font-bold">Görsel üretiliyor</p>
          <p className="mt-2 text-[13px] text-ink-muted">{STAGES[tick % STAGES.length]}</p>
          <p className="mt-3 text-[12.5px] text-ink-faint">Bu sayfa açıkken üretim devam eder.</p>
          <QuietLibrary />
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
              className="mt-3"
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
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={creative.publicUrl}
          alt={creative.title ?? ''}
          className="w-full rounded-[var(--radius-card)] border border-hairline bg-canvas object-contain"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {creative.publicUrl && creative.status === 'ready' ? (
          <>
            <AccentLink href={`/kampanyalar/yeni?gorsel=${encodeURIComponent(creative.publicUrl)}`}>
              Kampanyada kullan
            </AccentLink>
            <a
              href={creative.publicUrl}
              download
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border border-hairline-strong px-3.5 text-[14px] font-semibold"
            >
              İndir
            </a>
            <AccentLink href="/icerik/yeni">Yeni görsel</AccentLink>
          </>
        ) : null}
        {canManage ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => {
              void (async () => {
                const ok = await confirm({
                  title: 'Görseli sil',
                  confirmLabel: 'Sil',
                  tone: 'danger',
                })
                if (!ok) return
                startTransition(() => {
                  void deleteCreative(creative.id).then((result) => {
                    if (result?.error) toast(result.error, 'danger')
                    else router.push('/icerik')
                  })
                })
              })()
            }}
          >
            Sil
          </Button>
        ) : null}
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-start"
        action={(formData) => {
          startTransition(() => {
            void renameCreative(formData).then((result) => {
              if (result?.error) toast(result.error, 'danger')
              else toast(result?.ok ?? 'Kaydedildi', 'success')
            })
          })
        }}
      >
        <input type="hidden" name="id" value={creative.id} />
        <Textarea
          name="title"
          rows={3}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="min-h-[4.5rem] resize-y"
          maxLength={180}
          aria-label="Görsel adı"
        />
        <Button type="submit" variant="quiet" disabled={pending} className="w-full shrink-0 sm:mt-0 sm:w-auto">
          Adı kaydet
        </Button>
      </form>

      <p className="text-[12.5px] text-ink-muted">
        {new Date(creative.createdAt).toLocaleString('tr-TR')} · {creative.format}
        {creative.brandName ? ` · ${creative.brandName}` : ''}
        {creative.provider ? ` · ${creative.provider}` : ''}
        {creative.generationType ? ` · ${creative.generationType}` : ''}
      </p>
      {creative.brief ? <p className="text-[13px]">{creative.brief}</p> : null}

      {creative.status === 'ready' && canManage ? (
        <section className="space-y-2 rounded-[var(--radius-card)] border border-hairline bg-surface p-3.5">
          <h2 className="text-[14px] font-bold">✨ AI ile revize et</h2>
          <Field label="Neyi değiştirmek istiyorsunuz?">
            <Textarea
              rows={3}
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="Alttaki fiyatları kaldır. Logoyu sağ üste taşı. Arka planı daha açık yap."
              autoFocus={openRevise}
            />
          </Field>
          <Button
            type="button"
            variant="accent"
            disabled={pending || instruction.trim().length < 4}
            onClick={() =>
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
          >
            Revizyon üret
          </Button>
        </section>
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
      <Link href="/icerik" className="text-[13px] font-medium text-accent underline-offset-2 hover:underline">
        Arka planda devam et → kütüphane
      </Link>
    </p>
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
