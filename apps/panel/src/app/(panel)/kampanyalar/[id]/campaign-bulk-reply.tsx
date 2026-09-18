'use client'

import { useState, useTransition } from 'react'
import { Button, Card, CardHeader, Notice } from '@/components/ui'
import { Icon } from '@/components/icon'
import {
  sendCampaignBulkReplies,
  dismissCampaignReplies,
  blacklistCampaignReplies,
  type BulkReplyItem,
} from '../actions'

export type PendingReplyItem = {
  target_id: number
  contact_id: string | null
  contact_name: string
  phone_e164: string
  replied_at: string
  last_inbound_text: string
  suggested_reply: string
  intent_label: string
}

function categorizeMessage(text: string): 'price' | 'appointment' | 'opt_out' | 'general' {
  const lower = text.toLocaleLowerCase('tr-TR')
  if (
    lower.includes('istemiyor') ||
    lower.includes('iptal') ||
    lower.includes('silin') ||
    lower.includes('atmayın') ||
    lower.includes('atma') ||
    lower.includes('çık') ||
    lower.includes('engelle')
  ) {
    return 'opt_out'
  }
  if (
    lower.includes('fiyat') ||
    lower.includes('ücret') ||
    lower.includes('kaç tl') ||
    lower.includes('kac tl') ||
    lower.includes('ne kadar') ||
    lower.includes('tutar') ||
    lower.includes('maliyet')
  ) {
    return 'price'
  }
  if (
    lower.includes('randevu') ||
    lower.includes('saat') ||
    lower.includes('nerede') ||
    lower.includes('adres') ||
    lower.includes('konum') ||
    lower.includes('yarın') ||
    lower.includes('yarin')
  ) {
    return 'appointment'
  }
  return 'general'
}

const CATEGORY_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  price: {
    label: 'Fiyat',
    badgeClass: 'bg-accent/10 text-accent border border-accent/25',
  },
  appointment: {
    label: 'Randevu',
    badgeClass: 'bg-accent/10 text-accent border border-accent/25',
  },
  opt_out: {
    label: 'İptal',
    badgeClass: 'bg-danger/10 text-danger border border-danger/25',
  },
  general: {
    label: 'Genel',
    badgeClass: 'bg-hairline text-ink-muted border border-hairline-strong',
  },
}

export function CampaignBulkReply({
  campaignId,
  initialReplies,
  accountId,
  campaignName,
  campaignBody,
}: {
  campaignId: string
  initialReplies: PendingReplyItem[]
  accountId?: string
  campaignName?: string | null
  campaignBody?: string | null
}) {
  const [items, setItems] = useState(initialReplies)
  const [repliesMap, setRepliesMap] = useState<Record<number, string>>(() =>
    Object.fromEntries(initialReplies.map((r) => [r.target_id, r.suggested_reply || ''])),
  )
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    const set = new Set<number>()
    for (const r of initialReplies) {
      if (categorizeMessage(r.last_inbound_text) !== 'opt_out') {
        set.add(r.target_id)
      }
    }
    return set
  })
  const [activeFilter, setActiveFilter] = useState<'all' | 'price' | 'appointment' | 'opt_out' | 'general'>('all')
  const [isOpen, setIsOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [statusNotice, setStatusNotice] = useState<{ tone: 'accent' | 'danger'; text: string } | null>(null)
  const [aiLoadingIds, setAiLoadingIds] = useState<Set<number>>(new Set())
  const [isBulkAiGenerating, setIsBulkAiGenerating] = useState(false)

  if (items.length === 0) return null

  const categorizedItems = items.map((item) => ({
    ...item,
    cat: categorizeMessage(item.last_inbound_text),
  }))

  const filteredItems = categorizedItems.filter((item) => {
    if (activeFilter === 'all') return true
    return item.cat === activeFilter
  })

  const countByCat = {
    all: items.length,
    price: categorizedItems.filter((i) => i.cat === 'price').length,
    appointment: categorizedItems.filter((i) => i.cat === 'appointment').length,
    opt_out: categorizedItems.filter((i) => i.cat === 'opt_out').length,
    general: categorizedItems.filter((i) => i.cat === 'general').length,
  }

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    setSelectedIds(new Set(filteredItems.filter((i) => i.cat !== 'opt_out').map((i) => i.target_id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
  }

  const fetchAiForSingle = async (targetId: number, lastMessage: string, phone: string) => {
    setAiLoadingIds((prev) => new Set(prev).add(targetId))
    try {
      const historyContext = campaignBody
        ? `Kampanya Başlığı: ${campaignName || 'Kampanya'}\nMüşteriye Gönderilen Kampanya Mesajımız:\n"${campaignBody}"`
        : undefined

      const res = await fetch('/api/mesajlar/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastMessage,
          phone,
          history: historyContext,
        }),
      })
      const data = await res.json()
      if (data.suggestions && data.suggestions.length > 0) {
        const text = data.suggestions[0]?.text
        if (text) {
          setRepliesMap((prev) => ({ ...prev, [targetId]: text }))
        }
      }
    } catch (e) {
      console.error('AI suggest error:', e)
    } finally {
      setAiLoadingIds((prev) => {
        const next = new Set(prev)
        next.delete(targetId)
        return next
      })
    }
  }

  const handleGenerateAllAi = async () => {
    setIsBulkAiGenerating(true)
    setStatusNotice({
      tone: 'accent',
      text: 'Yapay zeka kampanya bağlamını kullanarak tüm yanıtları hazırlıyor...',
    })

    const eligible = items.filter((i) => categorizeMessage(i.last_inbound_text) !== 'opt_out')
    for (const item of eligible) {
      await fetchAiForSingle(item.target_id, item.last_inbound_text, item.phone_e164)
    }

    setIsBulkAiGenerating(false)
    setStatusNotice({
      tone: 'accent',
      text: 'Tüm yanıtlar kampanya detaylarına uygun şekilde yapay zeka tarafından güncellendi.',
    })
  }

  const handleSend = () => {
    const toSend: BulkReplyItem[] = []
    for (const id of selectedIds) {
      const item = items.find((i) => i.target_id === id)
      const text = repliesMap[id]?.trim()
      if (item && text) {
        toSend.push({
          targetId: item.target_id,
          phone: item.phone_e164,
          text,
        })
      }
    }

    if (toSend.length === 0) {
      setStatusNotice({ tone: 'danger', text: 'Gönderilecek seçili yanıt bulunamadı.' })
      return
    }

    startTransition(async () => {
      setStatusNotice(null)
      const res = await sendCampaignBulkReplies({
        campaignId,
        accountId,
        replies: toSend,
      })

      if (res.error) {
        setStatusNotice({ tone: 'danger', text: res.error })
      } else {
        setStatusNotice({
          tone: 'accent',
          text: res.ok || 'Yanıtlar güvenli gönderim kuyruğuna alındı.',
        })
        const sentSet = new Set(toSend.map((s) => s.targetId))
        setItems((prev) => prev.filter((i) => !sentSet.has(i.target_id)))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          for (const id of sentSet) next.delete(id)
          return next
        })
      }
    })
  }

  const handleBlacklistOptOuts = () => {
    const optOutItems = categorizedItems.filter((i) => i.cat === 'opt_out')
    if (optOutItems.length === 0) return

    startTransition(async () => {
      setStatusNotice(null)
      const res = await blacklistCampaignReplies({
        campaignId,
        items: optOutItems.map((i) => ({ targetId: i.target_id, phone: i.phone_e164 })),
      })

      if (res.error) {
        setStatusNotice({ tone: 'danger', text: res.error })
      } else {
        setStatusNotice({
          tone: 'accent',
          text: res.ok || 'İptal talepleri kara listeye eklendi.',
        })
        const optOutSet = new Set(optOutItems.map((i) => i.target_id))
        setItems((prev) => prev.filter((i) => !optOutSet.has(i.target_id)))
        setSelectedIds((prev) => {
          const next = new Set(prev)
          for (const id of optOutSet) next.delete(id)
          return next
        })
      }
    })
  }

  const handleDismiss = (id: number) => {
    startTransition(async () => {
      await dismissCampaignReplies({
        campaignId,
        targetIds: [id],
      })
      setItems((prev) => prev.filter((i) => i.target_id !== id))
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    })
  }

  return (
    <Card className="border-accent/30 bg-surface shadow-xs overflow-hidden">
      <CardHeader
        title="Gelen Yanıtlar"
        subtitle={
          isOpen
            ? `${items.length} müşteri yanıtı incelenmeye hazır.`
            : `${items.length} müşteri yanıt verdi.`
        }
        action={
          <div className="flex items-center gap-1.5">
            {isOpen ? (
              <Button
                variant="quiet"
                onClick={handleGenerateAllAi}
                disabled={isBulkAiGenerating || pending}
                className="text-[11.5px] h-7 px-2.5 gap-1"
                title="Tüm yanıtları kampanya detaylarına göre yeniden üretir"
              >
                <Icon
                  name="refresh"
                  className={`size-3.5 ${isBulkAiGenerating ? 'animate-spin text-accent' : 'text-ink-muted'}`}
                />
                <span>{isBulkAiGenerating ? 'Yazılıyor…' : 'Tümünü Yenile'}</span>
              </Button>
            ) : null}
            <Button
              variant={isOpen ? 'quiet' : 'accent'}
              onClick={() => setIsOpen(!isOpen)}
              className="text-[11.5px] h-7 px-3 shrink-0"
            >
              {isOpen ? 'Kapat' : `Masayı Aç (${items.length})`}
            </Button>
          </div>
        }
      />

      {!isOpen ? (
        <div className="px-4 pb-3 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-ink-muted font-medium">Özet:</span>
          {countByCat.price > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent border border-accent/20">
              Fiyat: {countByCat.price}
            </span>
          ) : null}
          {countByCat.appointment > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-accent/10 text-accent border border-accent/20">
              Randevu: {countByCat.appointment}
            </span>
          ) : null}
          {countByCat.opt_out > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-danger/10 text-danger border border-danger/20">
              İptal: {countByCat.opt_out}
            </span>
          ) : null}
          {countByCat.general > 0 ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium bg-hairline text-ink-muted border border-hairline-strong">
              Genel: {countByCat.general}
            </span>
          ) : null}
        </div>
      ) : null}

      {statusNotice ? (
        <div className="p-3 pt-0">
          <Notice tone={statusNotice.tone}>{statusNotice.text}</Notice>
        </div>
      ) : null}

      {isOpen ? (
        <div className="space-y-3 border-t border-hairline p-3 sm:p-4">
          {/* Filtre ve Hızlı Seçim Çubuğu */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-raised/40 rounded-[var(--radius-md)] p-2 border border-hairline">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'bg-surface text-ink-muted hover:text-ink border border-hairline'
                }`}
              >
                Tümü ({countByCat.all})
              </button>
              {countByCat.price > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveFilter('price')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    activeFilter === 'price'
                      ? 'bg-accent text-accent-ink shadow-xs'
                      : 'bg-surface text-ink-muted hover:text-ink border border-hairline'
                  }`}
                >
                  Fiyat ({countByCat.price})
                </button>
              ) : null}
              {countByCat.appointment > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveFilter('appointment')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    activeFilter === 'appointment'
                      ? 'bg-accent text-accent-ink shadow-xs'
                      : 'bg-surface text-ink-muted hover:text-ink border border-hairline'
                  }`}
                >
                  Randevu ({countByCat.appointment})
                </button>
              ) : null}
              {countByCat.general > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveFilter('general')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    activeFilter === 'general'
                      ? 'bg-accent text-accent-ink shadow-xs'
                      : 'bg-surface text-ink-muted hover:text-ink border border-hairline'
                  }`}
                >
                  Genel ({countByCat.general})
                </button>
              ) : null}
              {countByCat.opt_out > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveFilter('opt_out')}
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    activeFilter === 'opt_out'
                      ? 'bg-danger text-white shadow-xs'
                      : 'bg-danger/10 text-danger hover:bg-danger/20 border border-danger/20'
                  }`}
                >
                  İptal ({countByCat.opt_out})
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={selectAll}
                className="text-ink-muted hover:text-ink font-medium underline underline-offset-2"
              >
                Tümünü Seç
              </button>
              <span className="text-ink-faint">·</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-ink-muted hover:text-ink font-medium underline underline-offset-2"
              >
                Kaldır
              </button>
              {countByCat.opt_out > 0 ? (
                <>
                  <span className="text-ink-faint">·</span>
                  <button
                    type="button"
                    onClick={handleBlacklistOptOuts}
                    disabled={pending}
                    className="font-semibold text-danger hover:underline underline-offset-2"
                  >
                    İptalleri Engelle ({countByCat.opt_out})
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* İki Kolonlu / Ferah Satır Düzeni */}
          <div className="max-h-[540px] space-y-2.5 overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.target_id)
              const catMeta = CATEGORY_META[item.cat] || CATEGORY_META.general
              const currentText = repliesMap[item.target_id] ?? item.suggested_reply
              const isItemAiLoading = aiLoadingIds.has(item.target_id)
              const isOptOut = item.cat === 'opt_out'

              return (
                <div
                  key={item.target_id}
                  className={`rounded-[var(--radius-md)] border p-2.5 sm:p-3 transition-[background-color,border-color] duration-150 ${
                    isSelected
                      ? 'border-accent/40 bg-surface-raised/60 shadow-xs'
                      : isOptOut
                        ? 'border-danger/25 bg-danger/5'
                        : 'border-hairline bg-surface hover:border-hairline-strong'
                  }`}
                >
                  {/* Satır Başlığı */}
                  <div className="mb-2 flex items-center justify-between gap-2 border-b border-hairline/60 pb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      {!isOptOut ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(item.target_id)}
                          className="size-3.5 rounded border-hairline-strong accent-accent cursor-pointer shrink-0"
                        />
                      ) : (
                        <span className="size-3.5 flex items-center justify-center text-danger font-bold text-xs shrink-0" title="İptal talebi">
                          ✕
                        </span>
                      )}
                      <span className="text-[12.5px] font-semibold text-ink truncate max-w-[120px] sm:max-w-none">
                        {item.contact_name}
                      </span>
                      <span className="text-[11px] tabular text-ink-muted shrink-0">
                        {item.phone_e164}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-medium shrink-0 ${catMeta.badgeClass}`}
                      >
                        {catMeta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.replied_at ? (
                        <span className="text-[10px] text-ink-faint tabular">
                          {new Date(item.replied_at).toLocaleTimeString('tr-TR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => handleDismiss(item.target_id)}
                        className="text-[11px] text-ink-faint hover:text-ink-muted px-1"
                        title="Bu yanıtı listeden gizle"
                      >
                        Gizle ✕
                      </button>
                    </div>
                  </div>

                  {/* İçerik: Gelen Mesaj & Yanıt */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-stretch">
                    {/* Gelen Müşteri Mesajı */}
                    <div className="md:col-span-5 rounded-[var(--radius-sm)] bg-hairline/35 p-2 text-[12px] text-ink flex flex-col justify-between">
                      <p className="whitespace-pre-wrap leading-relaxed">{item.last_inbound_text}</p>
                      <span className="text-[9.5px] text-ink-faint mt-1 self-start">Gelen Mesaj</span>
                    </div>

                    {/* Gönderilecek Yanıt */}
                    <div className="md:col-span-7 flex flex-col justify-between">
                      {isOptOut ? (
                        <div className="h-full flex flex-col justify-between rounded-[var(--radius-sm)] border border-danger/20 bg-danger/10 p-2.5 text-[11.5px] text-danger">
                          <div>
                            <span className="block font-semibold mb-0.5">Çıkış / İptal Talep Edildi</span>
                            <p className="text-ink-muted leading-relaxed text-[11px]">
                              Müşteri listeden çıkmak istiyor. Kara listeye eklenmesi önerilir.
                            </p>
                          </div>
                          <div className="mt-2 flex items-center justify-end">
                            <Button
                              variant="danger"
                              onClick={handleBlacklistOptOuts}
                              disabled={pending}
                              className="text-[11px] h-6 px-2.5"
                            >
                              Kara Listeye Ekle
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col h-full">
                          <div className="mb-1 flex items-center justify-between text-[10.5px]">
                            <span className="font-medium text-ink-muted">
                              Yanıt Taslağı:
                            </span>
                            <div className="flex items-center gap-2">
                              {isItemAiLoading ? (
                                <span className="text-accent font-medium animate-pulse flex items-center gap-1">
                                  <Icon name="refresh" className="size-2.5 animate-spin" />
                                  Yazılıyor…
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    fetchAiForSingle(
                                      item.target_id,
                                      item.last_inbound_text,
                                      item.phone_e164,
                                    )
                                  }
                                  className="text-accent hover:underline font-medium flex items-center gap-1"
                                  title="Bu mesaj için yeniden taslak üret"
                                >
                                  <Icon name="sparkles" className="size-2.5" />
                                  AI ile Yenile
                                </button>
                              )}
                            </div>
                          </div>
                          <textarea
                            rows={2}
                            value={currentText}
                            onChange={(e) => {
                              const val = e.target.value
                              setRepliesMap((prev) => ({ ...prev, [item.target_id]: val }))
                            }}
                            className="w-full flex-1 rounded-[var(--radius-sm)] border border-hairline bg-surface p-2 text-[12px] text-ink outline-none transition-[border-color,box-shadow] focus:border-accent focus:ring-1 focus:ring-accent leading-relaxed resize-none font-sans min-h-[50px]"
                            placeholder="Müşteriye iletilecek yanıt metni..."
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Alt Gönderim Çubuğu */}
          <div className="flex items-center justify-between gap-2 border-t border-hairline pt-2.5 bg-surface">
            <div className="text-[11.5px] text-ink-muted truncate">
              <strong className="text-ink font-semibold">{selectedIds.size}</strong> yanıt seçili.
              <span className="hidden sm:inline text-ink-faint"> (5-10 sn aralıkla gönderilir)</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {selectedIds.size > 0 ? (
                <Button
                  variant="quiet"
                  onClick={deselectAll}
                  className="text-[11.5px] h-7.5 px-2.5"
                >
                  Temizle
                </Button>
              ) : null}
              <Button
                variant="accent"
                disabled={selectedIds.size === 0 || pending}
                onClick={handleSend}
                className="text-[12px] h-7.5 px-3.5 font-semibold shadow-xs"
              >
                {pending
                  ? 'Alınıyor…'
                  : `Gönder (${selectedIds.size})`}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
