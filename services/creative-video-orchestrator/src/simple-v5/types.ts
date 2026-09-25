import type { BrandContextSnapshot } from '../types/brand-snapshot.js'
import type { MultimodalAttachment } from '../types/creative-context.js'

export type CreativeEngineMode = 'CURRENT' | 'SIMPLE_V5_HYBRID'

import type { ResolvedContractReport, ProductFidelityContract } from './fidelity-contract.js'

export interface SimpleV5Brief {
  goal: string
  subject: string
  heroProductHandle: string
  heroProductId?: string
  heroProductSha?: string
  productFidelityContract?: ProductFidelityContract
  fidelityReport?: ResolvedContractReport
  brandName: string
  primaryIdea: string
  primaryAction: string
  location: string
  timeOfDay: string
  lighting: string
  cameraMotion: string
  spokenScript: string
  spokenWordCount: number
  verifiedFacts: string[]
  aspectRatio: '9:16'
  durationSeconds: number
}

export interface SimpleV5ShotPlan {
  shot1_hook: {
    timing: '0.0-2.2s'
    description: string
    framing: string
  }
  shot2_proof: {
    timing: '2.2-5.8s'
    description: string
    action: string
  }
  shot3_close: {
    timing: '5.8-8.0s'
    description: string
    resolution: string
  }
}

export interface SimpleV5CompiledPrompt {
  cinematicPrompt: string
  negativePrompt: string
  voiceoverScript: string
  wordCount: number
  fidelity: {
    applied: boolean
    canonicalAssetSha: string
    productId: string
    ruleCount: number
    contract: any
  }
  metrics: {
    charCount: number
    instructionCount: number
    negativeCount: number
    actionCount: number
    locationCount: number
    llmCallCountBeforeVeo: number
  }
}

export type SevereFailureCode =
  | 'WRONG_PRODUCT'
  | 'FOREIGN_BRAND'
  | 'PRODUCT_MORPH'
  | 'WRONG_SECTOR'
  | 'RAW_GENERATION_AUDIO_LANGUAGE_MISMATCH'
  | 'SEVERE_FAKE_UI'
  | 'INVENTED_DIEGETIC_BRANDING'
  | 'IMPOSSIBLE_PRODUCT_OPERATION'

export interface SimpleV5ReviewReport {
  passed: boolean
  decision: 'PASS' | 'NEEDS_REVIEW' | 'REGENERATE'
  severeFailureCodes: SevereFailureCode[]
  issues: string[]
  details: string
  isSevere: boolean
}
