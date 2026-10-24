import {createHash} from 'node:crypto'
import {readFileSync,realpathSync} from 'node:fs'
import {join,relative,isAbsolute} from 'node:path'
import {createBrandContextSnapshot,type RawBrandInput} from '@wa/creative-video-orchestrator'
import {GenerationWorkspace} from './providers/generation-workspace.js'
import type {ProviderRoutingResult} from './providers/video-provider-router.js'

export interface ProviderRecoveryReceipt {
  jobId:string;orgId:string;sourceAttemptId:string;revisionId:string
  mediaId:string;projectId:string;accountId:string;rawPath:string;sha256:string
  startedAt:string;completedAt:string
  verifiedAssets:Array<{asset_id:string;org_id:string;role:string;sha256:string;attached_media_id:string}>
  diagnostics:any
}

/** Operator recovery consumes an already-billed, identified clip; it cannot submit. */
export function validateRecoveredProvider(receipt:ProviderRecoveryReceipt,job:any,attemptId:string,rawInput:RawBrandInput,assets:any[]) {
  const fail=()=>{throw new Error('RECOVERED_PROVIDER_PROVENANCE_MISMATCH')}
  if(receipt.jobId!==job.id||receipt.orgId!==job.org_id||receipt.revisionId!==job.metadata?.creative_revision_id||!receipt.mediaId||!receipt.projectId)fail()
  const root=realpathSync(join('/shared/outputs',job.org_id,job.id,receipt.sourceAttemptId))
  const path=realpathSync(receipt.rawPath),inside=relative(root,path)
  if(!inside||inside.startsWith('..')||isAbsolute(inside)||createHash('sha256').update(readFileSync(path)).digest('hex')!==receipt.sha256)fail()
  if(receipt.verifiedAssets.length!==assets.length||assets.some(a=>!receipt.verifiedAssets.some(r=>r.asset_id===a.asset_id&&r.org_id===job.org_id&&r.role===a.role&&r.sha256===a.sha256&&r.attached_media_id)))fail()
  const snapshot=createBrandContextSnapshot({...rawInput,creative_engine_mode:'CURRENT'})
  const brief=receipt.diagnostics?.common_plan?.brief,shotPlan=receipt.diagnostics?.common_plan?.shotPlan
  const productionPlan=receipt.diagnostics?.production_plan,prompt=receipt.diagnostics?.exact_provider_prompts?.FLOW_VEO
  if(!brief||!shotPlan||!productionPlan||!prompt||brief.spokenScript!==rawInput.campaign?.approved_spoken_line||brief.heroProductSha!==snapshot.products[0]?.sha256||brief.heroProductId!==snapshot.products[0]?.product_id)fail()
  const workspace=new GenerationWorkspace({jobId:job.id,attemptId,expectedDurationSeconds:8,expectedAspectRatio:'9:16'})
  const measured=workspace.recordRawVideo(path)
  if(measured.sha256!==receipt.sha256)fail()
  const generated:ProviderRoutingResult={provider:'FLOW_VEO',requestedProvider:'FLOW_VEO',selectedProvider:'FLOW_VEO',capabilityState:'AVAILABLE',providerAccountId:receipt.accountId,providerAttemptId:receipt.sourceAttemptId,providerProjectId:receipt.projectId,providerMediaIds:[receipt.mediaId],outputPath:workspace.rawMp4Path(),rawOutputSha256:receipt.sha256,byteSize:measured.size,generationStartedAt:receipt.startedAt,generationCompletedAt:receipt.completedAt,attemptCounts:{FLOW_VEO:1,GEMINI_NATIVE_VIDEO:0}}
  return {snapshot,brief,shotPlan,productionPlan,providerPrompt:prompt,diagnostics:receipt.diagnostics.historical_contract,assContent:undefined as string|undefined,generated}
}
