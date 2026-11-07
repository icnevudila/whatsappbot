/** Optional release canary scope: never execute an unrelated historical job. */
export function parseJobScope(raw: string | undefined): string[] | null {
  if (raw === undefined) return null
  const ids = [...new Set(raw.split(',').map(value => value.trim()))]
  if (!ids.length || ids.some(id => !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id))) {
    throw new Error('INVALID_AI_MEDIA_JOB_ALLOWLIST')
  }
  return ids
}

export function scopeJobQuery<T extends { in: (column: string, values: string[]) => T }>(query: T): T {
  const ids = parseJobScope(process.env.AI_MEDIA_JOB_ALLOWLIST)
  return ids === null ? query : query.in('id', ids)
}
