import { ChatGPTCreativeDirectorV2, type CreativeConcept } from '../planner/chatgpt-creative-director.js'
import { ChatGPTCreativeCritic } from '../qa/chatgpt-creative-critic.js'
import { VeoPromptCompiler } from '../compiler/veo-prompt-compiler.js'
import type { IChatGPTCreativeProvider, CreativeCallTelemetry } from '../adapters/chatgpt-creative-adapter.js'
import type { CreativeContext } from '../types/creative-context.js'
import type { ShortAdMasterPlan } from '../planner/short-ad-master-plan.js'
import type { CreativeFingerprint } from '../strategy/creative-diversity-guard.js'

export type AssetProof = 'FIXTURE' | 'REAL_ASSET'

export interface ClaimAudit { claim: string; matched_verified_fact?: string; provenance?: string; supported: boolean }
export interface DiversityDiagnostic { pairwise_similarity: number; repeated_traits: string[]; clone_risk: 'low' | 'medium' | 'high' }
export interface CreativeEvaluationCase {
  case_id: string; sector: string; user_style: string; asset_proof: AssetProof
  concepts: CreativeConcept[]; selected_concept: CreativeConcept; master_plan: ShortAdMasterPlan
  compiled_veo_prompt: string; fingerprint?: CreativeFingerprint; critic_decision: string
  factual_claims: ClaimAudit[]; contamination: { suspicious_tokens: string[]; likely_source?: string; contamination_risk: 'low' | 'medium' | 'high' }
  speech: { word_count: number; estimated_words_per_second: number; repeated_brand_name: boolean; generic_phrases: string[]; factual_claim_count: number }
  timing: { valid: boolean; issues: string[]; beat_count: number; total_duration: number; camera_changes: number }
  quality_issues: string[]
}

class OfflineCreativeProvider implements IChatGPTCreativeProvider {
  async callDirector() { return null }
  async callCritic() { return null }
  async callVideoReviewer() { return null }
  getTelemetryHistory(): CreativeCallTelemetry[] { return [] }
}

const CLAIM_TERMS = ['high efficiency', 'faster', 'powerful', 'durable', 'premium quality', 'professional performance', 'reliable', 'easy', 'ergonomic', 'guaranteed', 'yüksek verim', 'hızlı', 'güçlü', 'dayanıklı', 'güvenilir', 'ergonomik', 'garantili']
const SECTOR_CONTAMINATION: Record<string, string[]> = {
  agriculture_equipment: ['car wash', 'software dashboard', 'saas'],
  construction_material: ['zeytinlik', 'restaurant kitchen', 'software dashboard'],
  food_restaurant: ['construction site', 'sprayer nozzle', 'software dashboard'],
  saas_software: ['physical product close-up', 'sprayer nozzle', 'construction site'],
  b2b_service: ['sprayer nozzle', 'restaurant kitchen', 'concrete pour'],
}

function normalized(text: string) { return text.toLocaleLowerCase('tr-TR') }
function fingerprintTraits(fp?: CreativeFingerprint): Record<string, string> {
  if (!fp) return {}
  return { ad_format: fp.ad_format, format_variant: fp.format_variant, hook_type: fp.hook_type, first_frame_type: fp.opening_visual_type, camera_pattern: fp.camera_pattern, environment_type: fp.environment_type, speech_structure: fp.speech_structure, ending_family: fp.end_card_family }
}

export class CreativeQualityHarness {
  private readonly provider = new OfflineCreativeProvider()

  public async evaluate(context: CreativeContext, asset_proof: AssetProof = 'FIXTURE'): Promise<CreativeEvaluationCase> {
    const director = new ChatGPTCreativeDirectorV2(this.provider)
    const critic = new ChatGPTCreativeCritic(this.provider)
    const concepts = await director.generateThreeConcepts(context)
    const selection = director.selectWinningConcept(concepts, context)
    const masterPlan = await director.buildDetailedMasterPlan(selection.selected_concept, context)
    const criticReport = await critic.evaluatePlan(masterPlan, context, 0)
    const compiled = new VeoPromptCompiler().compileVeoPrompt(masterPlan)
    const combined = [masterPlan.master_spoken_script || '', masterPlan.voiceover_script || '', compiled.cinematicPrompt].join(' ')
    const lower = normalized(combined)
    const factual_claims = CLAIM_TERMS.filter(term => lower.includes(normalized(term))).map(claim => {
      const fact = context.verified_facts.find(f => normalized(f.claim).includes(normalized(claim)) || normalized(claim).includes(normalized(f.claim)))
      return { claim, matched_verified_fact: fact?.claim, provenance: fact ? `${fact.source_type}:${fact.source_id}` : undefined, supported: !!fact }
    })
    const suspicious_tokens = (SECTOR_CONTAMINATION[context.brand_profile.sector] || []).filter(token => lower.includes(token))
    const speech = masterPlan.master_spoken_script || masterPlan.voiceover_script || ''
    const words = speech.trim() ? speech.trim().split(/\s+/) : []
    const duration = Math.max(...masterPlan.beats.map(b => b.end), 0)
    const timingIssues: string[] = []
    if (duration > 8) timingIssues.push('duration_exceeds_8_seconds')
    if (masterPlan.beats.some((beat, index) => index > 0 && beat.start < masterPlan.beats[index - 1]!.end)) timingIssues.push('overlapping_beats')
    if (masterPlan.beats.length > 6) timingIssues.push('excessive_scene_count')
    const genericPhrases = ['kalite', 'farkı', 'en iyi', 'üstün'].filter(p => lower.includes(p))
    const qualityIssues = [...criticReport.issues, ...factual_claims.filter(c => !c.supported).map(c => `unsupported_claim:${c.claim}`), ...timingIssues]
    return {
      case_id: context.job_id, sector: context.brand_profile.sector, user_style: context.campaign_context.user_style_preference, asset_proof,
      concepts, selected_concept: selection.selected_concept, master_plan: masterPlan, compiled_veo_prompt: compiled.cinematicPrompt,
      fingerprint: masterPlan.creative_fingerprint, critic_decision: criticReport.decision, factual_claims,
      contamination: { suspicious_tokens, likely_source: suspicious_tokens.length ? 'legacy_or_cross_sector_prompt_fragment' : undefined, contamination_risk: suspicious_tokens.length ? 'high' : 'low' },
      speech: { word_count: words.length, estimated_words_per_second: duration ? Number((words.length / duration).toFixed(2)) : 0, repeated_brand_name: (lower.match(new RegExp(normalized(context.brand_profile.brand_name), 'g')) || []).length > 1, generic_phrases: genericPhrases, factual_claim_count: factual_claims.length },
      timing: { valid: timingIssues.length === 0, issues: timingIssues, beat_count: masterPlan.beats.length, total_duration: duration, camera_changes: new Set(masterPlan.beats.map(b => b.camera)).size },
      quality_issues: qualityIssues,
    }
  }

  public compare(results: CreativeEvaluationCase[]): DiversityDiagnostic[] {
    return results.flatMap((left, index) => results.slice(index + 1).map(right => {
      const a = fingerprintTraits(left.fingerprint); const b = fingerprintTraits(right.fingerprint)
      const keys = Object.keys(a); const repeated = keys.filter(key => a[key] === b[key]).map(key => `${key}:${a[key]}`)
      const similarity = keys.length ? Number((repeated.length / keys.length).toFixed(2)) : 0
      return { pairwise_similarity: similarity, repeated_traits: repeated, clone_risk: similarity >= 0.75 ? 'high' : similarity >= 0.45 ? 'medium' : 'low' }
    }))
  }
}
