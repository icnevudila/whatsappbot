export const SEND_WINDOW_TZ = 'Europe/Istanbul'
export const DEFAULT_SEND_WINDOW_START = '08:00'
export const DEFAULT_SEND_WINDOW_END = '18:00'

const CLOCK = /^(\d{1,2}):(\d{2})(?::\d{2})?$/

export function normalizeClock(value: string | null | undefined, fallback = DEFAULT_SEND_WINDOW_START): string {
  const raw = String(value ?? '').trim()
  const match = CLOCK.exec(raw)
  if (!match) return fallback
  const hour = Number(match[1])
  const minute = Number(match[2])
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return fallback
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function toMinutes(value: string, fallback: string): number {
  const clock = normalizeClock(value, fallback)
  const hour = Number(clock.slice(0, 2))
  const minute = Number(clock.slice(3, 5))
  return hour * 60 + minute
}

function minutesInZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0')
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? '0')
  return hour * 60 + minute
}

export function isWithinSendWindow(
  now: Date,
  start: string | null | undefined,
  end: string | null | undefined,
  timeZone = SEND_WINDOW_TZ,
): boolean {
  const startM = toMinutes(start ?? DEFAULT_SEND_WINDOW_START, DEFAULT_SEND_WINDOW_START)
  const endM = toMinutes(end ?? DEFAULT_SEND_WINDOW_END, DEFAULT_SEND_WINDOW_END)
  if (startM === endM) return true
  const nowM = minutesInZone(now, timeZone)
  if (startM < endM) return nowM >= startM && nowM < endM
  return nowM >= startM || nowM < endM
}

export function formatSendWindowLabel(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  return `${normalizeClock(start, DEFAULT_SEND_WINDOW_START)}–${normalizeClock(end, DEFAULT_SEND_WINDOW_END)}`
}

export function formatSendWindowWait(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  return `Mesaj gönderme saat aralığı bekleniyor (${formatSendWindowLabel(start, end)})`
}

/** Penceredeysek şimdi; değilsek bir sonraki açılış (Istanbul). */
export function nextSendWindowOpen(
  now: Date,
  start: string | null | undefined,
  end: string | null | undefined,
  timeZone = SEND_WINDOW_TZ,
): Date {
  if (isWithinSendWindow(now, start, end, timeZone)) return now
  const startM = toMinutes(start ?? DEFAULT_SEND_WINDOW_START, DEFAULT_SEND_WINDOW_START)
  const nowM = minutesInZone(now, timeZone)
  let addMinutes = startM - nowM
  if (addMinutes <= 0) addMinutes += 24 * 60
  return new Date(now.getTime() + addMinutes * 60_000)
}
