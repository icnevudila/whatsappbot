'use client'

import { useEffect, useId, useState, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { Badge, Button, Field, Input, Notice, Select, Textarea } from '@/components/ui'
import { Icon } from '@/components/icon'
import { useSyncBusy } from '@/components/busy'
import { useToast } from '@/components/toast'
import { createListRequest, listListRequests } from './actions'
import turkiyeIlIlce from '../../../data/turkiye-il-ilce.json'

const MAX_LIST_REQUEST_PLACES = 100

function foldPlaceName(value: string) {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .replaceAll('â', 'a')
    .replaceAll('î', 'i')
    .replaceAll('û', 'u')
}

const provinceById = new Map(turkiyeIlIlce.provinces.map((row) => [row.id, row]))

const placeCatalog = [
  ...turkiyeIlIlce.provinces.map((row) => ({
    key: `p:${row.id}`,
    type: 'province',
    province_id: row.id,
    province_name: row.name,
    district_id: null,
    district_name: null,
    label: row.name,
    hint: 'İl',
    search: foldPlaceName(row.name),
  })),
  ...turkiyeIlIlce.districts.map((row) => {
    const province = provinceById.get(row.province_id)
    const provinceName = province?.name ?? ''
    return {
      key: `d:${row.id}`,
      type: 'district',
      province_id: row.province_id,
      province_name: provinceName,
      district_id: row.id,
      district_name: row.name,
      label: row.name,
      hint: provinceName,
      search: foldPlaceName(`${row.name} ${provinceName}`),
    }
  }),
]

function searchPlaces(query: string, limit = 12) {
  const needle = foldPlaceName(query).trim()
  if (needle.length < 1) return []
  const hits = []
  for (const item of placeCatalog) {
    if (!item.search.includes(needle)) continue
    hits.push(item)
    if (hits.length >= limit) break
  }
  return hits
}

function placeLabel(place: {
  type: string
  province_name: string
  district_name?: string | null
}) {
  if (place.type === 'province') return place.province_name
  return place.district_name ? `${place.district_name}, ${place.province_name}` : place.province_name
}

function placeKey(place: { type: string; district_id?: number | null; province_id: number }) {
  return place.type === 'district' ? `d:${place.district_id}` : `p:${place.province_id}`
}

function toStoredPlace(place: {
  type: string
  province_id: number
  province_name: string
  district_id?: number | null
  district_name?: string | null
}) {
  if (place.type === 'district') {
    return {
      type: 'district',
      province_id: place.province_id,
      province_name: place.province_name,
      district_id: place.district_id,
      district_name: place.district_name,
    }
  }
  return {
    type: 'province',
    province_id: place.province_id,
    province_name: place.province_name,
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Bekliyor',
  processing: 'Hazırlanıyor',
  completed: 'Tamamlandı',
  rejected: 'Reddedildi',
}

const STATUS_TONE: Record<string, 'neutral' | 'accent' | 'warn' | 'danger'> = {
  pending: 'warn',
  processing: 'accent',
  completed: 'accent',
  rejected: 'danger',
}

export function ListRequestButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button type="button" className="wb-wa-text-btn" onClick={() => setOpen(true)}>
        <Icon name="search" className="size-4" />
        Liste talep
      </Button>
      {open ? <ListRequestModal onClose={() => setOpen(false)} /> : null}
    </>
  )
}

export function ListRequestModal({
  onClose,
  initialView = 'list',
}: {
  onClose: () => void
  initialView?: 'list' | 'form'
}) {
  const titleId = useId()
  const [mounted, setMounted] = useState(false)
  const [view, setView] = useState(initialView)
  const [items, setItems] = useState<
    {
      id: string
      kind: string
      status: string
      category: string | null
      address: string | null
      locations: unknown
      radius_km: number | null
      nationwide: boolean
      contact_count: number
      created_at: string
    }[]
  >([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const refresh = async () => {
    setLoading(true)
    const result = await listListRequests()
    setLoadError(result.error ?? null)
    setItems(result.items ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void refresh()
  }, [])

  if (!mounted) return null

  return createPortal(
    <div className="wb-modal-root wb-modal-root--fill" role="presentation">
      <button type="button" className="wb-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="wb-modal-panel wb-modal-panel--fill wb-wa-modal"
      >
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="wb-modal-title">
              {view === 'form' ? 'Yeni liste talep' : 'Liste talepleri'}
            </h2>
            <p className="wb-modal-desc">
              {view === 'form'
                ? 'İl-ilçe veya çevrenizdeki işletmeler için kişi listesi isteyin.'
                : 'Önceki talepler ve durumları. Yeni talep ile form açılır.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-ink-muted hover:bg-canvas hover:text-ink"
          >
            ✕
          </button>
        </div>

        {view === 'form' ? (
          <ListRequestForm
            onBack={() => setView('list')}
            onCreated={async () => {
              setView('list')
              await refresh()
            }}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 shrink-0">
              <Button type="button" className="wb-wa-submit" onClick={() => setView('form')}>
                <Icon name="plus" className="size-4" />
                Yeni liste talep
              </Button>
            </div>
            {loadError ? <Notice tone="danger">{loadError}</Notice> : null}
            {loading ? (
              <p className="text-[13px] text-ink-muted">Yükleniyor…</p>
            ) : items.length === 0 ? (
              <p className="rounded-md border border-dashed border-hairline px-3 py-6 text-center text-[13px] text-ink-faint">
                Henüz talep yok. Yeni liste talep ile başlayın.
              </p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-md border border-hairline bg-canvas/50 px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-[12px] font-semibold text-ink" title={item.id}>
                          #{item.id.slice(0, 8)}
                        </p>
                        <p className="mt-0.5 text-[12.5px] text-ink-muted">
                          {item.kind === 'nearby' ? 'Çevremdekiler' : 'İl-İlçe'}
                          {item.kind === 'province_district' && item.category
                            ? ` · ${item.category}`
                            : ''}
                        </p>
                        <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-faint">
                          {item.kind === 'nearby'
                            ? `${item.radius_km ?? 2} km · ${item.address}`
                            : item.nationwide
                              ? 'Türkiye geneli'
                              : `${Array.isArray(item.locations) ? item.locations.length : 0} yer`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge tone={STATUS_TONE[item.status] ?? 'warn'}>
                          {STATUS_LABEL[item.status] ?? 'Bekliyor'}
                        </Badge>
                        <p className="tabular text-[12px] text-ink-muted">
                          {item.contact_count.toLocaleString('tr-TR')} kişi
                        </p>
                        <p className="tabular text-[11px] text-ink-faint">
                          {new Date(item.created_at).toLocaleString('tr-TR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

function ListRequestForm({
  onBack,
  onCreated,
}: {
  onBack: () => void
  onCreated: () => Promise<void>
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [kind, setKind] = useState('province_district')
  const [category, setCategory] = useState('')
  const [address, setAddress] = useState('')
  const [radiusKm, setRadiusKm] = useState('2')
  const [query, setQuery] = useState('')
  const [nationwide, setNationwide] = useState(false)
  const [selected, setSelected] = useState<
    {
      type: string
      province_id: number
      province_name: string
      district_id?: number | null
      district_name?: string | null
    }[]
  >([])
  const [error, setError] = useState<string | null>(null)
  useSyncBusy(pending, 'Talep kaydediliyor…')

  const hits = kind === 'province_district' ? searchPlaces(query) : []
  const selectedKeys = new Set(selected.map(placeKey))

  const addPlace = (place: (typeof placeCatalog)[number]) => {
    if (selectedKeys.has(place.key)) return
    if (selected.length >= MAX_LIST_REQUEST_PLACES) {
      setError(`En fazla ${MAX_LIST_REQUEST_PLACES} il / ilçe seçebilirsiniz.`)
      return
    }
    setError(null)
    setSelected((current) => [...current, toStoredPlace(place)])
  }

  const removePlace = (key: string) => {
    setSelected((current) => current.filter((place) => placeKey(place) !== key))
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result = await createListRequest(
        kind === 'nearby'
          ? { kind: 'nearby', address, radiusKm: Number(radiusKm) }
          : { kind: 'province_district', category, nationwide, locations: selected },
      )
      if (result.error) {
        setError(result.error)
        toast(result.error, 'danger')
        return
      }
      toast(result.ok ?? 'Talep alındı.', 'success')
      await onCreated()
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1 py-0.5">
        <div className="grid grid-cols-2 gap-2">
          <KindRadio
            checked={kind === 'province_district'}
            onChange={() => setKind('province_district')}
            title="İl-İlçe"
            hint="Şehir veya ilçe seçin"
          />
          <KindRadio
            checked={kind === 'nearby'}
            onChange={() => setKind('nearby')}
            title="Çevremdekiler"
            hint="Açık adres ve mesafe"
          />
        </div>

        {kind === 'province_district' ? (
          <>
            <Field label="Kategori" hint="Örn. restoran, eczane, oto servis">
              <Input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Hangi işletmeler?"
                maxLength={160}
              />
            </Field>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink-muted">İl veya ilçe</span>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-[12.5px] font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={nationwide}
                    onChange={(event) => {
                      const checked = event.target.checked
                      setNationwide(checked)
                      if (checked) {
                        setQuery('')
                        setError(null)
                      }
                    }}
                  />
                  Türkiye geneli
                </label>
              </div>
              <div className="relative">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={nationwide ? 'Türkiye geneli seçildi' : 'İl veya ilçe yazınız'}
                  disabled={nationwide}
                  className={query.trim() && !nationwide ? 'pr-10' : undefined}
                />
                {query.trim() && !nationwide ? (
                  <button
                    type="button"
                    aria-label="Aramayı temizle"
                    title="Temizle"
                    onClick={() => setQuery('')}
                    className="absolute right-1.5 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-ink-muted hover:bg-canvas hover:text-ink"
                  >
                    <Icon name="close" className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <span className="mt-1 block text-[12.5px] text-ink-faint">
                {nationwide
                  ? 'Tüm iller için istenir; il / ilçe seçilmez.'
                  : `En fazla ${MAX_LIST_REQUEST_PLACES} seçim`}
              </span>
            </div>
            {nationwide ? null : selected.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {selected.map((place) => {
                  const key = placeKey(place)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => removePlace(key)}
                      className="inline-flex items-center gap-1 rounded-full border border-hairline bg-surface px-2 py-1 text-[12px] font-medium text-ink hover:border-danger/40 hover:text-danger"
                    >
                      {placeLabel(place)}
                      <span aria-hidden>×</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
            {nationwide ? null : query.trim() ? (
              <ul className="divide-y divide-hairline overflow-hidden rounded-md border border-hairline bg-surface">
                {hits.length === 0 ? (
                  <li className="px-3 py-2.5 text-[12.5px] text-ink-faint">Eşleşen yer yok</li>
                ) : (
                  hits.map((place) => {
                    const added = selectedKeys.has(place.key)
                    return (
                      <li key={place.key}>
                        <button
                          type="button"
                          aria-label={added ? `${place.label} eklendi` : `${place.label} ekle`}
                          disabled={added}
                          onClick={() => addPlace(place)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-canvas disabled:cursor-default disabled:opacity-40"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[13px] font-medium text-ink">{place.label}</p>
                            <p className="text-[11.5px] text-ink-faint">{place.hint}</p>
                          </div>
                          <span
                            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-hairline bg-surface text-ink"
                            aria-hidden
                          >
                            <Icon name="plus" className="size-4" />
                          </span>
                        </button>
                      </li>
                    )
                  })
                )}
              </ul>
            ) : (
              <p className="text-[12.5px] text-ink-faint">Yazmaya başlayın, il ve ilçeler listelenir.</p>
            )}
          </>
        ) : (
          <>
            <Field label="Kaç kilometre çevreniz?" hint="1–5 km, zorunlu">
              <Select
                required
                value={radiusKm}
                onChange={(event) => setRadiusKm(event.target.value)}
                aria-label="Çevre mesafesi"
              >
                {[1, 2, 3, 4, 5].map((km) => (
                  <option key={km} value={String(km)}>
                    {km} km
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Açık adres" hint="Cadde, mahalle, bina — çevrenizdeki işletmeler için">
              <Textarea
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                rows={4}
                maxLength={1000}
                placeholder="Örn. Bursa Osmangazi, Haşim İşcan Cad. No 12"
              />
            </Field>
          </>
        )}

        {error ? <Notice tone="danger">{error}</Notice> : null}
      </div>

      <div className="mt-3 flex shrink-0 flex-wrap justify-end gap-2 border-t border-hairline pt-3">
        <Button type="button" onClick={onBack} disabled={pending}>
          Geri
        </Button>
        <Button type="button" variant="accent" disabled={pending} onClick={submit}>
          {pending ? 'Gönderiliyor…' : 'Talep gönder'}
        </Button>
      </div>
    </div>
  )
}

function KindRadio({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean
  onChange: () => void
  title: string
  hint: string
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2 rounded-md border px-3 py-2.5 ${
        checked ? 'border-accent/40 bg-accent-soft/50' : 'border-hairline bg-surface'
      }`}
    >
      <input type="radio" checked={checked} onChange={onChange} className="mt-1" />
      <span>
        <span className="block text-[13px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[11.5px] text-ink-muted">{hint}</span>
      </span>
    </label>
  )
}
