export function ownsStudioDraft(raw: unknown, orgId: string, productIds: string[]): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const draft = raw as Record<string, unknown>
  return draft.orgId === orgId && typeof draft.heroProductId === 'string' && productIds.includes(draft.heroProductId)
}
