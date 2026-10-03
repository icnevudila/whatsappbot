import { createHash } from 'node:crypto'

export function canonicalGenerationJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalGenerationJson).join(',')}]`
  return `{${Object.keys(value as object).sort().filter(key => (value as any)[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${canonicalGenerationJson((value as any)[key])}`).join(',')}}`
}

export type VideoGenerationInput = {
  orgId: string; creativeId: string; generationRevision: number; prompt: string
  assets: Array<{ role: string; sha256: string }>
  model: string; aspectRatio: string; duration: number; mode: string
  approvedDialogue: string; options?: Record<string, unknown>
}

export function createVideoGenerationIdentity(input: VideoGenerationInput) {
  if (!input.orgId || ['org_default', 'unknown_org', 'general', 'default', 'org'].includes(input.orgId)) throw new Error('VIDEO_ORG_REQUIRED')
  if (!input.creativeId || !Number.isSafeInteger(input.generationRevision) || input.generationRevision < 1) throw new Error('VIDEO_GENERATION_ID_REQUIRED')
  if (!input.assets.length || input.assets.some(asset => !/^[a-f0-9]{64}$/i.test(asset.sha256))) throw new Error('VIDEO_ASSET_HASH_REQUIRED')
  const normalized = { ...input, assets: input.assets.map(asset => ({ ...asset, sha256: asset.sha256.toLowerCase() })) }
  const requestHash = createHash('sha256').update(canonicalGenerationJson(normalized)).digest('hex')
  const idempotencyKey = `video:${input.orgId}:${input.creativeId}:${input.generationRevision}:${requestHash}`
  // Existing UUID primary keys provide the atomic uniqueness boundary; no new schema is required.
  const uuidFor = (namespace: string) => {
    const hash = createHash('sha256').update(`${namespace}:${input.orgId}:${input.creativeId}:${input.generationRevision}`).digest('hex')
    return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`
  }
  return { requestHash, idempotencyKey, jobId: uuidFor('video-job'), revisionId: uuidFor('video-revision'), conversationId: `video-${requestHash}` }
}

export async function findVideoGeneration(db: any, orgId: string, identity: ReturnType<typeof createVideoGenerationIdentity>) {
  const { data, error } = await db.from('ai_media_jobs').select('id,org_id,state,created_at,metadata').eq('id', identity.jobId).eq('org_id', orgId).maybeSingle()
  if (error) throw new Error('VIDEO_IDENTITY_LOOKUP_UNAVAILABLE')
  if (data && data.metadata?.generation_request_hash !== identity.requestHash) throw new Error('VIDEO_GENERATION_IDENTITY_CONFLICT')
  return data
}
