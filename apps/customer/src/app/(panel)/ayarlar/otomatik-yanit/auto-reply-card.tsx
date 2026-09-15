'use client'

import { useState, useTransition } from 'react'
import { Icon } from '@/components/icon'
import { useToast } from '@/components/toast'
import { updateOrgAutoReply } from '../../org-actions'

export function AutoReplyCard({
  initialEnabled,
  canManage,
}: {
  initialEnabled: boolean
  canManage: boolean
}) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const toast = useToast()

  function handleToggle() {
    if (!canManage) {
      toast('Yalnızca yönetici veya sahip bu ayarı değiştirebilir.', 'warn')
      return
    }
    const next = !enabled
    setEnabled(next)
    startTransition(async () => {
      const res = await updateOrgAutoReply(next)
      if (res?.error) {
        setEnabled(!next)
        toast(res.error, 'danger')
      } else if (res?.ok) {
        toast(res.ok, 'accent')
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-hairline bg-surface p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent-soft text-accent">
                <Icon name="sparkles" className="size-4" />
              </span>
              <h3 className="text-base font-semibold text-ink">Otomatik Yanıtlama (Auto-Reply)</h3>
            </div>
            <p className="text-sm text-ink-muted leading-relaxed max-w-xl">
              Gelen WhatsApp mesajlarına, ChatGPT yapay zeka motoru tarafından firmanızın kimliğine ve ürünlerine uygun olarak anında otomatik cevap gönderilir.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="text-xs font-medium text-ink-muted">
              {enabled ? 'Açık' : 'Kapalı'}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={isPending || !canManage}
              onClick={handleToggle}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                enabled ? 'bg-accent' : 'bg-hairline-strong'
              } ${isPending ? 'opacity-60 cursor-wait' : ''}`}
            >
              <span
                className={`pointer-events-none inline-block size-6 rounded-full bg-white shadow-md transform ring-0 transition duration-200 ease-in-out ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {enabled ? (
          <div className="mt-4 rounded-lg bg-emerald-50/80 border border-emerald-200/60 p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
            <Icon name="check" className="size-4 text-emerald-600 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Otomatik cevaplama şu an aktif</p>
              <p className="mt-0.5 text-emerald-800/90">
                Gelen mesajlara kurumsal ChatGPT motorunuz otomatik olarak 10-15 saniyelik doğal bekleme süresinin ardından doğrudan WhatsApp yanıtı gönderecektir.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-canvas p-3.5 text-xs text-ink-muted flex items-start gap-2.5">
            <Icon name="help" className="size-4 text-ink-faint mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-ink">Yarı-Otomatik (Önerilen Cevaplar) Modu Aktif</p>
              <p className="mt-0.5 text-ink-muted">
                Mesajlar ekranında gelen her mesaj için 3 alternatif hazır yanıt üretilir. Temsilciniz beğendiği yanıta tek tıkla basarak onaylayıp gönderir.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="rounded-xl border border-hairline bg-surface p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-ink">
            <Icon name="shield" className="size-3.5 text-accent" />
            Spam & Döngü Koruması
          </div>
          <p className="text-ink-muted leading-relaxed">
            Botların birbiriyle sonsuz mesajlaşmasını engellemek için aynı telefon numarasına 15 dakika içinde en fazla 1 kez otomatik yanıt gönderilir.
          </p>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-4 text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-ink">
            <Icon name="brand" className="size-3.5 text-accent" />
            Kurumsal Üslup & Ürünler
          </div>
          <p className="text-ink-muted leading-relaxed">
            Yapay zeka, Marka Kiti alanındaki ton bilginizi ve Ürünlerim kataloğundaki ürün isimlerini yanıt verirken otomatik olarak dikkate alır.
          </p>
        </div>
      </div>
    </div>
  )
}
