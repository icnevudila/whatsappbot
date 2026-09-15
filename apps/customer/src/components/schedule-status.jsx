'use client'

import { StatusPill } from '@/components/ui'
import { formatRemainingTr, formatScheduleAt } from '@/lib/schedule-remaining'
import { useCountdown } from '@/lib/use-countdown'

export function ScheduledStatusPill({ at }) {
  useCountdown(at)
  const remaining = formatRemainingTr(at)
  const when = formatScheduleAt(at)
  return <StatusPill status="scheduled" label={remaining || 'Planlandı'} hint={when} />
}
