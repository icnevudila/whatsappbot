import { isApprovedVideoOutput } from './video-output-approval'

type CreativeRow = { id: string; status: string; public_url?: string | null }
export function libraryVideoOutputId(url?: string | null): string | null {
  if (!url) return null
  try {
    const path = new URL(url, 'https://app.mesajify.com').pathname
    return /^\/api\/ai-media\/outputs\/([a-f0-9-]{36})$/i.exec(path)?.[1] || null
  } catch { return null }
}

/** Resolve persisted output approval, even when the legacy creative row says ready. */
export async function loadVideoLibraryState(db: any, orgId: string, rows: CreativeRow[]) {
  const mapped = rows.map(row => ({ row, outputId: libraryVideoOutputId(row.public_url) })).filter(item => item.outputId)
  const states = new Map<string, { status: string; durationSeconds: number | null }>()
  if (!mapped.length) return states
  const result = await db.from('ai_media_outputs').select('id,org_id,verified,is_approved,duration_seconds')
    .eq('org_id', orgId).in('id', mapped.map(item => item.outputId))
  for (const { row, outputId } of mapped) {
    const output = !result.error && result.data?.find((item: any) => item.id === outputId && item.org_id === orgId)
    const duration = Number(output?.duration_seconds)
    states.set(row.id, { status: output && isApprovedVideoOutput(output) ? row.status : 'needs_review',
      durationSeconds: Number.isFinite(duration) && duration > 0 ? duration : null })
  }
  return states
}

export function videoDurationLabel(seconds?: number | null): string {
  if (!seconds || !Number.isFinite(seconds) || seconds < 0) return 'Video'
  const duration = Math.round(seconds)
  return `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`
}
