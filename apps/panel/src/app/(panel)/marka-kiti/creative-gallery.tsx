'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'
import { useConfirm } from '@/components/confirm-dialog'
import { useToast } from '@/components/toast'
import { useT } from '@/lib/i18n/provider'
import { FORMATS, type FormatKey, type TemplateKey } from '@/lib/creative-templates'
import { deleteCreative } from './actions'

const TEMPLATE_LABEL: Record<string, string> = {
  bold: 'Tam zemin',
  split: 'Bölünmüş',
  frame: 'Çerçeve',
  photo: 'AI arka plan',
}

const FORMAT_LABEL: Record<string, string> = {
  square: 'Kare',
  feed: 'Dikey',
  story: 'Hikaye',
}

export type GalleryCreative = {
  id: string
  public_url: string | null
  template: string | null
  format: string | null
}

export function CreativeGallery({ creatives }: { creatives: GalleryCreative[] }) {
  const router = useRouter()
  const confirm = useConfirm()
  const toast = useToast()
  const t = useT()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const remove = (id: string) => {
    void (async () => {
      const ok = await confirm({
        title: t('confirm.deleteCreativeTitle'),
        description: t('confirm.deleteCreativeBody'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        tone: 'danger',
      })
      if (!ok) return

      setBusyId(id)
      startTransition(async () => {
        const result = await deleteCreative(id)
        setBusyId(null)
        if (result.error) {
          toast(result.error, 'danger')
          return
        }
        toast(t('confirm.deleteCreativeOk'), 'success')
        router.refresh()
      })
    })()
  }

  return (
    <div className="grid grid-cols-2 gap-2.5 p-3.5 sm:grid-cols-4">
      {creatives.map((creative) => {
        const templateKey = creative.template as TemplateKey
        const formatKey = creative.format as FormatKey
        const templateLabel =
          TEMPLATE_LABEL[templateKey] ?? creative.template ?? 'Şablon'
        const formatLabel =
          FORMAT_LABEL[formatKey] ?? FORMATS[formatKey]?.label ?? creative.format
        const deleting = busyId === creative.id

        return (
          <div
            key={creative.id}
            className="overflow-hidden rounded-md border border-hairline"
          >
            <a
              href={creative.public_url ?? '#'}
              target="_blank"
              rel="noreferrer"
              className="block transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={creative.public_url ?? ''}
                alt={`${templateLabel} · ${formatLabel}`}
                className="aspect-square w-full object-cover"
              />
            </a>
            <div className="border-t border-hairline px-2 py-1.5">
              <p className="truncate text-[11px] text-ink-faint">
                {templateLabel} · {formatLabel}
              </p>
              <div className="mt-1.5 flex flex-col gap-1">
                {creative.public_url ? (
                  <Link
                    href={`/hizli-gonderim?media=${encodeURIComponent(creative.public_url)}`}
                    className="block text-center text-[11.5px] font-medium text-accent hover:underline"
                  >
                    Gönderimde kullan
                  </Link>
                ) : null}
                <Button
                  type="button"
                  variant="danger"
                  className="h-7 w-full text-[11.5px]"
                  disabled={deleting}
                  onClick={() => remove(creative.id)}
                >
                  {deleting ? 'Siliniyor…' : t('common.delete')}
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
