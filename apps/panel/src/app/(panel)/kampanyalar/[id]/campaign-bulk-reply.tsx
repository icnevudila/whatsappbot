'use client'

import { useState, useTransition } from 'react'
import { Badge, Button, Card, CardHeader, Notice } from '@/components/ui'
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

const CATEGORY_LABELS: Record<string, { label: string; tone: 'accent' | 'warn' | 'danger' | 'neutral' }> = {
  price: { label: 'Fiyat Talebi', tone: 'accent' },
  appointment: { label: 'Randevu / Bilgi', tone: 'accent' },
  opt_out: { label: 'İptal / Çıkış', tone: 'danger' },
  general: { label: 'Genel Soru', tone: 'neutral' },
}

export function CampaignBulkReply({
  campaignId,
  initialReplies,
  accountId,
}: {
  campaignId: string
  initialReplies: PendingReplyItem[]
  accountId?: string
}) {
  const [items, setItems] = useState(initialReplies)
  const [repliesMap, setRepliesMap] = useState<Record<number, string>>(() =>
    Object.fromEntries(initialReplies.map((r) => [r.target_id, r.suggested_reply || ''])),
  )
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => {
    // Varsayılan: İptal/çıkış hariç tümünü seç
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
    setSelectedIds(new Set(filteredItems.map((i) => i.target_id)))
  }

  const deselectAll = () => {
    setSelectedIds(new Set())
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
        // Gönderilenleri yerel listeden düş
        const sentSet = new Set(toSend.map((s) => s.targetId))
        setItems((prev) => prev.filter((i) => !sentSet.has(i.target_id)))
        setSelectedIds(new Set())
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
    <Card className="border-accent/30 bg-surface">
      <CardHeader
        title="Gelen Yanıtlar ve Toplu Akıllı Yanıtlama"
        subtitle={`${items.length} müşteri yanıt verdi. Yapay zeka her müşterinin sorusuna özel taslak hazırladı.`}
        action={
          <Button
            variant={isOpen ? 'quiet' : 'accent'}
            onClick={() => setIsOpen(!isOpen)}
            className="text-[13px] h-8"
          >
            {isOpen ? 'Masayı Kapat' : `Yanıt Masasını Aç (${items.length}) →`}
          </Button>
        }
      />

      {statusNotice ? (
        <div className="p-3.5 pt-0">
          <Notice tone={statusNotice.tone}>{statusNotice.text}</Notice>
        </div>
      ) : null}

      {isOpen ? (
        <div className="space-y-4 border-t border-hairline p-3.5">
          {/* Kategori Filtreleri */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  activeFilter === 'all'
                    ? 'bg-accent text-accent-ink'
                    : 'bg-hairline text-ink-muted hover:bg-hairline-strong'
                }`}
              >
                Tümü ({countByCat.all})
              </button>
              {countByCat.price > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveFilter('price')}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    activeFilter === 'price'
                      ? 'bg-accent text-accent-ink'
                      : 'bg-hairline text-ink-muted hover:bg-hairline-strong'
                  }`}
                >
                  Fiyat Talebi ({countByCat.price})
                </button>
              ) : null}
              {countByCat.appointment > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveFilter('appointment')}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    activeFilter === 'appointment'
                      ? 'bg-accent text-accent-ink'
                      : 'bg-hairline text-ink-muted hover:bg-hairline-strong'
                  }`}
                >
                  Randevu / Bilgi ({countByCat.appointment})
                </button>
              ) : null}
              {countByCat.opt_out > 0 ? (
                <button
                  type="button"
                  onClick={() => setActiveFilter('opt_out')}
                  className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    activeFilter === 'opt_out'
                      ? 'bg-danger text-white'
                      : 'bg-danger/10 text-danger hover:bg-danger/20'
                  }`}
                >
                  İptal / Çıkış ({countByCat.opt_out})
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[12px] text-ink-muted hover:text-ink underline underline-offset-2"
              >
                Tümünü Seç
              </button>
              <span className="text-ink-faint">·</span>
              <button
                type="button"
                onClick={deselectAll}
                className="text-[12px] text-ink-muted hover:text-ink underline underline-offset-2"
              >
                Seçimi Kaldır
              </button>
              {countByCat.opt_out > 0 ? (
                <>
                  <span className="text-ink-faint">·</span>
                  <button
                    type="button"
                    onClick={handleBlacklistOptOuts}
                    disabled={pending}
                    className="text-[12px] font-medium text-danger hover:underline underline-offset-2"
                  >
                    İstemeyenleri Kara Listeye Al ({countByCat.opt_out})
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Yanıt Kartları Listesi */}
          <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {filteredItems.map((item) => {
              const isSelected = selectedIds.has(item.target_id)
              const catMeta = CATEGORY_LABELS[item.cat] || CATEGORY_LABELS.general
              const currentText = repliesMap[item.target_id] ?? item.suggested_reply

              return (
                <div
                  key={item.target_id}
                  className={`rounded-[var(--radius-md)] border p-3 transition-colors ${
                    isSelected
                      ? 'border-accent/35 bg-surface-raised/40'
                      : 'border-hairline bg-surface opacity-80'
                  }`}
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item.target_id)}
                        className="size-4 rounded border-hairline accent-accent cursor-pointer"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold text-ink">
                            {item.contact_name}
                          </span>
                          <span className="text-[11.5px] tabular text-ink-muted">
                            {item.phone_e164}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.2 text-[10.5px] font-medium ${
                              item.cat === 'opt_out'
                                ? 'bg-danger/10 text-danger border border-danger/20'
                                : item.cat === 'price'
                                  ? 'bg-accent/10 text-accent border border-accent/20'
                                  : 'bg-hairline text-ink-muted'
                            }`}
                          >
                            {catMeta.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDismiss(item.target_id)}
                      className="text-[11px] text-ink-faint hover:text-ink-muted"
                      title="Listeden Gizle"
                    >
                      Gizle ✕
                    </button>
                  </div>

                  {/* Gelen Mesaj Kutusu */}
                  <div className="mb-2 rounded-[var(--radius-sm)] border border-hairline bg-surface p-2 text-[12.5px] text-ink-muted">
                    <span className="block text-[11px] font-medium text-ink-faint mb-0.5">
                      Müşterinin Mesajı:
                    </span>
                    <p className="text-ink font-normal">{item.last_inbound_text}</p>
                  </div>

                  {/* AI Yanıtı Kutusu (Düzenlenebilir) */}
                  {item.cat === 'opt_out' ? (
                    <div className="rounded-[var(--radius-sm)] bg-danger/5 border border-danger/15 p-2 text-[12px] text-danger">
                      Müşteri çıkış / iptal talep etti. Yanıt gönderilmemesi ve kara listeye alınması önerilir.
                    </div>
                  ) : (
                    <div>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-ink-faint">
                        <span>Yapay Zeka Önerilen Yanıtı (Düzenleyebilirsiniz):</span>
                        <span className="text-[10.5px]">Temsilci Onaylı</span>
                      </div>
                      <textarea
                        rows={2}
                        value={currentText}
                        onChange={(e) => {
                          const val = e.target.value
                          setRepliesMap((prev) => ({ ...prev, [item.target_id]: val }))
                        }}
                        className="w-full rounded-[var(--radius-sm)] border border-hairline bg-surface p-2 text-[12.5px] text-ink outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
                        placeholder="Müşteriye iletilecek yanıt metni..."
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Alt Çubuk & Gönderim Butonu */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
            <div className="text-[12px] text-ink-muted">
              <strong className="text-ink">{selectedIds.size}</strong> yanıt seçili. Mesajlar
              hattın spama düşmemesi için 5-10 saniye aralıklarla doğal olarak gönderilecektir.
            </div>

            <Button
              variant="accent"
              disabled={selectedIds.size === 0 || pending}
              onClick={handleSend}
              className="text-[13px] h-9 px-4"
            >
              {pending
                ? 'Kuyruğa Alınıyor…'
                : `Seçilen ${selectedIds.size} Yanıtı Gönder`}
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  )
}
