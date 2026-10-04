import { createHash } from 'node:crypto'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { join, relative, isAbsolute } from 'node:path'
import type { ProviderRoutingResult } from './providers/video-provider-router.js'

/** A processing retry must reuse verified bytes, never silently buy another generation. */
export async function loadFinishingCheckpoint(supabase: any, job: any, brief: any, assets: any[], baseDir = '/shared/jobs') {
  if (!(job.retry_count > 0) || !job.raw_output_sha256) return null
  const fail = () => { throw new Error('FINISHING_CHECKPOINT_INVALID: retained raw video does not match the locked job') }
  if (!/^[a-f0-9]{64}$/.test(job.raw_output_sha256)) fail()
  const { data, error } = await supabase.from('ai_media_attempts')
    .select('id,org_id,job_id,metadata').eq('job_id', job.id).eq('org_id', job.org_id)
    .eq('status', 'failed').order('started_at', { ascending: false }).limit(1).maybeSingle()
  if (error || !data || data.org_id !== job.org_id || data.job_id !== job.id) fail()
  const metadata = data.metadata
  const previous = metadata?.diagnostics?.common_plan?.brief
  const history = metadata?.provider_attempt_history
  const generated = history?.at(-1) as ProviderRoutingResult & { combinedReview?: any }
  if (!previous || !generated || generated.rawOutputSha256 !== job.raw_output_sha256 ||
      previous.spokenScript !== brief.spokenScript || previous.heroProductSha !== brief.heroProductSha ||
      previous.heroProductId !== brief.heroProductId || previous.aspectRatio !== brief.aspectRatio ||
      previous.durationSeconds !== brief.durationSeconds || !generated.combinedReview) fail()
  const checkpointAssets = metadata?.finishing_checkpoint_assets
  // Older attempts are recoverable only when their locked canonical inputs are independently persisted.
  let expected = checkpointAssets || job.metadata?.locked_asset_hashes
  if (!expected) {
    const retained = await supabase.from('ai_media_assets').select('role,sha256')
      .eq('job_id', job.id).eq('org_id', job.org_id).lte('created_at', generated.generationStartedAt)
    if (retained.error) fail()
    expected = retained.data
  }
  if (!Array.isArray(expected) || expected.length !== assets.length ||
      assets.some(asset => !expected.some((item: any) => item.role === asset.role && item.sha256 === asset.sha256))) fail()
  let path: string
  try {
    const root = realpathSync(join(baseDir, job.id))
    path = realpathSync(generated.outputPath)
    const inside = relative(root, path)
    if (!inside || inside.startsWith('..') || isAbsolute(inside) || !statSync(path).isFile() || statSync(path).size < 1024) fail()
    if (createHash('sha256').update(readFileSync(path)).digest('hex') !== job.raw_output_sha256) fail()
  } catch { return fail() }
  return { generated: { ...generated, outputPath: path! }, history, sourceAttemptId: data.id,
    automaticRegenerations: Number(metadata.automatic_regenerations || 0) }
}
