export function remainingSeconds(iso, now = Date.now()) {
  if (!iso) return null
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return null
  return Math.round((target - now) / 1000)
}

export function formatRemainingTr(iso, now = Date.now()) {
  const seconds = remainingSeconds(iso, now)
  if (seconds == null) return ''
  if (seconds <= 0) return 'zamanı geldi'
  if (seconds < 60) return 'az sonra'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} dk sonra`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} sa sonra`
  const days = Math.round(hours / 24)
  return `${days} gün sonra`
}

export function formatScheduleAt(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatRelativePast(iso, now = Date.now()) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const ms = now - then
  if (ms < 0) return 'az önce'
  const min = Math.floor(ms / 60_000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min} dk önce`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour} sa önce`
  const day = Math.floor(hour / 24)
  if (day < 7) return `${day} gün önce`
  const week = Math.floor(day / 7)
  if (week < 5) return `${week} hf önce`
  const month = Math.floor(day / 30)
  if (month < 12) return `${month} ay önce`
  const year = Math.floor(day / 365)
  return `${year} yıl önce`
}
