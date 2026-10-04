export function sqlFilterColumn(column: string): string {
  const match = /^([a-z_][a-z0-9_]*)(?:->>([a-z_][a-z0-9_]*))?$/i.exec(column)
  if (!match) throw new Error('INVALID_FILTER_COLUMN')
  return match[2] ? `${match[1]}->>'${match[2]}'` : match[1]
}

/** The direct adapter accepts only the scalar OR grammar actually used by this service. */
export function sqlScalarOr(expression: string, params: unknown[]): string {
  return '(' + expression.split(',').map(part => {
    const match = /^([a-z_][a-z0-9_]*(?:->>[a-z_][a-z0-9_]*)?)\.(is|eq)\.(null|true|false)$/i.exec(part)
    if (!match) throw new Error('UNSUPPORTED_OR_FILTER')
    match[2] = match[2].toLowerCase()
    match[3] = match[3].toLowerCase()
    const column = sqlFilterColumn(match[1])
    if (match[2] === 'is' && match[3] === 'null') return `${column} IS NULL`
    if (match[2] !== 'eq' || match[3] === 'null') throw new Error('UNSUPPORTED_OR_FILTER')
    params.push(match[1].includes('->>') ? match[3] : match[3] === 'true')
    return `${column} = $${params.length}`
  }).join(' OR ') + ')'
}
