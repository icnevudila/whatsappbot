'use client'

import { useMemo, useState } from 'react'
import { WeeklyLineChart } from '@/components/charts'

type DayPoint = { day: string; label: string; out: number }
type Range = 'bugun' | 'dun' | '7gun'

export function HomeVolumePanel({
  weekDays,
  todayHours,
  yesterdayHours,
  todayKey,
  yesterdayKey,
}: {
  weekDays: DayPoint[]
  todayHours: number[]
  yesterdayHours: number[]
  todayKey: string
  yesterdayKey: string
}) {
  const [range, setRange] = useState<Range>('7gun')

  const chartDays = useMemo(() => {
    if (range === '7gun') return weekDays
    const hours = range === 'bugun' ? todayHours : yesterdayHours
    const dayKey = range === 'bugun' ? todayKey : yesterdayKey
    return hours.map((out, hour) => ({
      day: `${dayKey}T${String(hour).padStart(2, '0')}`,
      label: String(hour).padStart(2, '0'),
      out,
    }))
  }, [range, weekDays, todayHours, yesterdayHours, todayKey, yesterdayKey])

  const emptyText =
    range === '7gun'
      ? 'Son 7 günde giden mesaj yok.'
      : range === 'bugun'
        ? 'Bugün henüz giden mesaj yok.'
        : 'Dün giden mesaj yok.'

  const hrefForDay =
    range === '7gun'
      ? (day: string) => `/mesajlar?tarih=${day}&sekme=giden`
      : () => `/mesajlar?tarih=${range === 'bugun' ? 'bugun' : 'dun'}&sekme=giden`

  return (
    <div className="wb-home-panel">
      <div className="wb-home-panel-head">
        <h2 className="wb-home-panel-title">Gönderimler</h2>
        <div className="wb-home-filters">
          {(
            [
              ['bugun', 'Bugün'],
              ['dun', 'Dün'],
              ['7gun', '7 gün'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`wb-wa-chip${range === id ? ' is-active' : ''}`}
              onClick={() => setRange(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-3 pb-3 pt-1 sm:px-4">
        <WeeklyLineChart
          days={chartDays}
          hrefForDay={hrefForDay}
          emptyText={emptyText}
          denseLabels={range !== '7gun'}
        />
      </div>
    </div>
  )
}
