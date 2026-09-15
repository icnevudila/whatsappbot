const COLORS = ['#00a884', '#53bdeb', '#e17076', '#7bc862', '#a586e8', '#f5c26b', '#00a5f4', '#ff8a65']

export function waAvatarColor(key) {
  let hash = 0
  const value = String(key || '')
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return COLORS[hash % COLORS.length]
}

export function waAvatarLetters(name, fallback) {
  const trimmed = String(name || '').trim()
  if (trimmed) {
    const parts = trimmed.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toLocaleUpperCase('tr-TR')
    }
    return trimmed.slice(0, 2).toLocaleUpperCase('tr-TR')
  }
  const raw = String(fallback || '?')
  const digits = raw.replace(/\D/g, '')
  if (digits.length >= 2) return digits.slice(-2)
  return raw.slice(0, 2).toUpperCase() || '?'
}
