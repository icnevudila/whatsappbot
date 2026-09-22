/**
 * MESAJIFY / OMNISTUDIO — AUTONOMOUS COMMERCIAL DIRECTOR V3
 * CORE CREATIVE TYPES & INTERFACES (V6)
 */

export interface ResolvedCreativeFacts {
  orgId: string
  brandId: string
  brandName: string
  product: {
    id?: string
    name: string
    category?: string
    factualDescription: string
    physicalAttributes: string[]
    referenceAssetIds: string[]
    productImageUrl?: string | null
  }
  campaign: {
    objective: string
    targetAudience?: string
    offer?: string
    cta?: string
    durationSeconds: number
    aspectRatio: string
    language: string
    customVoiceover?: string | null
  }
  brandFacts: {
    tone: string[]
    personality: string[]
    palette?: string[]
    logoAssetIds: string[]
    logoUrl?: string | null
    requiredTerms?: string[]
    forbiddenClaims?: string[]
  }
  sectorFacts: {
    sectorProfileId: string
    physicalWorld: string[]
    authenticActions: string[]
    materials: string[]
    credibleProofTypes: string[]
    safetyConstraints: string[]
    forbiddenVisuals: string[]
    defaultAudioWorld?: string[]
  }
}

export interface CreativeDNA {
  brand: {
    personality: string[]
    communicationTone: string[]
    visualCharacter: string[]
    premiumLevel: 'mass' | 'mid' | 'premium' | 'luxury' | 'industrial_grade'
    brandBehaviors: string[]
    avoid: string[]
    corePillar: string
  }
  product: {
    materials: string[]
    physicalStrengths: string[]
    visualStrengths: string[]
    authenticInteractions: string[]
    transformations: string[]
    proofOpportunities: string[]
    visualWorld: string[]
    avoid: string[]
  }
  campaign: {
    objective: string
    primaryMessage?: string
    offer?: string
    cta?: string
    format: string
    durationSeconds: number
  }
  context: {
    audienceNeed: string[]
    credibleSituations: string[]
    desiredViewerResponse: string[]
  }
}

export interface StrategicPromise {
  statement: string
  viewerBeliefBefore: string
  viewerBeliefAfter: string
  evidence: Array<{
    type: string
    description: string
    source: 'product_fact' | 'brand_fact' | 'campaign_fact'
  }>
  forbiddenOverclaims: string[]
}

export interface CreativeConcept {
  id: string
  name: string
  oneSentenceIdea: string
  narrativeDevice: string
  openingMechanism: string
  payoffMechanism: string
  visualPotential: string[]
  proofUsage: string[]
  risks: string[]
}

export interface ConceptScore {
  conceptId: string
  brandFit: number            // 0.20
  productRelevance: number    // 0.20
  proofStrength: number       // 0.15
  visualDistinctiveness: number // 0.15
  narrativePayoff: number     // 0.15
  novelty: number             // 0.10
  productionFeasibility: number // 0.05
  totalScore: number          // 0-100
  noveltyPenaltyApplied: number
  notes: string[]
}

export interface TournamentResult {
  winner: CreativeConcept
  winnerScore: ConceptScore
  candidates: CreativeConcept[]
  allScores: ConceptScore[]
}

export interface DirectorTreatment {
  conceptId: string
  directorIntent: string
  emotionalArc: Array<{
    stage: string
    emotion: string
    intensity: number // 0.0 - 1.0
  }>
  visualMotif: {
    description: string
    recurringElements: string[]
  }
  motionMotif: {
    primaryDirection?: string
    movementCharacter: string
    progression: string
  }
  materialMotif: string[]
  cameraLanguage: {
    opening: string
    middle: string
    payoff: string
    forbiddenPatterns: string[]
  }
  lightingArc: {
    opening: string
    middle: string
    ending: string
  }
  editingRhythm: {
    start: string
    middle: string
    end: string
  }
  brandVisibilityStrategy: string
  productVisibilityStrategy: string
}

export type StoryBeatType =
  | 'hook'
  | 'reveal'
  | 'world'
  | 'need'
  | 'product_entrance'
  | 'transformation'
  | 'proof'
  | 'escalation'
  | 'result'
  | 'payoff'
  | 'brand_resolution'

export interface StoryBeat {
  id: string
  type: StoryBeatType
  startSec: number
  endSec: number
  purpose: string
  viewerKnowledgeBefore: string
  viewerKnowledgeAfter: string
  emotionIn: string
  emotionOut: string
  requiredEvidence?: string[]
}

export interface CauseEffectLink {
  fromBeatId: string
  toBeatId: string
  causalRelation: string
  continuityDevice:
    | 'action'
    | 'object'
    | 'shape'
    | 'motion'
    | 'sound'
    | 'material'
    | 'meaning'
}

export interface CreativeFingerprint {
  creativeId: string
  orgId: string
  brandId: string
  conceptFamily: string
  hookType: string
  environments: string[]
  lightingStyles: string[]
  cameraPatterns: string[]
  shotSizes: string[]
  visualMotifs: string[]
  transitionTypes: string[]
  humanActions: string[]
  heroShotType?: string
  endingType: string
  storyArchetype: string
}

export interface CreativeMemoryEvaluation {
  noveltyScore: number
  avoidRecentPatterns: string[]
  frequentTropesDetected: Record<string, number>
}

export interface SceneContractV2 {
  sceneId: string
  startSec: number
  endSec: number
  durationSec: number
  storyBeatId: string
  storyFunction: string
  viewerKnowledgeBefore: string
  viewerKnowledgeAfter: string
  emotionIn: string
  emotionOut: string
  causeFromPrevious?: string
  effectIntoNext?: string
  subject: {
    type: 'exact_reference_product' | 'person' | 'environment' | 'process' | 'result'
    identityLock?: boolean
    assetIds?: string[]
    description: string
  }
  primaryAction: string
  secondaryAction?: string
  environment: string
  composition: {
    foreground?: string
    midground?: string
    background?: string
  }
  camera: {
    shotSize: string
    lens?: string
    height?: string
    angle?: string
    movement: string
    movementSpeed?: string
    focusStrategy?: string
  }
  lighting: {
    motivation: string
    character: string
    continuity: string
  }
  visualMotif?: string
  motionDirection?: string
  motionEnergy: number // 0.0 (near-static) to 1.0 (very high)
  productVisibility: number // 0.0 to 1.0
  brandVisibility: number // 0.0 to 1.0
  incomingAction?: string
  outgoingAction?: string
  transitionOut?: {
    semanticReason: string
    visualTechnique:
      | 'cut'
      | 'match_cut'
      | 'motion_match'
      | 'object_wipe'
      | 'occlusion'
      | 'sound_bridge'
      | 'action_cut'
    matchElement?: string
  }
  mustShow: string[]
  mustAvoid: string[]
  naturalAudio?: string[]
  sfx?: string[]
  voiceoverSegment?: string
}

export interface AudioPlan {
  fullVoiceoverText: string
  wordCount: number
  estimatedDurationSec: number
  targetLanguage: string
  speakerIdentity: {
    id: string
    tone: string
    gender: 'neutral' | 'male' | 'female'
    pacingWordsPerMinute: number
  }
  music: {
    tempo: number
    instrumentation: string[]
    energyCurve: string
    introCharacter: string
    buildSec: number
    peakSec: number
    resolutionSec: number
    duckingDb: number
  }
  sfxCues: Array<{
    timestampSec: number
    description: string
    audioEvent: string
  }>
  loudnessTarget: {
    integratedLufs: number // e.g. -14
    truePeakDbTp: number   // e.g. -1.0
    preset: 'social_media' | 'broadcast' | 'cinematic'
  }
  maxDurationToleranceSec: number
}

export interface DirectorQAReport {
  verdict: 'PASS' | 'SOFT_FAIL' | 'HARD_FAIL'
  overallScore: number
  hardIdentityChecks: {
    correctBrand: boolean
    correctLogo: boolean
    noCrossTenantAssets: boolean
    productReferenceFidelity: boolean
    noForbiddenObjects: boolean
  }
  directorChecks: {
    intendedBeatConveyed: boolean
    storyProgressionValid: boolean
    continuityPreserved: boolean
    productVisibilityMet: boolean
    realisticEnvironment: boolean
    noAnatomicalDefects: boolean
    motionEnergyConsistent: boolean
    noRepetitiveLogoShots: boolean
  }
  narrativeChecks: {
    hookStrength: boolean
    strategicPromiseDelivered: boolean
    energyProgressionValid: boolean
    payoffValid: boolean
    noDecorativeShotsRemaining: boolean
  }
  issues: string[]
  retryRecommended: boolean
  inspectedFrames: Array<{
    label: string
    timestamp: number
    path?: string
  }>
}

export interface ArtifactProvenanceRecord {
  orgId: string
  brandId: string
  creativeId: string
  jobId: string
  attemptId: string
  workerId: string
  flowProjectId: string
  generationId?: string
  promptHash: string
  assetHashes: Record<string, string>
  downloadPath?: string
  rawVideoSha256: string
  postProcessedSha256?: string
  finalStorageUrl?: string
  provenanceValid: boolean
  verifiedAt: string
}

export interface V6FeatureFlags {
  CREATIVE_DIRECTOR_V6_ENABLED: boolean
  DIRECTOR_TWO_PASS_ENABLED: boolean
  DIRECTOR_VISUAL_QA_ENABLED: boolean
  DIRECTOR_CANDIDATES_ENABLED: boolean
  TTS_MASTER_ENABLED: boolean
  LEGACY_CREATIVE_FALLBACK_ENABLED: boolean
}

export interface V6FinalProductionPackage {
  facts: ResolvedCreativeFacts
  dna: CreativeDNA
  promise: StrategicPromise
  conceptTournament: TournamentResult
  directorTreatment: DirectorTreatment
  beatSheet: StoryBeat[]
  causeEffectGraph: CauseEffectLink[]
  sceneContracts: SceneContractV2[]
  veoPrompt: string
  audioPlan: AudioPlan
  qaReport?: DirectorQAReport
  provenance?: ArtifactProvenanceRecord
  featureFlags: V6FeatureFlags
  grammarType: 'short_performance' | 'mid_form' | 'brand_film'
  targetDurationSeconds: number
  version: '6.0.0'
}
